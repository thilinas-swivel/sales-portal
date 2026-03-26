import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const portals = session.user.portals ?? [];

  // Single portal → go directly
  if (portals.length === 1) {
    redirect(portals[0] === 'admin' ? '/admin' : '/caller');
  }

  // Multiple portals → let user choose on login page
  if (portals.length > 1) {
    redirect('/login');
  }

  // No portals → access denied
  redirect('/login?error=AccessDenied');
}
