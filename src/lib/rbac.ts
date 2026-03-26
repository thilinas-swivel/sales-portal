'use server';

import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { AppUserWithRole, PortalType } from '@/types';

/**
 * Fetches the currently logged-in application user with their role,
 * effective permissions (role + user overrides), portal access,
 * and pipeline assignments.
 */
export async function getAppUser(): Promise<AppUserWithRole | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const supabase = await createClient();

  // Fetch user with their role
  const { data: appUser, error: userError } = await supabase
    .from('app_users')
    .select(
      `
      id, email, name, role_id, is_active, last_login, created_at, updated_at,
      app_roles!inner ( id, name, label, description, sort_order, is_system )
    `,
    )
    .eq('email', session.user.email.toLowerCase())
    .single();

  if (userError || !appUser || !appUser.is_active) return null;

  const roleData = (appUser as Record<string, unknown>).app_roles as {
    id: string;
    name: string;
    label: string;
    description: string;
    sort_order: number;
    is_system: boolean;
  };

  // Fetch role permissions
  const { data: rolePerms } = await supabase
    .from('app_role_permissions')
    .select('permission')
    .eq('role_id', roleData.id);

  // Fetch user-specific permission overrides
  const { data: userPerms } = await supabase
    .from('app_user_permissions')
    .select('permission')
    .eq('user_id', appUser.id);

  // Effective permissions = role_perms ∪ user_perms (additive)
  const permissions = [
    ...new Set([
      ...(rolePerms?.map((p) => p.permission) ?? []),
      ...(userPerms?.map((p) => p.permission) ?? []),
    ]),
  ];

  // Derive portal access
  const portals: PortalType[] = [];
  if (permissions.includes('portal:admin')) portals.push('admin');
  if (permissions.includes('portal:caller')) portals.push('caller');

  // Fetch pipeline assignments
  const { data: pipelineRows } = await supabase
    .from('app_user_pipelines')
    .select('pipeline_id')
    .eq('user_id', appUser.id);

  const pipelineIds = pipelineRows?.map((p) => p.pipeline_id) ?? [];

  return {
    id: appUser.id,
    email: appUser.email,
    name: appUser.name,
    roleId: appUser.role_id,
    isActive: appUser.is_active,
    lastLogin: appUser.last_login,
    createdAt: appUser.created_at,
    updatedAt: appUser.updated_at,
    role: {
      id: roleData.id,
      name: roleData.name,
      label: roleData.label,
      description: roleData.description,
      sortOrder: roleData.sort_order,
      isSystem: roleData.is_system,
    },
    permissions,
    portals,
    pipelineIds,
  };
}

/** Check if a user has a specific permission. */
export async function hasPermission(
  user: AppUserWithRole | null,
  permission: string,
): Promise<boolean> {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Guard: ensures a valid app user session exists and optionally has
 * the required permission. Throws if unauthorized.
 */
export async function requireAuth(permission?: string): Promise<AppUserWithRole> {
  const user = await getAppUser();
  if (!user) throw new Error('Unauthorized: no valid session');
  if (permission && !user.permissions.includes(permission)) {
    throw new Error(`Forbidden: missing permission '${permission}'`);
  }
  return user;
}

/**
 * Check if a user can access a specific Pipedrive pipeline.
 * Returns true if the user has no pipeline restrictions (admin) or
 * if the given pipeline ID is in their assigned list.
 */
export async function canAccessPipeline(
  user: AppUserWithRole | null,
  pipelineId: number,
): Promise<boolean> {
  if (!user) return false;
  // No assignments = unrestricted access
  if (user.pipelineIds.length === 0) return true;
  return user.pipelineIds.includes(pipelineId);
}

/**
 * Get the pipeline IDs a user is restricted to.
 * Returns an empty array for unrestricted users.
 */
export async function getUserPipelineIds(user: AppUserWithRole | null): Promise<number[]> {
  if (!user) return [];
  return user.pipelineIds;
}
