/**
 * Diagnostic script to debug search functionality
 * Run with: npx tsx scripts/debug-search.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropertyEmbeddings() {
  console.log('\n🔍 Phase 1: Checking Property Embeddings for "922"');
  console.log('='.repeat(60));

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, address, city, state, search_text, embedding, embedding_indexed_at')
    .ilike('address', '%922%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching properties:', error);
    return;
  }

  console.log(`\n📊 Found ${properties?.length || 0} properties matching "922"`);

  if (properties && properties.length > 0) {
    properties.forEach((prop, idx) => {
      console.log(`\n${idx + 1}. ${prop.address}, ${prop.city}, ${prop.state}`);
      console.log(`   ID: ${prop.id}`);
      console.log(`   Search Text: ${prop.search_text?.substring(0, 100)}...`);
      console.log(`   Embedding: ${prop.embedding ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`   Indexed At: ${prop.embedding_indexed_at || 'Never'}`);
    });
  } else {
    console.log('⚠️  No properties found matching "922"');
  }
}

async function checkDocumentEmbeddings() {
  console.log('\n🔍 Phase 2: Checking Document Embeddings for "922"');
  console.log('='.repeat(60));

  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, name, category, ai_summary')
    .ilike('name', '%922%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching documents:', error);
    return;
  }

  console.log(`\n📊 Found ${documents?.length || 0} documents matching "922"`);

  if (documents && documents.length > 0) {
    for (const doc of documents) {
      console.log(`\n• ${doc.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Category: ${doc.category || 'N/A'}`);

      // Check document_chunks for embeddings
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id, embedding')
        .eq('document_id', doc.id)
        .limit(1);

      if (chunksError) {
        console.log(`  Chunks: ❌ Error - ${chunksError.message}`);
      } else {
        const hasEmbedding = chunks && chunks.length > 0 && chunks[0].embedding;
        console.log(`  Chunks: ${chunks?.length || 0} chunks, Embedding: ${hasEmbedding ? '✅ EXISTS' : '❌ MISSING'}`);
      }
    }
  } else {
    console.log('⚠️  No documents found matching "922"');
  }
}

async function testSearchAPI() {
  console.log('\n🔍 Phase 3: Testing Search API Directly');
  console.log('='.repeat(60));

  // First, we need to authenticate
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Replace with actual test account
    password: 'test1234', // Replace with actual password
  });

  if (authError) {
    console.log('⚠️  Cannot test API: Not authenticated');
    console.log('   Please sign in manually and provide token');
    return;
  }

  const token = authData.session?.access_token;

  if (!token) {
    console.log('❌ No auth token available');
    return;
  }

  console.log('\n📡 Calling universal-search API...');

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: '922',
          entityTypes: ['property', 'document', 'contact', 'deal'],
          matchThreshold: 0.1,
          matchCountPerType: 5,
        }),
      }
    );

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Error Response: ${error}`);
      return;
    }

    const data = await response.json();
    console.log(`   ✅ Success`);
    console.log(`   Results Count: ${data.results?.length || 0}`);

    if (data.results && data.results.length > 0) {
      console.log('\n   Results:');
      data.results.forEach((result: any, idx: number) => {
        console.log(`   ${idx + 1}. [${result.entity_type}] ${result.name}`);
        console.log(`      Similarity: ${result.similarity?.toFixed(4)}`);
        console.log(`      Text Rank: ${result.text_rank?.toFixed(4)}`);
        console.log(`      RRF Score: ${result.rrf_score?.toFixed(4)}`);
      });
    } else {
      console.log('   ⚠️  No results returned');
    }
  } catch (error) {
    console.error('   ❌ API Call Failed:', error);
  }
}

async function checkRPCFunction() {
  console.log('\n🔍 Phase 4: Checking RPC Function Exists');
  console.log('='.repeat(60));

  // Try to call the RPC function with dummy data
  const dummyEmbedding = Array(1536).fill(0);

  const { data, error } = await supabase.rpc('search_all_entities_hybrid', {
    p_query: '922',
    p_query_embedding: dummyEmbedding,
    p_tenant_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
    p_entity_types: ['property'],
    p_match_threshold: 0.1,
    p_match_count_per_type: 5,
  });

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('   ❌ RPC function NOT FOUND');
      console.log('   Migration may not have been applied');
    } else {
      console.log(`   ⚠️  RPC Error: ${error.message}`);
    }
  } else {
    console.log('   ✅ RPC function EXISTS and callable');
    console.log(`   Results: ${data?.length || 0}`);
  }
}

async function main() {
  console.log('\n🐛 SYSTEMATIC DEBUGGING: Search Feature');
  console.log('='.repeat(60));
  console.log('Following systematic-debugging methodology');
  console.log('Phase 1: Root Cause Investigation\n');

  try {
    await checkPropertyEmbeddings();
    await checkDocumentEmbeddings();
    await checkRPCFunction();
    // await testSearchAPI(); // Commented out - requires auth

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic Complete');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. Review the evidence above');
    console.log('2. Identify which layer is failing');
    console.log('3. Form hypothesis about root cause');
    console.log('4. Test hypothesis with minimal change');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Diagnostic Failed:', error);
    process.exit(1);
  }
}

main();
