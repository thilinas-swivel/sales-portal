/**
 * Server-side Pipedrive REST API client.
 *
 * All methods call Pipedrive's REST API using the company-level API token
 * passed via the `x-api-token` header. This file is only imported by
 * Next.js API route handlers — never by client components.
 *
 * Docs: https://developers.pipedrive.com/docs/api/v1
 */

import { env, isPipedriveConfigured } from '@/lib/env';
import type {
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
  PipedriveDealsListParams,
  PipedriveLeadsListParams,
  PipedrivePersonsListParams,
  PipedriveActivitiesListParams,
  PipedriveListParams,
} from '@/types/pipedrive';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PipedriveError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'PipedriveError';
  }
}

export class PipedriveNotConfiguredError extends Error {
  constructor() {
    super(
      'Pipedrive API credentials are not configured. ' +
        'Set PIPEDRIVE_API_TOKEN and PIPEDRIVE_COMPANY_DOMAIN in your environment.',
    );
    this.name = 'PipedriveNotConfiguredError';
  }
}

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

function baseUrl(): string {
  return `https://${env.PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api`;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${baseUrl()}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Max retries for 429 rate-limit responses */
const MAX_RETRIES = 3;

/** Wait `ms` milliseconds (used for backoff). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    params?: Record<string, unknown>;
    body?: unknown;
  },
): Promise<T> {
  if (!isPipedriveConfigured()) {
    throw new PipedriveNotConfiguredError();
  }

  const url = buildUrl(path, options?.params);

  const headers: Record<string, string> = {
    'x-api-token': env.PIPEDRIVE_API_TOKEN,
    Accept: 'application/json',
  };

  const init: RequestInit = {
    method,
    headers,
  };

  if (options?.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);

    // Handle rate-limiting with exponential backoff
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get('Retry-After');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : Math.min(1000 * 2 ** attempt, 10000); // 1s, 2s, 4s
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      throw new PipedriveError(
        `Pipedrive API error ${res.status}: ${res.statusText}`,
        res.status,
        body,
      );
    }

    return res.json() as Promise<T>;
  }

  // Should not reach here, but satisfy TypeScript
  throw new PipedriveError('Pipedrive API rate limit exceeded after retries', 429);
}

// Convenience wrappers
function get<T>(path: string, params?: Record<string, unknown>) {
  return request<T>('GET', path, { params });
}

function post<T>(path: string, body: unknown) {
  return request<T>('POST', path, { body });
}

function put<T>(path: string, body: unknown) {
  return request<T>('PUT', path, { body });
}

function patch<T>(path: string, body: unknown) {
  return request<T>('PATCH', path, { body });
}

function del<T>(path: string) {
  return request<T>('DELETE', path);
}

// ---------------------------------------------------------------------------
// DEALS
// ---------------------------------------------------------------------------

export const deals = {
  /** List deals with optional filtering & pagination. */
  list(params?: PipedriveDealsListParams) {
    return get<PipedriveListResponse<PipedriveDeal>>(
      '/v1/deals',
      params as Record<string, unknown>,
    );
  },

  /** Get a single deal by ID. */
  get(id: number) {
    return get<PipedriveResponse<PipedriveDeal>>(`/v1/deals/${id}`);
  },

  /** Create a new deal. */
  create(data: PipedriveCreateDeal) {
    return post<PipedriveResponse<PipedriveDeal>>('/v1/deals', data);
  },

  /** Update an existing deal. */
  update(id: number, data: PipedriveUpdateDeal) {
    return put<PipedriveResponse<PipedriveDeal>>(`/v1/deals/${id}`, data);
  },

  /** Delete a deal. */
  delete(id: number) {
    return del<PipedriveResponse<{ id: number }>>(`/v1/deals/${id}`);
  },

  /** Get deal summary (aggregated stats). */
  summary(params?: { status?: string; filter_id?: number; user_id?: number; stage_id?: number }) {
    return get<PipedriveResponse<PipedriveDealsSummary>>(
      '/v1/deals/summary',
      params as Record<string, unknown>,
    );
  },

  /** Get deals timeline (deals grouped by interval). */
  timeline(params: {
    start_date: string;
    interval: 'day' | 'week' | 'month' | 'quarter';
    amount: number;
    field_key: string;
    user_id?: number;
    pipeline_id?: number;
    filter_id?: number;
    exclude_deals?: 0 | 1;
    totals_convert_currency?: string;
  }) {
    return get<PipedriveResponse<unknown>>('/v1/deals/timeline', params as Record<string, unknown>);
  },

  /** Search deals. */
  search(params: {
    term: string;
    fields?: string;
    exact_match?: boolean;
    start?: number;
    limit?: number;
  }) {
    return get<PipedriveListResponse<{ item: PipedriveDeal; result_score: number }>>(
      '/v1/deals/search',
      params as Record<string, unknown>,
    );
  },
};

