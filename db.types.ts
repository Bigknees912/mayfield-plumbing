// Generated from the Supabase project schema (umtoseyxvszdxbuvuyuk).
// Regenerate with: supabase gen types typescript --project-id umtoseyxvszdxbuvuyuk
// or the Supabase MCP `generate_typescript_types` tool. Do not hand-edit.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          super_admin_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          super_admin_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          super_admin_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          automation_id: string
          company_id: string
          created_at: string
          customer_id: string | null
          error: string | null
          executed_at: string | null
          id: string
          job_id: string | null
          scheduled_for: string
          status: string
        }
        Insert: {
          automation_id: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          job_id?: string | null
          scheduled_for: string
          status?: string
        }
        Update: {
          automation_id?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          job_id?: string | null
          scheduled_for?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_config: Json
          action_type: string
          active: boolean
          company_id: string
          created_at: string
          created_by: string | null
          delay_minutes: number
          id: string
          name: string
          trigger_config: Json
          trigger_type: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          active?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          id?: string
          name: string
          trigger_config?: Json
          trigger_type: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          active?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          id?: string
          name?: string
          trigger_config?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          address: string | null
          company_id: string
          customer_name: string | null
          customer_phone: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          job_type_id: string | null
          outcome: string
          parts_tier: string | null
          property_type: string | null
          quote_high: number | null
          quote_low: number | null
          started_at: string
          transcript: Json | null
          urgency: string | null
          vapi_call_id: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          customer_name?: string | null
          customer_phone?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          job_type_id?: string | null
          outcome?: string
          parts_tier?: string | null
          property_type?: string | null
          quote_high?: number | null
          quote_low?: number | null
          started_at?: string
          transcript?: Json | null
          urgency?: string | null
          vapi_call_id?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          job_type_id?: string | null
          outcome?: string
          parts_tier?: string | null
          property_type?: string | null
          quote_high?: number | null
          quote_low?: number | null
          started_at?: string
          transcript?: Json | null
          urgency?: string | null
          vapi_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "job_types"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_enrollments: {
        Row: {
          campaign_id: string
          customer_id: string
          enrolled_at: string
          id: string
          status: string
        }
        Insert: {
          campaign_id: string
          customer_id: string
          enrolled_at?: string
          id?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          customer_id?: string
          enrolled_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "nurture_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_enrollments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          auto_assign_by_zone: boolean
          base_fee: number
          commission_pct: number
          contact_email: string | null
          created_at: string
          deposit_pct: number
          deposit_threshold: number
          emergency_multiplier: number
          financing_enabled: boolean
          financing_partner_url: string | null
          financing_threshold: number
          google_review_link: string | null
          hourly_rate: number
          id: string
          join_code: string
          name: string
          notify_emergency_calls: boolean
          sameday_multiplier: number
          service_area: string | null
          status: string
          team_size_bracket: string | null
          timezone: string
          trade: string
        }
        Insert: {
          auto_assign_by_zone?: boolean
          base_fee?: number
          commission_pct?: number
          contact_email?: string | null
          created_at?: string
          deposit_pct?: number
          deposit_threshold?: number
          emergency_multiplier?: number
          financing_enabled?: boolean
          financing_partner_url?: string | null
          financing_threshold?: number
          google_review_link?: string | null
          hourly_rate?: number
          id?: string
          join_code: string
          name: string
          notify_emergency_calls?: boolean
          sameday_multiplier?: number
          service_area?: string | null
          status?: string
          team_size_bracket?: string | null
          timezone?: string
          trade?: string
        }
        Update: {
          auto_assign_by_zone?: boolean
          base_fee?: number
          commission_pct?: number
          contact_email?: string | null
          created_at?: string
          deposit_pct?: number
          deposit_threshold?: number
          emergency_multiplier?: number
          financing_enabled?: boolean
          financing_partner_url?: string | null
          financing_threshold?: number
          google_review_link?: string | null
          hourly_rate?: number
          id?: string
          join_code?: string
          name?: string
          notify_emergency_calls?: boolean
          sameday_multiplier?: number
          service_area?: string | null
          status?: string
          team_size_bracket?: string | null
          timezone?: string
          trade?: string
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          body: string
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          type: string
        }
        Insert: {
          body: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          type?: string
        }
        Update: {
          body?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          pii_deleted_at: string | null
          pipeline_stage: string
          referral_code: string | null
          referred_by: string | null
          sms_consent: boolean
          sms_consent_at: string | null
          sms_consent_method: string | null
          tags: string[]
        }
        Insert: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          pii_deleted_at?: string | null
          pipeline_stage?: string
          referral_code?: string | null
          referred_by?: string | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          sms_consent_method?: string | null
          tags?: string[]
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          pii_deleted_at?: string | null
          pipeline_stage?: string
          referral_code?: string | null
          referred_by?: string | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          sms_consent_method?: string | null
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          company_id: string | null
          company_name_provided: string | null
          created_at: string
          details: string | null
          due_date: string
          id: string
          request_type: string
          requester_email: string
          requester_name: string
          requester_phone: string | null
          resolution_note: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          company_id?: string | null
          company_name_provided?: string | null
          created_at?: string
          details?: string | null
          due_date: string
          id?: string
          request_type: string
          requester_email: string
          requester_name: string
          requester_phone?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string | null
          company_name_provided?: string | null
          created_at?: string
          details?: string | null
          due_date?: string
          id?: string
          request_type?: string
          requester_email?: string
          requester_name?: string
          requester_phone?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          call_id: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string
          job_id: string | null
          job_type_id: string | null
          price_high: number | null
          price_low: number | null
          source: string
          status: string
          status_changed_at: string
        }
        Insert: {
          call_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          job_type_id?: string | null
          price_high?: number | null
          price_low?: number | null
          source?: string
          status?: string
          status_changed_at?: string
        }
        Update: {
          call_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          job_type_id?: string | null
          price_high?: number | null
          price_low?: number | null
          source?: string
          status?: string
          status_changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "job_types"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          id: string
          job_id: string | null
          note: string | null
          resolved: boolean
          sentiment: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          note?: string | null
          resolved?: boolean
          sentiment: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          note?: string | null
          resolved?: boolean
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          company_id: string
          config: Json | null
          connected: boolean
          connected_at: string | null
          id: string
          provider: string
        }
        Insert: {
          company_id: string
          config?: Json | null
          connected?: boolean
          connected_at?: string | null
          id?: string
          provider: string
        }
        Update: {
          company_id?: string
          config?: Json | null
          connected?: boolean
          connected_at?: string | null
          id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          company_id: string
          customer_id: string | null
          id: string
          invoice_no: string
          job_id: string | null
          paid_at: string | null
          sent_at: string
          status: string
        }
        Insert: {
          amount: number
          company_id: string
          customer_id?: string | null
          id?: string
          invoice_no: string
          job_id?: string | null
          paid_at?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          customer_id?: string | null
          id?: string
          invoice_no?: string
          job_id?: string | null
          paid_at?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          id: string
          job_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_events: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          job_id: string
          lat: number | null
          lng: number | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          lat?: number | null
          lng?: number | null
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          lat?: number | null
          lng?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_type_parts: {
        Row: {
          job_type_id: string
          part_id: string
        }
        Insert: {
          job_type_id: string
          part_id: string
        }
        Update: {
          job_type_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_type_parts_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "job_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_type_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_types: {
        Row: {
          active: boolean
          base_hours: number
          company_id: string
          hourly_rate_override: number | null
          id: string
          key: string
          label: string
          parts_cost: number
        }
        Insert: {
          active?: boolean
          base_hours?: number
          company_id: string
          hourly_rate_override?: number | null
          id?: string
          key: string
          label: string
          parts_cost?: number
        }
        Update: {
          active?: boolean
          base_hours?: number
          company_id?: string
          hourly_rate_override?: number | null
          id?: string
          key?: string
          label?: string
          parts_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string
          assigned_tech_id: string | null
          call_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          customer_id: string | null
          deposit_amount: number | null
          deposit_paid_at: string | null
          deposit_status: string
          description: string
          id: string
          job_type_id: string | null
          lat: number | null
          lng: number | null
          notes: string | null
          price_high: number | null
          price_low: number | null
          scheduled_date: string | null
          scheduled_window: string | null
          source: string
          status: string
          stripe_checkout_session_id: string | null
          urgency: string
        }
        Insert: {
          address: string
          assigned_tech_id?: string | null
          call_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          deposit_status?: string
          description: string
          id?: string
          job_type_id?: string | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          price_high?: number | null
          price_low?: number | null
          scheduled_date?: string | null
          scheduled_window?: string | null
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          urgency: string
        }
        Update: {
          address?: string
          assigned_tech_id?: string | null
          call_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          deposit_status?: string
          description?: string
          id?: string
          job_type_id?: string | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          price_high?: number | null
          price_low?: number | null
          scheduled_date?: string | null
          scheduled_window?: string | null
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "job_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          company_id: string
          converted_customer_id: string | null
          converted_job_id: string | null
          created_at: string
          id: string
          job_type_interest: string | null
          name: string
          phone: string
          source: string
          status: string
        }
        Insert: {
          address?: string | null
          company_id: string
          converted_customer_id?: string | null
          converted_job_id?: string | null
          created_at?: string
          id?: string
          job_type_interest?: string | null
          name: string
          phone: string
          source?: string
          status?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          converted_customer_id?: string | null
          converted_job_id?: string | null
          created_at?: string
          id?: string
          job_type_interest?: string | null
          name?: string
          phone?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_campaigns: {
        Row: {
          active: boolean
          company_id: string
          id: string
          name: string
          trigger_type: string
        }
        Insert: {
          active?: boolean
          company_id: string
          id?: string
          name: string
          trigger_type: string
        }
        Update: {
          active?: boolean
          company_id?: string
          id?: string
          name?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          features: Json
          key: string
          monthly_price: number
          name: string
          seat_limit: number | null
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          features?: Json
          key: string
          monthly_price?: number
          name: string
          seat_limit?: number | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          features?: Json
          key?: string
          monthly_price?: number
          name?: string
          seat_limit?: number | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          theme: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          role: string
          theme?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_snapshots: {
        Row: {
          breakdown: Json
          created_at: string
          snapshot_date: string
          total_revenue: number
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          snapshot_date: string
          total_revenue: number
        }
        Update: {
          breakdown?: Json
          created_at?: string
          snapshot_date?: string
          total_revenue?: number
        }
        Relationships: []
      }
      service_contracts: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          frequency_months: number
          id: string
          last_reminder_sent_at: string | null
          name: string
          next_due_date: string
          price: number | null
          reminder_lead_days: number
          status: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          customer_id: string
          frequency_months: number
          id?: string
          last_reminder_sent_at?: string | null
          name: string
          next_due_date: string
          price?: number | null
          reminder_lead_days?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          frequency_months?: number
          id?: string
          last_reminder_sent_at?: string | null
          name?: string
          next_due_date?: string
          price?: number | null
          reminder_lead_days?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_consent_events: {
        Row: {
          company_id: string
          consent: boolean
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: string
          note: string | null
        }
        Insert: {
          company_id?: string
          consent: boolean
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          method: string
          note?: string | null
        }
        Update: {
          company_id?: string
          consent?: boolean
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          method?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_consent_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_consent_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_consent_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          current_period_end: string | null
          override_note: string | null
          override_price: number | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          company_id: string
          current_period_end?: string | null
          override_note?: string | null
          override_price?: number | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          company_id?: string
          current_period_end?: string | null
          override_note?: string | null
          override_price?: number | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["key"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tech_locations: {
        Row: {
          company_id: string
          detail: string | null
          lat: number | null
          lng: number | null
          status: string
          tech_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          detail?: string | null
          lat?: number | null
          lng?: number | null
          status?: string
          tech_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          detail?: string | null
          lat?: number | null
          lng?: number | null
          status?: string
          tech_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_locations_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_part_stock: {
        Row: {
          company_id: string
          in_stock: boolean
          part_id: string
          tech_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string
          in_stock?: boolean
          part_id: string
          tech_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          in_stock?: boolean
          part_id?: string
          tech_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_part_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_part_stock_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_part_stock_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          company_id: string
          id: string
          tech_id: string
        }
        Insert: {
          clock_in: string
          clock_out?: string | null
          company_id?: string
          id?: string
          tech_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          company_id?: string
          id?: string
          tech_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_job_type_templates: {
        Row: {
          base_hours: number
          display_order: number
          hourly_rate: number
          key: string
          label: string
          parts_cost: number
          trade: string
        }
        Insert: {
          base_hours?: number
          display_order?: number
          hourly_rate: number
          key: string
          label: string
          parts_cost?: number
          trade: string
        }
        Update: {
          base_hours?: number
          display_order?: number
          hourly_rate?: number
          key?: string
          label?: string
          parts_cost?: number
          trade?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_company: {
        Args: {
          p_contact_email: string
          p_name: string
          p_plan: string
          p_trade?: string
        }
        Returns: Json
      }
      admin_delete_plan: { Args: { p_key: string }; Returns: undefined }
      admin_get_company_detail: {
        Args: { p_company_id: string }
        Returns: Json
      }
      admin_list_audit_log: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          created_at: string
          details: Json
          id: string
          super_admin_id: string
          target_id: string | null
          target_type: string | null
        }[]
      }
      admin_list_companies: {
        Args: never
        Returns: {
          contact_email: string
          created_at: string
          current_period_end: string
          id: string
          job_count: number
          join_code: string
          name: string
          plan: string
          status: string
          subscription_status: string
          tech_count: number
          trade: string
        }[]
      }
      admin_reorder_plans: {
        Args: { p_ordered_keys: string[] }
        Returns: undefined
      }
      admin_revenue_overview: { Args: never; Returns: Json }
      admin_set_company_override: {
        Args: { p_company_id: string; p_note: string; p_override_price: number }
        Returns: undefined
      }
      admin_set_company_status: {
        Args: { p_company_id: string; p_status: string }
        Returns: undefined
      }
      admin_upsert_plan: {
        Args: {
          p_active?: boolean
          p_display_order?: number
          p_features: Json
          p_key: string
          p_monthly_price: number
          p_name: string
        }
        Returns: {
          active: boolean
          created_at: string
          display_order: number
          features: Json
          key: string
          monthly_price: number
          name: string
          stripe_price_id: string | null
          updated_at: string
        }
      }
      anonymize_customer_pii: {
        Args: { p_customer_id: string; p_note?: string }
        Returns: undefined
      }
      create_company_and_owner: {
        Args: {
          p_business_name: string
          p_google_review_link?: string
          p_owner_name: string
          p_plan?: string
          p_service_area?: string
          p_team_size?: string
          p_trade?: string
        }
        Returns: {
          auto_assign_by_zone: boolean
          base_fee: number
          commission_pct: number
          contact_email: string | null
          created_at: string
          deposit_pct: number
          deposit_threshold: number
          emergency_multiplier: number
          financing_enabled: boolean
          financing_partner_url: string | null
          financing_threshold: number
          google_review_link: string | null
          hourly_rate: number
          id: string
          join_code: string
          name: string
          notify_emergency_calls: boolean
          sameday_multiplier: number
          service_area: string | null
          status: string
          team_size_bracket: string | null
          timezone: string
          trade: string
        }
      }
      current_company_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      join_company: {
        Args: { p_join_code: string; p_name: string }
        Returns: {
          auto_assign_by_zone: boolean
          base_fee: number
          commission_pct: number
          contact_email: string | null
          created_at: string
          deposit_pct: number
          deposit_threshold: number
          emergency_multiplier: number
          financing_enabled: boolean
          financing_partner_url: string | null
          financing_threshold: number
          google_review_link: string | null
          hourly_rate: number
          id: string
          join_code: string
          name: string
          notify_emergency_calls: boolean
          sameday_multiplier: number
          service_area: string | null
          status: string
          team_size_bracket: string | null
          timezone: string
          trade: string
        }
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_details: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      mark_contract_serviced: {
        Args: { p_contract_id: string }
        Returns: {
          company_id: string
          created_at: string
          customer_id: string
          frequency_months: number
          id: string
          last_reminder_sent_at: string | null
          name: string
          next_due_date: string
          price: number | null
          reminder_lead_days: number
          status: string
        }
      }
      record_sms_consent: {
        Args: {
          p_consent: boolean
          p_customer_id: string
          p_method: string
          p_note?: string
        }
        Returns: undefined
      }
      regenerate_join_code: { Args: never; Returns: string }
      run_due_automations: { Args: never; Returns: undefined }
      send_contract_reminders: { Args: never; Returns: undefined }
      take_revenue_snapshot: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
