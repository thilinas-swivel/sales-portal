'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  X,
  Lock,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchAppRoles,
  createAppRole,
  updateAppRole,
  deleteAppRole,
  fetchRolePermissions,
  updateRolePermissions,
} from '@/lib/supabase/user-actions';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/constants';
import type { AppRole } from '@/types';

// ─── Permission Groups ────────────────────────────────
const PERMISSION_GROUPS: { label: string; color: string; perms: string[] }[] = [
  {
    label: 'Portal Access',
    color: 'indigo',
    perms: ['portal:admin', 'portal:caller'],
  },
  {
    label: 'Dashboard',
    color: 'blue',
    perms: ['dashboard:view'],
  },
  {
    label: 'Pipelines',
    color: 'violet',
    perms: [
      'pipeline:view',
      'pipeline:edit',
      'pipeline_assignments:view',
      'pipeline_assignments:edit',
    ],
  },
  {
    label: 'Deals',
    color: 'orange',
    perms: ['deals:view', 'deals:edit', 'deals:delete'],
  },
  {
    label: 'Prospects',
    color: 'amber',
    perms: ['prospects:view', 'prospects:edit'],
  },
  {
    label: 'Partners',
    color: 'teal',
    perms: ['partners:view', 'partners:edit', 'partners:delete'],
  },
  {
    label: 'Settings',
    color: 'gray',
    perms: ['settings:view', 'settings:edit'],
  },
  {
    label: 'User Management',
    color: 'pink',
    perms: ['users:view', 'users:edit'],
  },
  {
    label: 'Role Management',
    color: 'purple',
    perms: ['roles:view', 'roles:edit', 'roles:manage_permissions'],
  },
  {
    label: 'Caller / Sales',
    color: 'emerald',
    perms: [
      'leads:view',
      'leads:create',
      'leads:edit',
      'contacts:view',
      'contacts:edit',
      'caller_stats:view',
    ],
  },
];

