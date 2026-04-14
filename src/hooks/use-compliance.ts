"use client";

import { useMemo } from "react";
import {
  MOCK_EMPLOYEES,
  MOCK_SHIFTS,
  MOCK_ROLES,
  MOCK_CERTIFICATIONS,
  MOCK_EMPLOYEE_ROLES,
  MOCK_LOCATIONS,
} from "@/lib/mock-data";
import {
  validateSchedule,
  type ComplianceResult,
  type ComplianceViolation,
} from "@/lib/compliance/validator";
import {
  getCertAlerts,
  type CertAlert,
  type Certification,
} from "@/lib/compliance/certifications";

export interface LocationComplianceResult {
  locationId: string;
  locationName: string;
  result: ComplianceResult;
}

/**
 * Hook to run compliance checks for a specific location and week.
 * Used by the schedule publish gate.
 */
export function useComplianceCheck(
  locationId: string | null,
  weekStart: string
) {
  const result = useMemo(() => {
    if (!locationId) return null;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const weekShifts = MOCK_SHIFTS.filter(
      (s) => s.date >= weekStart && s.date < weekEndStr
    );

    const shiftsWithMeta = weekShifts.map((s) => ({
      ...s,
      employee: MOCK_EMPLOYEES.find((e) => e.id === s.employee_id) ?? null,
      role: MOCK_ROLES.find((r) => r.id === s.role_id) ?? null,
    }));

    return validateSchedule(
      locationId,
      new Date(weekStart),
      shiftsWithMeta,
      MOCK_EMPLOYEES,
      MOCK_ROLES,
      MOCK_CERTIFICATIONS as Certification[]
    );
  }, [locationId, weekStart]);

  const errors = result?.violations.filter((v) => v.severity === "error") ?? [];
  const warnings =
    result?.violations.filter((v) => v.severity === "warning") ?? [];

  return {
    checking: false,
    result,
    violations: result?.violations ?? [],
    errors,
    warnings,
    canPublish: result ? result.valid : true,
    score: result?.score ?? 100,
  };
}

/**
 * Hook to get org-wide compliance status for the dashboard.
 */
export function useOrgCompliance(weekStart: string) {
  const { locationResults, certAlerts, orgScore } = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const weekShifts = MOCK_SHIFTS.filter(
      (s) => s.date >= weekStart && s.date < weekEndStr
    );

    const shiftsWithMeta = weekShifts.map((s) => ({
      ...s,
      employee: MOCK_EMPLOYEES.find((e) => e.id === s.employee_id) ?? null,
      role: MOCK_ROLES.find((r) => r.id === s.role_id) ?? null,
    }));

    const results: LocationComplianceResult[] = MOCK_LOCATIONS.filter(
      (l) => l.is_active
    ).map((loc) => ({
      locationId: loc.id,
      locationName: loc.name,
      result: validateSchedule(
        loc.id,
        new Date(weekStart),
        shiftsWithMeta,
        MOCK_EMPLOYEES,
        MOCK_ROLES,
        MOCK_CERTIFICATIONS as Certification[]
      ),
    }));

    const alerts = getCertAlerts(
      MOCK_EMPLOYEES,
      MOCK_ROLES,
      MOCK_EMPLOYEE_ROLES,
      MOCK_CERTIFICATIONS as Certification[]
    );

    // Org-wide score: average of location scores
    const totalScore =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + r.result.score, 0) /
              results.length
          )
        : 100;

    return { locationResults: results, certAlerts: alerts, orgScore: totalScore };
  }, [weekStart]);

  const allViolations = locationResults.flatMap((r) => r.result.violations);
  const errors = allViolations.filter((v) => v.severity === "error");
  const warnings = allViolations.filter((v) => v.severity === "warning");

  return {
    locationResults,
    certAlerts,
    orgScore,
    allViolations,
    errors,
    warnings,
    loading: false,
  };
}
