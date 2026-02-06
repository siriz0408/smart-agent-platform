/**
 * PM-Discovery: Quick Search Verification
 * Tests universal-search with common queries
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');

const TEST_QUERIES = [
  'sarah',
  'johnson', 
  '922',
  'sharondale',
  'denver',
  'inspection',
  'contract',
];

async function testSearch() {
  console.log('🔍 PM-Discovery: Testing Search\n');
  
  // Try to authenticate
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || '';
  
  if (!password) {
    console.log('⚠️  No TEST_USER_PASSWORD set. Testing API structure only.\n');
    console.log('To test with real data, set:');
    console.log('  export TEST_USER_EMAIL=your@email.com');
    console.log('  export TEST_USER_PASSWORD=yourpassword\n');
    return;
  }

  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !auth.session) {
    console.error('❌ Auth failed:', error?.message);
    return;
  }

  console.log(`✅ Authenticated as ${auth.user.email}\n`);

  let successCount = 0;
  const token = auth.session.access_token;

  for (const query of TEST_QUERIES) {
    try {
      const start = Date.now();
      const res = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, entityTypes: ['document', 'contact', 'property', 'deal'] }),
      });

      const data = await res.json();
      const latency = Date.now() - start;
      const count = data.results?.length || 0;
      
      if (res.ok && count > 0) {
        console.log(`✅ "${query}": ${count} results (${latency}ms)`);
        successCount++;
      } else {
        console.log(`⚠️  "${query}": ${count} results (${res.status})`);
      }
    } catch (err) {
      console.log(`❌ "${query}": ${err instanceof Error ? err.message : 'Error'}`);
    }
  }

  console.log(`\n📊 Success Rate: ${successCount}/${TEST_QUERIES.length} (${(successCount/TEST_QUERIES.length*100).toFixed(0)}%)`);
}

testSearch();
