"use client";

import { useMemo } from "react";
import { MOCK_CALLOUTS, MOCK_EMPLOYEES } from "@/lib/mock-data";

export interface CalloutWithDetails {
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
  employeeName: string;
  filledByName: string | null;
}

function getName(id: string): string {
  const emp = MOCK_EMPLOYEES.find((e) => e.id === id);
  return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useCallouts(locationId?: string | null) {
  const callouts: CalloutWithDetails[] = useMemo(
    () =>
      MOCK_CALLOUTS.map((c) => ({
        ...c,
        employeeName: getName(c.employee_id),
        filledByName: c.filled_by_employee_id
          ? getName(c.filled_by_employee_id)
          : null,
      })),
    []
  );

  return { callouts, loading: false, error: null as string | null };
}
