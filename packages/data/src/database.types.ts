export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assets: {
        Row: {
          attempt: number
          bucket_id: string
          byte_size: number
          checksum_sha256: string
          created_at: string
          design_id: string
          id: string
          identity_artifact_id: string | null
          identity_fingerprint: string
          input_asset_ids: string[]
          mime_type: string
          model: string
          object_path: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider: string
          revision_id: string
          run_id: string
          style_anchor_release_id: string | null
          task_id: string
          verification_result: Json
        }
        Insert: {
          attempt: number
          bucket_id: string
          byte_size: number
          checksum_sha256: string
          created_at?: string
          design_id: string
          id?: string
          identity_artifact_id?: string | null
          identity_fingerprint: string
          input_asset_ids?: string[]
          mime_type: string
          model: string
          object_path: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider: string
          revision_id: string
          run_id: string
          style_anchor_release_id?: string | null
          task_id: string
          verification_result: Json
        }
        Update: {
          attempt?: number
          bucket_id?: string
          byte_size?: number
          checksum_sha256?: string
          created_at?: string
          design_id?: string
          id?: string
          identity_artifact_id?: string | null
          identity_fingerprint?: string
          input_asset_ids?: string[]
          mime_type?: string
          model?: string
          object_path?: string
          owner_principal_id?: string
          pipeline_release?: string
          presentation_view?: string
          prompt_release?: string
          prompt_release_id?: string
          provider?: string
          revision_id?: string
          run_id?: string
          style_anchor_release_id?: string | null
          task_id?: string
          verification_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assets_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_design_id_owner_principal_id_fkey"
            columns: ["design_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id", "owner_principal_id"]
          },
          {
            foreignKeyName: "assets_identity_artifact_id_fkey"
            columns: ["identity_artifact_id"]
            isOneToOne: false
            referencedRelation: "identity_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_pipeline_release_fkey"
            columns: ["pipeline_release"]
            isOneToOne: false
            referencedRelation: "pipeline_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_prompt_release_fk"
            columns: ["prompt_release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_revision_id_owner_principal_id_fkey"
            columns: ["revision_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id", "owner_principal_id"]
          },
          {
            foreignKeyName: "assets_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_run_id_owner_principal_id_fkey"
            columns: ["run_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id", "owner_principal_id"]
          },
          {
            foreignKeyName: "assets_style_anchor_release_id_fkey"
            columns: ["style_anchor_release_id"]
            isOneToOne: false
            referencedRelation: "style_anchor_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_task_id_owner_principal_id_fkey"
            columns: ["task_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_type: string
          created_at: string
          design_id: string | null
          detail: Json
          id: number
          principal_id: string | null
        }
        Insert: {
          action: string
          actor_type: string
          created_at?: string
          design_id?: string | null
          detail?: Json
          id?: never
          principal_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          created_at?: string
          design_id?: string | null
          detail?: Json
          id?: never
          principal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      design_drafts: {
        Row: {
          created_at: string
          design_id: string | null
          id: string
          locale: string
          owner_principal_id: string
          revision_token: number
          specification: Json
          spelling_confirmed: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_id?: string | null
          id?: string
          locale: string
          owner_principal_id: string
          revision_token?: number
          specification: Json
          spelling_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_id?: string | null
          id?: string
          locale?: string
          owner_principal_id?: string
          revision_token?: number
          specification?: Json
          spelling_confirmed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_drafts_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_drafts_design_id_owner_principal_id_fkey"
            columns: ["design_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      design_revisions: {
        Row: {
          approval_idempotency_key: string
          approved_at: string
          created_at: string
          design_id: string
          draft_id: string
          id: string
          identity_anchor: Json
          owner_principal_id: string
          revision_number: number
          specification: Json
        }
        Insert: {
          approval_idempotency_key: string
          approved_at?: string
          created_at?: string
          design_id: string
          draft_id: string
          id?: string
          identity_anchor: Json
          owner_principal_id: string
          revision_number: number
          specification: Json
        }
        Update: {
          approval_idempotency_key?: string
          approved_at?: string
          created_at?: string
          design_id?: string
          draft_id?: string
          id?: string
          identity_anchor?: Json
          owner_principal_id?: string
          revision_number?: number
          specification?: Json
        }
        Relationships: [
          {
            foreignKeyName: "design_revisions_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_revisions_design_id_owner_principal_id_fkey"
            columns: ["design_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id", "owner_principal_id"]
          },
          {
            foreignKeyName: "design_revisions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "design_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_revisions_draft_id_owner_principal_id_fkey"
            columns: ["draft_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "design_drafts"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      designs: {
        Row: {
          active_revision_id: string | null
          created_at: string
          customer_id: string
          id: string
          locale: string
          name: string
          owner_principal_id: string
          resume_path: string | null
          status: Database["public"]["Enums"]["design_status"]
          updated_at: string
        }
        Insert: {
          active_revision_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          locale: string
          name?: string
          owner_principal_id: string
          resume_path?: string | null
          status?: Database["public"]["Enums"]["design_status"]
          updated_at?: string
        }
        Update: {
          active_revision_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          locale?: string
          name?: string
          owner_principal_id?: string
          resume_path?: string | null
          status?: Database["public"]["Enums"]["design_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_active_revision_fk"
            columns: ["active_revision_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      generation_prompt_snapshots: {
        Row: {
          compiled_prompt: string
          compiler_version: string
          created_at: string
          prompt_release_id: string
          sha256: string
          task_id: string
          variable_snapshot: Json
        }
        Insert: {
          compiled_prompt: string
          compiler_version: string
          created_at?: string
          prompt_release_id: string
          sha256: string
          task_id: string
          variable_snapshot: Json
        }
        Update: {
          compiled_prompt?: string
          compiler_version?: string
          created_at?: string
          prompt_release_id?: string
          sha256?: string
          task_id?: string
          variable_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generation_prompt_snapshots_prompt_release_id_fkey"
            columns: ["prompt_release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_prompt_snapshots_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "generation_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_runs: {
        Row: {
          actual_spend_cents: number
          cancelled_at: string | null
          created_at: string
          design_id: string
          id: string
          label: string
          operator_review_reason: string | null
          owner_principal_id: string
          pipeline_release_id: string
          reserved_spend_cents: number
          revision_id: string
          run_idempotency_key: string
          status: Database["public"]["Enums"]["run_status"]
          updated_at: string
        }
        Insert: {
          actual_spend_cents?: number
          cancelled_at?: string | null
          created_at?: string
          design_id: string
          id?: string
          label?: string
          operator_review_reason?: string | null
          owner_principal_id: string
          pipeline_release_id?: string
          reserved_spend_cents: number
          revision_id: string
          run_idempotency_key: string
          status?: Database["public"]["Enums"]["run_status"]
          updated_at?: string
        }
        Update: {
          actual_spend_cents?: number
          cancelled_at?: string | null
          created_at?: string
          design_id?: string
          id?: string
          label?: string
          operator_review_reason?: string | null
          owner_principal_id?: string
          pipeline_release_id?: string
          reserved_spend_cents?: number
          revision_id?: string
          run_idempotency_key?: string
          status?: Database["public"]["Enums"]["run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_runs_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_design_id_owner_principal_id_fkey"
            columns: ["design_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id", "owner_principal_id"]
          },
          {
            foreignKeyName: "generation_runs_pipeline_release_id_fkey"
            columns: ["pipeline_release_id"]
            isOneToOne: false
            referencedRelation: "pipeline_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_revision_id_owner_principal_id_fkey"
            columns: ["revision_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      generation_tasks: {
        Row: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          attempt?: number
          cancel_requested_at?: string | null
          created_at?: string
          dependency_task_id?: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents?: number
          id?: string
          identity_artifact_id?: string | null
          input_asset_ids?: string[]
          model_release?: string
          owner_principal_id: string
          pipeline_release?: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url?: string | null
          provider_status_url?: string | null
          reservation_cents?: number
          run_id: string
          status?: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id?: string | null
          task_profile?: string
          terminal_error_code?: string | null
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          attempt?: number
          cancel_requested_at?: string | null
          created_at?: string
          dependency_task_id?: string | null
          dispatch_idempotency_key?: string
          estimated_cost_cents?: number
          id?: string
          identity_artifact_id?: string | null
          input_asset_ids?: string[]
          model_release?: string
          owner_principal_id?: string
          pipeline_release?: string
          presentation_view?: string
          prompt_release?: string
          prompt_release_id?: string
          provider_profile?: string
          provider_response_url?: string | null
          provider_status_url?: string | null
          reservation_cents?: number
          run_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id?: string | null
          task_profile?: string
          terminal_error_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_tasks_dependency_task_id_fkey"
            columns: ["dependency_task_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_tasks_identity_artifact_id_fkey"
            columns: ["identity_artifact_id"]
            isOneToOne: false
            referencedRelation: "identity_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_tasks_pipeline_release_fkey"
            columns: ["pipeline_release"]
            isOneToOne: false
            referencedRelation: "pipeline_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_tasks_prompt_release_fk"
            columns: ["prompt_release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_tasks_run_id_owner_principal_id_fkey"
            columns: ["run_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id", "owner_principal_id"]
          },
          {
            foreignKeyName: "generation_tasks_style_anchor_release_id_fkey"
            columns: ["style_anchor_release_id"]
            isOneToOne: false
            referencedRelation: "style_anchor_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_artifacts: {
        Row: {
          approved_text: string
          bucket_id: string
          created_at: string
          engine_release: string
          fingerprint: string
          font_release: string
          id: string
          object_path: string
          owner_principal_id: string
          png_sha256: string
          revision_id: string
          script: string
          validation_report: Json
        }
        Insert: {
          approved_text: string
          bucket_id: string
          created_at?: string
          engine_release: string
          fingerprint: string
          font_release: string
          id?: string
          object_path: string
          owner_principal_id: string
          png_sha256: string
          revision_id: string
          script: string
          validation_report: Json
        }
        Update: {
          approved_text?: string
          bucket_id?: string
          created_at?: string
          engine_release?: string
          fingerprint?: string
          font_release?: string
          id?: string
          object_path?: string
          owner_principal_id?: string
          png_sha256?: string
          revision_id?: string
          script?: string
          validation_report?: Json
        }
        Relationships: [
          {
            foreignKeyName: "identity_artifacts_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_artifacts_revision_id_owner_principal_id_fkey"
            columns: ["revision_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string
          accepted_total: number
          checkout_status: Database["public"]["Enums"]["checkout_status"]
          created_at: string
          design_id: string
          id: string
          owner_principal_id: string
          quote_id: string
          revision_id: string
          shopify_draft_order_id: string | null
          shopify_order_id: string | null
          status: string
        }
        Insert: {
          accepted_at: string
          accepted_total: number
          checkout_status: Database["public"]["Enums"]["checkout_status"]
          created_at?: string
          design_id: string
          id?: string
          owner_principal_id: string
          quote_id: string
          revision_id: string
          shopify_draft_order_id?: string | null
          shopify_order_id?: string | null
          status: string
        }
        Update: {
          accepted_at?: string
          accepted_total?: number
          checkout_status?: Database["public"]["Enums"]["checkout_status"]
          created_at?: string
          design_id?: string
          id?: string
          owner_principal_id?: string
          quote_id?: string
          revision_id?: string
          shopify_draft_order_id?: string | null
          shopify_order_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempt_count: number
          available_at: string
          created_at: string
          dispatch_idempotency_key: string
          event_type: string
          id: string
          last_error: string | null
          lease_id: string | null
          locked_at: string | null
          payload: Json
          published_at: string | null
          state: string
          task_identifier: string | null
          trigger_run_id: string | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempt_count?: number
          available_at?: string
          created_at?: string
          dispatch_idempotency_key: string
          event_type: string
          id?: string
          last_error?: string | null
          lease_id?: string | null
          locked_at?: string | null
          payload: Json
          published_at?: string | null
          state?: string
          task_identifier?: string | null
          trigger_run_id?: string | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempt_count?: number
          available_at?: string
          created_at?: string
          dispatch_idempotency_key?: string
          event_type?: string
          id?: string
          last_error?: string | null
          lease_id?: string | null
          locked_at?: string | null
          payload?: Json
          published_at?: string | null
          state?: string
          task_identifier?: string | null
          trigger_run_id?: string | null
        }
        Relationships: []
      }
      pipeline_releases: {
        Row: {
          created_at: string
          id: string
          identity_engine_release: string
          shot_mapping: Json
          status: string
          still_model: string
          verifier_model: string | null
          video_final_model: string
          video_preview_model: string
        }
        Insert: {
          created_at?: string
          id: string
          identity_engine_release: string
          shot_mapping: Json
          status: string
          still_model: string
          verifier_model?: string | null
          video_final_model: string
          video_preview_model: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_engine_release?: string
          shot_mapping?: Json
          status?: string
          still_model?: string
          verifier_model?: string | null
          video_final_model?: string
          video_preview_model?: string
        }
        Relationships: []
      }
      price_snapshots: {
        Row: {
          assumptions: Json
          confidence: string
          created_at: string
          currency: string
          expires_at: string
          gold_price_timestamp: string
          high_amount: number
          id: string
          low_amount: number
          owner_principal_id: string
          revision_id: string
        }
        Insert: {
          assumptions?: Json
          confidence?: string
          created_at?: string
          currency?: string
          expires_at: string
          gold_price_timestamp?: string
          high_amount: number
          id?: string
          low_amount: number
          owner_principal_id: string
          revision_id: string
        }
        Update: {
          assumptions?: Json
          confidence?: string
          created_at?: string
          currency?: string
          expires_at?: string
          gold_price_timestamp?: string
          high_amount?: number
          id?: string
          low_amount?: number
          owner_principal_id?: string
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "design_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      principal_daily_usage: {
        Row: {
          actual_spend_cents: number
          principal_id: string
          reserved_spend_cents: number
          runs_started: number
          usage_date: string
        }
        Insert: {
          actual_spend_cents?: number
          principal_id: string
          reserved_spend_cents?: number
          runs_started?: number
          usage_date?: string
        }
        Update: {
          actual_spend_cents?: number
          principal_id?: string
          reserved_spend_cents?: number
          runs_started?: number
          usage_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      prompt_profile_publications: {
        Row: {
          profile: string
          published_at: string
          published_by: string
          release_id: string
        }
        Insert: {
          profile: string
          published_at?: string
          published_by: string
          release_id: string
        }
        Update: {
          profile?: string
          published_at?: string
          published_by?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_profile_publications_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_publication_events: {
        Row: {
          id: number
          previous_release_id: string | null
          profile: string
          published_at: string
          published_by: string
          release_id: string
        }
        Insert: {
          id?: never
          previous_release_id?: string | null
          profile: string
          published_at?: string
          published_by: string
          release_id: string
        }
        Update: {
          id?: never
          previous_release_id?: string | null
          profile?: string
          published_at?: string
          published_by?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_publication_events_previous_release_id_fkey"
            columns: ["previous_release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_publication_events_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_releases: {
        Row: {
          change_note: string
          created_at: string
          created_by: string
          id: string
          parsed_variables: string[]
          profile: string
          template: string
          version: number
        }
        Insert: {
          change_note: string
          created_at?: string
          created_by: string
          id?: string
          parsed_variables: string[]
          profile: string
          template: string
          version: number
        }
        Update: {
          change_note?: string
          created_at?: string
          created_by?: string
          id?: string
          parsed_variables?: string[]
          profile?: string
          template?: string
          version?: number
        }
        Relationships: []
      }
      provider_attempts: {
        Row: {
          actual_cost_cents: number | null
          attempt: number
          completed_at: string | null
          created_at: string
          error_class: string | null
          estimated_cost_cents: number
          id: string
          model: string
          owner_principal_id: string
          prompt_release_id: string
          provider: string
          provider_idempotency_key: string
          provider_request_id: string | null
          status: string
          task_id: string
        }
        Insert: {
          actual_cost_cents?: number | null
          attempt: number
          completed_at?: string | null
          created_at?: string
          error_class?: string | null
          estimated_cost_cents?: number
          id?: string
          model: string
          owner_principal_id: string
          prompt_release_id: string
          provider: string
          provider_idempotency_key: string
          provider_request_id?: string | null
          status: string
          task_id: string
        }
        Update: {
          actual_cost_cents?: number | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_class?: string | null
          estimated_cost_cents?: number
          id?: string
          model?: string
          owner_principal_id?: string
          prompt_release_id?: string
          provider?: string
          provider_idempotency_key?: string
          provider_request_id?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_attempts_prompt_release_fk"
            columns: ["prompt_release_id"]
            isOneToOne: false
            referencedRelation: "prompt_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_attempts_task_id_owner_principal_id_fkey"
            columns: ["task_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      provider_output_checkpoints: {
        Row: {
          attempt: number
          bucket_id: string
          byte_size: number
          checksum_sha256: string
          created_at: string
          mime_type: string
          object_path: string
          owner_principal_id: string
          provider_request_id: string | null
          state: string
          task_id: string
        }
        Insert: {
          attempt: number
          bucket_id: string
          byte_size: number
          checksum_sha256: string
          created_at?: string
          mime_type: string
          object_path: string
          owner_principal_id: string
          provider_request_id?: string | null
          state?: string
          task_id: string
        }
        Update: {
          attempt?: number
          bucket_id?: string
          byte_size?: number
          checksum_sha256?: string
          created_at?: string
          mime_type?: string
          object_path?: string
          owner_principal_id?: string
          provider_request_id?: string | null
          state?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_output_checkpoints_task_id_attempt_fkey"
            columns: ["task_id", "attempt"]
            isOneToOne: true
            referencedRelation: "provider_attempts"
            referencedColumns: ["task_id", "attempt"]
          },
          {
            foreignKeyName: "provider_output_checkpoints_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_output_checkpoints_task_id_owner_principal_id_fkey"
            columns: ["task_id", "owner_principal_id"]
            isOneToOne: false
            referencedRelation: "generation_tasks"
            referencedColumns: ["id", "owner_principal_id"]
          },
        ]
      }
      quotes: {
        Row: {
          checkout_claimed_at: string | null
          checkout_idempotency_key: string
          checkout_status: Database["public"]["Enums"]["checkout_status"]
          checkout_url: string | null
          created_at: string
          currency: string
          design_id: string
          expires_at: string
          id: string
          issued_at: string | null
          owner_principal_id: string
          revision_id: string
          shopify_draft_order_id: string | null
          snapshot: Json
          status: string
          total: number
        }
        Insert: {
          checkout_claimed_at?: string | null
          checkout_idempotency_key: string
          checkout_status?: Database["public"]["Enums"]["checkout_status"]
          checkout_url?: string | null
          created_at?: string
          currency?: string
          design_id: string
          expires_at: string
          id?: string
          issued_at?: string | null
          owner_principal_id: string
          revision_id: string
          shopify_draft_order_id?: string | null
          snapshot: Json
          status: string
          total: number
        }
        Update: {
          checkout_claimed_at?: string | null
          checkout_idempotency_key?: string
          checkout_status?: Database["public"]["Enums"]["checkout_status"]
          checkout_url?: string | null
          created_at?: string
          currency?: string
          design_id?: string
          expires_at?: string
          id?: string
          issued_at?: string | null
          owner_principal_id?: string
          revision_id?: string
          shopify_draft_order_id?: string | null
          snapshot?: Json
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "design_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_policy: {
        Row: {
          daily_generation_limit: number
          environment: string
          id: boolean
          max_reserved_spend_cents: number
          studio_reservation_cents: number
          supabase_region: string
          updated_at: string
          video_reservation_cents: number
        }
        Insert: {
          daily_generation_limit?: number
          environment?: string
          id?: boolean
          max_reserved_spend_cents?: number
          studio_reservation_cents?: number
          supabase_region?: string
          updated_at?: string
          video_reservation_cents?: number
        }
        Update: {
          daily_generation_limit?: number
          environment?: string
          id?: boolean
          max_reserved_spend_cents?: number
          studio_reservation_cents?: number
          supabase_region?: string
          updated_at?: string
          video_reservation_cents?: number
        }
        Relationships: []
      }
      share_grants: {
        Row: {
          created_at: string
          design_id: string
          expires_at: string
          id: string
          owner_principal_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          design_id: string
          expires_at: string
          id?: string
          owner_principal_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          design_id?: string
          expires_at?: string
          id?: string
          owner_principal_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_grants_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      style_anchor_publication_events: {
        Row: {
          id: number
          previous_release_id: string | null
          profile: string
          published_at: string
          published_by: string
          release_id: string
        }
        Insert: {
          id?: never
          previous_release_id?: string | null
          profile: string
          published_at?: string
          published_by: string
          release_id: string
        }
        Update: {
          id?: never
          previous_release_id?: string | null
          profile?: string
          published_at?: string
          published_by?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_anchor_publication_events_previous_release_id_fkey"
            columns: ["previous_release_id"]
            isOneToOne: false
            referencedRelation: "style_anchor_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_anchor_publication_events_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "style_anchor_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      style_anchor_publications: {
        Row: {
          profile: string
          published_at: string
          published_by: string
          release_id: string
        }
        Insert: {
          profile: string
          published_at?: string
          published_by: string
          release_id: string
        }
        Update: {
          profile?: string
          published_at?: string
          published_by?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_anchor_publications_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "style_anchor_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      style_anchor_releases: {
        Row: {
          approval_note: string
          bucket_id: string | null
          checksum_sha256: string | null
          created_at: string
          created_by: string
          id: string
          object_path: string | null
          profile: string
          source_task_id: string
          status: string
          version: number
        }
        Insert: {
          approval_note: string
          bucket_id?: string | null
          checksum_sha256?: string | null
          created_at?: string
          created_by: string
          id?: string
          object_path?: string | null
          profile: string
          source_task_id: string
          status: string
          version: number
        }
        Update: {
          approval_note?: string
          bucket_id?: string | null
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string
          id?: string
          object_path?: string | null
          profile?: string
          source_task_id?: string
          status?: string
          version?: number
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          delivery_id: string
          last_error: string | null
          payload_sha256: string
          processed_at: string | null
          provider: string
          received_at: string
          shop_domain: string | null
          topic: string | null
        }
        Insert: {
          delivery_id: string
          last_error?: string | null
          payload_sha256: string
          processed_at?: string | null
          provider: string
          received_at?: string
          shop_domain?: string | null
          topic?: string | null
        }
        Update: {
          delivery_id?: string
          last_error?: string | null
          payload_sha256?: string
          processed_at?: string | null
          provider?: string
          received_at?: string
          shop_domain?: string | null
          topic?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ack_outbox_event: {
        Args: {
          p_event_id: string
          p_lease_id: string
          p_trigger_run_id: string
        }
        Returns: undefined
      }
      approve_and_start_studio: {
        Args: {
          p_approval_key: string
          p_draft_id: string
          p_run_key: string
          p_specification: Json
        }
        Returns: {
          approved_design_id: string
          canonical_identity_anchor: Json
          outbox_id: string
          revision_id: string
          run_id: string
          task_id: string
        }[]
      }
      approve_and_start_studio_legacy: {
        Args: {
          p_approval_key: string
          p_draft_id: string
          p_run_key: string
          p_specification: Json
        }
        Returns: {
          approved_design_id: string
          canonical_identity_anchor: Json
          outbox_id: string
          revision_id: string
          run_id: string
          task_id: string
        }[]
      }
      cancel_generation_task: {
        Args: { p_task_id: string }
        Returns: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "generation_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      canonical_identity_anchor: {
        Args: { p_specification: Json }
        Returns: Json
      }
      claim_outbox_event: {
        Args: {
          p_event_id: string
          p_lease_id: string
          p_lease_seconds: number
        }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          attempt_count: number
          available_at: string
          created_at: string
          dispatch_idempotency_key: string
          event_type: string
          id: string
          last_error: string | null
          lease_id: string | null
          locked_at: string | null
          payload: Json
          published_at: string | null
          state: string
          task_identifier: string | null
          trigger_run_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "outbox_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_shopify_order: {
        Args: {
          p_delivery_id: string
          p_quote_id: string
          p_shopify_order_id: string
        }
        Returns: {
          accepted_at: string
          accepted_total: number
          checkout_status: Database["public"]["Enums"]["checkout_status"]
          created_at: string
          design_id: string
          id: string
          owner_principal_id: string
          quote_id: string
          revision_id: string
          shopify_draft_order_id: string | null
          shopify_order_id: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_prompt_release: {
        Args: {
          p_change_note: string
          p_created_by: string
          p_parsed_variables: string[]
          p_profile: string
          p_template: string
        }
        Returns: {
          change_note: string
          created_at: string
          created_by: string
          id: string
          parsed_variables: string[]
          profile: string
          template: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "prompt_releases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_style_anchor_release: {
        Args: {
          p_approval_note: string
          p_bucket_id: string
          p_checksum_sha256: string
          p_created_by: string
          p_object_path: string
          p_profile: string
          p_source_task_id: string
        }
        Returns: {
          approval_note: string
          bucket_id: string | null
          checksum_sha256: string | null
          created_at: string
          created_by: string
          id: string
          object_path: string | null
          profile: string
          source_task_id: string
          status: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "style_anchor_releases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      estimate_revision: {
        Args: { p_revision_id: string }
        Returns: {
          assumptions: Json
          confidence: string
          created_at: string
          currency: string
          expires_at: string
          gold_price_timestamp: string
          high_amount: number
          id: string
          low_amount: number
          owner_principal_id: string
          revision_id: string
        }
        SetofOptions: {
          from: "*"
          to: "price_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expand_final_media_run: {
        Args: { p_run_id: string }
        Returns: {
          outbox_id: string
          task_id: string
        }[]
      }
      ingest_shopify_paid_webhook: {
        Args: {
          p_delivery_id: string
          p_payload_sha256: string
          p_quote_id: string
          p_shop_domain: string
          p_shopify_order_id: string
        }
        Returns: Json
      }
      mark_task_pre_spend_blocked: {
        Args: { p_reason: string; p_task_id: string }
        Returns: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "generation_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      materialize_prompt_snapshot: {
        Args: {
          p_compiled_prompt: string
          p_compiler_version: string
          p_prompt_release_id: string
          p_sha256: string
          p_task_id: string
          p_variable_snapshot: Json
        }
        Returns: {
          compiled_prompt: string
          compiler_version: string
          created_at: string
          prompt_release_id: string
          sha256: string
          task_id: string
          variable_snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "generation_prompt_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      nack_outbox_event: {
        Args: {
          p_available_at: string
          p_error: string
          p_event_id: string
          p_lease_id: string
        }
        Returns: undefined
      }
      operator_retry_generation_task: {
        Args: { p_reason?: string; p_retry_key: string; p_task_id: string }
        Returns: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "generation_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_prompt_release: {
        Args: {
          p_expected_current_release_id: string
          p_published_by: string
          p_release_id: string
        }
        Returns: {
          previous_release_id: string
          profile: string
          published_at: string
          release_id: string
          version: number
        }[]
      }
      publish_style_anchor_release: {
        Args: {
          p_expected_current_release_id: string
          p_published_by: string
          p_release_id: string
        }
        Returns: {
          profile: string
          published_at: string
          published_by: string
          release_id: string
        }
        SetofOptions: {
          from: "*"
          to: "style_anchor_publications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_provider_attempt: {
        Args: {
          p_actual_cost_cents: number
          p_attempt: number
          p_error_class?: string
          p_status: string
          p_task_id: string
          p_terminal?: boolean
        }
        Returns: undefined
      }
      record_shopify_webhook_incident: {
        Args: {
          p_delivery_id: string
          p_payload_sha256: string
          p_reason: string
          p_shop_domain: string
          p_shopify_order_id?: string
          p_topic: string
        }
        Returns: Json
      }
      recover_stale_generation_tasks: {
        Args: { p_limit?: number; p_stale_before: string }
        Returns: {
          outbox_id: string
          recovery_action: string
          task_id: string
        }[]
      }
      refresh_run_status: { Args: { p_run_id: string }; Returns: string }
      request_video_task: {
        Args: {
          p_kind: string
          p_request_key: string
          p_run_id: string
          p_source_task_id: string
        }
        Returns: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "generation_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_provider_attempt: {
        Args: {
          p_model: string
          p_provider: string
          p_provider_key: string
          p_task_id: string
        }
        Returns: {
          attempt_number: number
          duplicate_complete: boolean
        }[]
      }
      reserve_shopify_checkout: {
        Args: {
          p_idempotency_key: string
          p_owner_principal_id: string
          p_quote_id: string
        }
        Returns: Json
      }
      retry_generation_task: {
        Args: { p_retry_key: string; p_task_id: string }
        Returns: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "generation_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_design_resume_path: {
        Args: { p_design_id: string; p_resume_path: string }
        Returns: {
          active_revision_id: string | null
          created_at: string
          customer_id: string
          id: string
          locale: string
          name: string
          owner_principal_id: string
          resume_path: string | null
          status: Database["public"]["Enums"]["design_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "designs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_studio_run: {
        Args: { p_design_id: string; p_run_key: string }
        Returns: {
          outbox_id: string
          run_id: string
          task_id: string
        }[]
      }
      start_studio_run_legacy: {
        Args: { p_design_id: string; p_run_key: string }
        Returns: {
          outbox_id: string
          run_id: string
          task_id: string
        }[]
      }
      transition_generation_task: {
        Args: {
          p_from: string[]
          p_patch?: Json
          p_task_id: string
          p_to: string
        }
        Returns: {
          aspect_ratio: string
          attempt: number
          cancel_requested_at: string | null
          created_at: string
          dependency_task_id: string | null
          dispatch_idempotency_key: string
          estimated_cost_cents: number
          id: string
          identity_artifact_id: string | null
          input_asset_ids: string[]
          model_release: string
          owner_principal_id: string
          pipeline_release: string
          presentation_view: string
          prompt_release: string
          prompt_release_id: string
          provider_profile: string
          provider_response_url: string | null
          provider_status_url: string | null
          reservation_cents: number
          run_id: string
          status: Database["public"]["Enums"]["task_status"]
          style_anchor_release_id: string | null
          task_profile: string
          terminal_error_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "generation_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      checkout_status:
        | "not_created"
        | "draft"
        | "ready"
        | "completed"
        | "expired"
        | "cancelled"
      design_status: "draft" | "approved" | "generating" | "quoted" | "ordered"
      run_status:
        | "queued"
        | "running"
        | "partial"
        | "complete"
        | "cancelled"
        | "operator_review"
      task_status:
        | "queued"
        | "generating"
        | "verifying"
        | "ready"
        | "retrying"
        | "failed"
        | "blocked"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

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
} as const
