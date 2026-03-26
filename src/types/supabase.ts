/**
 * Supabase database type definitions.
 * Keep in sync with your Supabase schema.
 *
 * To regenerate these types automatically, run:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
 */

export interface Database {
  public: {
    Tables: {
      pipeline_config: {
        Row: {
          id: number;
          pipeline_id: number;
          pipeline_name: string | null;
          selected: boolean;
          is_top_of_funnel: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          pipeline_id: number;
          pipeline_name?: string | null;
          selected?: boolean;
          is_top_of_funnel?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          pipeline_id?: number;
          pipeline_name?: string | null;
          selected?: boolean;
          is_top_of_funnel?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
