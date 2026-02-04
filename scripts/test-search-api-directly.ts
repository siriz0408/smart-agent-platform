import { createClient } from '@supabase/supabase-js';

// Type for search results
interface SearchResult {
  entity_type: string;
  name: string;
  similarity?: number;
  text_rank?: number;
  rrf_score?: number;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSearchAPI() {
  console.log('\n🔍 Testing Search API Directly\n');
  console.log('='.repeat(60));

  const tenantId = '5098bedb-a0bc-40ae-83fa-799df8f44981'; // siriz04081@gmail.com

  // Step 1: Check if Sarah Johnson exists with embedding
  console.log('\n1️⃣ Checking if Sarah Johnson exists...');
  const { data: sarah } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, search_text, embedding')
    .eq('tenant_id', tenantId)
    .ilike('first_name', '%sarah%')
    .single();

  if (sarah) {
    console.log('   ✅ Found: Sarah Johnson');
    console.log(`   Search text: ${sarah.search_text?.substring(0, 100)}...`);
    console.log(`   Has embedding: ${sarah.embedding ? 'YES' : 'NO'}`);
  } else {
    console.log('   ❌ Sarah Johnson not found in database');
  }

  // Step 2: Test the RPC function directly
  console.log('\n2️⃣ Testing search_all_entities_hybrid RPC...');

  // Generate embedding for "sarah"
  const { data: embedding } = await supabase.rpc('generate_deterministic_embedding', {
    text_input: 'sarah'
  });

  if (!embedding) {
    console.log('   ❌ Failed to generate embedding');
    return;
  }

  console.log('   ✅ Generated embedding for "sarah"');

  // Call the search RPC
  const { data: results, error } = await supabase.rpc('search_all_entities_hybrid', {
    p_query: 'sarah',
    p_query_embedding: embedding,
    p_tenant_id: tenantId,
    p_entity_types: ['contact', 'property', 'deal', 'document'],
    p_match_threshold: 0.1,
    p_match_count_per_type: 5
  });

  if (error) {
    console.log('   ❌ RPC Error:', error);
    return;
  }

  console.log(`   ✅ RPC returned ${results?.length || 0} results`);

  if (results && results.length > 0) {
    console.log('\n   Results:');
    results.forEach((r: SearchResult, i: number) => {
      console.log(`   ${i + 1}. [${r.entity_type}] ${r.name}`);
      console.log(`      Similarity: ${r.similarity?.toFixed(4) || 'N/A'}`);
      console.log(`      Text rank: ${r.text_rank?.toFixed(4) || 'N/A'}`);
      console.log(`      RRF score: ${r.rrf_score?.toFixed(4) || 'N/A'}`);
    });
  } else {
    console.log('   ⚠️  No results returned from RPC');
  }

  // Step 3: Test the Edge Function
  console.log('\n3️⃣ Testing universal-search Edge Function...');

  // Get a real user session token
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'siriz04081@gmail.com',
    password: 'your-password-here' // Need real password
  });

  if (authError) {
    console.log('   ⚠️  Skipping edge function test (need user password)');
    console.log('   You can test manually in browser DevTools → Network tab');
  } else {
    const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session?.access_token}`
      },
      body: JSON.stringify({
        query: 'sarah',
        entityTypes: ['contact', 'property', 'deal', 'document']
      })
    });

    console.log(`   Response status: ${response.status}`);
    const data = await response.json();
    console.log(`   Results: ${data.results?.length || 0}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete\n');
}

testSearchAPI();
