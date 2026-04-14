/**
 * Ontario ESA overtime calculation utilities.
 *
 * Rules:
 * - Regular hours: first 44 hours in a work week
 * - Overtime: hours beyond 44, paid at 1.5x regular rate
 * - Work week starts Monday
 */

import type { Database } from "@/types/database";

type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];

export interface WeeklyPayResult {
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
}

const ONTARIO_OT_THRESHOLD = 44; // hours per week
const ONTARIO_OT_MULTIPLIER = 1.5;

/**
 * Calculate weekly pay for a set of time entries at a given hourly rate.
 * Ontario ESA: OT kicks in after 44 hours/week at 1.5x.
 */
export function calculateWeeklyPay(
  entries: TimeEntry[],
  hourlyRate: number,
): WeeklyPayResult {
  const totalHours = entries.reduce((sum, entry) => {
    if (entry.hours_worked == null) return sum;
    return sum + entry.hours_worked;
  }, 0);

  const regularHours = Math.min(totalHours, ONTARIO_OT_THRESHOLD);
  const overtimeHours = Math.max(0, totalHours - ONTARIO_OT_THRESHOLD);

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * ONTARIO_OT_MULTIPLIER;
  const grossPay = regularPay + overtimePay;

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
  };
}

export interface PayStubResult {
  regularHours: number;
  overtimeHours: number;
  regularRate: number;
  overtimeRate: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  netPay: number;
}

/**
 * Calculate a pay stub for an employee over a set of time entries.
 * Groups entries by week to apply the 44-hour OT threshold per week.
 */
export function calculatePayPeriod(
  entries: TimeEntry[],
  hourlyRate: number,
): PayStubResult {
  // Group entries by ISO week (Monday start)
  const weekBuckets: Record<string, TimeEntry[]> = {};

  for (const entry of entries) {
    const d = new Date(entry.clock_in);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const weekKey = monday.toISOString().split("T")[0];
    if (!weekBuckets[weekKey]) weekBuckets[weekKey] = [];
    weekBuckets[weekKey].push(entry);
  }

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;

  for (const weekEntries of Object.values(weekBuckets)) {
    const result = calculateWeeklyPay(weekEntries, hourlyRate);
    totalRegularHours += result.regularHours;
    totalOvertimeHours += result.overtimeHours;
  }

  const regularPay = totalRegularHours * hourlyRate;
  const overtimePay = totalOvertimeHours * hourlyRate * ONTARIO_OT_MULTIPLIER;
  const grossPay = regularPay + overtimePay;

  return {
    regularHours: Math.round(totalRegularHours * 100) / 100,
    overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
    regularRate: hourlyRate,
    overtimeRate: ONTARIO_OT_MULTIPLIER,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
    netPay: Math.round(grossPay * 100) / 100, // placeholder — no deductions yet
  };
}
