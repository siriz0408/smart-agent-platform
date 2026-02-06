/**
 * Check Entity Embeddings Status
 * 
 * Reports how many contacts, properties, and deals need embeddings
 * Used to determine if backfill is needed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('\nPlease set it:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('\nOr run with:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-key npm run check:embeddings');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface EmbeddingStatus {
  entityType: string;
  total: number;
  withEmbedding: number;
  withoutEmbedding: number;
  percentage: number;
}

async function checkEmbeddings(): Promise<void> {
  console.log('🔍 Checking entity embedding status...\n');

  const statuses: EmbeddingStatus[] = [];

  // Check contacts
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  const { count: contactsWithEmbedding } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const contactsWithoutEmbedding = (totalContacts || 0) - (contactsWithEmbedding || 0);
  const contactsPercentage = totalContacts ? ((contactsWithEmbedding || 0) / totalContacts) * 100 : 0;

  statuses.push({
    entityType: 'contacts',
    total: totalContacts || 0,
    withEmbedding: contactsWithEmbedding || 0,
    withoutEmbedding: contactsWithoutEmbedding,
    percentage: contactsPercentage,
  });

  // Check properties
  const { count: totalProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  const { count: propertiesWithEmbedding } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const propertiesWithoutEmbedding = (totalProperties || 0) - (propertiesWithEmbedding || 0);
  const propertiesPercentage = totalProperties ? ((propertiesWithEmbedding || 0) / totalProperties) * 100 : 0;

  statuses.push({
    entityType: 'properties',
    total: totalProperties || 0,
    withEmbedding: propertiesWithEmbedding || 0,
    withoutEmbedding: propertiesWithoutEmbedding,
    percentage: propertiesPercentage,
  });

  // Check deals
  const { count: totalDeals } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true });

  const { count: dealsWithEmbedding } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const dealsWithoutEmbedding = (totalDeals || 0) - (dealsWithEmbedding || 0);
  const dealsPercentage = totalDeals ? ((dealsWithEmbedding || 0) / totalDeals) * 100 : 0;

  statuses.push({
    entityType: 'deals',
    total: totalDeals || 0,
    withEmbedding: dealsWithEmbedding || 0,
    withoutEmbedding: dealsWithoutEmbedding,
    percentage: dealsPercentage,
  });

  // Display results
  console.log('📊 Embedding Status:\n');
  console.log('┌─────────────┬────────┬──────────────┬─────────────────┬────────────┐');
  console.log('│ Entity Type │ Total  │ With Embedding│ Without Embedding│ Percentage │');
  console.log('├─────────────┼────────┼──────────────┼─────────────────┼────────────┤');

  for (const status of statuses) {
    const icon = status.percentage === 100 ? '✅' : status.percentage > 0 ? '🟡' : '❌';
    console.log(
      `│ ${status.entityType.padEnd(11)} │ ${String(status.total).padStart(6)} │ ${String(status.withEmbedding).padStart(12)} │ ${String(status.withoutEmbedding).padStart(15)} │ ${icon} ${String(status.percentage.toFixed(1)).padStart(5)}% │`
    );
  }

  console.log('└─────────────┴────────┴──────────────┴─────────────────┴────────────┘\n');

  // Summary
  const totalWithoutEmbedding = statuses.reduce((sum, s) => sum + s.withoutEmbedding, 0);
  const totalEntities = statuses.reduce((sum, s) => sum + s.total, 0);
  const overallPercentage = totalEntities ? ((totalEntities - totalWithoutEmbedding) / totalEntities) * 100 : 0;

  console.log(`📈 Overall: ${totalEntities - totalWithoutEmbedding}/${totalEntities} entities have embeddings (${overallPercentage.toFixed(1)}%)`);

  if (totalWithoutEmbedding > 0) {
    console.log(`\n⚠️  ${totalWithoutEmbedding} entities need embeddings`);
    console.log('   Run: npm run index:entities to backfill\n');
    process.exit(1); // Exit with error code to indicate backfill needed
  } else {
    console.log('\n✅ All entities have embeddings!\n');
    process.exit(0);
  }
}

checkEmbeddings().catch((error) => {
  console.error('❌ Error checking embeddings:', error);
  process.exit(1);
});
