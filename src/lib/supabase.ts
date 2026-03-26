import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Returns a lazily-initialised Supabase client.
 * Deferred so the module can be imported at build time without env vars present.
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables',
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/** Row shape for the pipeline_config table */
export interface PipelineConfigRow {
  id: number;
  pipeline_id: number;
  pipeline_name: string | null;
  selected: boolean;
  is_top_of_funnel: boolean;
  created_at: string;
  updated_at: string;
}

/** Row shape for the tier_settings table */
export interface TierSettingsRow {
  id: number;
  deal_enterprise: number;
  deal_mid_market: number;
  deal_smb: number;
  rev_enterprise: number;
  rev_mid_market: number;
  rev_smb: number;
  created_at: string;
  updated_at: string;
}

/** Row shape for the partners table */
export interface PartnerRow {
  id: number;
  name: string;
  contact_email: string | null;
  api_key: string | null;
  default_stage: string | null;
  sheet_tab: string | null;
  back_sync: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
