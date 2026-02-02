import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTestData() {
  const tenantId = 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';

  console.log('\n📋 Listing Test Data\n');

  // List all properties
  const { data: properties } = await supabase
    .from('properties')
    .select('address, city, state, embedding')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  console.log('🏠 Properties:');
  properties?.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.address}, ${p.city}, ${p.state} - ${p.embedding ? '✅ Has embedding' : '❌ No embedding'}`);
  });

  // List all contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('first_name, last_name, company, embedding')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  console.log('\n📇 Contacts:');
  contacts?.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.first_name} ${c.last_name} - ${c.company || 'No company'} - ${c.embedding ? '✅ Has embedding' : '❌ No embedding'}`);
  });
}

listTestData();
