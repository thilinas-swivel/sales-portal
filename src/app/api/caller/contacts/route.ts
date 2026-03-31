import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import { cached } from '@/lib/cache';
import type { PipedrivePerson, PipedriveOrganization } from '@/types/pipedrive';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface CallerContactPerson {
  id: number;
  name: string;
  org_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  open_deals_count: number;
  update_time: string;
}

export interface CallerContactOrg {
  id: number;
  name: string;
  address: string | null;
  people_count: number;
  open_deals_count: number;
}

export interface CallerContactsResponse {
  persons: CallerContactPerson[];
  orgs: CallerContactOrg[];
}

function mapPerson(p: PipedrivePerson): CallerContactPerson {
  const primaryPhone = p.phone?.find((x) => x.primary)?.value ?? p.phone?.[0]?.value ?? null;
  const primaryEmail = p.email?.find((x) => x.primary)?.value ?? p.email?.[0]?.value ?? null;
  return {
    id: p.id,
    name: p.name,
    org_name: (p.org_name as string | null | undefined) ?? null,
    job_title: (p['job_title'] as string | null | undefined) ?? null,
    phone: primaryPhone || null,
    email: primaryEmail || null,
    open_deals_count: p.open_deals_count ?? 0,
    update_time: p.update_time,
  };
}

function mapOrg(o: PipedriveOrganization): CallerContactOrg {
  return {
    id: o.id,
    name: o.name,
    address: o.address ?? null,
    people_count: o.people_count ?? 0,
    open_deals_count: o.open_deals_count ?? 0,
  };
}

/**
 * GET /api/caller/contacts
 *
 * Returns persons and organisations from Pipedrive.
 * Auth-gated; no pipeline restriction (contacts are company-wide).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const [personsRaw, orgsRaw] = await Promise.all([
      cached<PipedrivePerson[]>(
        'contacts:persons',
        async () => {
          const res = await pipedrive.persons.list({ limit: 500 });
          return res.data ?? [];
        },
        CACHE_TTL,
      ),
      cached<PipedriveOrganization[]>(
        'contacts:orgs',
        async () => {
          const res = await pipedrive.organizations.list({ limit: 500 });
          return res.data ?? [];
        },
        CACHE_TTL,
      ),
    ]);

    const data: CallerContactsResponse = {
      persons: personsRaw.map(mapPerson),
      orgs: orgsRaw.map(mapOrg),
    };

    return NextResponse.json({ success: true, data });
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
        { status: 502 },
      );
    }
    console.error('[/api/caller/contacts]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
