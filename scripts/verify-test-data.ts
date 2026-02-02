import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTestData() {
  const tenantId = 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';

  console.log('\n✅ Verifying Test Data and Embeddings\n');
  console.log('='.repeat(60));

  // Check for 922 property
  const { data: property922 } = await supabase
    .from('properties')
    .select('address, city, embedding, embedding_indexed_at')
    .eq('tenant_id', tenantId)
    .ilike('address', '%922%')
    .single();

  if (property922) {
    console.log('\n🏠 Property "922 Sharondale Dr":');
    console.log(`   ✅ Exists: ${property922.address}, ${property922.city}`);
    console.log(`   ✅ Has embedding: ${property922.embedding ? 'YES' : 'NO'}`);
    console.log(`   ✅ Indexed at: ${property922.embedding_indexed_at || 'N/A'}`);
  } else {
    console.log('\n❌ Property "922 Sharondale Dr" not found');
  }

  // Check for Denver contact
  const { data: denverContact } = await supabase
    .from('contacts')
    .select('first_name, last_name, company, embedding, embedding_indexed_at')
    .eq('tenant_id', tenantId)
    .ilike('first_name', '%Denver%')
    .single();

  if (denverContact) {
    console.log('\n📇 Contact "John Denver":');
    console.log(`   ✅ Exists: ${denverContact.first_name} ${denverContact.last_name}`);
    console.log(`   ✅ Company: ${denverContact.company}`);
    console.log(`   ✅ Has embedding: ${denverContact.embedding ? 'YES' : 'NO'}`);
    console.log(`   ✅ Indexed at: ${denverContact.embedding_indexed_at || 'N/A'}`);
  } else {
    console.log('\n❌ Contact "John Denver" not found');
  }

  // Summary counts
  const { data: contactCount } = await supabase
    .from('contacts')
    .select('id, embedding', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const { data: propertyCount } = await supabase
    .from('properties')
    .select('id, embedding', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const contactsWithEmbeddings = contactCount?.filter(c => c.embedding).length || 0;
  const propertiesWithEmbeddings = propertyCount?.filter(p => p.embedding).length || 0;

  console.log('\n📊 Summary:');
  console.log(`   Contacts: ${contactsWithEmbeddings}/${contactCount?.length || 0} with embeddings`);
  console.log(`   Properties: ${propertiesWithEmbeddings}/${propertyCount?.length || 0} with embeddings`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test data verification complete!\n');
}

verifyTestData();
