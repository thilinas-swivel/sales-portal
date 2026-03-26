/**
 * Application-wide constants.
 */

export const APP_NAME = 'LeadFlow - Sales Portal';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN: '/admin',
  CALLER: '/caller',
  DASHBOARD: '/dashboard',
  API: {
    HEALTH: '/api/health',
    PIPEDRIVE: {
      DEALS: '/api/pipedrive/deals',
      DEALS_SUMMARY: '/api/pipedrive/deals/summary',
      LEADS: '/api/pipedrive/leads',
      PERSONS: '/api/pipedrive/persons',
      ORGANIZATIONS: '/api/pipedrive/organizations',
      PIPELINES: '/api/pipedrive/pipelines',
      ACTIVITIES: '/api/pipedrive/activities',
      USERS: '/api/pipedrive/users',
    },
  },
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ─── RBAC Permissions ────────────────────────────────

export const ALL_PERMISSIONS = [
  // Portal access
  'portal:admin',
  'portal:caller',
  // Dashboard
  'dashboard:view',
  // Pipeline
  'pipeline:view',
  'pipeline:edit',
  // Deals
  'deals:view',
  'deals:edit',
  'deals:delete',
  // Prospects
  'prospects:view',
  'prospects:edit',
  // Partners
  'partners:view',
  'partners:edit',
  'partners:delete',
  // Settings
  'settings:view',
  'settings:edit',
  // User management
  'users:view',
  'users:edit',
  // Role management
  'roles:view',
  'roles:edit',
  'roles:manage_permissions',
  // Caller portal
  'leads:view',
  'leads:create',
  'leads:edit',
  'contacts:view',
  'contacts:edit',
  'caller_stats:view',
  // Pipeline assignments
  'pipeline_assignments:view',
  'pipeline_assignments:edit',
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  'portal:admin': 'Access Admin Portal',
  'portal:caller': 'Access Caller Portal',
  'dashboard:view': 'View Dashboard',
  'pipeline:view': 'View Pipelines',
  'pipeline:edit': 'Edit Pipelines',
  'deals:view': 'View Deals',
  'deals:edit': 'Edit Deals',
  'deals:delete': 'Delete Deals',
  'prospects:view': 'View Prospects',
  'prospects:edit': 'Edit Prospects',
  'partners:view': 'View Partners',
  'partners:edit': 'Edit Partners',
  'partners:delete': 'Delete Partners',
  'settings:view': 'View Settings',
  'settings:edit': 'Edit Settings',
  'users:view': 'View Users',
  'users:edit': 'Manage Users',
  'roles:view': 'View Roles',
  'roles:edit': 'Create & Edit Roles',
  'roles:manage_permissions': 'Manage Role Permissions',
  'leads:view': 'View Leads',
  'leads:create': 'Create Leads',
  'leads:edit': 'Edit Leads',
  'contacts:view': 'View Contacts',
  'contacts:edit': 'Edit Contacts',
  'caller_stats:view': 'View Caller Stats',
  'pipeline_assignments:view': 'View Pipeline Assignments',
  'pipeline_assignments:edit': 'Manage Pipeline Assignments',
};
