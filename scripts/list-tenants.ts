import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTenants() {
  console.log('\n👥 Listing All Tenants\n');

  // List all tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: true });

  console.log('Tenants:');
  tenants?.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name || 'Unnamed'}`);
    console.log(`      ID: ${t.id}`);
    console.log(`      Slug: ${t.slug}`);
    console.log(`      Created: ${t.created_at}`);
    console.log('');
  });

  console.log(`Total tenants: ${tenants?.length || 0}\n`);

  // List all users
  const { data: users } = await supabase.auth.admin.listUsers();

  console.log('Users:');
  users?.users?.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.email}`);
    console.log(`      ID: ${u.id}`);
    console.log(`      Created: ${u.created_at}`);
    console.log('');
  });

  console.log(`Total users: ${users?.users?.length || 0}\n`);

  // Check data counts per tenant
  for (const tenant of tenants || []) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenant.id);

    const { data: properties } = await supabase
      .from('properties')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenant.id);

    console.log(`📊 ${tenant.name || 'Unnamed'} (${tenant.id}):`);
    console.log(`   Contacts: ${contacts?.length || 0}`);
    console.log(`   Properties: ${properties?.length || 0}`);
    console.log('');
  }
}

listTenants();
