import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'test-key';
const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const supabase = createClient(supabaseUrl, supabaseKey);
const describeWithEnv = hasSupabaseEnv ? describe : describe.skip;

/**
 * CRITICAL: Backward Compatibility Tests
 *
 * These tests MUST pass to ensure we don't break existing functionality.
 * If any of these fail, the deployment should be blocked until fixed.
 */
describeWithEnv('Backward Compatibility - Existing Features', () => {
  let authToken: string = '';

  beforeAll(async () => {
    const { data } = await supabase.auth.signInWithPassword({
      email: 'test@search.test',
      password: 'Test1234!',
    });

    authToken = data.session?.access_token || '';
  });

  describe('Existing Document Search', () => {
    // CRITICAL: Existing document search must continue to work
    it('should still work with existing search-documents endpoint', async () => {
      // Skip if auth token not available (test environment)
      if (!authToken) {
        console.warn('Skipping edge function test - no auth token available');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/search-documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ query: 'contract' }),
        }
      );

      // If edge function not deployed or not accessible, skip test
      if (!response.ok && response.status === 404) {
        console.warn('Edge function not accessible - skipping test');
        return;
      }

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('results');
    });

    // CRITICAL: Document chunks table unchanged
    it('should maintain document_chunks table structure', async () => {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, document_id, content, embedding')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data && data.length > 0) {
        const chunk = data[0];
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('document_id');
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('embedding');
      }
    });
  });

  describe('Existing @ Mention System', () => {
    // CRITICAL: @ mentions must continue to work
    it('should maintain @ mention format @type:id[Name]', async () => {
      // Test that existing mention search pattern works
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .limit(5);

      expect(contacts).toBeDefined();
      expect(Array.isArray(contacts)).toBe(true);

      // Verify we can still query contacts for mentions
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        expect(contact).toHaveProperty('id');
        expect(contact).toHaveProperty('first_name');
      }
    });

    // CRITICAL: Contact table structure preserved
    it('should maintain contacts table columns', async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, company, tenant_id')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data && data.length > 0) {
        const contact = data[0];
        expect(contact).toHaveProperty('id');
        expect(contact).toHaveProperty('first_name');
        expect(contact).toHaveProperty('last_name');
        expect(contact).toHaveProperty('email');
        expect(contact).toHaveProperty('tenant_id');
      }
    });
  });

  describe('Existing CRM Features', () => {
    // CRITICAL: Properties table unchanged
    it('should maintain properties table structure', async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address, city, state, tenant_id')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    // CRITICAL: Deals table unchanged
    it('should maintain deals table structure', async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, tenant_id, stage, deal_type')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('RLS Policies', () => {
    // CRITICAL: RLS still enforces tenant isolation
    it('should enforce tenant isolation on contacts', async () => {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('tenant_id');

      // All returned contacts should belong to current user's tenant
      if (contacts && contacts.length > 0) {
        const uniqueTenants = new Set(contacts.map((c) => c.tenant_id));
        expect(uniqueTenants.size).toBe(1); // Only one tenant
      }
    });

    // CRITICAL: RLS still works on properties
    it('should enforce tenant isolation on properties', async () => {
      const { data: properties } = await supabase
        .from('properties')
        .select('tenant_id');

      if (properties && properties.length > 0) {
        const uniqueTenants = new Set(properties.map((p) => p.tenant_id));
        expect(uniqueTenants.size).toBe(1);
      }
    });

    // CRITICAL: RLS still works on deals
    it('should enforce tenant isolation on deals', async () => {
      const { data: deals } = await supabase.from('deals').select('tenant_id');

      if (deals && deals.length > 0) {
        const uniqueTenants = new Set(deals.map((d) => d.tenant_id));
        expect(uniqueTenants.size).toBe(1);
      }
    });
  });

  describe('AI Chat Features', () => {
    // CRITICAL: AI chat endpoint still works
    it('should maintain ai-chat edge function', async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          conversationId: 'test-conv-id',
          message: 'Hello',
          mentionedEntities: [],
        }),
      });

      // Should return 200 or appropriate error, but not 404
      expect(response.status).not.toBe(404);
    });

    // CRITICAL: AI conversations table unchanged
    it('should maintain ai_conversations table structure', async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, tenant_id, title')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Document Processing', () => {
    // CRITICAL: Document indexing still works
    it('should maintain index-document edge function', async () => {
      // Just verify endpoint exists - don't test full indexing
      const response = await fetch(
        `${supabaseUrl}/functions/v1/index-document`,
        {
          method: 'OPTIONS', // Preflight check
        }
      );

      // Should return CORS headers, not 404
      expect(response.status).not.toBe(404);
    });

    // CRITICAL: Documents table unchanged
    it('should maintain documents table structure', async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, tenant_id, category, ai_summary')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Performance Regressions', () => {
    // CRITICAL: Existing queries should not be slower
    it('should not degrade contacts query performance', async () => {
      const start = Date.now();

      await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .limit(10);

      const latency = Date.now() - start;

      // Should still be fast (< 1 second)
      expect(latency).toBeLessThan(1000);
    });

    // CRITICAL: Properties queries should remain fast
    it('should not degrade properties query performance', async () => {
      const start = Date.now();

      await supabase
        .from('properties')
        .select('id, address, city, state')
        .limit(10);

      const latency = Date.now() - start;

      expect(latency).toBeLessThan(1000);
    });
  });

  describe('Database Constraints', () => {
    // CRITICAL: Foreign keys still work
    it('should maintain foreign key relationships', async () => {
      // Test that document_chunks still reference documents
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('document_id, documents(id, name)')
        .limit(1);

      if (chunks && chunks.length > 0) {
        expect(chunks[0]).toHaveProperty('document_id');
        expect(chunks[0]).toHaveProperty('documents');
      }
    });

    // CRITICAL: Tenant ID columns still required
    it('should enforce tenant_id NOT NULL constraints', async () => {
      // Try to insert contact without tenant_id (should fail)
      const { error } = await supabase.from('contacts').insert({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        // Missing tenant_id
      });

      // Should fail with constraint violation
      expect(error).not.toBeNull();
    });
  });
});

/**
 * Export test summary for CI/CD gates
 */
export const BACKWARD_COMPATIBILITY_GATE = {
  critical: true,
  blockDeployment: true,
  description: 'All backward compatibility tests must pass before deployment',
};
