import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSearchText() {
  const tenantId = 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';

  console.log('\n🔍 Checking search_text column population...\n');

  // Check contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('first_name, last_name, search_text, embedding')
    .eq('tenant_id', tenantId)
    .limit(3);

  console.log('📇 Contacts:');
  contacts?.forEach((c) => {
    console.log(`   ${c.first_name} ${c.last_name}:`);
    console.log(`      search_text: ${c.search_text ? 'EXISTS' : 'NULL'} (${c.search_text?.substring(0, 50)}...)`);
    console.log(`      embedding: ${c.embedding ? 'EXISTS' : 'NULL'}`);
  });

  // Check properties
  const { data: properties } = await supabase
    .from('properties')
    .select('address, search_text, embedding')
    .eq('tenant_id', tenantId)
    .limit(3);

  console.log('\n🏠 Properties:');
  properties?.forEach((p) => {
    console.log(`   ${p.address}:`);
    console.log(`      search_text: ${p.search_text ? 'EXISTS' : 'NULL'} (${p.search_text?.substring(0, 50)}...)`);
    console.log(`      embedding: ${p.embedding ? 'EXISTS' : 'NULL'}`);
  });
}

checkSearchText();
