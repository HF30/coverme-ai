// Ontario ESA Compliance Validator
// Validates schedules against Employment Standards Act rules for restaurants

import type { Database } from "@/types/database";
import { hasValidCerts, type Certification } from "./certifications";

type Shift = Database["public"]["Tables"]["shifts"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Role = Database["public"]["Tables"]["roles"]["Row"];

export interface ComplianceViolation {
  type:
    | "break_missing"
    | "overtime"
    | "insufficient_rest"
    | "weekly_rest"
    | "cert_expired"
    | "cert_missing"
    | "minor_hours"
    | "approaching_overtime"
    | "cert_expiring"
    | "three_hour_rule"
    | "consecutive_days";
  severity: "error" | "warning";
  employee_id: string;
  employee_name: string;
  shift_id?: string;
  message: string;
  details: string;
  rule_reference: string;
}

export interface ComplianceResult {
  valid: boolean; // true if no errors (warnings allowed)
  violations: ComplianceViolation[];
  score: number; // 0-100, percentage compliant
}

interface ShiftWithMeta extends Shift {
  employee?: Employee | null;
  role?: Role | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getShiftDurationHours(shift: Shift): number {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (hours < 0) hours += 24; // overnight shift
  return hours;
}

function getGapHours(endTime: string, startTime: string): number {
  const end = new Date(endTime);
  const start = new Date(startTime);
  return (start.getTime() - end.getTime()) / (1000 * 60 * 60);
}

function getEmployeeName(employee: Employee): string {
  return `${employee.first_name} ${employee.last_name}`;
}

function getWeekTotalHours(shifts: Shift[]): number {
  return shifts.reduce((sum, s) => sum + getShiftDurationHours(s), 0);
}

/**
 * Get all unique dates an employee works in a given set of shifts,
 * sorted chronologically.
 */
function getWorkDates(shifts: Shift[]): string[] {
  const dates = [...new Set(shifts.map((s) => s.date))];
  return dates.sort();
}

/**
 * Count max consecutive days worked in a set of shifts.
 */
function maxConsecutiveDays(shifts: Shift[]): number {
  const dates = getWorkDates(shifts);
  if (dates.length === 0) return 0;

  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return maxRun;
}

/**
 * Check if employee has at least 24 consecutive hours off in the work week.
 * Returns true if they have adequate rest.
 */
function hasWeeklyRest(shifts: Shift[]): boolean {
  if (shifts.length === 0) return true;

  // Build a timeline of all shift start/end times
  const events: Array<{ time: number; type: "start" | "end" }> = [];
  for (const shift of shifts) {
    const start = new Date(shift.start_time).getTime();
    let end = new Date(shift.end_time).getTime();
    if (end < start) end += 24 * 60 * 60 * 1000; // overnight
    events.push({ time: start, type: "start" });
    events.push({ time: end, type: "end" });
  }

  // Sort events by time
  events.sort((a, b) => a.time - b.time);

  // Find the largest gap between consecutive work periods
  // First, merge overlapping shifts
  const mergedPeriods: Array<{ start: number; end: number }> = [];
  for (const shift of shifts) {
    const start = new Date(shift.start_time).getTime();
    let end = new Date(shift.end_time).getTime();
    if (end < start) end += 24 * 60 * 60 * 1000;

    if (mergedPeriods.length === 0) {
      mergedPeriods.push({ start, end });
    } else {
      const last = mergedPeriods[mergedPeriods.length - 1];
      if (start <= last.end) {
        last.end = Math.max(last.end, end);
      } else {
        mergedPeriods.push({ start, end });
      }
    }
  }

  mergedPeriods.sort((a, b) => a.start - b.start);

  // Check gaps
  for (let i = 1; i < mergedPeriods.length; i++) {
    const gapHours =
      (mergedPeriods[i].start - mergedPeriods[i - 1].end) / (1000 * 60 * 60);
    if (gapHours >= 24) return true;
  }

  return mergedPeriods.length <= 1; // If only 1 shift period, they have rest
}

// ─── Validators ─────────────────────────────────────────────────────

/**
 * Validate a single shift assignment against existing shifts for the employee.
 */
export function validateShiftAssignment(
  employee: Employee,
  shift: Shift,
  existingShifts: Shift[],
  role: Role | null,
  certs: Certification[]
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const empName = getEmployeeName(employee);
  const allShifts = [...existingShifts, shift];

  // 1. Break requirement (ESA s.22)
  const duration = getShiftDurationHours(shift);
  if (duration >= 5) {
    violations.push({
      type: "break_missing",
      severity: "error",
      employee_id: employee.id,
      employee_name: empName,
      shift_id: shift.id,
      message: `${empName} needs a 30-min break`,
      details: `Shift is ${duration.toFixed(1)} hours. Employees working 5+ consecutive hours must receive a 30-minute eating period (can be split into 2x15 min with written agreement).`,
      rule_reference: "Ontario ESA s.22(1)",
    });
  }

  // 2. Daily rest period — 11 hours between shifts (ESA s.18)
  const sortedAll = [...allShifts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sortedAll.length - 1; i++) {
    const current = sortedAll[i];
    const next = sortedAll[i + 1];
    if (
      (current.id === shift.id || next.id === shift.id) &&
      current.employee_id === employee.id &&
      next.employee_id === employee.id
    ) {
      const gap = getGapHours(current.end_time, next.start_time);
      if (gap >= 0 && gap < 11) {
        violations.push({
          type: "insufficient_rest",
          severity: "error",
          employee_id: employee.id,
          employee_name: empName,
          shift_id: shift.id,
          message: `${empName} has only ${gap.toFixed(1)}h rest (11h required)`,
          details: `Gap between shifts is ${gap.toFixed(1)} hours. Employees must have at least 11 consecutive hours free from work each day. This is a "clopen" violation.`,
          rule_reference: "Ontario ESA s.18(1)",
        });
      }
    }
  }

  // 3. Weekly overtime check
  const totalHours = getWeekTotalHours(allShifts.filter((s) => s.employee_id === employee.id));
  if (totalHours > 44) {
    violations.push({
      type: "overtime",
      severity: "error",
      employee_id: employee.id,
      employee_name: empName,
      shift_id: shift.id,
      message: `${empName} at ${totalHours.toFixed(1)}h/week (44h max)`,
      details: `Total scheduled hours exceed 44-hour standard work week. Hours beyond 44 require overtime pay at 1.5x rate.`,
      rule_reference: "Ontario ESA s.22(1)",
    });
  } else if (totalHours >= 40) {
    violations.push({
      type: "approaching_overtime",
      severity: "warning",
      employee_id: employee.id,
      employee_name: empName,
      shift_id: shift.id,
      message: `${empName} approaching OT at ${totalHours.toFixed(1)}h/week`,
      details: `Employee is at ${totalHours.toFixed(1)} hours this week. Standard work week is 44 hours. Consider redistributing hours.`,
      rule_reference: "Ontario ESA s.22(1)",
    });
  }

  // 4. Certification checks
  if (role) {
    const certResult = hasValidCerts(employee, role, certs);
    for (const missing of certResult.missing) {
      violations.push({
        type: "cert_missing",
        severity: "error",
        employee_id: employee.id,
        employee_name: empName,
        shift_id: shift.id,
        message: `${empName} missing ${formatCertLabel(missing)} for ${role.name}`,
        details: `The ${role.name} role requires a valid ${formatCertLabel(missing)} certification. Employee does not have one on file.`,
        rule_reference: "Ontario Regulation 380/07",
      });
    }
    for (const expired of certResult.expired) {
      violations.push({
        type: "cert_expired",
        severity: "error",
        employee_id: employee.id,
        employee_name: empName,
        shift_id: shift.id,
        message: `${empName}'s ${formatCertLabel(expired)} has expired`,
        details: `The ${role.name} role requires a valid ${formatCertLabel(expired)} certification. Employee's cert is expired.`,
        rule_reference: "Ontario Regulation 380/07",
      });
    }
    for (const expiring of certResult.expiring) {
      violations.push({
        type: "cert_expiring",
        severity: "warning",
        employee_id: employee.id,
        employee_name: empName,
        shift_id: shift.id,
        message: `${empName}'s ${formatCertLabel(expiring)} expires within 30 days`,
        details: `Employee's ${formatCertLabel(expiring)} certification is expiring soon. Ensure renewal is in progress.`,
        rule_reference: "Ontario Regulation 380/07",
      });
    }
  }

  // 5. Three-hour rule (ESA s.21.2)
  if (duration > 0 && duration < 3) {
    violations.push({
      type: "three_hour_rule",
      severity: "warning",
      employee_id: employee.id,
      employee_name: empName,
      shift_id: shift.id,
      message: `${empName} scheduled for ${duration.toFixed(1)}h (3h minimum pay rule)`,
      details: `If an employee who regularly works more than 3 hours is required to report to work but works less than 3 hours, they must be paid for at least 3 hours.`,
      rule_reference: "Ontario ESA s.21.2",
    });
  }

  return violations;
}

/**
 * Validate a full week schedule for a location.
 */
export function validateSchedule(
  locationId: string,
  weekStart: Date,
  shifts: ShiftWithMeta[],
  employees: Employee[],
  roles: Role[],
  certs: Certification[]
): ComplianceResult {
  const violations: ComplianceViolation[] = [];

  // Get shifts for this location only
  const locationShifts = shifts.filter((s) => s.location_id === locationId);

  // Group shifts by employee
  const shiftsByEmployee: Record<string, ShiftWithMeta[]> = {};
  for (const shift of locationShifts) {
    if (!shift.employee_id) continue;
    if (!shiftsByEmployee[shift.employee_id]) {
      shiftsByEmployee[shift.employee_id] = [];
    }
    shiftsByEmployee[shift.employee_id].push(shift);
  }

  // Validate each employee's shifts
  for (const [employeeId, empShifts] of Object.entries(shiftsByEmployee)) {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) continue;

    const empName = getEmployeeName(employee);

    // Sort shifts chronologically
    const sorted = [...empShifts].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // 1. Break check for each shift (ESA s.22)
    for (const shift of sorted) {
      const duration = getShiftDurationHours(shift);
      if (duration >= 5) {
        violations.push({
          type: "break_missing",
          severity: "error",
          employee_id: employeeId,
          employee_name: empName,
          shift_id: shift.id,
          message: `${empName} needs a 30-min break`,
          details: `Shift is ${duration.toFixed(1)} hours. Employees working 5+ consecutive hours must receive a 30-minute eating period.`,
          rule_reference: "Ontario ESA s.22(1)",
        });
      }

      // Three-hour rule
      if (duration > 0 && duration < 3) {
        violations.push({
          type: "three_hour_rule",
          severity: "warning",
          employee_id: employeeId,
          employee_name: empName,
          shift_id: shift.id,
          message: `${empName} scheduled for ${duration.toFixed(1)}h (3h minimum pay)`,
          details: `Short shift may trigger three-hour minimum pay rule.`,
          rule_reference: "Ontario ESA s.21.2",
        });
      }
    }

    // 2. Daily rest — 11 hours between shifts (ESA s.18)
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = getGapHours(sorted[i].end_time, sorted[i + 1].start_time);
      if (gap >= 0 && gap < 11) {
        violations.push({
          type: "insufficient_rest",
          severity: "error",
          employee_id: employeeId,
          employee_name: empName,
          shift_id: sorted[i + 1].id,
          message: `${empName} has only ${gap.toFixed(1)}h rest between shifts`,
          details: `Gap between ${formatShiftTime(sorted[i])} and ${formatShiftTime(sorted[i + 1])} is ${gap.toFixed(1)} hours. 11 consecutive hours required.`,
          rule_reference: "Ontario ESA s.18(1)",
        });
      }
    }

    // 3. Weekly hours
    const totalHours = getWeekTotalHours(empShifts);
    if (totalHours > 44) {
      violations.push({
        type: "overtime",
        severity: "error",
        employee_id: employeeId,
        employee_name: empName,
        message: `${empName} at ${totalHours.toFixed(1)}h/week (over 44h limit)`,
        details: `Total hours: ${totalHours.toFixed(1)}. Overtime pay required at 1.5x for hours beyond 44.`,
        rule_reference: "Ontario ESA s.22(1)",
      });
    } else if (totalHours >= 40) {
      violations.push({
        type: "approaching_overtime",
        severity: "warning",
        employee_id: employeeId,
        employee_name: empName,
        message: `${empName} approaching OT at ${totalHours.toFixed(1)}h/week`,
        details: `${totalHours.toFixed(1)} of 44 maximum hours scheduled.`,
        rule_reference: "Ontario ESA s.22(1)",
      });
    }

    // 4. Weekly rest — 24 consecutive hours off per week (ESA s.18)
    if (!hasWeeklyRest(empShifts)) {
      violations.push({
        type: "weekly_rest",
        severity: "error",
        employee_id: employeeId,
        employee_name: empName,
        message: `${empName} lacks 24h consecutive rest this week`,
        details: `Employee must have at least 24 consecutive hours off in each work week, or 48 hours off in every 2 consecutive work weeks.`,
        rule_reference: "Ontario ESA s.18(4)",
      });
    }

    // 5. Certification checks per shift
    for (const shift of empShifts) {
      const role = shift.role ?? roles.find((r) => r.id === shift.role_id) ?? null;
      if (!role) continue;

      const certResult = hasValidCerts(employee, role, certs);
      for (const missing of certResult.missing) {
        violations.push({
          type: "cert_missing",
          severity: "error",
          employee_id: employeeId,
          employee_name: empName,
          shift_id: shift.id,
          message: `${empName} missing ${formatCertLabel(missing)} for ${role.name}`,
          details: `The ${role.name} role requires ${formatCertLabel(missing)}.`,
          rule_reference: "Ontario Regulation 380/07",
        });
      }
      for (const expired of certResult.expired) {
        violations.push({
          type: "cert_expired",
          severity: "error",
          employee_id: employeeId,
          employee_name: empName,
          shift_id: shift.id,
          message: `${empName}'s ${formatCertLabel(expired)} has expired`,
          details: `Expired certification cannot be used for ${role.name} role.`,
          rule_reference: "Ontario Regulation 380/07",
        });
      }
      for (const expiring of certResult.expiring) {
        violations.push({
          type: "cert_expiring",
          severity: "warning",
          employee_id: employeeId,
          employee_name: empName,
          shift_id: shift.id,
          message: `${empName}'s ${formatCertLabel(expiring)} expires within 30 days`,
          details: `Ensure renewal is in progress.`,
          rule_reference: "Ontario Regulation 380/07",
        });
      }
    }

    // 6. Consecutive days warning
    const consecutiveDays = maxConsecutiveDays(empShifts);
    if (consecutiveDays >= 6) {
      violations.push({
        type: "consecutive_days",
        severity: "warning",
        employee_id: employeeId,
        employee_name: empName,
        message: `${empName} scheduled ${consecutiveDays} days in a row`,
        details: `Working ${consecutiveDays} consecutive days increases burnout risk. Consider giving a day off.`,
        rule_reference: "Workplace best practice",
      });
    }
  }

  // Deduplicate cert violations (same employee + same cert type should only appear once)
  const dedupedViolations = deduplicateViolations(violations);

  const errors = dedupedViolations.filter((v) => v.severity === "error");
  const total = dedupedViolations.length;
  const score = total === 0 ? 100 : Math.max(0, Math.round(100 - (errors.length / Math.max(total, 1)) * 100));

  return {
    valid: errors.length === 0,
    violations: dedupedViolations,
    score,
  };
}

// ─── Utilities ──────────────────────────────────────────────────────

function deduplicateViolations(violations: ComplianceViolation[]): ComplianceViolation[] {
  const seen = new Set<string>();
  return violations.filter((v) => {
    // For cert violations, dedupe per employee + cert type
    if (v.type === "cert_missing" || v.type === "cert_expired" || v.type === "cert_expiring") {
      const key = `${v.type}:${v.employee_id}:${v.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
}

function formatCertLabel(certType: string): string {
  const labels: Record<string, string> = {
    smart_serve: "Smart Serve",
    food_handler: "Food Handler",
    whmis: "WHMIS",
    first_aid: "First Aid",
  };
  return labels[certType] ?? certType;
}

function formatShiftTime(shift: Shift): string {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${shift.date} ${fmt(start)}-${fmt(end)}`;
}
