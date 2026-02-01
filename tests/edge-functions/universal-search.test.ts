import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('universal-search Edge Function', () => {
  let authToken: string = '';

  beforeAll(async () => {
    // Sign in to get auth token
    const { data } = await supabase.auth.signInWithPassword({
      email: 'test@search.test',
      password: 'Test1234!',
    });

    authToken = data.session?.access_token || '';
  });

  // RED: Test will fail until edge function is deployed
  it('should validate query length minimum 2 chars', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ query: 'x' }), // Too short
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('at least 2 characters');
  });

  // RED: Test max query length
  it('should reject very long queries (> 1000 chars)', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ query: 'a'.repeat(1001) }),
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('too long');
  });

  // RED: Test returns valid response structure
  it('should return valid response structure', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: 'Denver',
          entityTypes: ['contact', 'property'],
          matchThreshold: 0.1,
          matchCountPerType: 5,
        }),
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('results');
    expect(Array.isArray(data.results)).toBe(true);

    if (data.results.length > 0) {
      const result = data.results[0];
      expect(result).toHaveProperty('entity_type');
      expect(result).toHaveProperty('entity_id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('subtitle');
      expect(result).toHaveProperty('rrf_score');
    }
  });

  // RED: Test backward compatibility - existing document search still works
  it('should not break existing document search', async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/search-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ query: 'test' }),
    });

    // Existing function should still work
    expect(response.ok).toBe(true);
  });

  // RED: Test requires authentication
  it('should require authentication', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
        body: JSON.stringify({ query: 'Denver' }),
      }
    );

    expect(response.status).toBe(401);
  });

  // RED: Test handles entity type filtering
  it('should filter by entity types', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: 'Denver',
          entityTypes: ['contact'], // Only contacts
          matchThreshold: 0.1,
          matchCountPerType: 5,
        }),
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();

    // All results should be contacts
    if (data.results.length > 0) {
      expect(data.results.every((r: { entity_type: string }) => r.entity_type === 'contact')).toBe(
        true
      );
    }
  });

  // RED: Test handles CORS preflight
  it('should handle CORS preflight requests', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'OPTIONS',
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  // RED: Test performance - should respond within 500ms
  it('should respond within 500ms', async () => {
    const start = Date.now();

    const response = await fetch(
      `${supabaseUrl}/functions/v1/universal-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: 'Denver',
          entityTypes: ['contact', 'property', 'document', 'deal'],
        }),
      }
    );

    const latency = Date.now() - start;

    expect(response.ok).toBe(true);
    expect(latency).toBeLessThan(500);
  });
});
