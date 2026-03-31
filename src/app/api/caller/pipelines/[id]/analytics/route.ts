import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import { cached } from '@/lib/cache';
import type { PipedriveDeal, PipedriveDealField } from '@/types/pipedrive';

const CACHE_TTL = 3 * 60 * 1000; // 3 min
const FIELD_CACHE_TTL = 5 * 60 * 1000; // 5 min

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface DistributionItem {
  label: string;
  count: number;
  value: number; // total deal value
}

export interface PipelineAnalytics {
  pipelineId: number;
  pipelineName: string;
  totalDeals: number;
  /** Deal value bucket distribution */
  valueBuckets: DistributionItem[];
  /** Top organisations by deal count */
  topOrganisations: DistributionItem[];
  /** Custom enum/set field distributions (deal, org, person) */
  fieldDistributions: {
    fieldName: string;
    source: 'deal' | 'organization' | 'person';
    items: DistributionItem[];
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FieldDef = {
  key: string;
  name: string;
  field_type: string;
  options?: { id: number | string; label: string }[];
};

/** Given a raw field value and its options, return the human-readable label(s). */
function resolveFieldLabel(
  raw: unknown,
  options: { id: number | string; label: string }[],
): string[] {
  if (raw == null || raw === '') return [];
  const optionMap = new Map(options.map((o) => [String(o.id), o.label]));

  // set fields may be stored as comma-separated ids (e.g. "1,3,5")
  const ids = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const labels: string[] = [];
  for (const id of ids) {
    labels.push(optionMap.get(id) ?? id);
  }
  return labels;
}

function buildValueBuckets(deals: PipedriveDeal[], _currency: string): DistributionItem[] {
  const buckets = [
    { label: `< 10K`, min: 0, max: 10_000 },
    { label: `10K – 50K`, min: 10_000, max: 50_000 },
    { label: `50K – 100K`, min: 50_000, max: 100_000 },
    { label: `100K – 500K`, min: 100_000, max: 500_000 },
    { label: `500K+`, min: 500_000, max: Infinity },
  ];
  const result: DistributionItem[] = buckets.map((b) => ({ label: b.label, count: 0, value: 0 }));
  for (const d of deals) {
    const v = d.value ?? 0;
    const idx = buckets.findIndex((b) => v >= b.min && v < b.max);
    if (idx >= 0) {
      result[idx].count++;
      result[idx].value += v;
    }
  }
  // Drop empty buckets from both ends for cleaner display
  while (result.length > 0 && result[0].count === 0) result.shift();
  while (result.length > 0 && result[result.length - 1].count === 0) result.pop();
  return result;
}

function buildOrgDistribution(deals: PipedriveDeal[]): DistributionItem[] {
  const map = new Map<string, { count: number; value: number }>();
  for (const d of deals) {
    const name = ((d.org_name as string | null | undefined) ?? '').trim() || 'No Organisation';
    const entry = map.get(name) ?? { count: 0, value: 0 };
    entry.count++;
    entry.value += d.value ?? 0;
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([label, { count, value }]) => ({ label, count, value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

function buildFieldDistribution(
  records: Record<string, unknown>[],
  field: FieldDef,
): DistributionItem[] {
  const map = new Map<string, { count: number; value: number }>();
  for (const rec of records) {
    const raw = rec[field.key];
    const labels = resolveFieldLabel(raw, field.options ?? []);
    if (labels.length === 0) {
      const entry = map.get('Not Set') ?? { count: 0, value: 0 };
      entry.count++;
      entry.value += (rec.value as number) ?? 0;
      map.set('Not Set', entry);
    } else {
      for (const label of labels) {
        const entry = map.get(label) ?? { count: 0, value: 0 };
        entry.count++;
        entry.value += (rec.value as number) ?? 0;
        map.set(label, entry);
      }
    }
  }
  return [...map.entries()]
    .map(([label, { count, value }]) => ({ label, count, value }))
    .sort((a, b) => b.count - a.count);
}

/** Build distribution from free-text (varchar) field values, normalising case. */
function buildTextDistribution(
  records: Record<string, unknown>[],
  fieldKey: string,
): DistributionItem[] {
  const map = new Map<string, { count: number; value: number }>();
  for (const rec of records) {
    const raw = rec[fieldKey];
    const text = (typeof raw === 'string' ? raw.trim() : '') || '';
    if (!text) continue; // skip empty — don't pollute with "Not Set"
    // Normalise: title-case the first letter of each word for grouping
    const normalised = text.replace(/\b\w/g, (c) => c.toUpperCase());
    const entry = map.get(normalised) ?? { count: 0, value: 0 };
    entry.count++;
    entry.value += (rec.value as number) ?? 0;
    map.set(normalised, entry);
  }
  return [...map.entries()]
    .map(([label, { count, value }]) => ({ label, count, value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

/** Regex to match profile-related person field names. */
const PROFILE_FIELD_RE = /job.?title|role|position|designation|department|seniority|decision/i;

/** Regex to match profile-related org field names. */
const ORG_PROFILE_FIELD_RE = /industry|sector|revenue|size|type|category|segment|region|country/i;

/** Fetch a single entity by ID with per-entity caching. */
async function fetchOrgsCached(ids: number[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const results = await Promise.all(
    unique.map((id) =>
      cached(`org:${id}`, () => pipedrive.organizations.get(id), FIELD_CACHE_TTL)
        .then((r) => r.data)
        .catch(() => null),
    ),
  );
  return results.filter(Boolean) as Record<string, unknown>[];
}

async function fetchPersonsCached(ids: number[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const results = await Promise.all(
    unique.map((id) =>
      cached(`person:${id}`, () => pipedrive.persons.get(id), FIELD_CACHE_TTL)
        .then((r) => r.data)
        .catch(() => null),
    ),
  );
  return results.filter(Boolean) as Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const pipelineId = parseInt(idRaw, 10);
  if (!Number.isFinite(pipelineId)) {
    return NextResponse.json({ error: 'Invalid pipeline ID' }, { status: 400 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];
  if (!allowedPipelineIds.includes(pipelineId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch deals + field definitions in parallel
    const [dealsRes, dealFieldsRes, orgFieldsRes, personFieldsRes, pipelinesRes] =
      await Promise.all([
        cached(
          `caller-leads:${pipelineId}:all_not_deleted:all`,
          () => pipedrive.pipelines.deals(pipelineId, { status: 'all_not_deleted', limit: 500 }),
          CACHE_TTL,
        ),
        cached('dealFields', () => pipedrive.dealFields.list(), FIELD_CACHE_TTL),
        cached('orgFields', () => pipedrive.organizationFields.list(), FIELD_CACHE_TTL),
        cached('personFields', () => pipedrive.personFields.list(), FIELD_CACHE_TTL),
        cached('pipelines', () => pipedrive.pipelines.list(), FIELD_CACHE_TTL),
      ]);

    const deals = (dealsRes.data ?? []) as PipedriveDeal[];
    const pipelineName =
      (pipelinesRes.data ?? []).find((p) => p.id === pipelineId)?.name ?? `Pipeline ${pipelineId}`;

    const currency = deals.find((d) => d.currency)?.currency ?? 'AUD';

    // --- Value buckets ---
    const valueBuckets = buildValueBuckets(deals, currency);

    // --- Top organisations ---
    const topOrganisations = buildOrgDistribution(deals);

    // --- Custom field distributions ---
    const fieldDistributions: PipelineAnalytics['fieldDistributions'] = [];

    // Deal enum/set fields
    const allDealFields = (dealFieldsRes.data ?? []) as PipedriveDealField[];
    const customDealFields = allDealFields.filter(
      (f) =>
        (f.field_type === 'enum' || f.field_type === 'set') &&
        f.active_flag &&
        f.options &&
        f.options.length > 0 &&
        f.edit_flag, // custom fields have edit_flag=true
    );
    for (const field of customDealFields) {
      const items = buildFieldDistribution(
        deals as unknown as Record<string, unknown>[],
        field as FieldDef,
      );
      if (items.length > 0 && items.some((i) => i.label !== 'Not Set')) {
        fieldDistributions.push({ fieldName: field.name, source: 'deal', items });
      }
    }

    // Org fields — fetch unique orgs referenced by deals
    const orgIds = deals
      .map((d) => {
        const raw = d.org_id;
        if (typeof raw === 'number') return raw;
        if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>))
          return (raw as Record<string, unknown>).value as number;
        return 0;
      })
      .filter(Boolean);

    if (orgIds.length > 0) {
      const orgs = await fetchOrgsCached(orgIds);
      const allOrgFields = (orgFieldsRes.data ?? []) as FieldDef[];

      // Enum/set custom fields
      const customOrgFields = allOrgFields.filter(
        (f) =>
          (f.field_type === 'enum' || f.field_type === 'set') &&
          f.options &&
          f.options.length > 0 &&
          (f as Record<string, unknown>).edit_flag === true,
      );
      for (const field of customOrgFields) {
        const items = buildFieldDistribution(orgs, field);
        if (items.length > 0 && items.some((i) => i.label !== 'Not Set')) {
          fieldDistributions.push({ fieldName: field.name, source: 'organization', items });
        }
      }

      // Text-based org profile fields (industry, revenue, etc.)
      const textOrgFields = allOrgFields.filter(
        (f) =>
          (f.field_type === 'varchar' ||
            f.field_type === 'text' ||
            f.field_type === 'varchar_auto') &&
          (f as Record<string, unknown>).edit_flag === true &&
          ORG_PROFILE_FIELD_RE.test(f.name),
      );
      for (const field of textOrgFields) {
        const items = buildTextDistribution(orgs, field.key);
        if (items.length > 1) {
          fieldDistributions.push({ fieldName: field.name, source: 'organization', items });
        }
      }
    }

    // Person fields — fetch unique persons referenced by deals
    const personIds = deals
      .map((d) => {
        const raw = d.person_id;
        if (typeof raw === 'number') return raw;
        if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>))
          return (raw as Record<string, unknown>).value as number;
        return 0;
      })
      .filter(Boolean);

    if (personIds.length > 0) {
      const persons = await fetchPersonsCached(personIds);
      const allPersonFields = (personFieldsRes.data ?? []) as FieldDef[];

      // Enum/set custom fields
      const customPersonFields = allPersonFields.filter(
        (f) =>
          (f.field_type === 'enum' || f.field_type === 'set') &&
          f.options &&
          f.options.length > 0 &&
          (f as Record<string, unknown>).edit_flag === true,
      );
      for (const field of customPersonFields) {
        const items = buildFieldDistribution(persons, field);
        if (items.length > 0 && items.some((i) => i.label !== 'Not Set')) {
          fieldDistributions.push({ fieldName: field.name, source: 'person', items });
        }
      }

      // Text-based profile fields (varchar custom fields like Job Title, Position, etc.)
      const textPersonFields = allPersonFields.filter(
        (f) =>
          (f.field_type === 'varchar' ||
            f.field_type === 'text' ||
            f.field_type === 'varchar_auto') &&
          (f as Record<string, unknown>).edit_flag === true &&
          PROFILE_FIELD_RE.test(f.name),
      );
      for (const field of textPersonFields) {
        const items = buildTextDistribution(persons, field.key);
        if (items.length > 1) {
          // Only show if there's meaningful variety
          fieldDistributions.push({ fieldName: field.name, source: 'person', items });
        }
      }

      // Also try well-known person text keys even if not found as custom fields
      const coveredKeys = new Set([
        ...customPersonFields.map((f) => f.key),
        ...textPersonFields.map((f) => f.key),
      ]);
      for (const fallbackKey of ['job_title', 'title', 'role', 'position', 'designation']) {
        if (coveredKeys.has(fallbackKey)) continue;
        const items = buildTextDistribution(persons, fallbackKey);
        if (items.length > 1) {
          const displayName = fallbackKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          fieldDistributions.push({ fieldName: displayName, source: 'person', items });
          break; // Only add the first one that has data to avoid duplicates
        }
      }
    }

    const analytics: PipelineAnalytics = {
      pipelineId,
      pipelineName,
      totalDeals: deals.length,
      valueBuckets,
      topOrganisations,
      fieldDistributions,
    };

    return NextResponse.json({ success: true, data: analytics });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof PipedriveError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
