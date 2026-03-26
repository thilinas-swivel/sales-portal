import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabase, type PipelineConfigRow } from '@/lib/supabase';

/**
 * GET /api/pipedrive/config
 * Returns the selected pipeline IDs from Supabase.
 */
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pipeline_config')
    .select('*')
    .eq('selected', true)
    .order('pipeline_id')
    .returns<PipelineConfigRow[]>();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const selectedPipelineIds = (data ?? []).map((row) => row.pipeline_id);
  const topOfFunnelPipelineIds = (data ?? [])
    .filter((row) => row.is_top_of_funnel)
    .map((row) => row.pipeline_id);
  return NextResponse.json({
    success: true,
    data: { selectedPipelineIds, topOfFunnelPipelineIds },
  });
}

/**
 * PUT /api/pipedrive/config
 * Upserts the pipeline configuration.
 * Body: { selectedPipelineIds: number[], pipelines?: { id: number; name: string }[] }
 */
export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  if (!body || !Array.isArray(body.selectedPipelineIds)) {
    return NextResponse.json(
      { success: false, error: 'selectedPipelineIds must be an array of numbers' },
      { status: 400 },
    );
  }

  const selectedPipelineIds: number[] = body.selectedPipelineIds.filter(
    (id: unknown) => typeof id === 'number' && Number.isFinite(id),
  );

  // Top-of-funnel flags
  const topOfFunnelPipelineIds: number[] = Array.isArray(body.topOfFunnelPipelineIds)
    ? body.topOfFunnelPipelineIds.filter(
        (id: unknown) => typeof id === 'number' && Number.isFinite(id),
      )
    : [];

  // Optional: pipeline names for labelling
  const pipelineMap = new Map<number, string>();
  if (Array.isArray(body.pipelines)) {
    for (const p of body.pipelines) {
      if (typeof p.id === 'number' && typeof p.name === 'string') {
        pipelineMap.set(p.id, p.name);
      }
    }
  }

  // Mark everything as deselected first
  const { error: deselectError } = await supabase
    .from('pipeline_config')
    .update({ selected: false })
    .neq('pipeline_id', -1); // matches all rows

  if (deselectError) {
    return NextResponse.json({ success: false, error: deselectError.message }, { status: 500 });
  }

  if (selectedPipelineIds.length > 0) {
    // Upsert selected pipelines
    const rows = selectedPipelineIds.map((pid) => ({
      pipeline_id: pid,
      pipeline_name: pipelineMap.get(pid) ?? null,
      selected: true,
      is_top_of_funnel: topOfFunnelPipelineIds.includes(pid),
    }));

    const { error: upsertError } = await supabase
      .from('pipeline_config')
      .upsert(rows, { onConflict: 'pipeline_id' });

    if (upsertError) {
      return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    data: { selectedPipelineIds, topOfFunnelPipelineIds },
  });
}
