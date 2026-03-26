import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabase, type PartnerRow } from '@/lib/supabase';

/**
 * PUT /api/partners/[id]
 * Update an existing partner.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partnerId = Number(id);
  if (!Number.isFinite(partnerId) || partnerId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid partner id' }, { status: 400 });
  }

  const body = await req.json();
  const updates: Partial<Omit<PartnerRow, 'id' | 'created_at' | 'updated_at'>> = {};

  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.contact_email !== undefined) updates.contact_email = body.contact_email?.trim() || null;
  if (body.api_key !== undefined) updates.api_key = body.api_key?.trim() || null;
  if (body.default_stage !== undefined) updates.default_stage = body.default_stage?.trim() || null;
  if (body.sheet_tab !== undefined) updates.sheet_tab = body.sheet_tab?.trim() || null;
  if (body.back_sync !== undefined) updates.back_sync = !!body.back_sync;
  if (body.status !== undefined && ['active', 'inactive'].includes(body.status)) {
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', partnerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update partner' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/partners/[id]
 * Delete a partner by id.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partnerId = Number(id);
  if (!Number.isFinite(partnerId) || partnerId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid partner id' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('partners').delete().eq('id', partnerId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete partner' },
      { status: 500 },
    );
  }
}
