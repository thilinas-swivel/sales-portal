import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabase, type TierSettingsRow } from '@/lib/supabase';

const DEFAULTS: Omit<TierSettingsRow, 'id' | 'created_at' | 'updated_at'> = {
  deal_enterprise: 100_000,
  deal_mid_market: 25_000,
  deal_smb: 5_000,
  rev_enterprise: 50_000_000,
  rev_mid_market: 10_000_000,
  rev_smb: 1_000_000,
};

/**
 * GET /api/settings/tiers
 * Returns the current tier threshold settings (or defaults if none saved).
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tier_settings')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .returns<TierSettingsRow[]>();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data?.[0] ?? DEFAULTS,
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: DEFAULTS,
    });
  }
}

const NUMERIC_FIELDS = [
  'deal_enterprise',
  'deal_mid_market',
  'deal_smb',
  'rev_enterprise',
  'rev_mid_market',
  'rev_smb',
] as const;

/**
 * PUT /api/settings/tiers
 * Update tier threshold settings. Creates the row if it doesn't exist.
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();

  // Validate all required fields are positive numbers
  const updates: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    const val = body[field];
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      return NextResponse.json(
        { success: false, error: `${field} must be a non-negative number` },
        { status: 400 },
      );
    }
    updates[field] = val;
  }

  try {
    const supabase = getSupabase();

    // Check if a row exists
    const { data: existing } = await supabase
      .from('tier_settings')
      .select('id')
      .order('id', { ascending: true })
      .limit(1)
      .returns<{ id: number }[]>();

    let result;
    if (existing && existing.length > 0) {
      result = await supabase
        .from('tier_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select()
        .returns<TierSettingsRow[]>();
    } else {
      result = await supabase
        .from('tier_settings')
        .insert(updates)
        .select()
        .returns<TierSettingsRow[]>();
    }

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data?.[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
