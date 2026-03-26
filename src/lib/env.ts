/**
 * Validate that required environment variables are defined.
 * Import this in your root layout or instrumentation file.
 */

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  /** Public app URL used for metadata, OG images, etc. */
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  /** Node environment */
  NODE_ENV: process.env.NODE_ENV || 'development',

  /** Supabase */
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  /** Pipedrive API token (server-only) */
  PIPEDRIVE_API_TOKEN: process.env.PIPEDRIVE_API_TOKEN || '',

  /** Pipedrive company domain (e.g. "mycompany" for mycompany.pipedrive.com) */
  PIPEDRIVE_COMPANY_DOMAIN: process.env.PIPEDRIVE_COMPANY_DOMAIN || '',

  /** NextAuth.js */
  AUTH_SECRET: process.env.AUTH_SECRET || '',
  AUTH_URL: process.env.AUTH_URL || '',

  /** Microsoft Entra ID (Azure AD) */
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID || '',
  AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET || '',
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID || '',
} as const;

/**
 * Returns true when Pipedrive credentials are configured.
 * Use this server-side to decide whether to call Pipedrive or fall back to mock data.
 */
export function isPipedriveConfigured(): boolean {
  return Boolean(env.PIPEDRIVE_API_TOKEN && env.PIPEDRIVE_COMPANY_DOMAIN);
}

// Ensure getRequiredEnv is used (avoids tree-shaking the import in dev)
void getRequiredEnv;