// ---------------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------------

export const leads = {
  /** List leads. */
  list(params?: PipedriveLeadsListParams) {
    return get<PipedriveListResponse<PipedriveLead>>(
      '/v1/leads',
      params as Record<string, unknown>,
    );
  },

  /** Get a single lead by ID (UUID). */
  get(id: string) {
    return get<PipedriveResponse<PipedriveLead>>(`/v1/leads/${id}`);
  },

  /** Create a new lead. */
  create(data: PipedriveCreateLead) {
    return post<PipedriveResponse<PipedriveLead>>('/v1/leads', data);
  },

  /** Update an existing lead. */
  update(id: string, data: PipedriveUpdateLead) {
    return patch<PipedriveResponse<PipedriveLead>>(`/v1/leads/${id}`, data);
  },

  /** Delete a lead. */
  delete(id: string) {
    return del<PipedriveResponse<{ id: string }>>(`/v1/leads/${id}`);
  },

  /** List lead labels. */
  labels() {
    return get<PipedriveListResponse<PipedriveLeadLabel>>('/v1/leadLabels');
  },
};

// ---------------------------------------------------------------------------
// PERSONS (Contacts)
// ---------------------------------------------------------------------------

export const persons = {
  /** List persons. */
  list(params?: PipedrivePersonsListParams) {
    return get<PipedriveListResponse<PipedrivePerson>>(
      '/v1/persons',
      params as Record<string, unknown>,
    );
  },

  /** Get a single person by ID. */
  get(id: number) {
    return get<PipedriveResponse<PipedrivePerson>>(`/v1/persons/${id}`);
  },

  /** Create a person. */
  create(data: PipedriveCreatePerson) {
    return post<PipedriveResponse<PipedrivePerson>>('/v1/persons', data);
  },

  /** Search persons. */
  search(params: {
    term: string;
    fields?: string;
    exact_match?: boolean;
    start?: number;
    limit?: number;
  }) {
    return get<PipedriveListResponse<{ item: PipedrivePerson; result_score: number }>>(
      '/v1/persons/search',
      params as Record<string, unknown>,
    );
  },

  /** Delete a person. */
  delete(id: number) {
    return del<PipedriveResponse<{ id: number }>>(`/v1/persons/${id}`);
  },
};

// ---------------------------------------------------------------------------
// ORGANIZATIONS
// ---------------------------------------------------------------------------

export const organizations = {
  /** List organizations. */
  list(params?: PipedriveListParams) {
    return get<PipedriveListResponse<PipedriveOrganization>>(
      '/v1/organizations',
      params as Record<string, unknown>,
    );
  },

  /** Get a single organization by ID. */
  get(id: number) {
    return get<PipedriveResponse<PipedriveOrganization>>(`/v1/organizations/${id}`);
  },

  /** Create an organization. */
  create(data: PipedriveCreateOrganization) {
    return post<PipedriveResponse<PipedriveOrganization>>('/v1/organizations', data);
  },

  /** Search organizations. */
  search(params: {
    term: string;
    fields?: string;
    exact_match?: boolean;
    start?: number;
    limit?: number;
  }) {
    return get<PipedriveListResponse<{ item: PipedriveOrganization; result_score: number }>>(
      '/v1/organizations/search',
      params as Record<string, unknown>,
    );
  },

  /** Delete an organization. */
  delete(id: number) {
    return del<PipedriveResponse<{ id: number }>>(`/v1/organizations/${id}`);
  },
};

