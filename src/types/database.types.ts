/**
 * Kinetra CRM — Supabase Database types (Phase 1).
 *
 * Hand-authored to match supabase/migrations/*. If you later run
 * `supabase gen types typescript`, you can replace this file wholesale —
 * the rest of the codebase only depends on the exported helper aliases.
 *
 * NOTE: all shapes are `type` aliases (not interfaces) on purpose —
 * supabase-js query typing requires implicit index signatures, which
 * interfaces don't provide.
 *
 * NOTE: `leads.id` is typed as `string` (uuid). If your live table uses a
 * bigint id, change LeadRow["id"] and the `lead_id` fields to `number` —
 * the SQL migrations themselves adapt automatically either way.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  project_type: string | null;
  budget_range: string | null;
  social_url: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  status_changed_at: string | null;
  archived_at: string | null;
};

type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  updated_at: string | null;
};

type LeadNoteRow = {
  id: string;
  lead_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

type LeadActivityRow = {
  id: string;
  lead_id: string;
  actor_id: string | null;
  type: string;
  payload: Json;
  created_at: string;
};

type AdminNotificationRow = {
  id: string;
  recipient_id: string | null;
  lead_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

type AdminSettingRow = {
  key: string;
  value: Json;
  updated_by: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          project_type?: string | null;
          budget_range?: string | null;
          social_url?: string | null;
          message: string;
          status?: string;
          created_at?: string;
          updated_at?: string | null;
          status_changed_at?: string | null;
          archived_at?: string | null;
        };
        Update: Partial<LeadRow>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<AdminUserRow>;
        Relationships: [];
      };
      lead_notes: {
        Row: LeadNoteRow;
        Insert: {
          id?: string;
          lead_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<LeadNoteRow>;
        Relationships: [];
      };
      lead_activities: {
        Row: LeadActivityRow;
        Insert: {
          id?: string;
          lead_id: string;
          actor_id?: string | null;
          type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<LeadActivityRow>;
        Relationships: [];
      };
      admin_notifications: {
        Row: AdminNotificationRow;
        Insert: {
          id?: string;
          recipient_id?: string | null;
          lead_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<AdminNotificationRow>;
        Relationships: [];
      };
      admin_settings: {
        Row: AdminSettingRow;
        Insert: {
          key: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<AdminSettingRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      kinetra_is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** Convenience helpers: Tables<"leads"> → row type, etc. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];