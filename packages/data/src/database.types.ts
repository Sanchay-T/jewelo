export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      assets: {
        Row: {
          attempt: number;
          bucket_id: string;
          byte_size: number;
          checksum_sha256: string;
          created_at: string;
          design_id: string;
          id: string;
          identity_fingerprint: string;
          input_asset_ids: string[];
          mime_type: string;
          model: string;
          object_path: string;
          owner_principal_id: string;
          presentation_view: string;
          prompt_release: string;
          provider: string;
          revision_id: string;
          run_id: string;
          task_id: string;
          verification_result: Json;
        };
        Insert: {
          attempt: number;
          bucket_id: string;
          byte_size: number;
          checksum_sha256: string;
          created_at?: string;
          design_id: string;
          id?: string;
          identity_fingerprint: string;
          input_asset_ids?: string[];
          mime_type: string;
          model: string;
          object_path: string;
          owner_principal_id: string;
          presentation_view: string;
          prompt_release: string;
          provider: string;
          revision_id: string;
          run_id: string;
          task_id: string;
          verification_result: Json;
        };
        Update: {
          attempt?: number;
          bucket_id?: string;
          byte_size?: number;
          checksum_sha256?: string;
          created_at?: string;
          design_id?: string;
          id?: string;
          identity_fingerprint?: string;
          input_asset_ids?: string[];
          mime_type?: string;
          model?: string;
          object_path?: string;
          owner_principal_id?: string;
          presentation_view?: string;
          prompt_release?: string;
          provider?: string;
          revision_id?: string;
          run_id?: string;
          task_id?: string;
          verification_result?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "assets_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_design_id_owner_principal_id_fkey";
            columns: ["design_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id", "owner_principal_id"];
          },
          {
            foreignKeyName: "assets_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_revision_id_owner_principal_id_fkey";
            columns: ["revision_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id", "owner_principal_id"];
          },
          {
            foreignKeyName: "assets_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "generation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_run_id_owner_principal_id_fkey";
            columns: ["run_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "generation_runs";
            referencedColumns: ["id", "owner_principal_id"];
          },
          {
            foreignKeyName: "assets_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "generation_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_task_id_owner_principal_id_fkey";
            columns: ["task_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "generation_tasks";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_type: string;
          created_at: string;
          design_id: string | null;
          detail: Json;
          id: number;
          principal_id: string | null;
        };
        Insert: {
          action: string;
          actor_type: string;
          created_at?: string;
          design_id?: string | null;
          detail?: Json;
          id?: never;
          principal_id?: string | null;
        };
        Update: {
          action?: string;
          actor_type?: string;
          created_at?: string;
          design_id?: string | null;
          detail?: Json;
          id?: never;
          principal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
        ];
      };
      design_drafts: {
        Row: {
          created_at: string;
          design_id: string | null;
          id: string;
          locale: string;
          owner_principal_id: string;
          revision_token: number;
          specification: Json;
          spelling_confirmed: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          design_id?: string | null;
          id?: string;
          locale: string;
          owner_principal_id: string;
          revision_token?: number;
          specification: Json;
          spelling_confirmed?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          design_id?: string | null;
          id?: string;
          locale?: string;
          owner_principal_id?: string;
          revision_token?: number;
          specification?: Json;
          spelling_confirmed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "design_drafts_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_drafts_design_id_owner_principal_id_fkey";
            columns: ["design_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      design_revisions: {
        Row: {
          approval_idempotency_key: string;
          approved_at: string;
          created_at: string;
          design_id: string;
          draft_id: string;
          id: string;
          identity_anchor: Json;
          owner_principal_id: string;
          revision_number: number;
          specification: Json;
        };
        Insert: {
          approval_idempotency_key: string;
          approved_at?: string;
          created_at?: string;
          design_id: string;
          draft_id: string;
          id?: string;
          identity_anchor: Json;
          owner_principal_id: string;
          revision_number: number;
          specification: Json;
        };
        Update: {
          approval_idempotency_key?: string;
          approved_at?: string;
          created_at?: string;
          design_id?: string;
          draft_id?: string;
          id?: string;
          identity_anchor?: Json;
          owner_principal_id?: string;
          revision_number?: number;
          specification?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "design_revisions_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_revisions_design_id_owner_principal_id_fkey";
            columns: ["design_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id", "owner_principal_id"];
          },
          {
            foreignKeyName: "design_revisions_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: false;
            referencedRelation: "design_drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "design_revisions_draft_id_owner_principal_id_fkey";
            columns: ["draft_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "design_drafts";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      designs: {
        Row: {
          active_revision_id: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          locale: string;
          name: string;
          owner_principal_id: string;
          resume_path: string | null;
          status: Database["public"]["Enums"]["design_status"];
          updated_at: string;
        };
        Insert: {
          active_revision_id?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          locale: string;
          name?: string;
          owner_principal_id: string;
          resume_path?: string | null;
          status?: Database["public"]["Enums"]["design_status"];
          updated_at?: string;
        };
        Update: {
          active_revision_id?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          locale?: string;
          name?: string;
          owner_principal_id?: string;
          resume_path?: string | null;
          status?: Database["public"]["Enums"]["design_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "designs_active_revision_fk";
            columns: ["active_revision_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      generation_runs: {
        Row: {
          actual_spend_cents: number;
          cancelled_at: string | null;
          created_at: string;
          design_id: string;
          id: string;
          label: string;
          operator_review_reason: string | null;
          owner_principal_id: string;
          reserved_spend_cents: number;
          revision_id: string;
          run_idempotency_key: string;
          status: Database["public"]["Enums"]["run_status"];
          updated_at: string;
        };
        Insert: {
          actual_spend_cents?: number;
          cancelled_at?: string | null;
          created_at?: string;
          design_id: string;
          id?: string;
          label?: string;
          operator_review_reason?: string | null;
          owner_principal_id: string;
          reserved_spend_cents: number;
          revision_id: string;
          run_idempotency_key: string;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
        };
        Update: {
          actual_spend_cents?: number;
          cancelled_at?: string | null;
          created_at?: string;
          design_id?: string;
          id?: string;
          label?: string;
          operator_review_reason?: string | null;
          owner_principal_id?: string;
          reserved_spend_cents?: number;
          revision_id?: string;
          run_idempotency_key?: string;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_runs_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generation_runs_design_id_owner_principal_id_fkey";
            columns: ["design_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id", "owner_principal_id"];
          },
          {
            foreignKeyName: "generation_runs_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generation_runs_revision_id_owner_principal_id_fkey";
            columns: ["revision_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      generation_tasks: {
        Row: {
          attempt: number;
          cancel_requested_at: string | null;
          created_at: string;
          dispatch_idempotency_key: string;
          id: string;
          owner_principal_id: string;
          presentation_view: string;
          prompt_release: string;
          provider_profile: string;
          run_id: string;
          status: Database["public"]["Enums"]["task_status"];
          terminal_error_code: string | null;
          updated_at: string;
        };
        Insert: {
          attempt?: number;
          cancel_requested_at?: string | null;
          created_at?: string;
          dispatch_idempotency_key: string;
          id?: string;
          owner_principal_id: string;
          presentation_view: string;
          prompt_release: string;
          provider_profile: string;
          run_id: string;
          status?: Database["public"]["Enums"]["task_status"];
          terminal_error_code?: string | null;
          updated_at?: string;
        };
        Update: {
          attempt?: number;
          cancel_requested_at?: string | null;
          created_at?: string;
          dispatch_idempotency_key?: string;
          id?: string;
          owner_principal_id?: string;
          presentation_view?: string;
          prompt_release?: string;
          provider_profile?: string;
          run_id?: string;
          status?: Database["public"]["Enums"]["task_status"];
          terminal_error_code?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_tasks_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "generation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generation_tasks_run_id_owner_principal_id_fkey";
            columns: ["run_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "generation_runs";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      orders: {
        Row: {
          accepted_at: string;
          accepted_total: number;
          checkout_status: Database["public"]["Enums"]["checkout_status"];
          created_at: string;
          design_id: string;
          id: string;
          owner_principal_id: string;
          quote_id: string;
          revision_id: string;
          shopify_draft_order_id: string | null;
          shopify_order_id: string | null;
          status: string;
        };
        Insert: {
          accepted_at: string;
          accepted_total: number;
          checkout_status: Database["public"]["Enums"]["checkout_status"];
          created_at?: string;
          design_id: string;
          id?: string;
          owner_principal_id: string;
          quote_id: string;
          revision_id: string;
          shopify_draft_order_id?: string | null;
          shopify_order_id?: string | null;
          status: string;
        };
        Update: {
          accepted_at?: string;
          accepted_total?: number;
          checkout_status?: Database["public"]["Enums"]["checkout_status"];
          created_at?: string;
          design_id?: string;
          id?: string;
          owner_principal_id?: string;
          quote_id?: string;
          revision_id?: string;
          shopify_draft_order_id?: string | null;
          shopify_order_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: true;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      outbox_events: {
        Row: {
          aggregate_id: string;
          aggregate_type: string;
          attempt_count: number;
          available_at: string;
          created_at: string;
          dispatch_idempotency_key: string;
          event_type: string;
          id: string;
          last_error: string | null;
          locked_at: string | null;
          payload: Json;
          published_at: string | null;
          state: string;
        };
        Insert: {
          aggregate_id: string;
          aggregate_type: string;
          attempt_count?: number;
          available_at?: string;
          created_at?: string;
          dispatch_idempotency_key: string;
          event_type: string;
          id?: string;
          last_error?: string | null;
          locked_at?: string | null;
          payload: Json;
          published_at?: string | null;
          state?: string;
        };
        Update: {
          aggregate_id?: string;
          aggregate_type?: string;
          attempt_count?: number;
          available_at?: string;
          created_at?: string;
          dispatch_idempotency_key?: string;
          event_type?: string;
          id?: string;
          last_error?: string | null;
          locked_at?: string | null;
          payload?: Json;
          published_at?: string | null;
          state?: string;
        };
        Relationships: [];
      };
      principal_daily_usage: {
        Row: {
          actual_spend_cents: number;
          principal_id: string;
          reserved_spend_cents: number;
          runs_started: number;
          usage_date: string;
        };
        Insert: {
          actual_spend_cents?: number;
          principal_id: string;
          reserved_spend_cents?: number;
          runs_started?: number;
          usage_date?: string;
        };
        Update: {
          actual_spend_cents?: number;
          principal_id?: string;
          reserved_spend_cents?: number;
          runs_started?: number;
          usage_date?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
      provider_attempts: {
        Row: {
          actual_cost_cents: number | null;
          attempt: number;
          completed_at: string | null;
          created_at: string;
          error_class: string | null;
          estimated_cost_cents: number;
          id: string;
          model: string;
          owner_principal_id: string;
          provider: string;
          provider_idempotency_key: string;
          provider_request_id: string | null;
          status: string;
          task_id: string;
        };
        Insert: {
          actual_cost_cents?: number | null;
          attempt: number;
          completed_at?: string | null;
          created_at?: string;
          error_class?: string | null;
          estimated_cost_cents?: number;
          id?: string;
          model: string;
          owner_principal_id: string;
          provider: string;
          provider_idempotency_key: string;
          provider_request_id?: string | null;
          status: string;
          task_id: string;
        };
        Update: {
          actual_cost_cents?: number | null;
          attempt?: number;
          completed_at?: string | null;
          created_at?: string;
          error_class?: string | null;
          estimated_cost_cents?: number;
          id?: string;
          model?: string;
          owner_principal_id?: string;
          provider?: string;
          provider_idempotency_key?: string;
          provider_request_id?: string | null;
          status?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_attempts_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "generation_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_attempts_task_id_owner_principal_id_fkey";
            columns: ["task_id", "owner_principal_id"];
            isOneToOne: false;
            referencedRelation: "generation_tasks";
            referencedColumns: ["id", "owner_principal_id"];
          },
        ];
      };
      quotes: {
        Row: {
          checkout_idempotency_key: string;
          checkout_status: Database["public"]["Enums"]["checkout_status"];
          checkout_url: string | null;
          created_at: string;
          currency: string;
          design_id: string;
          expires_at: string;
          id: string;
          issued_at: string | null;
          owner_principal_id: string;
          revision_id: string;
          shopify_draft_order_id: string | null;
          snapshot: Json;
          status: string;
          total: number;
        };
        Insert: {
          checkout_idempotency_key: string;
          checkout_status?: Database["public"]["Enums"]["checkout_status"];
          checkout_url?: string | null;
          created_at?: string;
          currency?: string;
          design_id: string;
          expires_at: string;
          id?: string;
          issued_at?: string | null;
          owner_principal_id: string;
          revision_id: string;
          shopify_draft_order_id?: string | null;
          snapshot: Json;
          status: string;
          total: number;
        };
        Update: {
          checkout_idempotency_key?: string;
          checkout_status?: Database["public"]["Enums"]["checkout_status"];
          checkout_url?: string | null;
          created_at?: string;
          currency?: string;
          design_id?: string;
          expires_at?: string;
          id?: string;
          issued_at?: string | null;
          owner_principal_id?: string;
          revision_id?: string;
          shopify_draft_order_id?: string | null;
          snapshot?: Json;
          status?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "design_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      runtime_policy: {
        Row: {
          daily_generation_limit: number;
          environment: string;
          id: boolean;
          max_reserved_spend_cents: number;
          studio_reservation_cents: number;
          supabase_region: string;
          updated_at: string;
        };
        Insert: {
          daily_generation_limit?: number;
          environment?: string;
          id?: boolean;
          max_reserved_spend_cents?: number;
          studio_reservation_cents?: number;
          supabase_region?: string;
          updated_at?: string;
        };
        Update: {
          daily_generation_limit?: number;
          environment?: string;
          id?: boolean;
          max_reserved_spend_cents?: number;
          studio_reservation_cents?: number;
          supabase_region?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      share_grants: {
        Row: {
          created_at: string;
          design_id: string;
          expires_at: string;
          id: string;
          owner_principal_id: string;
          revoked_at: string | null;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          design_id: string;
          expires_at: string;
          id?: string;
          owner_principal_id: string;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          design_id?: string;
          expires_at?: string;
          id?: string;
          owner_principal_id?: string;
          revoked_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "share_grants_design_id_fkey";
            columns: ["design_id"];
            isOneToOne: false;
            referencedRelation: "designs";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_deliveries: {
        Row: {
          delivery_id: string;
          payload_sha256: string;
          processed_at: string | null;
          provider: string;
          received_at: string;
        };
        Insert: {
          delivery_id: string;
          payload_sha256: string;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
        };
        Update: {
          delivery_id?: string;
          payload_sha256?: string;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_and_start_studio: {
        Args: {
          p_approval_key: string;
          p_draft_id: string;
          p_run_key: string;
          p_specification: Json;
        };
        Returns: {
          approved_design_id: string;
          canonical_identity_anchor: Json;
          outbox_id: string;
          revision_id: string;
          run_id: string;
          task_id: string;
        }[];
      };
      cancel_generation_task: {
        Args: { p_task_id: string };
        Returns: {
          attempt: number;
          cancel_requested_at: string | null;
          created_at: string;
          dispatch_idempotency_key: string;
          id: string;
          owner_principal_id: string;
          presentation_view: string;
          prompt_release: string;
          provider_profile: string;
          run_id: string;
          status: Database["public"]["Enums"]["task_status"];
          terminal_error_code: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "generation_tasks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      canonical_identity_anchor: {
        Args: { p_specification: Json };
        Returns: Json;
      };
      reconcile_provider_attempt: {
        Args: {
          p_actual_cost_cents: number;
          p_attempt: number;
          p_error_class?: string;
          p_status: string;
          p_task_id: string;
          p_terminal?: boolean;
        };
        Returns: undefined;
      };
      reserve_provider_attempt: {
        Args: {
          p_model: string;
          p_provider: string;
          p_provider_key: string;
          p_task_id: string;
        };
        Returns: {
          attempt_number: number;
          duplicate_complete: boolean;
        }[];
      };
      retry_generation_task: {
        Args: { p_retry_key: string; p_task_id: string };
        Returns: {
          attempt: number;
          cancel_requested_at: string | null;
          created_at: string;
          dispatch_idempotency_key: string;
          id: string;
          owner_principal_id: string;
          presentation_view: string;
          prompt_release: string;
          provider_profile: string;
          run_id: string;
          status: Database["public"]["Enums"]["task_status"];
          terminal_error_code: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "generation_tasks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_design_resume_path: {
        Args: { p_design_id: string; p_resume_path: string };
        Returns: {
          active_revision_id: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          locale: string;
          name: string;
          owner_principal_id: string;
          resume_path: string | null;
          status: Database["public"]["Enums"]["design_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "designs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      checkout_status:
        | "not_created"
        | "draft"
        | "ready"
        | "completed"
        | "expired"
        | "cancelled";
      design_status: "draft" | "approved" | "generating" | "quoted" | "ordered";
      run_status:
        | "queued"
        | "running"
        | "partial"
        | "complete"
        | "cancelled"
        | "operator_review";
      task_status:
        | "queued"
        | "generating"
        | "verifying"
        | "ready"
        | "retrying"
        | "failed"
        | "blocked"
        | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      checkout_status: [
        "not_created",
        "draft",
        "ready",
        "completed",
        "expired",
        "cancelled",
      ],
      design_status: ["draft", "approved", "generating", "quoted", "ordered"],
      run_status: [
        "queued",
        "running",
        "partial",
        "complete",
        "cancelled",
        "operator_review",
      ],
      task_status: [
        "queued",
        "generating",
        "verifying",
        "ready",
        "retrying",
        "failed",
        "blocked",
        "cancelled",
      ],
    },
  },
} as const;