const GROUP_COLORS: Record<string, string> = {
  indigo:
    'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  violet:
    'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  orange:
    'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  amber:
    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  pink: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  purple:
    'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  emerald:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

// ─── Main Page ────────────────────────────────────────

export default function RolesPage() {
  const { data: session } = useSession();
  const sessionPerms: string[] = session?.user?.permissions ?? [];
  const canEditRoles = sessionPerms.includes('roles:edit');
  const canManagePerms = sessionPerms.includes('roles:manage_permissions');

  // ── Page Data ───────────────────────────────────────
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Role permissions cache: roleId -> string[]
  const [rolePermsCache, setRolePermsCache] = useState<Record<string, string[]>>({});
  // Which roles have expanded permission preview
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // ── Create Role Modal ───────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', label: '', description: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  // ── Edit Role Modal ─────────────────────────────────
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [editForm, setEditForm] = useState({ label: '', description: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // ── Permissions Modal ───────────────────────────────
  const [permsRole, setPermsRole] = useState<AppRole | null>(null);
  const [permsSelected, setPermsSelected] = useState<string[]>([]);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);

  // ── Delete confirm ──────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load roles ──────────────────────────────────────
  const loadRoles = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await fetchAppRoles();
      setRoles(data);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to load roles');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoles();
  }, [loadRoles]);

  // ── Get / cache role permissions ────────────────────
  const getRolePerms = useCallback(
    async (roleId: string): Promise<string[]> => {
      if (rolePermsCache[roleId]) return rolePermsCache[roleId];
      try {
        const perms = await fetchRolePermissions(roleId);
        setRolePermsCache((prev) => ({ ...prev, [roleId]: perms }));
        return perms;
      } catch {
        return [];
      }
    },
    [rolePermsCache],
  );

  // ── Toggle permission preview expansion ─────────────
  const toggleExpand = useCallback(
    async (roleId: string) => {
      await getRolePerms(roleId);
      setExpandedRoles((prev) => {
        const next = new Set(prev);
        if (next.has(roleId)) next.delete(roleId);
        else next.add(roleId);
        return next;
      });
    },
    [getRolePerms],
  );

  // ── Open permissions modal ───────────────────────────
  const openPermsModal = useCallback(
    async (role: AppRole) => {
      const perms = await getRolePerms(role.id);
      setPermsSelected([...perms]);
      setPermsRole(role);
      setPermsError(null);
    },
    [getRolePerms],
  );

  // ── Create Role ──────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.label.trim()) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      await createAppRole({
        name: createForm.name || createForm.label,
        label: createForm.label,
        description: createForm.description,
      });
      setShowCreate(false);
      setCreateForm({ name: '', label: '', description: '' });
      await loadRoles();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create role');
    }
    setCreateSaving(false);
  };

  // ── Update Role ──────────────────────────────────────
  const handleEdit = async () => {
    if (!editingRole || !editForm.label.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateAppRole({
        id: editingRole.id,
        label: editForm.label,
        description: editForm.description,
      });
      setEditingRole(null);
      await loadRoles();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save role');
    }
    setEditSaving(false);
  };

  // ── Save Permissions ─────────────────────────────────
  const savePermissions = async () => {
    if (!permsRole) return;
    setPermsSaving(true);
    setPermsError(null);
    try {
      await updateRolePermissions(permsRole.id, permsSelected);
      setRolePermsCache((prev) => ({ ...prev, [permsRole.id]: [...permsSelected] }));
      setPermsRole(null);
      await loadRoles();
    } catch (e) {
      setPermsError(e instanceof Error ? e.message : 'Failed to save permissions');
    }
    setPermsSaving(false);
  };

  // ── Delete Role ──────────────────────────────────────
  const handleDelete = async (roleId: string) => {
    setDeleting(true);
    try {
      await deleteAppRole(roleId);
      setDeleteConfirm(null);
      await loadRoles();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete role');
    }
    setDeleting(false);
  };

  // ── Toggle single permission ─────────────────────────
  const togglePerm = (perm: string) => {
    setPermsSelected((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  // ── Toggle whole group ───────────────────────────────
  const toggleGroup = (perms: string[]) => {
    const allSelected = perms.every((p) => permsSelected.includes(p));
    if (allSelected) {
      setPermsSelected((prev) => prev.filter((p) => !perms.includes(p)));
    } else {
      setPermsSelected((prev) => [...new Set([...prev, ...perms])]);
    }
  };

  const totalPerms = ALL_PERMISSIONS.length;

  // ─── Render ───────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Roles</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage roles and their permission sets
          </p>
        </div>
        {canEditRoles && (
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateError(null);
              setCreateForm({ name: '', label: '', description: '' });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      {/* Error */}
      {pageError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{pageError}</p>
        </div>
      )}

      {/* Roles List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => {
            const perms = rolePermsCache[role.id] ?? [];
            const expanded = expandedRoles.has(role.id);
            return (
              <div
                key={role.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
              >
                {/* Role Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {role.label}
                        </h3>
                        {role.isSystem && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <Lock className="w-3 h-3" />
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {role.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Permission count badge */}
                    <button
                      onClick={() => toggleExpand(role.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {rolePermsCache[role.id] ? `${perms.length}/${totalPerms}` : 'Show perms'}
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>

                    {canManagePerms && (
                      <button
                        onClick={() => openPermsModal(role)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Permissions
                      </button>
                    )}

                    {canEditRoles && (
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setEditForm({ label: role.label, description: role.description ?? '' });
                          setEditError(null);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                        title="Edit role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}

                    {canEditRoles && !role.isSystem && (
                      <button
                        onClick={() => setDeleteConfirm(role.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                        title="Delete role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Permission Preview */}
                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-50 dark:border-gray-800 pt-4">
                    {perms.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">
                        No permissions assigned to this role
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {PERMISSION_GROUPS.flatMap((g) =>
                          g.perms
                            .filter((p) => perms.includes(p))
                            .map((p) => (
                              <span
                                key={p}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${GROUP_COLORS[g.color]}`}
                              >
                                {PERMISSION_LABELS[p] ?? p}
                              </span>
                            )),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Role Modal ──────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Role</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {createError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{createError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Sales Executive"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this role's responsibilities"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createSaving || !createForm.label.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {createSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ────────────────────────────── */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Role</h3>
              <button
                onClick={() => setEditingRole(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{editError}</p>
                </div>
              )}

              {editingRole.isSystem && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    System roles cannot have their name or type changed.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editSaving || !editForm.label.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {editSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Permissions Modal ───────────────────── */}
      {permsRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Permissions — {permsRole.label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {permsSelected.length} of {totalPerms} permissions granted
                </p>
              </div>
              <button
                onClick={() => setPermsRole(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permission error */}
            {permsError && (
              <div className="mx-6 mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{permsError}</p>
              </div>
            )}

            {/* Permission Groups */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {PERMISSION_GROUPS.map((group) => {
                const groupSelected = group.perms.filter((p) => permsSelected.includes(p));
                const allSelected = groupSelected.length === group.perms.length;
                const someSelected = groupSelected.length > 0 && !allSelected;
                return (
                  <div key={group.label}>
                    {/* Group header with toggle all */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {group.label}
                      </h4>
                      <button
                        onClick={() => toggleGroup(group.perms)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        {allSelected ? 'Deselect all' : someSelected ? 'Select all' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.perms.map((perm) => {
                        const selected = permsSelected.includes(perm);
                        return (
                          <label
                            key={perm}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => togglePerm(perm)}
                              className="w-4 h-4 rounded text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {PERMISSION_LABELS[perm] ?? perm}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => setPermsSelected([])}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Clear all
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setPermsRole(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePermissions}
                  disabled={permsSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {permsSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
              Delete Role
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
              This role will be permanently deleted. Users assigned to this role must be reassigned
              first.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
