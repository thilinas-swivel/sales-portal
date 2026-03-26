import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { errorResponse } from '../_helpers';
import { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import { cached, invalidateCache } from '@/lib/cache';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/pipedrive/enrichment
 *
 * Accepts { personIds: number[], orgIds: number[], refresh?: boolean } and
 * returns enriched person + organization details along with deal-field
 * metadata.
 *
 * Uses list-based fetching with pagination (instead of individual GET per
 * person/org) to minimize API call count and avoid rate-limiting.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const personIds: number[] = (Array.isArray(body.personIds) ? body.personIds : []).filter(
      (id: unknown) => typeof id === 'number' && Number.isFinite(id),
    );
    const orgIds: number[] = (Array.isArray(body.orgIds) ? body.orgIds : []).filter(
      (id: unknown) => typeof id === 'number' && Number.isFinite(id),
    );

    const refresh = body.refresh === true;
    if (refresh) {
      invalidateCache('enrichment');
    }

    const uniquePersonIds = new Set(personIds);
    const uniqueOrgIds = new Set(orgIds);

    // Fetch deal fields (cached)
    const dealFieldsResult = await cached(
      'enrichment:dealFields',
      () => pipedrive.dealFields.list().catch(() => ({ data: [] })),
      CACHE_TTL,
    );

    // Fetch organization fields (cached) — used to discover revenue custom field
    const orgFieldsResult = await cached(
      'enrichment:orgFields',
      () => pipedrive.organizationFields.list().catch(() => ({ data: [] })),
      CACHE_TTL,
    );

    // Fetch ALL persons via paginated list (much fewer API calls than individual GETs)
    const allPersons = await cached(
      'enrichment:persons',
      () => fetchAllPaginated((start) => pipedrive.persons.list({ start, limit: 500 })),
      CACHE_TTL,
    );

    // Fetch ALL organizations via paginated list
    const allOrgs = await cached(
      'enrichment:organizations',
      () => fetchAllPaginated((start) => pipedrive.organizations.list({ start, limit: 500 })),
      CACHE_TTL,
    );

    // Filter to only the ones referenced in the deals
    const persons = allPersons.filter((p: { id: number }) => uniquePersonIds.has(p.id));
    const organizations = allOrgs.filter((o: { id: number }) => uniqueOrgIds.has(o.id));

    return NextResponse.json({
      success: true,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dealFields: (dealFieldsResult as any)?.data ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orgFields: (orgFieldsResult as any)?.data ?? [],
        persons,
        organizations,
      },
    });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return errorResponse(err.message, 503);
    }
    if (err instanceof PipedriveError) {
      return errorResponse(err.message, err.status);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse(message, 500);
  }
}

/**
 * Fetches all items from a paginated Pipedrive list endpoint.
 * Makes sequential requests (not parallel) to stay within rate limits.
 * Stops when `additional_data.pagination.more_items_in_collection` is false.
 */
async function fetchAllPaginated<T>(
  fetcher: (start: number) => Promise<{
    success?: boolean;
    data: T[] | null;
    additional_data?: { pagination?: { more_items_in_collection?: boolean; next_start?: number } };
  }>,
): Promise<T[]> {
  const allItems: T[] = [];
  let start = 0;
  const MAX_PAGES = 20; // Safety limit (20 × 500 = 10k items max)

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetcher(start);
    const items = result.data ?? [];
    allItems.push(...items);

    const pagination = result.additional_data?.pagination;
    if (!pagination?.more_items_in_collection) break;
    start = pagination.next_start ?? start + items.length;
  }

  return allItems;
}
