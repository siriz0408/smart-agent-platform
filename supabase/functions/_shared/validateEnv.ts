/**
 * Validates that required environment variables are present.
 * Throws an error with a clear message if any are missing.
 *
 * @param required - Array of required environment variable names
 * @throws Error if any required variables are missing
 */
export function requireEnv(required: string[]): void {
  const missing = required.filter((key) => !Deno.env.get(key));

  if (missing.length > 0) {
    const missingVars = missing.join(", ");
    throw new Error(
      `Missing required environment variables: ${missingVars}. ` +
      `Please configure these in your Supabase project settings.`
    );
  }
}

/**
 * Gets an environment variable value with a clear error message if missing.
 *
 * @param key - Environment variable name
 * @returns The environment variable value
 * @throws Error if the variable is not set
 */
export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please configure this in your Supabase project settings.`
    );
  }

  return value;
}
