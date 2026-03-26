import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabase, type PartnerRow } from '@/lib/supabase';

/**
 * GET /api/partners
 * List all partners ordered by name.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('name', { ascending: true })
      .returns<PartnerRow[]>();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 },
    );
  }
}

const ALLOWED_STATUSES = ['active', 'inactive'] as const;

/**
 * POST /api/partners
 * Create a new partner.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, contact_email, api_key, default_stage, sheet_tab, back_sync, status } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
  }

  const partnerStatus = ALLOWED_STATUSES.includes(status) ? status : 'active';

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('partners')
      .insert({
        name: name.trim(),
        contact_email: contact_email?.trim() || null,
        api_key: api_key?.trim() || null,
        default_stage: default_stage?.trim() || null,
        sheet_tab: sheet_tab?.trim() || null,
        back_sync: !!back_sync,
        status: partnerStatus,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 },
    );
  }
}
