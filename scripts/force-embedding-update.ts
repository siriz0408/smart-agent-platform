import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceEmbeddingUpdate() {
  console.log('\n🔄 Forcing embedding update for existing records...\n');

  const tenantId = 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';

  // Update contacts to trigger embeddings
  const { error: contactsError } = await supabase
    .from('contacts')
    .update({ updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId);

  if (contactsError) {
    console.error('❌ Error updating contacts:', contactsError);
  } else {
    console.log('✅ Updated contacts to trigger embeddings');
  }

  // Update properties to trigger embeddings
  const { error: propertiesError } = await supabase
    .from('properties')
    .update({ updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId);

  if (propertiesError) {
    console.error('❌ Error updating properties:', propertiesError);
  } else {
    console.log('✅ Updated properties to trigger embeddings');
  }

  // Wait for triggers to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check results
  const { data: contacts } = await supabase
    .from('contacts')
    .select('first_name, last_name, embedding')
    .eq('tenant_id', tenantId);

  const { data: properties } = await supabase
    .from('properties')
    .select('address, embedding')
    .eq('tenant_id', tenantId);

  console.log(`\n📊 Results:`);
  console.log(`   Contacts with embeddings: ${contacts?.filter((c) => c.embedding).length || 0}/${contacts?.length || 0}`);
  console.log(`   Properties with embeddings: ${properties?.filter((p) => p.embedding).length || 0}/${properties?.length || 0}`);
}

forceEmbeddingUpdate();
