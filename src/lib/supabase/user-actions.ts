'use server';

import { revalidatePath } from 'next/cache';
import type { AppRole, AppUser, AppUserWithRole, AppUserPipeline, PortalType } from '@/types';
import { getAppUser, hasPermission } from '@/lib/rbac';
import { createClient } from '@/lib/supabase/server';

// ── Guard ────────────────────────────────────────────
async function requirePermission(permission: string) {
  const currentUser = await getAppUser();
  if (!currentUser || !(await hasPermission(currentUser, permission))) {
    throw new Error(`Forbidden: requires '${permission}' permission`);
  }
  return currentUser;
}

// =============================================================================
// ROLES
// =============================================================================

// ── Fetch Roles ──────────────────────────────────────
export async function fetchAppRoles(): Promise<AppRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('app_roles').select('*').order('sort_order');

  if (error) throw new Error(`Failed to fetch roles: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    label: r.label,
    description: r.description,
    sortOrder: r.sort_order,
    isSystem: r.is_system,
  }));
}

// ── Create Role (requires 'roles:edit') ──────────────
export async function createAppRole(input: {
  name: string;
  label: string;
  description: string;
}): Promise<AppRole> {
  await requirePermission('roles:edit');
  const supabase = await createClient();

  // Determine next sort_order
  const { data: maxRow } = await supabase
    .from('app_roles')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSort = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('app_roles')
    .insert({
      name: input.name.trim().toLowerCase().replace(/\s+/g, '_'),
      label: input.label.trim(),
      description: input.description.trim(),
      sort_order: nextSort,
      is_system: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create role: ${error.message}`);

  revalidatePath('/');
  return {
    id: data.id,
    name: data.name,
    label: data.label,
    description: data.description,
    sortOrder: data.sort_order,
    isSystem: data.is_system,
  };
}

// ── Update Role (requires 'roles:edit') ──────────────
export async function updateAppRole(input: {
  id: string;
  label: string;
  description: string;
}): Promise<void> {
  await requirePermission('roles:edit');
  const supabase = await createClient();

  // Prevent editing system role names
  const { data: existing } = await supabase
    .from('app_roles')
    .select('is_system')
    .eq('id', input.id)
    .single();

  if (!existing) throw new Error('Role not found');

  const { error } = await supabase
    .from('app_roles')
    .update({
      label: input.label.trim(),
      description: input.description.trim(),
    })
    .eq('id', input.id);

  if (error) throw new Error(`Failed to update role: ${error.message}`);
  revalidatePath('/');
}

// ── Delete Role (requires 'roles:edit', non-system only) ──
export async function deleteAppRole(roleId: string): Promise<void> {
  await requirePermission('roles:edit');
  const supabase = await createClient();

  const { data: role } = await supabase
    .from('app_roles')
    .select('is_system')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error('Role not found');
  if (role.is_system) throw new Error('Cannot delete a system role');

  // Check if any users are still assigned to this role
  const { count } = await supabase
    .from('app_users')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId);

  if (count && count > 0) {
    throw new Error('Cannot delete role: users are still assigned to it');
  }

  const { error } = await supabase.from('app_roles').delete().eq('id', roleId);

  if (error) throw new Error(`Failed to delete role: ${error.message}`);
  revalidatePath('/');
}

// ── Update Role Permissions (requires 'roles:manage_permissions') ──
export async function updateRolePermissions(roleId: string, permissions: string[]): Promise<void> {
  await requirePermission('roles:manage_permissions');
  const supabase = await createClient();

  // Delete existing role permissions
  await supabase.from('app_role_permissions').delete().eq('role_id', roleId);

  // Insert new permissions
  if (permissions.length > 0) {
    const rows = permissions.map((p) => ({
      role_id: roleId,
      permission: p,
    }));
    const { error } = await supabase.from('app_role_permissions').insert(rows);
    if (error) throw new Error(`Failed to update role permissions: ${error.message}`);
  }

  revalidatePath('/');
}

// ── Fetch Role Permissions ───────────────────────────
export async function fetchRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_role_permissions')
    .select('permission')
    .eq('role_id', roleId);

  if (error) throw new Error(`Failed to fetch role permissions: ${error.message}`);
  return data?.map((r) => r.permission) ?? [];
}

// =============================================================================
// USERS
// =============================================================================

// ── Fetch User Count ─────────────────────────────────
export async function fetchAppUserCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('app_users')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`Failed to fetch user count: ${error.message}`);
  return count ?? 0;
}

