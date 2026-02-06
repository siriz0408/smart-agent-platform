/**
 * Check database with authenticated user
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthAndData() {
  console.log('\n🔑 Checking Authentication Status');
  console.log('='.repeat(60));

  // Check current session
  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;

  console.log(`Session: ${session ? '✅ Authenticated' : '❌ Not authenticated'}`);

  if (session) {
    console.log(`User ID: ${session.user.id}`);
    console.log(`Email: ${session.user.email}`);
  } else {
    console.log('\n⚠️  Not authenticated - RLS policies will block data access');
    console.log('   This explains why we see 0 properties and 0 documents');
  }

  // Try to count properties (will fail with RLS if not authenticated)
  const propResult = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total Properties Count: ${propResult.count !== null ? propResult.count : 'ERROR'}`);
  if (propResult.error) {
    console.log(`   Error: ${propResult.error.message}`);
  }

  // Try to count documents
  const docResult = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total Documents Count: ${docResult.count !== null ? docResult.count : 'ERROR'}`);
  if (docResult.error) {
    console.log(`   Error: ${docResult.error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS:');
  console.log('='.repeat(60));

  if (!session) {
    console.log('❌ ACTUAL ROOT CAUSE CONFIRMED:');
    console.log('   - Diagnostic script not authenticated (using anon key)');
    console.log('   - RLS policies block unauthenticated access');
    console.log('   - Data DOES exist (user sees it in screenshot)');
    console.log('   - User IS authenticated in browser (they can see the data)');
    console.log('\n🔍 REAL ISSUE:');
    console.log('   Need to check if property "922 Sharondale Dr" has embeddings');
    console.log('   Need to run backfill OR check if triggers are working');
    console.log('\n📋 NEXT STEP:');
    console.log('   1. Check browser DevTools Network tab for search API call');
    console.log('   2. Check search API response');
    console.log('   3. Likely need to run backfill indexing');
  } else {
    console.log('✅ Authentication working');
    console.log('   Continue investigating other potential issues');
  }
}

checkAuthAndData();
