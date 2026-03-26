/**
 * Shared TypeScript types used across the application.
 */

// Re-export all Pipedrive types for convenience
export type {
  PipedriveResponse,
  PipedriveListResponse,
  PipedriveDeal,
  PipedriveCreateDeal,
  PipedriveUpdateDeal,
  PipedriveLead,
  PipedriveCreateLead,
  PipedriveUpdateLead,
  PipedrivePerson,
  PipedriveCreatePerson,
  PipedriveOrganization,
  PipedriveCreateOrganization,
  PipedrivePipeline,
  PipedriveStage,
  PipedriveActivity,
  PipedriveCreateActivity,
  PipedriveUser,
  PipedriveDealField,
  PipedriveLeadLabel,
  PipedriveDealsSummary,
} from './pipedrive';

// Re-export Supabase database types
export type { Database } from './supabase';

// ─── Auth / RBAC Types ──────────────────────────────────

/**
 * Application role names are dynamic — Super Admin can create any role.
 * System-seeded roles: super_admin, sales_admin, sales_executive,
 * leadership_executive, internal_caller, external_caller.
 */
export type AppRoleName = string;

/** Portal identifiers */
export type PortalType = 'admin' | 'caller';

export interface AppRole {
  id: string;
  name: string;
  label: string;
  description: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

/** AppUser enriched with role details, permissions, and portal access. */
export interface AppUserWithRole extends AppUser {
  role: AppRole;
  permissions: string[];
  portals: PortalType[];
  /** Pipedrive pipeline IDs this user is restricted to (empty = unrestricted). */
  pipelineIds: number[];
}

/** Pipeline assignment record */
export interface AppUserPipeline {
  id: string;
  userId: string;
  pipelineId: number;
  pipelineName: string | null;
  assignedBy: string | null;
  assignedAt: string;
}

// ─── Generic Types ──────────────────────────────────────

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Generic ID type — use for entity identifiers */
export type EntityId = string | number;

/** Common props for components that accept className */
export interface ClassNameProps {
  className?: string;
}

/** Children-only props */
export interface ChildrenProps {
  children: React.ReactNode;
}

/** Combined className + children */
export interface BaseComponentProps extends ClassNameProps, ChildrenProps {}
