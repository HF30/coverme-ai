"use client";

import { useMemo, useCallback } from "react";
import { MOCK_SHIFTS, MOCK_EMPLOYEES, MOCK_CALLOUTS, MOCK_LOCATIONS, MOCK_CERTIFICATIONS } from "@/lib/mock-data";

export type AlertType =
  | "coverage_gap"
  | "no_show"
  | "labor_over"
  | "cert_expiring"
  | "cert_expired"
  | "schedule_late"
  | "callout_unfilled"
  | "compliance_violation"
  | "consecutive_days";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "auto_resolved";

export interface Alert {
  id: string;
  organization_id: string;
  location_id: string | null;
  location_name: string | null;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_employee_id: string | null;
  related_employee_name: string | null;
  related_shift_id: string | null;
  related_callout_id: string | null;
  status: AlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  notified_via: string[];
  escalation_level: number;
  created_at: string;
  updated_at: string;
}

export interface UseAlertsOptions {
  locationId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
  type?: AlertType;
}

function generateMockAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Coverage gaps -- open shifts today
  const openShiftsToday = MOCK_SHIFTS.filter(
    (s) => s.date === today && s.is_open && !s.employee_id
  );
  for (const shift of openShiftsToday) {
    const loc = MOCK_LOCATIONS.find((l) => l.id === shift.location_id);
    const startTime = new Date(shift.start_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    alerts.push({
      id: `alert-cov-${shift.id}`,
      organization_id: shift.organization_id,
      location_id: shift.location_id,
      location_name: loc?.name.replace("Wingporium ", "") ?? null,
      type: "coverage_gap",
      severity: "critical",
      title: "Unfilled shift starting soon",
      message: `Open shift at ${loc?.name.replace("Wingporium ", "") ?? "location"} starts at ${startTime} with no one assigned.`,
      related_employee_id: null,
      related_employee_name: null,
      related_shift_id: shift.id,
      related_callout_id: null,
      status: "active",
      acknowledged_by: null,
      acknowledged_at: null,
      resolved_at: null,
      resolution_note: null,
      notified_via: ["dashboard"],
      escalation_level: 0,
      created_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    });
  }

  // Callout unfilled
  const escalatedCallouts = MOCK_CALLOUTS.filter(
    (c) => c.status === "escalated"
  );
  for (const callout of escalatedCallouts) {
    const emp = MOCK_EMPLOYEES.find((e) => e.id === callout.employee_id);
    alerts.push({
      id: `alert-callout-${callout.id}`,
      organization_id: callout.organization_id,
      location_id: null,
      location_name: null,
      type: "callout_unfilled",
      severity: "critical",
      title: "Callout still unfilled",
      message: `${emp?.first_name ?? "Employee"}'s callout has been escalated for 30+ minutes with no resolution.`,
      related_employee_id: callout.employee_id,
      related_employee_name: emp
        ? `${emp.first_name} ${emp.last_name}`
        : null,
      related_shift_id: callout.shift_id,
      related_callout_id: callout.id,
      status: "active",
      acknowledged_by: null,
      acknowledged_at: null,
      resolved_at: null,
      resolution_note: null,
      notified_via: ["dashboard", "sms"],
      escalation_level: 1,
      created_at: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    });
  }

  // Cert expiring -- check mock certifications
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  );
  for (const cert of MOCK_CERTIFICATIONS) {
    const expiresAt = new Date(cert.expires_at);
    if (expiresAt < now) {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === cert.employee_id);
      if (!emp) continue;
      alerts.push({
        id: `alert-cert-exp-${cert.id}`,
        organization_id: emp.organization_id,
        location_id: null,
        location_name: null,
        type: "cert_expired",
        severity: "warning",
        title: "Certification expired",
        message: `${emp.first_name} ${emp.last_name}'s ${cert.cert_type.replace("_", " ")} has expired.`,
        related_employee_id: emp.id,
        related_employee_name: `${emp.first_name} ${emp.last_name}`,
        related_shift_id: null,
        related_callout_id: null,
        status: "active",
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_at: null,
        resolution_note: null,
        notified_via: ["dashboard"],
        escalation_level: 0,
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(
          now.getTime() - 2 * 60 * 60 * 1000
        ).toISOString(),
      });
    } else if (expiresAt <= thirtyDaysFromNow) {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === cert.employee_id);
      if (!emp) continue;
      const daysLeft = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: `alert-cert-warn-${cert.id}`,
        organization_id: emp.organization_id,
        location_id: null,
        location_name: null,
        type: "cert_expiring",
        severity: "warning",
        title: "Certification expiring soon",
        message: `${emp.first_name} ${emp.last_name}'s ${cert.cert_type.replace("_", " ")} expires in ${daysLeft} days.`,
        related_employee_id: emp.id,
        related_employee_name: `${emp.first_name} ${emp.last_name}`,
        related_shift_id: null,
        related_callout_id: null,
        status: "active",
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_at: null,
        resolution_note: null,
        notified_via: ["dashboard"],
        escalation_level: 0,
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(
          now.getTime() - 1 * 60 * 60 * 1000
        ).toISOString(),
      });
    }
  }

  // Schedule not published -- mock: it's always a warning
  alerts.push({
    id: "alert-sched-late-1",
    organization_id: MOCK_LOCATIONS[0]?.organization_id ?? "",
    location_id: MOCK_LOCATIONS[2]?.id ?? null,
    location_name: MOCK_LOCATIONS[2]?.name.replace("Wingporium ", "") ?? null,
    type: "schedule_late",
    severity: "info",
    title: "Schedule not published",
    message: `Next week's schedule for ${MOCK_LOCATIONS[2]?.name.replace("Wingporium ", "") ?? "Hamilton"} is not published yet.`,
    related_employee_id: null,
    related_employee_name: null,
    related_shift_id: null,
    related_callout_id: null,
    status: "active",
    acknowledged_by: null,
    acknowledged_at: null,
    resolved_at: null,
    resolution_note: null,
    notified_via: ["dashboard"],
    escalation_level: 0,
    created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
  });

  // Add a resolved alert for history
  alerts.push({
    id: "alert-resolved-1",
    organization_id: MOCK_LOCATIONS[0]?.organization_id ?? "",
    location_id: MOCK_LOCATIONS[0]?.id ?? null,
    location_name: MOCK_LOCATIONS[0]?.name.replace("Wingporium ", "") ?? null,
    type: "no_show",
    severity: "critical",
    title: "No-show resolved",
    message: "Marco DeLuca clocked in late for their 11:00 AM shift.",
    related_employee_id: null,
    related_employee_name: "Marco DeLuca",
    related_shift_id: null,
    related_callout_id: null,
    status: "auto_resolved",
    acknowledged_by: null,
    acknowledged_at: null,
    resolved_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    resolution_note: "Employee clocked in or shift updated.",
    notified_via: ["dashboard"],
    escalation_level: 0,
    created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
  });

  return alerts;
}