// ── Fetch All Users (requires 'users:view') ──────────
export async function fetchAppUsers(): Promise<AppUserWithRole[]> {
  await requirePermission('users:view');

  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from('app_users')
    .select(
      `
      id, email, name, role_id, is_active, last_login, created_at, updated_at,
      app_roles!inner ( id, name, label, description, sort_order, is_system )
    `,
    )
    .order('name');

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);

  // For each user, fetch their permissions and pipeline assignments
  const result: AppUserWithRole[] = [];
  for (const u of users ?? []) {
    const roleData = (u as Record<string, unknown>).app_roles as {
      id: string;
      name: string;
      label: string;
      description: string;
      sort_order: number;
      is_system: boolean;
    };

    const { data: rolePerms } = await supabase
      .from('app_role_permissions')
      .select('permission')
      .eq('role_id', roleData.id);

    const { data: userPerms } = await supabase
      .from('app_user_permissions')
      .select('permission')
      .eq('user_id', u.id);

    const permissions = [
      ...new Set([
        ...(rolePerms?.map((p) => p.permission) ?? []),
        ...(userPerms?.map((p) => p.permission) ?? []),
      ]),
    ];

    const portals: PortalType[] = [];
    if (permissions.includes('portal:admin')) portals.push('admin');
    if (permissions.includes('portal:caller')) portals.push('caller');

    const { data: pipelineRows } = await supabase
      .from('app_user_pipelines')
      .select('pipeline_id')
      .eq('user_id', u.id);

    const pipelineIds = pipelineRows?.map((p) => p.pipeline_id) ?? [];

    result.push({
      id: u.id,
      email: u.email,
      name: u.name,
      roleId: u.role_id,
      isActive: u.is_active,
      lastLogin: u.last_login,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
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
    });
  }

  return result;
}

// ── Add User (requires 'users:edit') ─────────────────
export async function addAppUser(input: {
  email: string;
  name: string;
  roleId: string;
}): Promise<AppUser> {
  await requirePermission('users:edit');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_users')
    .insert({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      role_id: input.roleId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add user: ${error.message}`);

  revalidatePath('/');
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    roleId: data.role_id,
    isActive: data.is_active,
    lastLogin: data.last_login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ── Update User (requires 'users:edit') ──────────────
export async function updateAppUser(input: {
  id: string;
  name: string;
  roleId: string;
  isActive: boolean;
}): Promise<void> {
  await requirePermission('users:edit');
  const supabase = await createClient();

  const { error } = await supabase
    .from('app_users')
    .update({
      name: input.name.trim(),
      role_id: input.roleId,
      is_active: input.isActive,
    })
    .eq('id', input.id);

  if (error) throw new Error(`Failed to update user: ${error.message}`);
  revalidatePath('/');
}

// ── Update Per-User Permissions (requires 'users:edit') ──
export async function updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
  const currentUser = await requirePermission('users:edit');
  const supabase = await createClient();

  // Delete existing user-specific permissions
  await supabase.from('app_user_permissions').delete().eq('user_id', userId);

  // Insert new ones
  if (permissions.length > 0) {
    const rows = permissions.map((p) => ({
      user_id: userId,
      permission: p,
      granted_by: currentUser.id,
    }));
    const { error } = await supabase.from('app_user_permissions').insert(rows);
    if (error) throw new Error(`Failed to update permissions: ${error.message}`);
  }

  revalidatePath('/');
}

// =============================================================================
// PIPELINE ASSIGNMENTS
// =============================================================================

// ── Fetch Pipeline Assignments for a User ────────────
export async function fetchUserPipelines(userId: string): Promise<AppUserPipeline[]> {
  await requirePermission('pipeline_assignments:view');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_user_pipelines')
    .select('*')
    .eq('user_id', userId)
    .order('assigned_at');

  if (error) throw new Error(`Failed to fetch pipeline assignments: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    pipelineId: r.pipeline_id,
    pipelineName: r.pipeline_name,
    assignedBy: r.assigned_by,
    assignedAt: r.assigned_at,
  }));
}

// ── Assign Pipelines to a User (replaces all) ────────
export async function assignUserPipelines(
  userId: string,
  pipelines: { pipelineId: number; pipelineName: string }[],
): Promise<void> {
  const currentUser = await requirePermission('pipeline_assignments:edit');
  const supabase = await createClient();

  // Remove all existing assignments
  await supabase.from('app_user_pipelines').delete().eq('user_id', userId);

  // Insert new assignments
  if (pipelines.length > 0) {
    const rows = pipelines.map((p) => ({
      user_id: userId,
      pipeline_id: p.pipelineId,
      pipeline_name: p.pipelineName,
      assigned_by: currentUser.id,
    }));
    const { error } = await supabase.from('app_user_pipelines').insert(rows);
    if (error) throw new Error(`Failed to assign pipelines: ${error.message}`);
  }

  revalidatePath('/');
}

// ── Delete User (requires 'users:edit') ──────────────
export async function deleteAppUser(id: string): Promise<void> {
  await requirePermission('users:edit');
  const supabase = await createClient();

  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
  revalidatePath('/');
}
