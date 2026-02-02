import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserData() {
  const tenantId = '5098bedb-a0bc-40ae-83fa-799df8f44981'; // siriz04081@gmail.com

  console.log('\n✅ Verifying Data for siriz04081@gmail.com\n');

  // List all contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('first_name, last_name, company, embedding, embedding_indexed_at')
    .eq('tenant_id', tenantId);

  console.log('📇 Contacts:');
  contacts?.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.first_name} ${c.last_name} - ${c.company || 'No company'}`);
    console.log(`      Embedding: ${c.embedding ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`      Indexed: ${c.embedding_indexed_at || 'N/A'}`);
  });

  // List all properties
  const { data: properties } = await supabase
    .from('properties')
    .select('address, city, state, embedding, embedding_indexed_at')
    .eq('tenant_id', tenantId);

  console.log('\n🏠 Properties:');
  properties?.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.address}, ${p.city}, ${p.state}`);
    console.log(`      Embedding: ${p.embedding ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`      Indexed: ${p.embedding_indexed_at || 'N/A'}`);
  });

  const contactsWithEmbeddings = contacts?.filter(c => c.embedding).length || 0;
  const propertiesWithEmbeddings = properties?.filter(p => p.embedding).length || 0;

  console.log('\n📊 Summary:');
  console.log(`   Contacts: ${contactsWithEmbeddings}/${contacts?.length || 0} with embeddings`);
  console.log(`   Properties: ${propertiesWithEmbeddings}/${properties?.length || 0} with embeddings`);

  // Force update if any missing
  if (propertiesWithEmbeddings < (properties?.length || 0)) {
    console.log('\n🔄 Forcing embedding update for properties...');
    await supabase
      .from('properties')
      .update({ updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { data: updatedProps } = await supabase
      .from('properties')
      .select('address, embedding')
      .eq('tenant_id', tenantId);

    const nowWithEmbeddings = updatedProps?.filter(p => p.embedding).length || 0;
    console.log(`   ✅ Now ${nowWithEmbeddings}/${updatedProps?.length || 0} properties have embeddings`);
  }

  console.log('\n✅ Verification complete!\n');
}

verifyUserData();
