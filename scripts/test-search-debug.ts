/**
 * Test Script: Debug Universal Search
 *
 * This script tests the universal search edge function and diagnoses issues
 */

import { createClient } from '@supabase/supabase-js';

// Type for search results
interface SearchResult {
  entity_type: string;
  name: string;
  similarity?: number;
  text_rank?: number;
  rrf_score?: number;
}

const SUPABASE_URL = 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0aG5lenVhZGZibWJxbHhpd3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NTQ3MjksImV4cCI6MjA1MTQzMDcyOX0.Ct7dL5Sl_rHBZXfHI-xXMlKNwcPY8Oj2xdCjBdqWgNw';

async function testSearch() {
  console.log('\n🔍 Starting Universal Search Debug\n');
  console.log('=' .repeat(60));

  // Step 1: Login to get auth token
  console.log('\n📧 Step 1: Logging in as siriz04081@gmail.com...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'siriz04081@gmail.com',
    password: process.env.TEST_PASSWORD || 'password', // Will need actual password
  });

  if (authError || !authData.session) {
    console.error('❌ Login failed:', authError?.message);
    console.log('\n⚠️  Please set TEST_PASSWORD environment variable:');
    console.log('   export TEST_PASSWORD="your-password"');
    console.log('   npm run test:search-debug');
    return;
  }

  console.log('✅ Login successful');
  console.log('   User ID:', authData.user.id);

  // Step 2: Check profiles table
  console.log('\n👤 Step 2: Checking profiles table...');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, id')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile lookup error:', profileError.message);
  } else if (!profile) {
    console.log('⚠️  No profile found for this user');
  } else {
    console.log('✅ Profile found');
    console.log('   Tenant ID:', profile.tenant_id);
    console.log('   Profile ID:', profile.id);
  }

  const tenantId = profile?.tenant_id || authData.user.id;
  console.log('\n🔑 Using tenant_id:', tenantId);

  // Step 3: Check test data exists
  console.log('\n📊 Step 3: Checking test data...');

  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, tenant_id')
    .eq('tenant_id', tenantId)
    .ilike('first_name', '%sarah%');

  if (contactsError) {
    console.error('❌ Error checking contacts:', contactsError.message);
  } else {
    console.log(`✅ Found ${contacts?.length || 0} contacts with "sarah" in name`);
    if (contacts && contacts.length > 0) {
      contacts.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.first_name} ${c.last_name} (tenant: ${c.tenant_id})`);
      });
    }
  }

  // Step 4: Test RPC directly
  console.log('\n🔧 Step 4: Testing RPC function directly...');

  // Generate a simple test embedding (1536 dimensions of 0.1)
  const testEmbedding = Array(1536).fill(0.1);

  const { data: rpcResults, error: rpcError } = await supabase.rpc(
    'search_all_entities_hybrid',
    {
      p_query: 'sarah',
      p_query_embedding: testEmbedding,
      p_tenant_id: tenantId,
      p_entity_types: ['contact'],
      p_match_threshold: 0.0, // Lower threshold to catch more results
      p_match_count_per_type: 10,
    }
  );

  if (rpcError) {
    console.error('❌ RPC error:', rpcError.message);
    console.error('   Details:', JSON.stringify(rpcError, null, 2));
  } else {
    console.log(`✅ RPC returned ${rpcResults?.length || 0} results`);
    if (rpcResults && rpcResults.length > 0) {
      rpcResults.slice(0, 3).forEach((r: SearchResult, i: number) => {
        console.log(`   ${i + 1}. ${r.name} (${r.entity_type})`);
        console.log(`      Similarity: ${r.similarity}`);
        console.log(`      Text Rank: ${r.text_rank}`);
        console.log(`      RRF Score: ${r.rrf_score}`);
      });
    }
  }

  // Step 5: Test edge function
  console.log('\n🌐 Step 5: Testing edge function...');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({
          query: 'sarah',
          entityTypes: ['contact'],
          matchThreshold: 0.0,
          matchCountPerType: 10,
        }),
      }
    );

    if (!response.ok) {
      console.error(`❌ Edge function error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('   Response:', errorText);
    } else {
      const data = await response.json();
      console.log(`✅ Edge function returned ${data.count} results`);
      if (data.results && data.results.length > 0) {
        data.results.slice(0, 3).forEach((r: SearchResult, i: number) => {
          console.log(`   ${i + 1}. ${r.name} (${r.entity_type})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }

  // Step 6: Check if contacts have embeddings
  console.log('\n🔢 Step 6: Checking if contacts have embeddings...');

  const { data: embeddingCheck, error: embeddingError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, embedding')
    .eq('tenant_id', tenantId)
    .limit(5);

  if (embeddingError) {
    console.error('❌ Error checking embeddings:', embeddingError.message);
  } else {
    const withEmbeddings = embeddingCheck?.filter(c => c.embedding !== null).length || 0;
    const total = embeddingCheck?.length || 0;
    console.log(`✅ ${withEmbeddings}/${total} contacts have embeddings`);

    if (withEmbeddings === 0) {
      console.log('\n⚠️  WARNING: No contacts have embeddings!');
      console.log('   This is likely the root cause.');
      console.log('   Run: npm run index-entities to generate embeddings');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Debug complete\n');
}

testSearch().catch(console.error);
