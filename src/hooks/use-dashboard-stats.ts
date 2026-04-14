"use client";

import { useMemo } from "react";
import { MOCK_SHIFTS, MOCK_CALLOUTS, MOCK_EMPLOYEES, MOCK_LOCATIONS } from "@/lib/mock-data";

export interface LocationStats {
  locationId: string;
  locationName: string;
  staffOnDuty: number;
  totalScheduled: number;
  openShifts: number;
  laborCostEstimate: number;
}

export interface DashboardStats {
  totalStaffOnDuty: number;
  totalScheduledToday: number;
  totalOpenShifts: number;
  totalCallouts: number;
  fillRate: number;
  totalLaborCost: number;
  locationStats: LocationStats[];
  pendingApprovals: number;
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  id: string;
  type: "coverage_gap" | "callout" | "approval" | "certification";
  severity: "critical" | "warning" | "info";
  message: string;
  locationName?: string;
}

function computeStats(): DashboardStats {
  const today = new Date().toISOString().split("T")[0];

  const todayShifts = MOCK_SHIFTS.filter((s) => s.date === today);
  const openShifts = todayShifts.filter((s) => s.is_open);
  const filledShifts = todayShifts.filter((s) => !s.is_open && s.employee_id);

  const recentCallouts = MOCK_CALLOUTS;
  const filledCallouts = recentCallouts.filter((c) => c.status === "filled");
  const fillRate =
    recentCallouts.length > 0
      ? Math.round((filledCallouts.length / recentCallouts.length) * 100)
      : 100;

  const locationStats: LocationStats[] = MOCK_LOCATIONS.map((loc) => {
    const locShifts = todayShifts.filter((s) => s.location_id === loc.id);
    const locOpen = locShifts.filter((s) => s.is_open);
    const locFilled = locShifts.filter((s) => !s.is_open && s.employee_id);

    const laborCost = locFilled.reduce((total, shift) => {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === shift.employee_id);
      if (!emp) return total;
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (hours < 0) hours += 24;
      return total + emp.hourly_rate * hours;
    }, 0);

    return {
      locationId: loc.id,
      locationName: loc.name.replace("Wingporium ", ""),
      staffOnDuty: locFilled.length,
      totalScheduled: locShifts.length,
      openShifts: locOpen.length,
      laborCostEstimate: Math.round(laborCost),
    };
  });

  const totalLaborCost = locationStats.reduce(
    (sum, ls) => sum + ls.laborCostEstimate,
    0
  );

  const alerts: DashboardAlert[] = [];

  openShifts.forEach((shift) => {
    const loc = MOCK_LOCATIONS.find((l) => l.id === shift.location_id);
    alerts.push({
      id: `alert-open-${shift.id}`,
      type: "coverage_gap",
      severity: "critical",
      message: `Open shift needs coverage`,
      locationName: loc?.name.replace("Wingporium ", ""),
    });
  });

  const pendingCallouts = recentCallouts.filter(
    (c) => c.status === "pending" || c.status === "escalated"
  );
  pendingCallouts.forEach((callout) => {
    const emp = MOCK_EMPLOYEES.find((e) => e.id === callout.employee_id);
    alerts.push({
      id: `alert-callout-${callout.id}`,
      type: "callout",
      severity: callout.status === "escalated" ? "critical" : "warning",
      message: `${emp?.first_name ?? "Employee"} called out: ${callout.reason ?? "No reason given"}`,
    });
  });

  return {
    totalStaffOnDuty: filledShifts.length,
    totalScheduledToday: todayShifts.length,
    totalOpenShifts: openShifts.length,
    totalCallouts: recentCallouts.length,
    fillRate,
    totalLaborCost,
    locationStats,
    pendingApprovals: 2,
    alerts,
  };
}

export function useDashboardStats() {
  const stats = useMemo(() => computeStats(), []);
  return { stats, loading: false };
}
