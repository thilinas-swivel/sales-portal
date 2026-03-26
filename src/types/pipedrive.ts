/**
 * Pipedrive API entity types.
 * Based on Pipedrive REST API v1/v2 — https://developers.pipedrive.com/docs/api/v1
 */

// ---------------------------------------------------------------------------
// Generic response wrappers
// ---------------------------------------------------------------------------

/** Standard Pipedrive API success response (single entity) */
export interface PipedriveResponse<T> {
  success: boolean;
  data: T;
  additional_data?: Record<string, unknown>;
}

/** Pipedrive paginated list response (offset-based, v1) */
export interface PipedriveListResponse<T> {
  success: boolean;
  data: T[] | null;
  additional_data?: {
    pagination?: {
      start: number;
      limit: number;
      more_items_in_collection: boolean;
      next_start?: number;
    };
    next_cursor?: string;
  };
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export interface PipedriveDeal {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: 'open' | 'won' | 'lost' | 'deleted';
  stage_id: number;
  pipeline_id: number;
  user_id: number;
  person_id: number | null;
  org_id: number | null;
  add_time: string;
  update_time: string;
  stage_change_time: string | null;
  won_time: string | null;
  lost_time: string | null;
  close_time: string | null;
  expected_close_date: string | null;
  probability: number | null;
  lost_reason: string | null;
  label: number[] | null;
  stage_order_nr?: number;
  person_name?: string;
  org_name?: string;
  owner_name?: string;
  cc_email?: string;
  weighted_value?: number;
  formatted_value?: string;
  formatted_weighted_value?: string;
  activities_count?: number;
  done_activities_count?: number;
  undone_activities_count?: number;
  notes_count?: number;
  files_count?: number;
  followers_count?: number;
  participants_count?: number;
  products_count?: number;
  [key: string]: unknown; // custom fields
}

export interface PipedriveCreateDeal {
  title: string;
  value?: number;
  currency?: string;
  user_id?: number;
  person_id?: number;
  org_id?: number;
  pipeline_id?: number;
  stage_id?: number;
  status?: 'open' | 'won' | 'lost';
  expected_close_date?: string;
  probability?: number;
  lost_reason?: string;
  visible_to?: 1 | 3 | 5 | 7;
  add_time?: string;
  [key: string]: unknown; // custom fields
}

export interface PipedriveUpdateDeal {
  title?: string;
  value?: number;
  currency?: string;
  user_id?: number;
  person_id?: number;
  org_id?: number;
  pipeline_id?: number;
  stage_id?: number;
  status?: 'open' | 'won' | 'lost';
  expected_close_date?: string;
  probability?: number;
  lost_reason?: string;
  visible_to?: 1 | 3 | 5 | 7;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export interface PipedriveLead {
  id: string; // UUIDs
  title: string;
  owner_id: number;
  person_id: number | null;
  organization_id: number | null;
  label_ids: string[];
  value: { amount: number; currency: string } | null;
  expected_close_date: string | null;
  is_archived: boolean;
  source_name: string | null;
  was_seen: boolean;
  add_time: string;
  update_time: string;
  next_activity_id: number | null;
  [key: string]: unknown;
}

export interface PipedriveCreateLead {
  title: string;
  owner_id?: number;
  person_id?: number;
  organization_id?: number;
  label_ids?: string[];
  value?: { amount: number; currency: string };
  expected_close_date?: string;
  visible_to?: 1 | 3 | 5 | 7;
  was_seen?: boolean;
  [key: string]: unknown;
}

export interface PipedriveUpdateLead {
  title?: string;
  owner_id?: number;
  person_id?: number;
  organization_id?: number;
  label_ids?: string[];
  value?: { amount: number; currency: string } | null;
  expected_close_date?: string;
  is_archived?: boolean;
  was_seen?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Persons (Contacts)
// ---------------------------------------------------------------------------

export interface PipedrivePerson {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: { value: string; primary: boolean; label: string }[];
  phone: { value: string; primary: boolean; label: string }[];
  org_id: number | null;
  owner_id: number;
  open_deals_count: number;
  closed_deals_count: number;
  won_deals_count: number;
  lost_deals_count: number;
  activities_count: number;
  done_activities_count: number;
  undone_activities_count: number;
  add_time: string;
  update_time: string;
  label?: number;
  org_name?: string;
  cc_email?: string;
  [key: string]: unknown;
}

export interface PipedriveCreatePerson {
  name: string;
  owner_id?: number;
  org_id?: number;
  email?: string | { value: string; primary?: boolean; label?: string }[];
  phone?: string | { value: string; primary?: boolean; label?: string }[];
  visible_to?: 1 | 3 | 5 | 7;
  add_time?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface PipedriveOrganization {
  id: number;
  name: string;
  owner_id: number;
  people_count: number;
  open_deals_count: number;
  closed_deals_count: number;
  won_deals_count: number;
  lost_deals_count: number;
  activities_count: number;
  done_activities_count: number;
  undone_activities_count: number;
  address: string | null;
  address_country?: string;
  cc_email?: string;
  add_time: string;
  update_time: string;
  label?: number;
  [key: string]: unknown;
}

export interface PipedriveCreateOrganization {
  name: string;
  owner_id?: number;
  visible_to?: 1 | 3 | 5 | 7;
  add_time?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Pipelines & Stages
// ---------------------------------------------------------------------------

export interface PipedrivePipeline {
  id: number;
  name: string;
  url_title: string;
  order_nr: number;
  active: boolean;
  deal_probability: boolean;
  add_time: string;
  update_time: string;
  selected?: boolean;
}

export interface PipedriveStage {
  id: number;
  name: string;
  pipeline_id: number;
  order_nr: number;
  active_flag: boolean;
  deal_probability: number;
  rotten_flag: boolean;
  rotten_days: number | null;
  add_time: string;
  update_time: string;
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export interface PipedriveActivity {
  id: number;
  type: string;
  subject: string;
  done: boolean;
  due_date: string;
  due_time: string | null;
  duration: string | null;
  user_id: number;
  deal_id: number | null;
  person_id: number | null;
  org_id: number | null;
  lead_id: string | null;
  note: string | null;
  add_time: string;
  update_time: string;
  marked_as_done_time?: string;
  busy_flag?: boolean;
  location?: string;
  attendees?: { person_id: number; email_address: string }[];
  participants?: { person_id: number; primary_flag: boolean }[];
  [key: string]: unknown;
}

export interface PipedriveCreateActivity {
  subject: string;
  type: string;
  done?: 0 | 1;
  due_date?: string;
  due_time?: string;
  duration?: string;
  user_id?: number;
  deal_id?: number;
  person_id?: number;
  org_id?: number;
  lead_id?: string;
  note?: string;
  busy_flag?: boolean;
  location?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface PipedriveUser {
  id: number;
  name: string;
  email: string;
  active_flag: boolean;
  role_id: number;
  icon_url: string | null;
  is_admin: 0 | 1;
  created: string;
  modified: string;
  phone?: string;
  default_currency?: string;
  timezone_name?: string;
  timezone_offset?: string;
  locale?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Deal Fields (schema metadata)
// ---------------------------------------------------------------------------

export interface PipedriveDealField {
  id: number;
  key: string;
  name: string;
  field_type:
    | 'varchar'
    | 'text'
    | 'int'
    | 'double'
    | 'monetary'
    | 'date'
    | 'set'
    | 'enum'
    | 'phone'
    | 'time'
    | 'address'
    | 'varchar_auto'
    | 'visible_to'
    | 'daterange';
  options?: { id: number; label: string }[];
  active_flag: boolean;
  edit_flag: boolean;
  add_visible_flag: boolean;
  important_flag: boolean;
  mandatory_flag: boolean;
  order_nr: number;
}

// ---------------------------------------------------------------------------
// Lead Labels
// ---------------------------------------------------------------------------

export interface PipedriveLeadLabel {
  id: string;
  name: string;
  color: string;
  add_time: string;
  update_time: string;
}

// ---------------------------------------------------------------------------
// Deal Summary / Statistics
// ---------------------------------------------------------------------------

export interface PipedriveDealsSummary {
  total_count: number;
  total_currency_converted_value: number;
  per_stages: Record<
    string,
    {
      count: number;
      value: number;
      value_formatted: string;
      weighted_value: number;
      weighted_value_formatted: string;
    }
  >;
  per_currency: Record<
    string,
    {
      count: number;
      value: number;
    }
  >;
}

// ---------------------------------------------------------------------------
// Query / filter param helpers
// ---------------------------------------------------------------------------

export interface PipedriveListParams {
  start?: number;
  limit?: number;
  cursor?: string;
  sort?: string;
}

export interface PipedriveDealsListParams extends PipedriveListParams {
  user_id?: number;
  filter_id?: number;
  stage_id?: number;
  status?: 'all_not_deleted' | 'open' | 'won' | 'lost' | 'deleted';
  owned_by_you?: 0 | 1;
}

export interface PipedriveLeadsListParams extends PipedriveListParams {
  archived_status?: 'archived' | 'not_archived';
  owner_id?: number;
  person_id?: number;
  organization_id?: number;
  sort?: string;
}

export interface PipedrivePersonsListParams extends PipedriveListParams {
  user_id?: number;
  filter_id?: number;
  first_char?: string;
}

export interface PipedriveActivitiesListParams extends PipedriveListParams {
  user_id?: number;
  filter_id?: number;
  type?: string;
  start_date?: string;
  end_date?: string;
  done?: 0 | 1;
}
