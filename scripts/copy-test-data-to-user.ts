import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function copyTestDataToUser() {
  console.log('\n📋 Copying Test Data to siriz04081@gmail.com\n');

  // Source: test tenant
  const sourceTenantId = 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';

  // Target: siriz04081@gmail.com tenant
  const targetTenantId = '5098bedb-a0bc-40ae-83fa-799df8f44981';

  console.log(`Source: Test Search Tenant (${sourceTenantId})`);
  console.log(`Target: siriz04081@gmail.com (${targetTenantId})\n`);

  // Get contacts from test tenant
  const { data: sourceContacts } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, phone, company, contact_type, notes')
    .eq('tenant_id', sourceTenantId)
    .limit(4); // Get unique 4 (John, Sarah, Michael, Emily)

  // Remove duplicates by email
  const uniqueContacts = sourceContacts?.filter((contact, index, self) =>
    index === self.findIndex((c) => c.email === contact.email)
  );

  console.log(`📇 Copying ${uniqueContacts?.length || 0} unique contacts...`);

  if (uniqueContacts && uniqueContacts.length > 0) {
    const contactsToInsert = uniqueContacts.map(c => ({
      ...c,
      tenant_id: targetTenantId
    }));

    const { data: newContacts, error: contactsError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select();

    if (contactsError) {
      console.error('   ❌ Error copying contacts:', contactsError);
    } else {
      console.log(`   ✅ Copied ${newContacts?.length || 0} contacts`);
      newContacts?.forEach(c => {
        console.log(`      • ${c.first_name} ${c.last_name}`);
      });
    }
  }

  // Get properties from test tenant
  const { data: sourceProperties } = await supabase
    .from('properties')
    .select('address, city, state, zip_code, price, bedrooms, bathrooms, square_feet, property_type, status, description')
    .eq('tenant_id', sourceTenantId)
    .limit(3);

  // Remove duplicates by address
  const uniqueProperties = sourceProperties?.filter((property, index, self) =>
    index === self.findIndex((p) => p.address === property.address)
  );

  console.log(`\n🏠 Copying ${uniqueProperties?.length || 0} unique properties...`);

  if (uniqueProperties && uniqueProperties.length > 0) {
    const propertiesToInsert = uniqueProperties.map(p => ({
      ...p,
      tenant_id: targetTenantId
    }));

    const { data: newProperties, error: propertiesError } = await supabase
      .from('properties')
      .insert(propertiesToInsert)
      .select();

    if (propertiesError) {
      console.error('   ❌ Error copying properties:', propertiesError);
    } else {
      console.log(`   ✅ Copied ${newProperties?.length || 0} properties`);
      newProperties?.forEach(p => {
        console.log(`      • ${p.address}, ${p.city}, ${p.state}`);
      });
    }
  }

  // Wait for triggers to generate embeddings
  console.log('\n⏳ Waiting for embeddings to generate...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify embeddings
  const { data: contacts } = await supabase
    .from('contacts')
    .select('first_name, last_name, embedding')
    .eq('tenant_id', targetTenantId);

  const { data: properties } = await supabase
    .from('properties')
    .select('address, embedding')
    .eq('tenant_id', targetTenantId);

  console.log('\n📊 Final Count for siriz04081@gmail.com:');
  console.log(`   Contacts: ${contacts?.length || 0} (${contacts?.filter(c => c.embedding).length || 0} with embeddings)`);
  console.log(`   Properties: ${properties?.length || 0} (${properties?.filter(p => p.embedding).length || 0} with embeddings)`);

  console.log('\n✅ Data copy complete!\n');
  console.log('🧪 Test search in production:');
  console.log('   1. Login to https://smart-agent-platform.vercel.app');
  console.log('   2. Use email: siriz04081@gmail.com');
  console.log('   3. Search for "922" or "Denver" in the global search bar\n');
}

copyTestDataToUser();
