'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  GitBranch,
  UserCheck,
  UserX,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  fetchAppUsers,
  fetchAppRoles,
  addAppUser,
  updateAppUser,
  deleteAppUser,
  updateUserPermissions,
  fetchUserPipelines,
  assignUserPipelines,
  fetchRolePermissions,
} from '@/lib/supabase/user-actions';
import { PERMISSION_LABELS } from '@/lib/constants';
import type { AppRole, AppUserWithRole } from '@/types';

// ─── Permission Groups ────────────────────────────────
const PERMISSION_GROUPS: { label: string; perms: string[] }[] = [
  { label: 'Portal Access', perms: ['portal:admin', 'portal:caller'] },
  { label: 'Dashboard', perms: ['dashboard:view'] },
  {
    label: 'Pipelines',
    perms: [
      'pipeline:view',
      'pipeline:edit',
      'pipeline_assignments:view',
      'pipeline_assignments:edit',
    ],
  },
  { label: 'Deals', perms: ['deals:view', 'deals:edit', 'deals:delete'] },
  { label: 'Prospects', perms: ['prospects:view', 'prospects:edit'] },
  { label: 'Partners', perms: ['partners:view', 'partners:edit', 'partners:delete'] },
  { label: 'Settings', perms: ['settings:view', 'settings:edit'] },
  { label: 'User Management', perms: ['users:view', 'users:edit'] },
  { label: 'Role Management', perms: ['roles:view', 'roles:edit', 'roles:manage_permissions'] },
  {
    label: 'Caller / Sales',
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

// ─── Helpers ──────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PipedriveOption {
  id: number;
  name: string;
}

// ─── Main Page ────────────────────────────────────────

export default function UsersPage() {
  const { data: session } = useSession();
  const sessionPerms: string[] = session?.user?.permissions ?? [];
  const canEdit = sessionPerms.includes('users:edit');
  const canAssignPipelines = sessionPerms.includes('pipeline_assignments:edit');

  // ── Page Data ───────────────────────────────────────
  const [users, setUsers] = useState<AppUserWithRole[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [allPipelines, setAllPipelines] = useState<PipedriveOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Add User Modal ──────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', name: '', roleId: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // ── Edit User Drawer ────────────────────────────────
  const [editingUser, setEditingUser] = useState<AppUserWithRole | null>(null);
  const [editTab, setEditTab] = useState<'general' | 'permissions' | 'pipelines'>('general');
  const [editForm, setEditForm] = useState({ name: '', roleId: '', isActive: true });
  const [editRolePerms, setEditRolePerms] = useState<string[]>([]);
  const [editExtraPerms, setEditExtraPerms] = useState<string[]>([]);
  const [editPipelineIds, setEditPipelineIds] = useState<number[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Role perms cache ────────────────────────────────
  const [rolePermsCache, setRolePermsCache] = useState<Record<string, string[]>>({});

  // ── Delete confirm ──────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load data on mount ──────────────────────────────
  const loadPage = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [usersData, rolesData] = await Promise.all([fetchAppUsers(), fetchAppRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to load data');
    }
    setLoading(false);
  }, []);

  const loadPipelines = useCallback(async () => {
    try {
      const res = await fetch('/api/pipedrive/pipelines');
      if (!res.ok) return;
      const json = await res.json();
      const pipes: PipedriveOption[] = (json.data?.pipelines ?? []).map(
        (p: { id: number; name: string }) => ({ id: p.id, name: p.name }),
      );
      setAllPipelines(pipes);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage();
    loadPipelines();
  }, [loadPage, loadPipelines]);

  // ── Open Edit drawer ────────────────────────────────
  const openEdit = useCallback(
    async (user: AppUserWithRole) => {
      setEditingUser(user);
      setEditTab('general');
      setEditForm({ name: user.name, roleId: user.roleId, isActive: user.isActive });
      setEditError(null);
      setEditSaving(false);

      // Fetch role perms (cached)
      let rPerms = rolePermsCache[user.roleId];
      if (!rPerms) {
        try {
          rPerms = await fetchRolePermissions(user.roleId);
          setRolePermsCache((prev) => ({ ...prev, [user.roleId]: rPerms }));
        } catch {
          rPerms = [];
        }
      }
      setEditRolePerms(rPerms);

      // Compute extra perms = user combined perms - role perms
      const extras = user.permissions.filter((p) => !rPerms.includes(p));
      setEditExtraPerms(extras);

      // Fetch pipeline assignments
      if (canAssignPipelines) {
        try {
          const pipelines = await fetchUserPipelines(user.id);
          setEditPipelineIds(pipelines.map((p) => p.pipelineId));
        } catch {
          setEditPipelineIds([]);
        }
      } else {
        setEditPipelineIds(user.pipelineIds);
      }
    },
    [rolePermsCache, canAssignPipelines],
  );

  // When role changes in edit form, update cached role perms
  const handleEditRoleChange = useCallback(
    async (newRoleId: string) => {
      setEditForm((f) => ({ ...f, roleId: newRoleId }));
      let rPerms = rolePermsCache[newRoleId];
      if (!rPerms) {
        try {
          rPerms = await fetchRolePermissions(newRoleId);
          setRolePermsCache((prev) => ({ ...prev, [newRoleId]: rPerms }));
        } catch {
          rPerms = [];
        }
      }
      setEditRolePerms(rPerms);
      // Clear portal deny overrides when role changes — new role's portals take effect
      setEditExtraPerms((prev) => prev.filter((p) => !p.endsWith(':deny')));
    },
    [rolePermsCache],
  );

  // ── Save General (name / role / status) ─────────────
  const saveGeneral = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await Promise.all([
        updateAppUser({
          id: editingUser.id,
          name: editForm.name,
          roleId: editForm.roleId,
          isActive: editForm.isActive,
        }),
        updateUserPermissions(editingUser.id, editExtraPerms),
      ]);
      await loadPage();
      setEditingUser((prev) =>
        prev
          ? {
              ...prev,
              name: editForm.name,
              roleId: editForm.roleId,
              isActive: editForm.isActive,
            }
          : null,
      );
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save');
    }
    setEditSaving(false);
  };

  // ── Save Extra Permissions ───────────────────────────
  const savePermissions = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateUserPermissions(editingUser.id, editExtraPerms);
      await loadPage();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save permissions');
    }
    setEditSaving(false);
  };

  // ── Save Pipeline Assignments ────────────────────────
  const savePipelines = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const assignments = editPipelineIds.map((id) => {
        const pipe = allPipelines.find((p) => p.id === id);
        return { pipelineId: id, pipelineName: pipe?.name ?? '' };
      });
      await assignUserPipelines(editingUser.id, assignments);
      await loadPage();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save pipeline assignments');
    }
    setEditSaving(false);
  };

  // ── Add User ─────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.email.trim() || !addForm.name.trim() || !addForm.roleId) return;
    setAddSaving(true);
    setAddError(null);
    try {
      await addAppUser(addForm);
      setShowAdd(false);
      setAddForm({ email: '', name: '', roleId: roles[0]?.id ?? '' });
      await loadPage();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add user');
    }
    setAddSaving(false);
  };

  // ── Delete User ──────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteAppUser(id);
      setDeleteConfirm(null);
      if (editingUser?.id === id) setEditingUser(null);
      await loadPage();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user');
    }
    setDeleting(false);
  };

  // ── Toggle extra permission ──────────────────────────
  const toggleExtraPerm = (perm: string) => {
    setEditExtraPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  // ── Toggle portal access (supports revoking role-granted portals via deny) ──
  const togglePortal = (perm: string) => {
    if (!canEdit) return;
    const fromRole = editRolePerms.includes(perm);
    setEditExtraPerms((prev) => {
      const isDenied = prev.includes(`${perm}:deny`);
      const isExtra = prev.includes(perm);
      const isActive = (fromRole || isExtra) && !isDenied;
      if (isActive) {
        // Turning OFF: if role grants it, add a deny; otherwise just remove the extra grant
        return fromRole
          ? [...prev.filter((p) => p !== perm), `${perm}:deny`]
          : prev.filter((p) => p !== perm);
      } else {
        // Turning ON: remove any deny, add explicit grant only if role doesn't already grant it
        const filtered = prev.filter((p) => p !== `${perm}:deny`);
        return fromRole ? filtered : [...filtered, perm];
      }
    });
  };

  // ── Toggle pipeline assignment ───────────────────────
  const togglePipeline = (id: number) => {
    setEditPipelineIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;

  // ─── Render ───────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage user access, roles, and pipeline assignments
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setShowAdd(true);
              setAddError(null);
              setAddForm({ email: '', name: '', roleId: roles[0]?.id ?? '' });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total Users</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Active</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-400">{inactiveCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Inactive</div>
        </div>
      </div>

      {/* Error */}
      {pageError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{pageError}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No users yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add users to grant portal access
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                    Portals
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    Last Login
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        {user.role.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.portals.length === 0 ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">None</span>
                        ) : (
                          user.portals.map((p) => (
                            <span
                              key={p}
                              className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                p === 'admin'
                                  ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300'
                                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {p === 'admin' ? 'Admin' : 'Sales'}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastLogin)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                          <UserCheck className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium">
                          <UserX className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEdit(user)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!canEdit && (
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="View user"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add User Modal ─────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add User</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {addError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{addError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Corporate Email
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Must match the user&apos;s Microsoft account email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Role
                </label>
                <select
                  value={addForm.roleId}
                  onChange={(e) => setAddForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={addSaving || !addForm.name.trim() || !addForm.email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {addSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Drawer ───────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingUser(null)}
          />
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingUser.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
              {(
                [
                  { key: 'general', label: 'General', icon: Users },
                  { key: 'permissions', label: 'Permissions', icon: Shield },
                  { key: 'pipelines', label: 'Pipelines', icon: GitBranch },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setEditTab(key)}
                  className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    editTab === key
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Error banner */}
            {editError && (
              <div className="mx-6 mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{editError}</p>
              </div>
            )}

            {/* ── General Tab ──────────────────────────── */}
            {editTab === 'general' && (
              <div className="flex-1 px-6 py-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm opacity-70 cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Role
                  </label>
                  <select
                    value={editForm.roleId}
                    onChange={(e) => handleEditRoleChange(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-60"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Portal Access Toggles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Portal Access
                  </label>
                  <div className="space-y-2">
                    {(
                      [
                        {
                          perm: 'portal:admin',
                          label: 'Admin Portal',
                          desc: 'Dashboard, pipelines, deals, settings',
                          activeClass:
                            'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-500/10',
                          toggleClass: 'bg-indigo-600',
                        },
                        {
                          perm: 'portal:caller',
                          label: 'Sales Portal',
                          desc: 'Leads, contacts, submissions, stats',
                          activeClass:
                            'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10',
                          toggleClass: 'bg-emerald-600',
                        },
                      ] as const
                    ).map(({ perm, label, desc, activeClass, toggleClass }) => {
                      const fromRole = editRolePerms.includes(perm);
                      const isExtra = editExtraPerms.includes(perm);
                      const isActive = fromRole || isExtra;
                      return (
                        <div
                          key={perm}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                            isActive
                              ? activeClass
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {label}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {desc}
                              </span>
                              {fromRole && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  from role
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => canEdit && togglePortal(perm)}
                            disabled={!canEdit}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                              isActive ? toggleClass : 'bg-gray-300 dark:bg-gray-600'
                            } ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {editRolePerms.some((p) => p === 'portal:admin' || p === 'portal:caller') && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      Portals marked &quot;from role&quot; are granted by the role but can be
                      toggled off per user. Changing the role resets any overrides.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Active</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Inactive users cannot log in
                    </div>
                  </div>
                  <button
                    onClick={() => canEdit && setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                    disabled={!canEdit}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editForm.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } disabled:opacity-60`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editForm.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {canEdit && (
                  <button
                    onClick={saveGeneral}
                    disabled={editSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    {editSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                )}
              </div>
            )}

            {/* ── Permissions Tab ──────────────────────── */}
            {editTab === 'permissions' && (
              <div className="flex-1 px-6 py-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Permissions granted by the role are shown as inherited. Check additional
                  permissions to grant them directly to this user.
                </p>

                <div className="space-y-5">
                  {PERMISSION_GROUPS.filter((g) => g.label !== 'Portal Access').map((group) => (
                    <div key={group.label}>
                      <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                        {group.label}
                      </h4>
                      <div className="space-y-1.5">
                        {group.perms.map((perm) => {
                          const fromRole = editRolePerms.includes(perm);
                          const isExtra = editExtraPerms.includes(perm);
                          return (
                            <label
                              key={perm}
                              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                                fromRole
                                  ? 'opacity-60 cursor-default'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={fromRole || isExtra}
                                disabled={fromRole || !canEdit}
                                onChange={() => !fromRole && toggleExtraPerm(perm)}
                                className="w-4 h-4 rounded text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                              />
                              <span className="flex-1 text-sm text-gray-900 dark:text-white">
                                {PERMISSION_LABELS[perm] ?? perm}
                              </span>
                              {fromRole && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                  from role
                                </span>
                              )}
                              {!fromRole && isExtra && (
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                  extra
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {canEdit && (
                  <button
                    onClick={savePermissions}
                    disabled={editSaving}
                    className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    {editSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Permissions
                  </button>
                )}
              </div>
            )}

            {/* ── Pipelines Tab ────────────────────────── */}
            {editTab === 'pipelines' && (
              <div className="flex-1 px-6 py-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Restrict this user to specific Pipedrive pipelines. If no pipelines are selected,
                  the user can access all pipelines.
                </p>
                {editPipelineIds.length === 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-4">
                    ✓ Currently unrestricted — can access all pipelines
                  </p>
                )}
                {editPipelineIds.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-4">
                    Restricted to {editPipelineIds.length} pipeline
                    {editPipelineIds.length !== 1 ? 's' : ''}
                  </p>
                )}

                {allPipelines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <GitBranch className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No pipelines available
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Configure Pipedrive pipelines first
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allPipelines.map((pipe) => {
                      const assigned = editPipelineIds.includes(pipe.id);
                      return (
                        <label
                          key={pipe.id}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={assigned}
                            disabled={!canAssignPipelines}
                            onChange={() => togglePipeline(pipe.id)}
                            className="w-4 h-4 rounded text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                          />
                          <GitBranch className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {pipe.name}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">ID: {pipe.id}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {canAssignPipelines && (
                  <div className="mt-5 space-y-2">
                    <button
                      onClick={savePipelines}
                      disabled={editSaving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                    >
                      {editSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save Pipeline Assignments
                    </button>
                    {editPipelineIds.length > 0 && (
                      <button
                        onClick={() => setEditPipelineIds([])}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                      >
                        Clear — grant unrestricted access
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Drawer footer with delete */}
            {canEdit && (
              <div className="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setDeleteConfirm(editingUser.id)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>
              </div>
            )}
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
              Delete User
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
              This will permanently remove the user and revoke all portal access. This action cannot
              be undone.
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
