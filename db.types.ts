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
          created_at: string
          deposit_pct: number
          deposit_threshold: number
          emergency_multiplier: number
          google_review_link: string | null
          hourly_rate: number
          id: string
          join_code: string
          name: string
          notify_emergency_calls: boolean
          sameday_multiplier: number
          service_area: string | null
          team_size_bracket: string | null
          timezone: string
          trade: string
        }
        Insert: {
          auto_assign_by_zone?: boolean
          base_fee?: number
          commission_pct?: number
          created_at?: string
          deposit_pct?: number
          deposit_threshold?: number
          emergency_multiplier?: number
          google_review_link?: string | null
          hourly_rate?: number
          id?: string
          join_code: string
          name: string
          notify_emergency_calls?: boolean
          sameday_multiplier?: number
          service_area?: string | null
          team_size_bracket?: string | null
          timezone?: string
          trade?: string
        }
        Update: {
          auto_assign_by_zone?: boolean
          base_fee?: number
          commission_pct?: number
          created_at?: string
          deposit_pct?: number
          deposit_threshold?: number
          emergency_multiplier?: number
          google_review_link?: string | null
          hourly_rate?: number
          id?: string
          join_code?: string
          name?: string
          notify_emergency_calls?: boolean
          sameday_multiplier?: number
          service_area?: string | null
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
          pipeline_stage: string
          referral_code: string | null
          referred_by: string | null
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
          pipeline_stage?: string
          referral_code?: string | null
          referred_by?: string | null
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
          pipeline_stage?: string
          referral_code?: string | null
          referred_by?: string | null
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
      subscriptions: {
        Row: {
          company_id: string
          current_period_end: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          company_id: string
          current_period_end?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          company_id?: string
          current_period_end?: string | null
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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company_and_owner: {
        Args: {
          p_business_name: string
          p_owner_name: string
          p_service_area?: string
          p_team_size?: string
          p_trade?: string
        }
        Returns: {
          auto_assign_by_zone: boolean
          base_fee: number
          commission_pct: number
          created_at: string
          deposit_pct: number
          deposit_threshold: number
          emergency_multiplier: number
          google_review_link: string | null
          hourly_rate: number
          id: string
          join_code: string
          name: string
          notify_emergency_calls: boolean
          sameday_multiplier: number
          service_area: string | null
          team_size_bracket: string | null
          timezone: string
          trade: string
        }
      }
      current_company_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      join_company_as_tech: {
        Args: { p_join_code: string; p_name: string }
        Returns: {
          auto_assign_by_zone: boolean
          base_fee: number
          commission_pct: number
          created_at: string
          deposit_pct: number
          deposit_threshold: number
          emergency_multiplier: number
          google_review_link: string | null
          hourly_rate: number
          id: string
          join_code: string
          name: string
          notify_emergency_calls: boolean
          sameday_multiplier: number
          service_area: string | null
          team_size_bracket: string | null
          timezone: string
          trade: string
        }
      }
      regenerate_join_code: { Args: never; Returns: string }
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
