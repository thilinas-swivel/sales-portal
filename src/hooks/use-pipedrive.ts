/**
 * React hooks for fetching data from the Pipedrive proxy API routes.
 *
 * All hooks follow a consistent pattern:
 *  - `data`    — the resolved value (typed)
 *  - `error`   — error message string or null
 *  - `loading` — whether a request is in-flight
 *  - `refetch` — call to re-run the fetch imperatively
 *  - `mutate`  — (on mutation hooks) function to trigger the POST/PUT/PATCH/DELETE
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PipedriveListResponse,
  PipedriveResponse,
  PipedriveDeal,
  PipedriveCreateDeal,
  PipedriveUpdateDeal,
  PipedriveLead,
  PipedriveCreateLead,
  PipedrivePerson,
  PipedriveCreatePerson,
  PipedriveOrganization,
  PipedriveCreateOrganization,
  PipedriveActivity,
  PipedriveCreateActivity,
  PipedrivePipeline,
  PipedriveStage,
  PipedriveUser,
  PipedriveDealsSummary,
} from '@/types/pipedrive';

// ---------------------------------------------------------------------------
// Generic fetch hook
// ---------------------------------------------------------------------------

interface UseFetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

function usePipedriveFetch<T>(url: string | null, deps: unknown[] = []): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(() => {
    if (!url) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (!controller.signal.aborted) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// Generic mutation hook
// ---------------------------------------------------------------------------

interface UseMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput>;
  data: TOutput | null;
  error: string | null;
  loading: boolean;
}

function usePipedriveMutation<TInput, TOutput>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
): UseMutationResult<TInput, TOutput> {
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as TOutput;
        setData(json);
        return json;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, method],
  );

  return { mutate, data, error, loading };
}

// ---------------------------------------------------------------------------
// Helper to build query string from params object
// ---------------------------------------------------------------------------

function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------------------
// DEALS
// ---------------------------------------------------------------------------

export function useDeals(params?: {
  start?: number;
  limit?: number;
  user_id?: number;
  filter_id?: number;
  stage_id?: number;
  status?: string;
}) {
  return usePipedriveFetch<PipedriveListResponse<PipedriveDeal>>(
    `/api/pipedrive/deals${qs(params)}`,
    [JSON.stringify(params)],
  );
}

export function useDeal(id: number | null) {
  return usePipedriveFetch<PipedriveResponse<PipedriveDeal>>(
    id != null ? `/api/pipedrive/deals/${id}` : null,
    [id],
  );
}

export function useCreateDeal() {
  return usePipedriveMutation<PipedriveCreateDeal, PipedriveResponse<PipedriveDeal>>(
    '/api/pipedrive/deals',
    'POST',
  );
}

export function useUpdateDeal(id: number) {
  return usePipedriveMutation<PipedriveUpdateDeal, PipedriveResponse<PipedriveDeal>>(
    `/api/pipedrive/deals/${id}`,
    'PUT',
  );
}

export function useDealsSummary() {
  return usePipedriveFetch<PipedriveResponse<PipedriveDealsSummary>>(
    '/api/pipedrive/deals/summary',
  );
}

// ---------------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------------

export function useLeads(params?: {
  start?: number;
  limit?: number;
  archived_status?: string;
  owner_id?: number;
  sort?: string;
}) {
  return usePipedriveFetch<PipedriveListResponse<PipedriveLead>>(
    `/api/pipedrive/leads${qs(params)}`,
    [JSON.stringify(params)],
  );
}

export function useLead(id: string | null) {
  return usePipedriveFetch<PipedriveResponse<PipedriveLead>>(
    id ? `/api/pipedrive/leads/${id}` : null,
    [id],
  );
}

export function useCreateLead() {
  return usePipedriveMutation<PipedriveCreateLead, PipedriveResponse<PipedriveLead>>(
    '/api/pipedrive/leads',
    'POST',
  );
}

// ---------------------------------------------------------------------------
// PERSONS
// ---------------------------------------------------------------------------

export function usePersons(params?: { start?: number; limit?: number; user_id?: number }) {
  return usePipedriveFetch<PipedriveListResponse<PipedrivePerson>>(
    `/api/pipedrive/persons${qs(params)}`,
    [JSON.stringify(params)],
  );
}

export function useCreatePerson() {
  return usePipedriveMutation<PipedriveCreatePerson, PipedriveResponse<PipedrivePerson>>(
    '/api/pipedrive/persons',
    'POST',
  );
}

// ---------------------------------------------------------------------------
// ORGANIZATIONS
// ---------------------------------------------------------------------------

export function useOrganizations(params?: { start?: number; limit?: number }) {
  return usePipedriveFetch<PipedriveListResponse<PipedriveOrganization>>(
    `/api/pipedrive/organizations${qs(params)}`,
    [JSON.stringify(params)],
  );
}

export function useCreateOrganization() {
  return usePipedriveMutation<
    PipedriveCreateOrganization,
    PipedriveResponse<PipedriveOrganization>
  >('/api/pipedrive/organizations', 'POST');
}

// ---------------------------------------------------------------------------
// PIPELINES & STAGES
// ---------------------------------------------------------------------------

export function usePipelines() {
  return usePipedriveFetch<{
    success: boolean;
    data: { pipelines: PipedrivePipeline[] | null; stages: PipedriveStage[] | null };
  }>('/api/pipedrive/pipelines');
}

// ---------------------------------------------------------------------------
// ACTIVITIES
// ---------------------------------------------------------------------------

export function useActivities(params?: {
  start?: number;
  limit?: number;
  user_id?: number;
  type?: string;
  start_date?: string;
  end_date?: string;
  done?: 0 | 1;
}) {
  return usePipedriveFetch<PipedriveListResponse<PipedriveActivity>>(
    `/api/pipedrive/activities${qs(params)}`,
    [JSON.stringify(params)],
  );
}

export function useCreateActivity() {
  return usePipedriveMutation<PipedriveCreateActivity, PipedriveResponse<PipedriveActivity>>(
    '/api/pipedrive/activities',
    'POST',
  );
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

export function useUsers() {
  return usePipedriveFetch<PipedriveListResponse<PipedriveUser>>('/api/pipedrive/users');
}

// ---------------------------------------------------------------------------
// PIPELINE DEALS (deals within a specific pipeline)
// ---------------------------------------------------------------------------

export function usePipelineDeals(
  pipelineId: number | null,
  params?: { start?: number; limit?: number; status?: string },
) {
  const url =
    pipelineId != null ? `/api/pipedrive/pipelines/${pipelineId}/deals${qs(params)}` : null;
  return usePipedriveFetch<PipedriveListResponse<PipedriveDeal>>(url, [
    pipelineId,
    JSON.stringify(params),
  ]);
}

// ---------------------------------------------------------------------------
// PIPELINE CONFIG (selected pipelines from Supabase)
// ---------------------------------------------------------------------------

export function usePipelineConfig() {
  return usePipedriveFetch<{
    success: boolean;
    data: { selectedPipelineIds: number[]; topOfFunnelPipelineIds: number[] };
  }>('/api/pipedrive/config');
}
