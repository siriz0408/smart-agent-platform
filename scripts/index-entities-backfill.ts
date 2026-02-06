/**
 * Index Entities Backfill
 * 
 * Backfills embeddings for contacts, properties, and deals that don't have them
 * Calls the index-entities edge function in batches
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.error('\nPlease set it:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('\nOr run with:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-key npm run index:entities');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface IndexResult {
  entityType: string;
  indexed: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

interface IndexResponse {
  success: boolean;
  results: IndexResult[];
  summary: {
    totalIndexed: number;
    totalSkipped: number;
    totalErrors: number;
    totalDuration_ms: number;
  };
}

async function backfillEmbeddings(entityType: 'contact' | 'property' | 'deal' | 'all' = 'all', batchSize: number = 100): Promise<void> {
  console.log(`🚀 Starting entity embedding backfill (${entityType}, batch size: ${batchSize})...\n`);

  const functionUrl = `${supabaseUrl}/functions/v1/index-entities`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType,
        batchSize,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result: IndexResponse = await response.json();

    // Display results
    console.log('📊 Backfill Results:\n');
    console.log('┌─────────────┬──────────┬──────────┬────────┬──────────────┐');
    console.log('│ Entity Type │ Indexed  │ Skipped  │ Errors │ Duration (ms) │');
    console.log('├─────────────┼──────────┼──────────┼────────┼──────────────┤');

    for (const res of result.results) {
      const icon = res.errors === 0 ? '✅' : '⚠️';
      console.log(
        `│ ${res.entityType.padEnd(11)} │ ${String(res.indexed).padStart(8)} │ ${String(res.skipped).padStart(8)} │ ${String(res.errors).padStart(6)} │ ${String(res.duration_ms).padStart(12)} │`
      );
    }

    console.log('└─────────────┴──────────┴──────────┴────────┴──────────────┘\n');

    // Summary
    console.log(`📈 Summary:`);
    console.log(`   Total indexed: ${result.summary.totalIndexed}`);
    console.log(`   Total skipped: ${result.summary.totalSkipped}`);
    console.log(`   Total errors: ${result.summary.totalErrors}`);
    console.log(`   Total duration: ${(result.summary.totalDuration_ms / 1000).toFixed(2)}s\n`);

    if (result.success && result.summary.totalErrors === 0) {
      console.log('✅ Backfill completed successfully!\n');
      
      // If there are more entities to process, suggest running again
      if (result.summary.totalIndexed === batchSize) {
        console.log('⚠️  Note: Batch size limit reached. Run again to process more entities.\n');
      }
    } else {
      console.log('⚠️  Backfill completed with errors. Check logs above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error running backfill:', error);
    console.error('\nMake sure:');
    console.error('  1. The index-entities edge function is deployed');
    console.error('  2. SUPABASE_SERVICE_ROLE_KEY is correct');
    console.error('  3. You have network access to Supabase\n');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let entityType: 'contact' | 'property' | 'deal' | 'all' = 'all';
let batchSize = 100;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    const type = args[i + 1].toLowerCase();
    if (['contact', 'property', 'deal', 'all'].includes(type)) {
      entityType = type as 'contact' | 'property' | 'deal' | 'all';
    } else {
      console.error(`❌ Invalid entity type: ${type}. Must be: contact, property, deal, or all`);
      process.exit(1);
    }
    i++;
  } else if (args[i] === '--batch-size' && args[i + 1]) {
    batchSize = parseInt(args[i + 1], 10);
    if (isNaN(batchSize) || batchSize < 1) {
      console.error(`❌ Invalid batch size: ${args[i + 1]}. Must be a positive number`);
      process.exit(1);
    }
    i++;
  }
}

backfillEmbeddings(entityType, batchSize).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
