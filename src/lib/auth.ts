import { createClient } from '@supabase/supabase-js';
import NextAuth from 'next-auth';
import type { PortalType } from '@/types';
import { authConfig } from './auth.config';

/** Lightweight Supabase client for auth callbacks (no SSR cookie management). */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;

      const supabase = getSupabase();
      const { data } = await supabase
        .from('app_users')
        .select('id, is_active')
        .eq('email', user.email.toLowerCase())
        .single();

      // Reject if user isn't in app_users or is deactivated
      if (!data || !data.is_active) {
        return '/login?error=AccessDenied';
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      // On initial sign-in or manual update, enrich the JWT with role data
      if (user?.email || trigger === 'update') {
        const email = (user?.email ?? token.email) as string;
        if (!email) return token;

        const supabase = getSupabase();

        // Fetch the app_user with their role
        const { data: appUser } = await supabase
          .from('app_users')
          .select(
            `
            id, email, name, is_active, role_id,
            app_roles!inner ( id, name, label, description, sort_order )
          `,
          )
          .eq('email', email.toLowerCase())
          .single();

        if (appUser && appUser.is_active) {
          const role = (appUser as Record<string, unknown>).app_roles as {
            id: string;
            name: string;
            label: string;
          };

          // Fetch role permissions
          const { data: rolePerms } = await supabase
            .from('app_role_permissions')
            .select('permission')
            .eq('role_id', role.id);

          // Fetch user-specific permission overrides
          const { data: userPerms } = await supabase
            .from('app_user_permissions')
            .select('permission')
            .eq('user_id', appUser.id);

          const userPermList = userPerms?.map((p) => p.permission) ?? [];
          const userPermSet = new Set(userPermList);
          const permissions = [
            ...new Set([
              ...(rolePerms?.map((p) => p.permission) ?? []),
              ...userPermList.filter((p) => !p.endsWith(':deny')),
            ]),
          ];

          // Derive portal access: role or user grants, minus explicit per-user denies
          const portals: PortalType[] = [];
          if (permissions.includes('portal:admin') && !userPermSet.has('portal:admin:deny'))
            portals.push('admin');
          if (permissions.includes('portal:caller') && !userPermSet.has('portal:caller:deny'))
            portals.push('caller');

          // Fetch pipeline assignments
          const { data: pipelineRows } = await supabase
            .from('app_user_pipelines')
            .select('pipeline_id')
            .eq('user_id', appUser.id);

          const pipelineIds = pipelineRows?.map((p) => p.pipeline_id) ?? [];

          token.appUserId = appUser.id;
          token.role = role.name;
          token.roleLabel = role.label;
          token.permissions = permissions;
          token.portals = portals;
          token.pipelineIds = pipelineIds;

          // Update last_login
          await supabase
            .from('app_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', appUser.id);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.appUserId = token.appUserId as string;
        session.user.role = token.role as string;
        session.user.roleLabel = token.roleLabel as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.portals = (token.portals as PortalType[]) ?? [];
        session.user.pipelineIds = (token.pipelineIds as number[]) ?? [];
      }
      return session;
    },
  },
});
