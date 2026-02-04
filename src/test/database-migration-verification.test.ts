/**
 * Database Migration Verification Tests
 *
 * Tests that verify database optimizations were applied correctly.
 * These tests require a Supabase instance with migrations applied.
 *
 * Run after: supabase db push
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// These will be set from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'test-key';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const supabase = createClient(supabaseUrl, supabaseKey);
const describeWithEnv = hasSupabaseEnv ? describe : describe.skip;

describeWithEnv('Database Migration Verification', () => {
  describe('Sprint 1: Critical Performance Indexes', () => {
    test('document_chunks composite index exists', async () => {
      const { data, error } = await supabase.rpc('check_index_exists', {
        p_table_name: 'document_chunks',
        p_index_name: 'idx_document_chunks_doc_idx'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('usage_records performance indexes exist', async () => {
      const { data, error } = await supabase.rpc('check_multiple_indexes_exist', {
        p_table_name: 'usage_records',
        p_index_names: ['idx_usage_records_tenant_type_date', 'idx_usage_records_ai_recent']
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('tenant_id indexes exist on core tables', async () => {
      const tables = ['contacts', 'properties', 'deals', 'documents', 'ai_conversations'];

      for (const table of tables) {
        const { data, error } = await supabase.rpc('check_index_exists', {
          p_table_name: table,
          p_index_name: `idx_${table}_tenant_id`
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });

    test('document_chunks has tenant_id column', async () => {
      const { data, error } = await supabase.rpc('check_column_exists', {
        p_table_name: 'document_chunks',
        p_column_name: 'tenant_id'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('document_chunks tenant_id is NOT NULL', async () => {
      const { data, error } = await supabase.rpc('check_column_not_null', {
        p_table_name: 'document_chunks',
        p_column_name: 'tenant_id'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('document_chunks has no NULL tenant_ids', async () => {
      const { count, error } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true })
        .is('tenant_id', null);

      expect(error).toBeNull();
      expect(count).toBe(0);
    });

    test('RLS policy on document_chunks uses direct tenant_id check', async () => {
      const { data, error } = await supabase.rpc('get_policy_definition', {
        p_table_name: 'document_chunks',
        p_policy_name: 'Users can view chunks in their tenant'
      });

      expect(error).toBeNull();
      expect(data).toContain('tenant_id');
      expect(data).not.toContain('IN (SELECT'); // Should not have subquery
    });
  });

  describe('Sprint 2: Partial and GIN Indexes', () => {
    test('partial indexes exist for active records', async () => {
      const partialIndexes = [
        { table: 'contacts', index: 'idx_contacts_active' },
        { table: 'properties', index: 'idx_properties_active' },
        { table: 'notifications', index: 'idx_notifications_unread' }
      ];

      for (const { table, index } of partialIndexes) {
        const { data, error } = await supabase.rpc('check_index_exists', {
          p_table_name: table,
          p_index_name: index
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });

    test('GIN indexes exist for JSONB columns', async () => {
      const ginIndexes = [
        { table: 'contacts', index: 'idx_contacts_custom_fields_gin' },
        { table: 'contacts', index: 'idx_contacts_tags_gin' },
        { table: 'properties', index: 'idx_properties_features_gin' }
      ];

      for (const { table, index } of ginIndexes) {
        const { data, error } = await supabase.rpc('check_index_exists', {
          p_table_name: table,
          p_index_name: index
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });

    test('composite indexes exist for common query patterns', async () => {
      const compositeIndexes = [
        { table: 'documents', index: 'idx_documents_tenant_created' },
        { table: 'contacts', index: 'idx_contacts_tenant_type_updated' },
        { table: 'ai_conversations', index: 'idx_ai_conversations_user_updated' }
      ];

      for (const { table, index } of compositeIndexes) {
        const { data, error } = await supabase.rpc('check_index_exists', {
          p_table_name: table,
          p_index_name: index
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });
  });

  describe('Sprint 3: Monitoring and Maintenance', () => {
    test('monitoring views exist', async () => {
      const views = ['slow_queries', 'unused_indexes', 'table_maintenance_status', 'index_health'];

      for (const view of views) {
        const { data, error } = await supabase.rpc('check_view_exists', {
          p_view_name: view
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });

    test('can query slow_queries view', async () => {
      const { data, error } = await supabase
        .from('slow_queries')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('archival functions exist', async () => {
      const { data, error } = await supabase.rpc('check_function_exists', {
        p_function_name: 'archive_old_usage_records'
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('NOT NULL constraints applied', async () => {
      const constraints = [
        { table: 'document_chunks', column: 'document_id' },
        { table: 'ai_messages', column: 'conversation_id' },
        { table: 'deal_milestones', column: 'deal_id' },
        { table: 'contact_agents', column: 'contact_id' }
      ];

      for (const { table, column } of constraints) {
        const { data, error } = await supabase.rpc('check_column_not_null', {
          p_table_name: table,
          p_column_name: column
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });
  });

  describe('Performance Validation', () => {
    test('tenant-filtered query uses index (no seq scan)', async () => {
      // This test verifies the query plan uses an index scan, not a sequential scan
      const { data, error } = await supabase.rpc('explain_query', {
        p_query: `SELECT * FROM contacts WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 100`
      });

      expect(error).toBeNull();
      expect(data).toContain('Index Scan');
      expect(data).not.toContain('Seq Scan');
    });

    test('document_chunks query uses composite index', async () => {
      const { data, error } = await supabase.rpc('explain_query', {
        p_query: `SELECT * FROM document_chunks WHERE document_id = (SELECT id FROM documents LIMIT 1) ORDER BY chunk_index LIMIT 30`
      });

      expect(error).toBeNull();
      expect(data).toContain('idx_document_chunks_doc_idx');
    });

    test('usage quota check is fast (<10ms)', async () => {
      const start = performance.now();

      await supabase.rpc('check_and_increment_ai_usage', {
        p_tenant_id: (await supabase.from('tenants').select('id').limit(1).single()).data?.id
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('Edge Function Compatibility', () => {
    test('can insert document_chunks with tenant_id', async () => {
      // This test verifies the edge function changes are compatible
      // Create a test document first
      const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
      expect(tenant).toBeDefined();

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          tenant_id: tenant!.id,
          name: 'test.pdf',
          file_path: '/test/test.pdf',
          file_type: 'application/pdf'
        })
        .select()
        .single();

      expect(docError).toBeNull();
      expect(document).toBeDefined();

      // Now insert a chunk with tenant_id
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_id: document!.id,
          tenant_id: tenant!.id,
          chunk_index: 0,
          content: 'Test chunk content',
          embedding: JSON.stringify([0.1, 0.2, 0.3])
        });

      expect(chunkError).toBeNull();

      // Cleanup
      await supabase.from('documents').delete().eq('id', document!.id);
    });
  });
});

describe('Helper RPC Functions (Create These in Supabase)', () => {
  test.skip('check_index_exists RPC should be created', () => {
    // This test documents that we need to create these helper functions
    // See: docs/DATABASE_OPTIMIZATION_CODE_REVIEW.md for SQL to create them
  });

  test.skip('check_view_exists RPC should be created', () => {
    // Helper function needed for verification
  });

  test.skip('explain_query RPC should be created', () => {
    // Helper function to run EXPLAIN ANALYZE
  });
});
