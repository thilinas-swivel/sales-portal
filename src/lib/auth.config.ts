/**
 * NextAuth config safe for Edge Runtime.
 * No Supabase or Node-only imports here — only provider config and page routes.
 */
import type { NextAuthConfig } from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { PortalType } from '@/types';

// Extend the NextAuth Session type to include app role info
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      appUserId?: string;
      role?: string;
      roleLabel?: string;
      permissions?: string[];
      portals?: PortalType[];
      /** Pipedrive pipeline IDs this user is restricted to (empty = all). */
      pipelineIds?: number[];
    };
  }
}

export const authConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    // Edge-safe: maps JWT token fields onto session.user so middleware and
    // client useSession() can read portals and permissions.
    session({ session, token }) {
      if (session.user) {
        session.user.portals = (token.portals as PortalType[]) ?? [];
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.appUserId = token.appUserId as string | undefined;
        session.user.role = token.role as string | undefined;
        session.user.roleLabel = token.roleLabel as string | undefined;
        session.user.pipelineIds = (token.pipelineIds as number[]) ?? [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
