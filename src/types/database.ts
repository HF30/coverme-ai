// Placeholder for Supabase generated types.
// Run `npx supabase gen types typescript --project-id <ref>` to regenerate.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          settings?: Json;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string;
          timezone: string;
          lat: number | null;
          lng: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address: string;
          timezone?: string;
          lat?: number | null;
          lng?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string;
          timezone?: string;
          lat?: number | null;
          lng?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          phone: string;
          email: string | null;
          primary_location_id: string;
          can_float: boolean;
          hourly_rate: number;
          max_hours_per_week: number;
          reliability_score: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          phone: string;
          email?: string | null;
          primary_location_id: string;
          can_float?: boolean;
          hourly_rate: number;
          max_hours_per_week?: number;
          reliability_score?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          phone?: string;
          email?: string | null;
          primary_location_id?: string;
          can_float?: boolean;
          hourly_rate?: number;
          max_hours_per_week?: number;
          reliability_score?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          requires_smart_serve: boolean;
          requires_food_handler: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          requires_smart_serve?: boolean;
          requires_food_handler?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          requires_smart_serve?: boolean;
          requires_food_handler?: boolean;
        };
      };
      employee_roles: {
        Row: {
          employee_id: string;
          role_id: string;
          location_id: string;
        };
        Insert: {
          employee_id: string;
          role_id: string;
          location_id: string;
        };
        Update: {
          employee_id?: string;
          role_id?: string;
          location_id?: string;
        };
      };
      employee_certifications: {
        Row: {
          id: string;
          employee_id: string;
          cert_type: string;
          cert_number: string | null;
          issued_at: string;
          expires_at: string;
          is_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          cert_type: string;
          cert_number?: string | null;
          issued_at: string;
          expires_at: string;
          is_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          cert_type?: string;
          cert_number?: string | null;
          issued_at?: string;
          expires_at?: string;
          is_verified?: boolean;
        };
      };
      employee_availability: {
        Row: {
          id: string;
          employee_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
          effective_from: string;
          effective_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available?: boolean;
          effective_from: string;
          effective_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
          effective_from?: string;
          effective_until?: string | null;
        };
      };
      shifts: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string;
          role_id: string;
          employee_id: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status: string;
          is_open: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id: string;
          role_id: string;
          employee_id?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status?: string;
          is_open?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          location_id?: string;
          role_id?: string;
          employee_id?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          is_open?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string;
          week_start: string;
          status: string;
          published_at: string | null;
          published_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id: string;
          week_start: string;
          status?: string;
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          location_id?: string;
          week_start?: string;
          status?: string;
          published_at?: string | null;
          published_by?: string | null;
          updated_at?: string;
        };
      };
      callouts: {
        Row: {
          id: string;
          organization_id: string;
          shift_id: string;
          employee_id: string;
          reason: string | null;
          reported_at: string;
          status: string;
          filled_by_employee_id: string | null;
          filled_at: string | null;
          escalated_at: string | null;
          resolution_time_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          shift_id: string;
          employee_id: string;
          reason?: string | null;
          reported_at: string;
          status?: string;
          filled_by_employee_id?: string | null;
          filled_at?: string | null;
          escalated_at?: string | null;
          resolution_time_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          shift_id?: string;
          employee_id?: string;
          reason?: string | null;
          reported_at?: string;
          status?: string;
          filled_by_employee_id?: string | null;
          filled_at?: string | null;
          escalated_at?: string | null;
          resolution_time_seconds?: number | null;
        };
      };
      sms_conversations: {
        Row: {
          id: string;
          organization_id: string;
          phone_number: string;
          employee_id: string | null;
          direction: string;
          message: string;
          context: string;
          related_callout_id: string | null;
          related_shift_id: string | null;
          twilio_sid: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          phone_number: string;
          employee_id?: string | null;
          direction: string;
          message: string;
          context?: string;
          related_callout_id?: string | null;
          related_shift_id?: string | null;
          twilio_sid?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          phone_number?: string;
          employee_id?: string | null;
          direction?: string;
          message?: string;
          context?: string;
          related_callout_id?: string | null;
          related_shift_id?: string | null;
          twilio_sid?: string | null;
        };
      };
      conversation_context: {
        Row: {
          phone_number: string;
          organization_id: string;
          current_context: string;
          context_data: Json;
          expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          phone_number: string;
          organization_id: string;
          current_context?: string;
          context_data?: Json;
          expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          phone_number?: string;
          organization_id?: string;
          current_context?: string;
          context_data?: Json;
          expires_at?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          event_type: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          venue: string | null;
          is_playoff: boolean;
          is_ppv: boolean;
          demand_multiplier: number;
          affects_locations: string[] | null;
          source: string;
          external_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          event_type: string;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          venue?: string | null;
          is_playoff?: boolean;
          is_ppv?: boolean;
          demand_multiplier?: number;
          affects_locations?: string[] | null;
          source?: string;
          external_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          event_type?: string;
          event_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          venue?: string | null;
          is_playoff?: boolean;
          is_ppv?: boolean;
          demand_multiplier?: number;
          affects_locations?: string[] | null;
          source?: string;
          external_id?: string | null;
          updated_at?: string;
        };
      };
      staffing_suggestions: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string;
          location_id: string;
          suggested_date: string;
          role_id: string;
          current_headcount: number;
          suggested_headcount: number;
          status: string;
          approved_by: string | null;
          approved_headcount: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id: string;
          location_id: string;
          suggested_date: string;
          role_id: string;
          current_headcount: number;
          suggested_headcount: number;
          status?: string;
          approved_by?: string | null;
          approved_headcount?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          event_id?: string;
          location_id?: string;
          suggested_date?: string;
          role_id?: string;
          current_headcount?: number;
          suggested_headcount?: number;
          status?: string;
          approved_by?: string | null;
          approved_headcount?: number | null;
          notes?: string | null;
        };
      };
      event_actuals: {
        Row: {
          id: string;
          event_id: string;
          location_id: string;
          actual_covers: number | null;
          normal_covers_estimate: number | null;
          actual_revenue: number | null;
          labor_cost: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          location_id: string;
          actual_covers?: number | null;
          normal_covers_estimate?: number | null;
          actual_revenue?: number | null;
          labor_cost?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          location_id?: string;
          actual_covers?: number | null;
          normal_covers_estimate?: number | null;
          actual_revenue?: number | null;
          labor_cost?: number | null;
          notes?: string | null;
        };
      };
      compliance_checks: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string;
          schedule_id: string | null;
          checked_at: string;
          checked_by: string | null;
          score: number;
          violations: Json;
          result: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id: string;
          schedule_id?: string | null;
          checked_at?: string;
          checked_by?: string | null;
          score: number;
          violations: Json;
          result: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          location_id?: string;
          schedule_id?: string | null;
          checked_at?: string;
          checked_by?: string | null;
          score?: number;
          violations?: Json;
          result?: string;
        };
      };
      cert_reminders: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          cert_type: string;
          expires_at: string;
          reminder_sent_at: string | null;
          renewed_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          employee_id: string;
          cert_type: string;
          expires_at: string;
          reminder_sent_at?: string | null;
          renewed_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          employee_id?: string;
          cert_type?: string;
          expires_at?: string;
          reminder_sent_at?: string | null;
          renewed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      briefings: {
        Row: {
          id: string;
          organization_id: string;
          type: string;
          recipient_phone: string;
          content: string;
          data_snapshot: Json;
          sent_at: string;
          twilio_sid: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          type: string;
          recipient_phone: string;
          content: string;
          data_snapshot?: Json;
          sent_at?: string;
          twilio_sid?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          type?: string;
          recipient_phone?: string;
          content?: string;
          data_snapshot?: Json;
          sent_at?: string;
          twilio_sid?: string | null;
        };
      };
      owner_queries: {
        Row: {
          id: string;
          organization_id: string;
          query: string;
          parsed_command: string | null;
          response: string;
          response_time_ms: number | null;
          ai_model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          query: string;
          parsed_command?: string | null;
          response: string;
          response_time_ms?: number | null;
          ai_model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          query?: string;
          parsed_command?: string | null;
          response?: string;
          response_time_ms?: number | null;
          ai_model?: string | null;
        };
      };
      alerts: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string | null;
          type: string;
          severity: string;
          title: string;
          message: string;
          related_employee_id: string | null;
          related_shift_id: string | null;
          related_callout_id: string | null;
          status: string;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          notified_via: string[];
          escalation_level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id?: string | null;
          type: string;
          severity: string;
          title: string;
          message: string;
          related_employee_id?: string | null;
          related_shift_id?: string | null;
          related_callout_id?: string | null;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          notified_via?: string[];
          escalation_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          location_id?: string | null;
          type?: string;
          severity?: string;
          title?: string;
          message?: string;
          related_employee_id?: string | null;
          related_shift_id?: string | null;
          related_callout_id?: string | null;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          notified_via?: string[];
          escalation_level?: number;
          updated_at?: string;
        };
      };
      alert_preferences: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          alert_type: string;
          channel: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          alert_type: string;
          channel: string;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          alert_type?: string;
          channel?: string;
          enabled?: boolean;
        };
      };
      time_entries: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          location_id: string;
          shift_id: string | null;
          clock_in: string;
          clock_out: string | null;
          break_minutes: number;
          hours_worked: number | null;
          hourly_rate: number;
          gross_pay: number | null;
          is_overtime: boolean;
          overtime_rate: number;
          status: string;
          notes: string | null;
          edited_by: string | null;
          edited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          employee_id: string;
          location_id: string;
          shift_id?: string | null;
          clock_in: string;
          clock_out?: string | null;
          break_minutes?: number;
          hourly_rate: number;
          is_overtime?: boolean;
          overtime_rate?: number;
          status?: string;
          notes?: string | null;
          edited_by?: string | null;
          edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          employee_id?: string;
          location_id?: string;
          shift_id?: string | null;
          clock_in?: string;
          clock_out?: string | null;
          break_minutes?: number;
          hourly_rate?: number;
          is_overtime?: boolean;
          overtime_rate?: number;
          status?: string;
          notes?: string | null;
          edited_by?: string | null;
          edited_at?: string | null;
          updated_at?: string;
        };
      };
      pay_periods: {
        Row: {
          id: string;
          organization_id: string;
          start_date: string;
          end_date: string;
          status: string;
          total_regular_hours: number | null;
          total_overtime_hours: number | null;
          total_gross_pay: number | null;
          finalized_at: string | null;
          finalized_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          start_date: string;
          end_date: string;
          status?: string;
          total_regular_hours?: number | null;
          total_overtime_hours?: number | null;
          total_gross_pay?: number | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          start_date?: string;
          end_date?: string;
          status?: string;
          total_regular_hours?: number | null;
          total_overtime_hours?: number | null;
          total_gross_pay?: number | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          notes?: string | null;
        };
      };
      pay_stubs: {
        Row: {
          id: string;
          organization_id: string;
          pay_period_id: string;
          employee_id: string;
          regular_hours: number;
          overtime_hours: number;
          regular_rate: number | null;
          overtime_rate: number;
          regular_pay: number;
          overtime_pay: number;
          gross_pay: number;
          deductions: Json;
          net_pay: number;
          status: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          pay_period_id: string;
          employee_id: string;
          regular_hours?: number;
          overtime_hours?: number;
          regular_rate?: number | null;
          overtime_rate?: number;
          regular_pay?: number;
          overtime_pay?: number;
          gross_pay?: number;
          deductions?: Json;
          net_pay?: number;
          status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          pay_period_id?: string;
          employee_id?: string;
          regular_hours?: number;
          overtime_hours?: number;
          regular_rate?: number | null;
          overtime_rate?: number;
          regular_pay?: number;
          overtime_pay?: number;
          gross_pay?: number;
          deductions?: Json;
          net_pay?: number;
          status?: string;
          paid_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
