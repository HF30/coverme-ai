"use client";

import { useMemo, useCallback, useState } from "react";
import { MOCK_SHIFTS, MOCK_EMPLOYEES, MOCK_ROLES } from "@/lib/mock-data";
import type { Database } from "@/types/database";

type Shift = Database["public"]["Tables"]["shifts"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Role = Database["public"]["Tables"]["roles"]["Row"];

export interface ShiftWithDetails extends Shift {
  employee?: Employee | null;
  role?: Role | null;
}

export function useSchedule(locationId: string | null, weekStart: string) {
  const [, setRefreshKey] = useState(0);

  const shifts: ShiftWithDetails[] = useMemo(() => {
    const filtered = locationId
      ? MOCK_SHIFTS.filter((s) => s.location_id === locationId)
      : MOCK_SHIFTS;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const weekFiltered = filtered.filter(
      (s) => s.date >= weekStart && s.date < weekEndStr
    );

    return weekFiltered.map((shift) => ({
      ...shift,
      employee:
        MOCK_EMPLOYEES.find((e) => e.id === shift.employee_id) ?? null,
      role: MOCK_ROLES.find((r) => r.id === shift.role_id) ?? null,
    }));
  }, [locationId, weekStart]);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { shifts, loading: false, error: null as string | null, refetch };
}
