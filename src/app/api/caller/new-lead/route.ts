import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import type { PipedriveCreatePerson, PipedriveCreateDeal } from '@/types/pipedrive';

// ---------------------------------------------------------------------------
// Request body shape
// ---------------------------------------------------------------------------

interface NewLeadBody {
  contactPerson: string;
  email: string;
  phone: string;
  positionTitle?: string;
  organisation: string;
  website?: string;
  location?: string;
  pipelineId: number;
  stageId: number;
  notes?: string;
  dealValue?: number;
  currency?: string;
  /** Existing Pipedrive person ID (skip person creation) */
  existingPersonId?: number;
  /** Existing Pipedrive org ID (skip org creation) */
  existingOrgId?: number;
  /** Custom field key-value pairs (Pipedrive field hash → value) */
  customFields?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find or create an organization by exact name match. */
async function resolveOrganization(name: string): Promise<number> {
  // Search for existing org
  const searchRes = await pipedrive.organizations.search({
    term: name,
    fields: 'name',
    exact_match: true,
    limit: 1,
  });

  const items = searchRes.data?.items ?? [];
  if (items.length > 0) {
    return items[0].item.id;
  }

  // Create new org
  const createRes = await pipedrive.organizations.create({ name });
  return createRes.data.id;
}

/** Find or create a person by exact email match. */
async function resolvePerson(
  name: string,
  email: string,
  phone: string | undefined,
  orgId: number,
): Promise<number> {
  // Search by email
  if (email) {
    const searchRes = await pipedrive.persons.search({
      term: email,
      fields: 'email',
      exact_match: true,
      limit: 1,
    });

    const items = searchRes.data?.items ?? [];
    if (items.length > 0) {
      return items[0].item.id;
    }
  }

  // Create new person
  const personData: PipedriveCreatePerson = {
    name,
    org_id: orgId,
  };
  if (email) {
    personData.email = [{ value: email, primary: true, label: 'work' }];
  }
  if (phone) {
    personData.phone = [{ value: phone, primary: true, label: 'work' }];
  }

  const createRes = await pipedrive.persons.create(personData);
  return createRes.data.id;
}

/** Check if a deal with the same title already exists for this person+org in the given pipeline. */
async function dealExists(title: string, personId: number, orgId: number): Promise<boolean> {
  const searchRes = await pipedrive.deals.search({
    term: title,
    fields: 'title',
    exact_match: true,
    limit: 5,
  });

  const items = searchRes.data?.items ?? [];
  if (items.length === 0) return false;

  // Verify at least one match has same person + org
  return items.some((r) => r.item.person?.id === personId && r.item.organization?.id === orgId);
}

// ---------------------------------------------------------------------------
// POST /api/caller/new-lead
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];

  let body: NewLeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // ── Validate required fields ───────────────────────────────────────────
  const {
    contactPerson,
    email,
    phone,
    organisation,
    pipelineId,
    stageId,
    existingPersonId,
    existingOrgId,
  } = body;

  if (!existingPersonId && !contactPerson?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Contact person name is required' },
      { status: 400 },
    );
  }
  if (!existingOrgId && !existingPersonId && !organisation?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Organisation name is required' },
      { status: 400 },
    );
  }
  if (!existingPersonId && !email?.trim() && !phone?.trim()) {
    return NextResponse.json(
      { success: false, error: 'At least one of email or phone is required' },
      { status: 400 },
    );
  }
  if (!pipelineId || !stageId) {
    return NextResponse.json(
      { success: false, error: 'Pipeline and stage are required' },
      { status: 400 },
    );
  }

  // Authorise pipeline access
  if (!allowedPipelineIds.includes(pipelineId)) {
    return NextResponse.json(
      { success: false, error: 'You do not have access to this pipeline' },
      { status: 403 },
    );
  }

  try {
    let orgId: number;
    let personId: number;

    if (existingPersonId) {
      // ── Use the existing person directly ───────────────────────────
      personId = existingPersonId;
      // Resolve org from the existing person's org, or from existingOrgId, or create
      if (existingOrgId) {
        orgId = existingOrgId;
      } else {
        // Fetch person to get their org
        const personRes = await pipedrive.persons.get(existingPersonId);
        const personOrgId = personRes.data?.org_id;
        if (personOrgId) {
          orgId =
            typeof personOrgId === 'object'
              ? (personOrgId as { value: number }).value
              : personOrgId;
        } else if (organisation?.trim()) {
          orgId = await resolveOrganization(organisation.trim());
        } else {
          return NextResponse.json(
            { success: false, error: 'Organisation is required when contact has no org' },
            { status: 400 },
          );
        }
      }
    } else {
      // ── Resolve organisation (find or create) ──────────────────────
      orgId = existingOrgId ?? (await resolveOrganization(organisation.trim()));

      // ── Resolve person (find or create) ────────────────────────────
      personId = await resolvePerson(
        contactPerson.trim(),
        email?.trim() ?? '',
        phone?.trim(),
        orgId,
      );
    }

    // ── Check for duplicate deal ───────────────────────────────────
    const dealTitle = organisation?.trim() || contactPerson.trim();
    const duplicate = await dealExists(dealTitle, personId, orgId);
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'A deal with this organisation and contact already exists' },
        { status: 409 },
      );
    }

    // ── Create deal ────────────────────────────────────────────
    const dealPayload: PipedriveCreateDeal = {
      title: dealTitle,
      person_id: personId,
      org_id: orgId,
      pipeline_id: pipelineId,
      stage_id: stageId,
    };

    if (body.dealValue && body.dealValue > 0) {
      dealPayload.value = body.dealValue;
      if (body.currency) dealPayload.currency = body.currency;
    }

    // Merge custom fields (keys are Pipedrive field hashes like `75070433ca...`)
    if (body.customFields) {
      for (const [key, value] of Object.entries(body.customFields)) {
        if (value !== null && value !== undefined && value !== '') {
          dealPayload[key] = value;
        }
      }
    }

    const dealRes = await pipedrive.deals.create(dealPayload);
    const dealId = dealRes.data.id;

    // ── Add note if provided ───────────────────────────────────
    if (body.notes?.trim()) {
      await pipedrive.notes.create({
        content: body.notes.trim(),
        deal_id: dealId,
        person_id: personId,
        org_id: orgId,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        dealId,
        orgId,
        personId,
        title: dealTitle,
        pipelineId,
        stageId,
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
      console.error('[new-lead] Pipedrive error:', err.status, err.body);
      return NextResponse.json(
        { success: false, error: `Pipedrive error: ${err.message}` },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error('[new-lead] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/caller/new-lead — fetch pipelines + stages for form dropdowns
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];
  if (allowedPipelineIds.length === 0) {
    return NextResponse.json({ success: true, data: { pipelines: [] } });
  }

  try {
    const [pipelinesRes, stagesRes, dealFieldsRes] = await Promise.all([
      pipedrive.pipelines.list(),
      pipedrive.stages.list(),
      pipedrive.dealFields.list(),
    ]);

    const allPipelines = pipelinesRes.data ?? [];
    const allStages = stagesRes.data ?? [];
    const allDealFields = dealFieldsRes.data ?? [];

    // Filter to user's allowed pipelines
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

    // Extract custom deal fields (non-built-in) that have options (enum/set types)
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

    return NextResponse.json({
      success: true,
      data: { pipelines: userPipelines, customFields },
    });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: 'Pipedrive is not configured' },
        { status: 503 },
      );
    }
    if (err instanceof PipedriveError) {
      return NextResponse.json(
        { success: false, error: `Pipedrive error: ${err.message}` },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error('[new-lead GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