export function useAlerts(filters?: UseAlertsOptions) {
  const allAlerts = useMemo(() => generateMockAlerts(), []);

  const filteredAlerts = useMemo(() => {
    let result = allAlerts;
    if (filters?.locationId) {
      result = result.filter((a) => a.location_id === filters.locationId);
    }
    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.severity) {
      result = result.filter((a) => a.severity === filters.severity);
    }
    if (filters?.type) {
      result = result.filter((a) => a.type === filters.type);
    }
    return result;
  }, [allAlerts, filters?.locationId, filters?.status, filters?.severity, filters?.type]);

  const activeAlerts = useMemo(
    () =>
      allAlerts.filter(
        (a) => a.status === "active" || a.status === "acknowledged"
      ),
    [allAlerts]
  );

  const activeCount = activeAlerts.length;
  const criticalCount = activeAlerts.filter(
    (a) => a.severity === "critical"
  ).length;

  const acknowledge = useCallback((id: string) => {
    console.log(`[alerts] Acknowledging alert ${id}`);
    // In production: supabase.from('alerts').update(...)
  }, []);

  const resolve = useCallback((id: string, note: string) => {
    console.log(`[alerts] Resolving alert ${id}: ${note}`);
    // In production: supabase.from('alerts').update(...)
  }, []);

  return {
    alerts: filteredAlerts,
    activeAlerts,
    activeCount,
    criticalCount,
    acknowledge,
    resolve,
    loading: false,
  };
}
