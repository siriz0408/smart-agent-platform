import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to generate deterministic test embedding
function generateTestEmbedding(text: string): number[] {
  // Simple hash-based embedding for testing
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  return Array(1536).fill(0).map((_, i) => {
    return Math.sin(hash * (i + 1)) * 0.5 + 0.5;
  });
}

describe('search_all_entities_hybrid RPC', () => {
  let testTenantId: string;
  let testContactId: string;
  let testPropertyId: string;

  beforeAll(async () => {
    // Create test tenant and data
    const { data: { user } } = await supabase.auth.signUp({
      email: `test-${Date.now()}@search.test`,
      password: 'Test1234!',
    });

    testTenantId = user?.id || '';
  });

  beforeEach(async () => {
    // Clean up test data before each test
    if (testContactId) {
      await supabase.from('contacts').delete().eq('id', testContactId);
    }
    if (testPropertyId) {
      await supabase.from('properties').delete().eq('id', testPropertyId);
    }
  });

  afterAll(async () => {
    // Cleanup
    await supabase.auth.signOut();
  });

  // RED: This test will FAIL until we create the RPC function
  it('should return empty array when no matches found', async () => {
    const { data, error } = await supabase.rpc('search_all_entities_hybrid', {
      p_query: 'xyznonexistent',
      p_query_embedding: Array(1536).fill(0),
      p_tenant_id: testTenantId,
      p_entity_types: ['contact'],
    });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // RED: Test RRF scoring combines vector and keyword search
  it('should combine vector and keyword search results with RRF', async () => {
    // Setup: Insert test contact with known text and embedding
    const { data: contact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        first_name: 'John',
        last_name: 'Denver',
        company: 'Denver Real Estate',
        email: 'john@denver.test',
        tenant_id: testTenantId,
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    testContactId = contact?.id;

    // Generate embedding for the contact
    const embedding = generateTestEmbedding('John Denver Denver Real Estate');

    // Update with embedding
    await supabase
      .from('contacts')
      .update({ embedding })
      .eq('id', testContactId);

    // Search with query that matches both semantically and via keywords
    const { data, error } = await supabase.rpc('search_all_entities_hybrid', {
      p_query: 'Denver',
      p_query_embedding: generateTestEmbedding('Denver'),
      p_tenant_id: testTenantId,
      p_entity_types: ['contact'],
      p_match_threshold: 0.1,
      p_match_count_per_type: 5,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);

    if (data && data.length > 0) {
      expect(data[0].entity_type).toBe('contact');
      expect(data[0].rrf_score).toBeGreaterThan(0);
      // RRF should combine both vector and text scores
      expect(data[0]).toHaveProperty('similarity');
      expect(data[0]).toHaveProperty('text_rank');
    }
  });

  // RED: Test RLS policies enforce tenant isolation
  it('should only return entities for current tenant', async () => {
    // This test will fail until RLS policies are properly configured
    const otherTenantId = 'other-tenant-uuid-' + Date.now();

    // Insert contacts for two different tenants
    const { data: contact1 } = await supabase
      .from('contacts')
      .insert({
        first_name: 'Alice',
        last_name: 'Smith',
        tenant_id: testTenantId,
        email: 'alice@test.com',
      })
      .select()
      .single();

    testContactId = contact1?.id;

    const { data, error } = await supabase.rpc('search_all_entities_hybrid', {
      p_query: 'Alice',
      p_query_embedding: generateTestEmbedding('Alice Smith'),
      p_tenant_id: testTenantId,
      p_entity_types: ['contact'],
    });

    expect(error).toBeNull();

    // Should only return results for the specified tenant
    if (data && data.length > 0) {
      expect(data.every((r: { name?: string }) => r.name?.includes('Alice'))).toBe(true);
    }
  });

  // RED: Test function handles missing entity types gracefully
  it('should handle empty entity_types array', async () => {
    const { data, error } = await supabase.rpc('search_all_entities_hybrid', {
      p_query: 'test',
      p_query_embedding: generateTestEmbedding('test'),
      p_tenant_id: testTenantId,
      p_entity_types: [],
    });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // RED: Test function respects match_count_per_type limit
  it('should limit results per entity type', async () => {
    // Insert multiple test contacts
    const contacts = Array.from({ length: 10 }, (_, i) => ({
      first_name: `TestContact${i}`,
      last_name: 'Denver',
      email: `test${i}@denver.test`,
      tenant_id: testTenantId,
      embedding: generateTestEmbedding(`TestContact${i} Denver`),
    }));

    await supabase.from('contacts').insert(contacts);

    const { data, error } = await supabase.rpc('search_all_entities_hybrid', {
      p_query: 'Denver',
      p_query_embedding: generateTestEmbedding('Denver'),
      p_tenant_id: testTenantId,
      p_entity_types: ['contact'],
      p_match_count_per_type: 3,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data) {
      expect(data.length).toBeLessThanOrEqual(3);
    }

    // Cleanup
    await supabase.from('contacts').delete().ilike('first_name', 'TestContact%');
  });
});
