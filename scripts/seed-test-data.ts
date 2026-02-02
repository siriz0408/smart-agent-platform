/**
 * Seed test data for search functionality testing
 * Creates contacts, properties, and deals with searchable content
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key to bypass RLS for seeding
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getOrCreateTestTenant() {
  console.log('\n📋 Getting or creating test tenant...');

  // Try to find existing user
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    throw listError;
  }

  // Find or create test user
  let testUser = users.users.find((u) => u.email === 'test-search@smartagent.test');

  if (!testUser) {
    console.log('Creating new test user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'test-search@smartagent.test',
      password: 'TestSearch123!',
      email_confirm: true,
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      throw createError;
    }

    testUser = newUser.user;
    console.log('✅ Created test user:', testUser.id);

    // Create tenant record
    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: testUser.id,
        name: 'Test Search Tenant',
        slug: 'test-search-tenant'
      });

    if (tenantError) {
      console.error('❌ Error creating tenant:', tenantError);
      throw tenantError;
    }

    console.log('✅ Created tenant record');
  } else {
    console.log('✅ Found existing test user:', testUser.id);
  }

  // Ensure tenant record exists
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', testUser.id)
    .single();

  if (!existingTenant) {
    console.log('Creating missing tenant record...');
    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: testUser.id,
        name: 'Test Search Tenant',
        slug: 'test-search-tenant'
      });

    if (tenantError) {
      console.error('❌ Error creating tenant:', tenantError);
      throw tenantError;
    }
    console.log('✅ Created tenant record');
  }

  return testUser.id;
}

async function seedContacts(tenantId: string) {
  console.log('\n📇 Seeding test contacts...');

  const contacts = [
    {
      first_name: 'John',
      last_name: 'Denver',
      email: 'john.denver@realestate.com',
      phone: '555-0101',
      company: 'Denver Real Estate Partners',
      contact_type: 'buyer',
      notes: 'Looking for properties in Denver metro area. Budget: $500k-750k',
      tenant_id: tenantId,
    },
    {
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.j@example.com',
      phone: '555-0102',
      company: 'Johnson Properties LLC',
      contact_type: 'seller',
      notes: 'Selling investment property at 922 Sharondale Dr',
      tenant_id: tenantId,
    },
    {
      first_name: 'Michael',
      last_name: 'Smith',
      email: 'michael.smith@gmail.com',
      phone: '555-0103',
      contact_type: 'buyer',
      notes: 'First-time homebuyer, interested in Amherst area',
      tenant_id: tenantId,
    },
    {
      first_name: 'Emily',
      last_name: 'Brown',
      email: 'emily.brown@email.com',
      phone: '555-0104',
      company: 'Brown Realty Group',
      contact_type: 'agent',
      notes: 'Real estate agent specializing in Ohio properties',
      tenant_id: tenantId,
    },
  ];

  const { data, error } = await supabase.from('contacts').insert(contacts).select();

  if (error) {
    console.error('❌ Error seeding contacts:', error);
    throw error;
  }

  console.log(`✅ Created ${data?.length || 0} contacts`);
  return data;
}

async function seedProperties(tenantId: string) {
  console.log('\n🏠 Seeding test properties...');

  const properties = [
    {
      address: '922 Sharondale Dr',
      city: 'Amherst',
      state: 'OH',
      zip_code: '44001',
      price: 240000,
      bedrooms: 3,
      bathrooms: 3,
      square_feet: 2000,
      property_type: 'single_family',
      status: 'active',
      description: 'Beautiful single family home in Amherst. Features 3 bedrooms, 3 bathrooms, and attached garage.',
      tenant_id: tenantId,
    },
    {
      address: '1234 Denver Street',
      city: 'Denver',
      state: 'CO',
      zip_code: '80202',
      price: 675000,
      bedrooms: 4,
      bathrooms: 3,
      square_feet: 2800,
      property_type: 'single_family',
      status: 'active',
      description: 'Spacious home in Denver metro area with mountain views. Perfect for families.',
      tenant_id: tenantId,
    },
    {
      address: '456 Main Street',
      city: 'Amherst',
      state: 'OH',
      zip_code: '44001',
      price: 189000,
      bedrooms: 2,
      bathrooms: 2,
      square_feet: 1500,
      property_type: 'condo',
      status: 'pending',
      description: 'Modern condo in downtown Amherst. Low maintenance living.',
      tenant_id: tenantId,
    },
  ];

  const { data, error } = await supabase.from('properties').insert(properties).select();

  if (error) {
    console.error('❌ Error seeding properties:', error);
    throw error;
  }

  console.log(`✅ Created ${data?.length || 0} properties`);
  return data;
}

async function seedDeals(tenantId: string, properties: any[], contacts: any[]) {
  console.log('\n💼 Seeding test deals...');

  if (!properties || properties.length === 0 || !contacts || contacts.length === 0) {
    console.log('⚠️  Skipping deals - no properties or contacts available');
    return [];
  }

  const deals = [
    {
      property_id: properties[0].id,
      contact_id: contacts[0].id,
      deal_type: 'buyer',
      stage: 'offer',
      estimated_value: 240000,
      notes: 'Client interested in 922 Sharondale Dr property. Needs inspection.',
      tenant_id: tenantId,
      search_text: `922 Sharondale Dr Amherst OH buyer offer ${contacts[0].first_name} ${contacts[0].last_name}`,
    },
    {
      property_id: properties[1].id,
      contact_id: contacts[1].id,
      deal_type: 'seller',
      stage: 'showing',
      estimated_value: 675000,
      notes: 'Denver property listing. Multiple interested buyers.',
      tenant_id: tenantId,
      search_text: `1234 Denver Street Denver CO seller showing ${contacts[1].first_name} ${contacts[1].last_name}`,
    },
  ];

  const { data, error } = await supabase.from('deals').insert(deals).select();

  if (error) {
    console.error('❌ Error seeding deals:', error);
    throw error;
  }

  console.log(`✅ Created ${data?.length || 0} deals`);
  return data;
}

async function verifyEmbeddings() {
  console.log('\n🔍 Verifying embeddings were generated...');

  // Wait a moment for triggers to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('first_name, last_name, embedding, embedding_indexed_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (contactsError) {
    console.error('❌ Error checking contacts:', contactsError);
  } else {
    console.log(`\n📇 Contacts with embeddings: ${contacts?.filter((c) => c.embedding).length || 0}/${contacts?.length || 0}`);
    contacts?.forEach((c) => {
      const status = c.embedding ? '✅' : '❌';
      console.log(`   ${status} ${c.first_name} ${c.last_name} - ${c.embedding_indexed_at || 'Not indexed'}`);
    });
  }

  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('address, embedding, embedding_indexed_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (propertiesError) {
    console.error('❌ Error checking properties:', propertiesError);
  } else {
    console.log(`\n🏠 Properties with embeddings: ${properties?.filter((p) => p.embedding).length || 0}/${properties?.length || 0}`);
    properties?.forEach((p) => {
      const status = p.embedding ? '✅' : '❌';
      console.log(`   ${status} ${p.address} - ${p.embedding_indexed_at || 'Not indexed'}`);
    });
  }

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, search_text, embedding, embedding_indexed_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (dealsError) {
    console.error('❌ Error checking deals:', dealsError);
  } else {
    console.log(`\n💼 Deals with embeddings: ${deals?.filter((d) => d.embedding).length || 0}/${deals?.length || 0}`);
    deals?.forEach((d) => {
      const status = d.embedding ? '✅' : '❌';
      console.log(`   ${status} Deal ${d.id} - ${d.embedding_indexed_at || 'Not indexed'}`);
    });
  }
}

async function main() {
  console.log('\n🌱 SEEDING TEST DATA FOR SEARCH');
  console.log('='.repeat(60));

  try {
    const tenantId = await getOrCreateTestTenant();

    const contacts = await seedContacts(tenantId);
    const properties = await seedProperties(tenantId);
    const deals = await seedDeals(tenantId, properties, contacts);

    await verifyEmbeddings();

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST DATA SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log('\nTest Data Summary:');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Contacts: ${contacts?.length || 0}`);
    console.log(`   Properties: ${properties?.length || 0}`);
    console.log(`   Deals: ${deals?.length || 0}`);
    console.log('\nNext Steps:');
    console.log('   1. Run: npm run test -- src/test/global-search.test.tsx');
    console.log('   2. Or manually test search in UI');
    console.log('   3. Search for: "Denver", "922", "Amherst", "John"');
    console.log('\nTest Credentials:');
    console.log('   Email: test-search@smartagent.test');
    console.log('   Password: TestSearch123!');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
