// Hand-written to match supabase/migrations/*.sql (no live project to run
// `supabase gen types typescript` against yet). Regenerate from the real
// project once it exists: `npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`
//
// Every table needs a `Relationships` array (even if empty) and the schema
// needs a `Views` key — postgrest-js's `GenericSchema`/`GenericTable`
// constraints require them, and without them the query builder's row types
// silently collapse to `never` instead of erroring loudly.

export type AccessRole = "org_level_executive" | "sales_manager" | "sales_executive";
export type StaffProfileType = "therapist" | "doctor" | "salon";

export interface KpiThreshold {
  min?: number | null;
  max?: number | null;
  score: number;
}

export interface KpiDefinition {
  category: "attendance" | "service" | "customer";
  weight: number;
  direction: "higher_better" | "lower_better";
  thresholds: KpiThreshold[];
}

export interface RatingBand {
  min: number | null;
  label: string;
}

export interface KpiConfigShape {
  categories: { attendance: number; service: number; customer: number };
  kpis: {
    attendance_punctuality: KpiDefinition;
    leave_pct: KpiDefinition;
    absent_without_leave_pct: KpiDefinition;
    attendance_regularization_pct: KpiDefinition;
    service_utilization_pct: KpiDefinition;
    signoff_missed_pct: KpiDefinition;
    client_escalations_pct: KpiDefinition;
  };
  rating_bands: RatingBand[];
}

export interface Database {
  public: {
    Tables: {
      locations: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: AccessRole;
          location_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: AccessRole;
          location_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: AccessRole;
          location_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      staff_members: {
        Row: {
          id: string;
          location_id: string;
          profile_type: StaffProfileType;
          full_name: string;
          employee_code: string | null;
          login_profile_id: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          profile_type: StaffProfileType;
          full_name: string;
          employee_code?: string | null;
          login_profile_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          profile_type?: StaffProfileType;
          full_name?: string;
          employee_code?: string | null;
          login_profile_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      kpi_config: {
        Row: {
          id: string;
          profile_type: StaffProfileType;
          version: number;
          effective_from: string;
          confirmed: boolean;
          config: KpiConfigShape;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_type: StaffProfileType;
          version: number;
          effective_from: string;
          confirmed?: boolean;
          config: KpiConfigShape;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_type?: StaffProfileType;
          version?: number;
          effective_from?: string;
          confirmed?: boolean;
          config?: KpiConfigShape;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      score_batches: {
        Row: {
          id: string;
          location_id: string;
          period: string;
          uploaded_by: string;
          source_filename: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          period: string;
          uploaded_by: string;
          source_filename?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          period?: string;
          uploaded_by?: string;
          source_filename?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      raw_kpi_entries: {
        Row: {
          id: string;
          batch_id: string;
          staff_member_id: string;
          applicable: boolean;
          attendance_punctuality: number | null;
          leave_pct: number | null;
          absent_without_leave_pct: number | null;
          attendance_regularization_pct: number | null;
          service_utilization_pct: number | null;
          signoff_missed_pct: number | null;
          client_escalations_pct: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          staff_member_id: string;
          applicable?: boolean;
          attendance_punctuality?: number | null;
          leave_pct?: number | null;
          absent_without_leave_pct?: number | null;
          attendance_regularization_pct?: number | null;
          service_utilization_pct?: number | null;
          signoff_missed_pct?: number | null;
          client_escalations_pct?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          staff_member_id?: string;
          applicable?: boolean;
          attendance_punctuality?: number | null;
          leave_pct?: number | null;
          absent_without_leave_pct?: number | null;
          attendance_regularization_pct?: number | null;
          service_utilization_pct?: number | null;
          signoff_missed_pct?: number | null;
          client_escalations_pct?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      computed_scores: {
        Row: {
          id: string;
          batch_id: string;
          staff_member_id: string;
          period: string;
          kpi_scores: Record<string, number | null>;
          category_scores: { attendance: number; service: number; customer: number };
          final_score: number;
          rating: string;
          kpi_config_id: string;
          computed_at: string;
        };
        // Written only by the calculate_scores() RPC — RLS blocks direct
        // client inserts/updates, so there's no valid shape to offer here.
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_scores: {
        Args: { p_batch_id: string };
        Returns: void;
      };
    };
  };
}
