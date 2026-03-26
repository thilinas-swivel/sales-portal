import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        AZURE_AD_CLIENT_ID: !!process.env.AZURE_AD_CLIENT_ID,
        AZURE_AD_TENANT_ID: !!process.env.AZURE_AD_TENANT_ID,
        AZURE_AD_CLIENT_SECRET: !!process.env.AZURE_AD_CLIENT_SECRET,
        AUTH_SECRET: !!process.env.AUTH_SECRET,
        AUTH_URL: !!process.env.AUTH_URL,
        AUTH_TRUST_HOST: !!process.env.AUTH_TRUST_HOST,
      },
    },
    { status: 200 },
  );
}
