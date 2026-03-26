import pipedrive from '@/lib/pipedrive';
import { handlePipedrive } from '../_helpers';

/**
 * GET /api/pipedrive/users
 * Returns all users in the Pipedrive company account.
 */
export async function GET() {
  return handlePipedrive(() => pipedrive.users.list());
}
