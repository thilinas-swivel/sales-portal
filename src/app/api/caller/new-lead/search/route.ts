import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';

// ---------------------------------------------------------------------------
// GET /api/caller/new-lead/search?type=person|organization&term=xxx
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const type = sp.get('type');
  const term = sp.get('term')?.trim();

  if (!type || !term || term.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    if (type === 'person') {
      const res = await pipedrive.persons.search({ term, limit: 10 });
      const items = (res.data?.items ?? []).map((r) => ({
        id: r.item.id,
        name: r.item.name,
        email: r.item.emails?.[0] ?? '',
        phone: r.item.phones?.[0] ?? '',
        orgId: r.item.organization?.id ?? null,
        orgName: r.item.organization?.name ?? '',
      }));
      return NextResponse.json({ success: true, data: items });
    }

    if (type === 'organization') {
      const res = await pipedrive.organizations.search({ term, limit: 10 });
      const items = (res.data?.items ?? []).map((r) => ({
        id: r.item.id,
        name: r.item.name,
      }));
      return NextResponse.json({ success: true, data: items });
    }

    return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: 'Pipedrive is not configured' },
        { status: 503 },
      );
    }
    if (err instanceof PipedriveError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    console.error('[new-lead/search] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
