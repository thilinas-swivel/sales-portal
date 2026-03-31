import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import { cached } from '@/lib/cache';
import type { PipedriveDeal } from '@/types/pipedrive';

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const CUTOFF_DAYS = 14;

export interface CallerNotification {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  dealId: number;
}

export interface CallerNotificationsResponse {
  notifications: CallerNotification[];
}

function daysAgo(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function dealToNotification(deal: PipedriveDeal): CallerNotification | null {
  const cutoff = CUTOFF_DAYS;

  const org = (deal.org_name as string | null | undefined) ?? null;
  const who = org ? `with ${org}` : null;

  if (deal.status === 'won') {
    const ts = (deal.won_time as string | null | undefined) ?? deal.update_time;
    if (daysAgo(ts) > cutoff) return null;
    return {
      id: `deal-${deal.id}-won`,
      type: 'success',
      title: 'Deal Won',
      message: who
        ? `"${deal.title}" ${who} has been marked as won.`
        : `"${deal.title}" has been marked as won.`,
      timestamp: ts,
      dealId: deal.id,
    };
  }

  if (deal.status === 'lost') {
    const ts = (deal.lost_time as string | null | undefined) ?? deal.update_time;
    if (daysAgo(ts) > cutoff) return null;
    return {
      id: `deal-${deal.id}-lost`,
      type: 'warning',
      title: 'Deal Lost',
      message: who
        ? `"${deal.title}" ${who} was marked as lost.`
        : `"${deal.title}" was marked as lost.`,
      timestamp: ts,
      dealId: deal.id,
    };
  }

  if (deal.status === 'open') {
    const stageChanged = (deal.stage_change_time as string | null | undefined) ?? null;

    if (daysAgo(deal.add_time) <= 3) {
      return {
        id: `deal-${deal.id}-added`,
        type: 'info',
        title: 'New Lead Added',
        message: who
          ? `"${deal.title}" for ${org} was added to the pipeline.`
          : `"${deal.title}" was added to the pipeline.`,
        timestamp: deal.add_time,
        dealId: deal.id,
      };
    }

    if (stageChanged && daysAgo(stageChanged) <= 7) {
      return {
        id: `deal-${deal.id}-stage`,
        type: 'info',
        title: 'Stage Updated',
        message: who
          ? `"${deal.title}" ${who} moved to a new stage.`
          : `"${deal.title}" moved to a new stage.`,
        timestamp: stageChanged,
        dealId: deal.id,
      };
    }

    if (daysAgo(deal.update_time) <= cutoff) {
      return {
        id: `deal-${deal.id}-updated`,
        type: 'info',
        title: 'Lead Updated',
        message: who
          ? `"${deal.title}" ${who} was recently updated.`
          : `"${deal.title}" was recently updated.`,
        timestamp: deal.update_time,
        dealId: deal.id,
      };
    }
  }

  return null;
}

/**
 * GET /api/caller/notifications
 *
 * Returns recent deal activity for the caller's pipelines as a notification feed.
 * Won/lost deals and recently added/updated leads from the last 14 days.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.permissions?.includes('portal:caller')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];
  if (allowedPipelineIds.length === 0) {
    return NextResponse.json({ notifications: [] } satisfies CallerNotificationsResponse);
  }

  const cacheKey = `caller:notifications:${allowedPipelineIds.join(',')}`;

  try {
    const notifications = await cached(
      cacheKey,
      async () => {
        // Fetch won, lost, and open deals from each pipeline in parallel
        const batches = await Promise.all(
          allowedPipelineIds.flatMap((id) => [
            pipedrive.pipelines.deals(id, { status: 'won', limit: 15 }),
            pipedrive.pipelines.deals(id, { status: 'lost', limit: 15 }),
            pipedrive.pipelines.deals(id, { status: 'open', limit: 30 }),
          ]),
        );

        const allDeals = batches.flatMap((r) => r.data ?? []);

        // Deduplicate by deal id + status (a deal can only produce one notification)
        const seen = new Set<string>();
        const result: CallerNotification[] = [];

        for (const deal of allDeals) {
          const notif = dealToNotification(deal);
          if (!notif || seen.has(notif.id)) continue;
          seen.add(notif.id);
          result.push(notif);
        }

        return result
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 30);
      },
      CACHE_TTL,
    );

    return NextResponse.json({ notifications } satisfies CallerNotificationsResponse);
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json({ notifications: [] } satisfies CallerNotificationsResponse);
    }
    if (err instanceof PipedriveError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[notifications] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
