/**
 * ============================================================================
 * DISCOVER: Environment Configuration
 * Description: Type-safe environment variables with validation
 * ============================================================================
 */

import { z } from 'zod';

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  
  // GitHub
  GITHUB_TOKEN: z.string().min(1).optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  
  // Internal API Security
  INTERNAL_API_SECRET: z.string().min(32).optional(),
  
  // Feature Flags
  FEATURE_REDIS: z.enum(['0', '1']).default('0'),
  FEATURE_RATE_LIMIT: z.enum(['0', '1']).default('0'),
  FEATURE_RESPONSE_CACHE: z.enum(['0', '1']).default('0'),
  
  // Redis/Upstash (optional)
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// ============================================================================
// PARSED ENVIRONMENT
// ============================================================================

/**
 * Parse and validate environment variables
 * Will throw if required variables are missing in production
 */
function parseEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    
    // In production, throw error
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables');
    }
    
    // In development, return partial env with defaults
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
      FEATURE_REDIS: '0' as const,
      FEATURE_RATE_LIMIT: '0' as const,
      FEATURE_RESPONSE_CACHE: '0' as const,
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
      UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_TOKEN,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };
  }
  
  return result.data;
}

export const env = parseEnv();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if we're in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Check if Redis is enabled
 */
export function isRedisEnabled(): boolean {
  return env.FEATURE_REDIS === '1' && !!env.UPSTASH_REDIS_URL;
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return env.FEATURE_RATE_LIMIT === '1';
}

/**
 * Check if response caching is enabled
 */
export function isResponseCacheEnabled(): boolean {
  return env.FEATURE_RESPONSE_CACHE === '1';
}

/**
 * Get the application URL
 */
export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
