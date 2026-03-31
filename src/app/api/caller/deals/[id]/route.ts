import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import type { PipedriveUpdateDeal } from '@/types/pipedrive';

// ---------------------------------------------------------------------------
// GET /api/caller/deals/[id] — fetch a single deal with full details
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const dealId = parseInt(id, 10);
  if (isNaN(dealId)) {
    return NextResponse.json({ success: false, error: 'Invalid deal ID' }, { status: 400 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];

  try {
    const dealRes = await pipedrive.deals.get(dealId);
    const deal = dealRes.data;

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Authorise: user must have access to the deal's pipeline
    if (!allowedPipelineIds.includes(deal.pipeline_id)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Pipedrive single-deal response returns person_id / org_id as objects
    // e.g. { value: 123, name: "..." } instead of plain numbers.
    const personIdRaw = deal.person_id as unknown;
    const orgIdRaw = deal.org_id as unknown;
    const personId =
      typeof personIdRaw === 'object' && personIdRaw !== null
        ? (personIdRaw as { value: number }).value
        : (personIdRaw as number | null);
    const orgId =
      typeof orgIdRaw === 'object' && orgIdRaw !== null
        ? (orgIdRaw as { value: number }).value
        : (orgIdRaw as number | null);

    // Fetch supporting data in parallel
    const [stagesRes, pipelinesRes, dealFieldsRes, personRes, orgRes, flowRes] = await Promise.all([
      pipedrive.stages.list(),
      pipedrive.pipelines.list(),
      pipedrive.dealFields.list(),
      personId ? pipedrive.persons.get(personId) : null,
      orgId ? pipedrive.organizations.get(orgId) : null,
      pipedrive.deals.flow(dealId, { limit: 100, all_changes: '1' }),
    ]);

    const allStages = stagesRes.data ?? [];
    const allPipelines = pipelinesRes.data ?? [];
    const allDealFields = dealFieldsRes.data ?? [];

    // Build pipelines with stages (only user's allowed ones)
    const userPipelines = allPipelines
      .filter((p) => allowedPipelineIds.includes(p.id))
      .sort((a, b) => a.order_nr - b.order_nr)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stages: allStages
          .filter((s) => s.pipeline_id === p.id && s.active_flag)
          .sort((a, b) => a.order_nr - b.order_nr)
          .map((s) => ({ id: s.id, name: s.name })),
      }));

    // Extract custom fields with their current values
    // Exclude "Status" — deal stage is already handled by the pipeline/stage selector
    // Force single-select for fields that don't make sense as multi-select
    const SINGLE_SELECT_FIELDS = new Set(['company size', 'owner', 'source']);
    const customFields = allDealFields
      .filter(
        (f) =>
          f.key &&
          f.key.length > 20 &&
          (f.field_type === 'enum' || f.field_type === 'set') &&
          f.name.toLowerCase() !== 'status',
      )
      .map((f) => ({
        key: f.key,
        name: f.name,
        type: (f.field_type === 'set' && SINGLE_SELECT_FIELDS.has(f.name.toLowerCase())
          ? 'enum'
          : f.field_type) as 'enum' | 'set',
        options: (f as unknown as Record<string, unknown>).options as
          | { id: number; label: string }[]
          | undefined,
      }))
      .filter((f) => f.options && f.options.length > 0);

    // Build person details
    const person = personRes?.data
      ? {
          id: personRes.data.id,
          name: personRes.data.name,
          email: Array.isArray(personRes.data.email) ? (personRes.data.email[0]?.value ?? '') : '',
          phone: Array.isArray(personRes.data.phone) ? (personRes.data.phone[0]?.value ?? '') : '',
        }
      : null;

    // Build org details
    const org = orgRes?.data ? { id: orgRes.data.id, name: orgRes.data.name } : null;

    // Extract custom field values from deal
    const customFieldValues: Record<string, unknown> = {};
    for (const field of customFields) {
      const val = deal[field.key];
      if (val !== null && val !== undefined && val !== '') {
        customFieldValues[field.key] = val;
      }
    }

    // Build flow (unified history timeline) items
    const flowItems = (flowRes.data ?? []) as Array<{
      object: string;
      timestamp: string;
      data: Record<string, unknown>;
    }>;
    const relatedUsers = (flowRes.related_objects?.user ?? {}) as Record<string, { name: string }>;

    const history = flowItems.map((item) => {
      const d = item.data;
      const userId = d.user_id as number | undefined;
      const userName =
        userId && relatedUsers[String(userId)] ? relatedUsers[String(userId)].name : undefined;
      return {
        object: item.object,
        timestamp: item.timestamp,
        data: d,
        user_name: userName ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          id: deal.id,
          title: deal.title,
          value: deal.value ?? 0,
          currency: deal.currency ?? 'AUD',
          status: deal.status,
          pipeline_id: deal.pipeline_id,
          stage_id: deal.stage_id,
          expected_close_date: deal.expected_close_date ?? null,
          add_time: deal.add_time ?? null,
          update_time: deal.update_time ?? null,
        },
        person,
        org,
        customFieldValues,
        pipelines: userPipelines,
        customFields,
        history,
      },
    });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: 'Pipedrive is not configured' },
        { status: 503 },
      );
    }
    if (err instanceof PipedriveError) {
      console.error('[deals/id] Pipedrive error:', err.status, err.body);
      return NextResponse.json(
        { success: false, error: `Pipedrive error: ${err.message}` },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error('[deals/id] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/caller/deals/[id] — update a deal (including pipeline transfer)
// ---------------------------------------------------------------------------

interface UpdateDealBody {
  title?: string;
  value?: number;
  currency?: string;
  pipelineId?: number;
  stageId?: number;
  status?: 'open' | 'won' | 'lost';
  expectedCloseDate?: string | null;
  /** Custom field key-value pairs */
  customFields?: Record<string, unknown>;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const dealId = parseInt(id, 10);
  if (isNaN(dealId)) {
    return NextResponse.json({ success: false, error: 'Invalid deal ID' }, { status: 400 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];

  let body: UpdateDealBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    // Verify user owns access to the deal's current pipeline
    const existingDeal = await pipedrive.deals.get(dealId);
    if (!existingDeal.data) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }
    if (!allowedPipelineIds.includes(existingDeal.data.pipeline_id)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // If transferring to a new pipeline, verify access to the target pipeline
    if (body.pipelineId && !allowedPipelineIds.includes(body.pipelineId)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to the target pipeline' },
        { status: 403 },
      );
    }

    // Build update payload
    const payload: PipedriveUpdateDeal = {};

    if (body.title !== undefined) payload.title = body.title;
    if (body.value !== undefined) payload.value = body.value;
    if (body.currency !== undefined) payload.currency = body.currency;
    if (body.pipelineId !== undefined) payload.pipeline_id = body.pipelineId;
    if (body.stageId !== undefined) payload.stage_id = body.stageId;
    if (body.status !== undefined) payload.status = body.status;
    if (body.expectedCloseDate !== undefined) {
      payload.expected_close_date = body.expectedCloseDate ?? undefined;
    }

    // Merge custom fields
    if (body.customFields) {
      for (const [key, value] of Object.entries(body.customFields)) {
        payload[key] = value === '' ? null : value;
      }
    }

    const updated = await pipedrive.deals.update(dealId, payload);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.data.id,
        title: updated.data.title,
        pipeline_id: updated.data.pipeline_id,
        stage_id: updated.data.stage_id,
        status: updated.data.status,
        value: updated.data.value,
      },
    });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: 'Pipedrive is not configured' },
        { status: 503 },
      );
    }
    if (err instanceof PipedriveError) {
      console.error('[deals/id PATCH] Pipedrive error:', err.status, err.body);
      return NextResponse.json(
        { success: false, error: `Pipedrive error: ${err.message}` },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error('[deals/id PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/caller/deals/[id] — delete (mark as deleted) a deal
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const dealId = parseInt(id, 10);
  if (isNaN(dealId)) {
    return NextResponse.json({ success: false, error: 'Invalid deal ID' }, { status: 400 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];

  try {
    // Verify user has access to the deal's pipeline before deleting
    const existingDeal = await pipedrive.deals.get(dealId);
    if (!existingDeal.data) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }
    if (!allowedPipelineIds.includes(existingDeal.data.pipeline_id)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    await pipedrive.deals.delete(dealId);

    // Invalidate the pipeline cache so the next fetch returns fresh data
    invalidateCache(`caller-leads:${existingDeal.data.pipeline_id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: 'Pipedrive is not configured' },
        { status: 503 },
      );
    }
    if (err instanceof PipedriveError) {
      console.error('[deals/id DELETE] Pipedrive error:', err.status, err.body);
      return NextResponse.json(
        { success: false, error: `Pipedrive error: ${err.message}` },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error('[deals/id DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
