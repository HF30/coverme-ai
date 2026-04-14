"use client";

import { useMemo, useCallback, useState } from "react";
import {
  MOCK_EMPLOYEES,
  MOCK_EMPLOYEE_ROLES,
  MOCK_ROLES,
  MOCK_CERTIFICATIONS,
  MOCK_SHIFTS,
} from "@/lib/mock-data";
import type { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

export interface StaffFilters {
  locationId?: string | null;
  roleId?: string | null;
  availableNow?: boolean;
  searchQuery?: string;
}

export interface EmployeeWithDetails extends Employee {
  roles: string[];
  certifications: string[];
  hoursThisWeek: number;
}

export function useStaff(filters: StaffFilters = {}) {
  const [, setRefreshKey] = useState(0);

  const staff: EmployeeWithDetails[] = useMemo(() => {
    let filtered = [...MOCK_EMPLOYEES];

    if (filters.locationId) {
      filtered = filtered.filter(
        (e) => e.primary_location_id === filters.locationId
      );
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.first_name.toLowerCase().includes(q) ||
          e.last_name.toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q))
      );
    }

    if (filters.roleId) {
      const employeeIdsWithRole = MOCK_EMPLOYEE_ROLES
        .filter((er) => er.role_id === filters.roleId)
        .map((er) => er.employee_id);
      filtered = filtered.filter((e) => employeeIdsWithRole.includes(e.id));
    }

    // Calculate hours this week
    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diff);
    const mondayStr = monday.toISOString().split("T")[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    const sundayStr = sunday.toISOString().split("T")[0];

    const enriched: EmployeeWithDetails[] = filtered.map((emp) => {
      const empRoles = MOCK_EMPLOYEE_ROLES
        .filter((er) => er.employee_id === emp.id)
        .map(
          (er) =>
            MOCK_ROLES.find((r) => r.id === er.role_id)?.name ?? "Unknown"
        );

      const empCerts = MOCK_CERTIFICATIONS
        .filter((c) => c.employee_id === emp.id)
        .map((c) => c.cert_type);

      const empShifts = MOCK_SHIFTS.filter(
        (s) =>
          s.employee_id === emp.id &&
          s.date >= mondayStr &&
          s.date < sundayStr
      );

      const hoursThisWeek = empShifts.reduce((total, shift) => {
        const start = new Date(shift.start_time);
        const end = new Date(shift.end_time);
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (hours < 0) hours += 24;
        return total + hours;
      }, 0);

      return {
        ...emp,
        roles: [...new Set(empRoles)],
        certifications: [...new Set(empCerts)],
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      };
    });

    if (filters.availableNow) {
      const todayStr = now.toISOString().split("T")[0];
      const busyEmployeeIds = MOCK_SHIFTS
        .filter((s) => s.date === todayStr && s.employee_id)
        .map((s) => s.employee_id);
      return enriched.filter((e) => !busyEmployeeIds.includes(e.id));
    }

    return enriched;
  }, [filters.locationId, filters.roleId, filters.availableNow, filters.searchQuery]);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { staff, loading: false, error: null as string | null, refetch };
}
