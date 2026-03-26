import pipedrive from '@/lib/pipedrive';
import { handlePipedrive } from '../../_helpers';

/**
 * GET /api/pipedrive/deals/summary
 * Proxy for Pipedrive GET /v1/deals/summary.
 */
export async function GET() {
  return handlePipedrive(() => pipedrive.deals.summary({ status: 'open' }));
}