// ---------------------------------------------------------------------------
// PIPELINES & STAGES
// ---------------------------------------------------------------------------

export const pipelines = {
  /** List all pipelines. */
  list() {
    return get<PipedriveListResponse<PipedrivePipeline>>('/v1/pipelines');
  },

  /** Get a single pipeline. */
  get(id: number) {
    return get<PipedriveResponse<PipedrivePipeline>>(`/v1/pipelines/${id}`);
  },

  /** Get deals in a pipeline (with optional filter_id / stage totals). */
  deals(id: number, params?: PipedriveDealsListParams) {
    return get<PipedriveListResponse<PipedriveDeal>>(
      `/v1/pipelines/${id}/deals`,
      params as Record<string, unknown>,
    );
  },
};

export const stages = {
  /** List all stages (optionally filter by pipeline_id). */
  list(params?: { pipeline_id?: number }) {
    return get<PipedriveListResponse<PipedriveStage>>(
      '/v1/stages',
      params as Record<string, unknown>,
    );
  },

  /** Get a single stage by ID. */
  get(id: number) {
    return get<PipedriveResponse<PipedriveStage>>(`/v1/stages/${id}`);
  },

  /** Get deals in a stage. */
  deals(id: number, params?: PipedriveDealsListParams) {
    return get<PipedriveListResponse<PipedriveDeal>>(
      `/v1/stages/${id}/deals`,
      params as Record<string, unknown>,
    );
  },
};

// ---------------------------------------------------------------------------
// ACTIVITIES
// ---------------------------------------------------------------------------

export const activities = {
  /** List activities. */
  list(params?: PipedriveActivitiesListParams) {
    return get<PipedriveListResponse<PipedriveActivity>>(
      '/v1/activities',
      params as Record<string, unknown>,
    );
  },

  /** Get a single activity. */
  get(id: number) {
    return get<PipedriveResponse<PipedriveActivity>>(`/v1/activities/${id}`);
  },

  /** Create an activity. */
  create(data: PipedriveCreateActivity) {
    return post<PipedriveResponse<PipedriveActivity>>('/v1/activities', data);
  },

  /** Delete an activity. */
  delete(id: number) {
    return del<PipedriveResponse<{ id: number }>>(`/v1/activities/${id}`);
  },
};

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

export const users = {
  /** List users in the company. */
  list() {
    return get<PipedriveListResponse<PipedriveUser>>('/v1/users');
  },

  /** Get a single user by ID. */
  get(id: number) {
    return get<PipedriveResponse<PipedriveUser>>(`/v1/users/${id}`);
  },

  /** Get the currently authenticated user. */
  me() {
    return get<PipedriveResponse<PipedriveUser>>('/v1/users/me');
  },
};

// ---------------------------------------------------------------------------
// DEAL FIELDS (schema introspection)
// ---------------------------------------------------------------------------

export const dealFields = {
  /** List deal fields (built-in + custom). */
  list() {
    return get<PipedriveListResponse<PipedriveDealField>>('/v1/dealFields');
  },
};

// ---------------------------------------------------------------------------
// ORGANIZATION FIELDS (schema introspection)
// ---------------------------------------------------------------------------

export const organizationFields = {
  /** List organization fields (built-in + custom). */
  list() {
    return get<PipedriveListResponse<Record<string, unknown>>>('/v1/organizationFields');
  },
};

// ---------------------------------------------------------------------------
// Convenience: single-import namespace
// ---------------------------------------------------------------------------

const pipedrive = {
  deals,
  leads,
  persons,
  organizations,
  pipelines,
  stages,
  activities,
  users,
  dealFields,
  organizationFields,
} as const;

export default pipedrive;
