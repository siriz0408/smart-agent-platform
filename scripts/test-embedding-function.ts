import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEmbeddingFunction() {
  console.log('\n🧪 Testing embedding generation function...\n');

  // Test the SQL function directly
  const { data, error } = await supabase.rpc('generate_deterministic_embedding', {
    text_input: 'Test search text for embedding generation'
  });

  if (error) {
    console.error('❌ Error calling function:', error);
  } else {
    console.log('✅ Function executed successfully');
    console.log(`   Embedding length: ${Array.isArray(data) ? data.length : 'N/A'}`);
  }

  // Try manually updating a contact with the embedding
  console.log('\n🔧 Manually generating embedding for one contact...');

  const tenantId = 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';

  // Get first contact
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, search_text')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (contacts && contacts.length > 0) {
    const contact = contacts[0];
    console.log(`   Contact: ${contact.first_name} ${contact.last_name}`);

    // Generate embedding using the function
    const { data: embedding } = await supabase.rpc('generate_deterministic_embedding', {
      text_input: contact.search_text
    });

    if (embedding) {
      // Update the contact directly
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          embedding: embedding,
          embedding_indexed_at: new Date().toISOString()
        })
        .eq('id', contact.id);

      if (updateError) {
        console.error('   ❌ Error updating contact:', updateError);
      } else {
        console.log('   ✅ Successfully updated contact with embedding');
      }
    }
  }
}

testEmbeddingFunction();
