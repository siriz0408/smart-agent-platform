/**
 * Simple diagnostic script that checks the search issue without requiring login
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  console.log('   Set it in .env or run:');
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  process.exit(1);
}

async function diagnoseSearch() {
  console.log('\n🔍 Universal Search Diagnostic Report\n');
  console.log('='.repeat(70));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Step 1: Check user exists
  console.log('\n📧 Step 1: Checking user siriz04081@gmail.com...');

  const { data: userData, error: userError } = await supabase
    .from('auth.users')
    .select('id, email')
    .eq('email', 'siriz04081@gmail.com')
    .single();

  if (userError) {
    console.log('⚠️  Cannot query auth.users directly (expected)');
    console.log('   Checking profiles instead...');
  }

  // Step 2: Find user through profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, tenant_id, full_name')
    .limit(10);

  if (profileError) {
    console.error('❌ Error querying profiles:', profileError.message);
    return;
  }

  console.log(`✅ Found ${profiles?.length || 0} profiles total`);
  if (profiles && profiles.length > 0) {
    console.log('\n   Sample profiles:');
    profiles.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.full_name || 'No name'}`);
      console.log(`      User ID: ${p.user_id}`);
      console.log(`      Tenant ID: ${p.tenant_id}`);
    });
  }

  // Step 3: Check test data for known tenant
  console.log('\n\n📊 Step 2: Checking test data...');

  const knownTenantId = '5098bedb-a0bc-40ae-83fa-799df8f44981';
  console.log(`   Using known tenant_id: ${knownTenantId}`);

  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, tenant_id, embedding, search_text')
    .eq('tenant_id', knownTenantId);

  if (contactsError) {
    console.error('❌ Error querying contacts:', contactsError.message);
  } else {
    console.log(`✅ Found ${contacts?.length || 0} contacts for this tenant`);

    const withEmbeddings = contacts?.filter(c => c.embedding !== null).length || 0;
    console.log(`   ${withEmbeddings}/${contacts?.length || 0} have embeddings`);

    const sarahContacts = contacts?.filter(c =>
      c.first_name?.toLowerCase().includes('sarah')
    ) || [];

    console.log(`   ${sarahContacts.length} contacts contain "sarah"`);

    sarahContacts.forEach((c, i) => {
      console.log(`\n   Contact ${i + 1}:`);
      console.log(`      Name: ${c.first_name} ${c.last_name}`);
      console.log(`      Has embedding: ${c.embedding ? 'Yes' : 'No'}`);
      console.log(`      Search text: ${c.search_text?.substring(0, 50)}...`);
    });
  }

  // Step 4: Test RPC function
  console.log('\n\n🔧 Step 3: Testing RPC function directly...');

  const testEmbedding = Array(1536).fill(0.1);

  const { data: rpcResults, error: rpcError } = await supabase.rpc(
    'search_all_entities_hybrid',
    {
      p_query: 'sarah',
      p_query_embedding: testEmbedding,
      p_tenant_id: knownTenantId,
      p_entity_types: ['contact'],
      p_match_threshold: 0.0,
      p_match_count_per_type: 10,
    }
  );

  if (rpcError) {
    console.error('❌ RPC error:', rpcError.message);
    console.error('   Code:', rpcError.code);
    console.error('   Details:', rpcError.details);
    console.error('   Hint:', rpcError.hint);
  } else {
    console.log(`✅ RPC returned ${rpcResults?.length || 0} results`);

    if (rpcResults && rpcResults.length > 0) {
      console.log('\n   Top results:');
      rpcResults.slice(0, 5).forEach((r: SearchResult, i: number) => {
        console.log(`\n   ${i + 1}. ${r.name} (${r.entity_type})`);
        console.log(`      Similarity: ${r.similarity}`);
        console.log(`      Text Rank: ${r.text_rank}`);
        console.log(`      RRF Score: ${r.rrf_score}`);
      });
    } else {
      console.log('\n   ⚠️  No results returned!');
      console.log('   Possible causes:');
      console.log('   1. No embeddings on contacts');
      console.log('   2. RPC function logic issue');
      console.log('   3. Match threshold too high');
    }
  }

  // Step 5: Check if RPC function exists
  console.log('\n\n🔍 Step 4: Checking if RPC function exists...');

  const { data: functions, error: functionsError } = await supabase
    .rpc('search_all_entities_hybrid', {
      p_query: 'test',
      p_query_embedding: testEmbedding,
      p_tenant_id: knownTenantId,
      p_entity_types: ['contact'],
      p_match_threshold: 0.0,
      p_match_count_per_type: 1,
    });

  if (functionsError) {
    if (functionsError.message.includes('does not exist')) {
      console.error('❌ RPC function does not exist!');
      console.log('   Run migrations: npm run db:migrate');
    } else {
      console.log('✅ RPC function exists (returned an error, but function is present)');
    }
  } else {
    console.log('✅ RPC function exists and works');
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 Diagnostic complete\n');
}

diagnoseSearch().catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
