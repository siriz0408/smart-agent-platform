/**
 * Shared utility for generating deterministic embeddings
 * Used across edge functions for consistency with database triggers
 */

import { createHash } from "node:crypto";

/**
 * Generate deterministic 1536-dimension embedding from text
 * Uses MD5 hash for reproducibility (same text → same embedding)
 *
 * @param text - Input text to embed
 * @returns Array of 1536 float values between 0 and 1
 */
export function generateDeterministicEmbedding(text: string): number[] {
  // Create MD5 hash of input text
  const hash = createHash("md5").update(text).digest("hex");

  // Convert hex hash to bigint for seed
  const hashValue = BigInt("0x" + hash.substring(0, 15));

  // Generate 1536 float values using deterministic pseudo-random function
  const embedding: number[] = [];

  for (let i = 0; i < 1536; i++) {
    // Use hash + index to generate values
    // Sin function provides smooth distribution
    const value = Math.sin(Number(hashValue) * (i + 1)) * 0.5 + 0.5;
    embedding.push(value);
  }

  return embedding;
}

/**
 * Normalize embedding vector to unit length
 * Improves cosine similarity calculations
 *
 * @param embedding - Input embedding vector
 * @returns Normalized embedding
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  // Calculate magnitude
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    return embedding; // Avoid division by zero
  }

  // Normalize each component
  return embedding.map((val) => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between -1 (opposite) and 1 (identical)
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Cosine similarity score
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimension");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Validate embedding dimensions
 */
export function validateEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === 1536 &&
    embedding.every((val) => typeof val === "number" && !isNaN(val))
  );
}
