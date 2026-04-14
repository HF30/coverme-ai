/**
 * OT Calculator — Ontario ESA compliance
 *
 * Calculates hours worked in the current week for an employee
 * and checks whether adding a shift would exceed the weekly limit.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the Monday (start) of the week containing the given date.
 * ISO weeks start on Monday.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Sunday (end) of the week containing the given date.
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Calculate total hours an employee is scheduled to work in the week
 * containing `weekOf`. Only counts non-cancelled shifts.
 */
export async function getHoursThisWeek(
  supabase: SupabaseClient,
  employeeId: string,
  weekOf: Date,
): Promise<number> {
  const weekStart = getWeekStart(weekOf);
  const weekEnd = getWeekEnd(weekOf);

  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('start_time, end_time')
    .eq('employee_id', employeeId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .not('status', 'in', '("cancelled","missed")');

  if (error) {
    console.error(`[overtime] Error fetching shifts for ${employeeId}:`, error);
    return 0;
  }

  if (!shifts || shifts.length === 0) return 0;

  let totalHours = 0;
  for (const shift of shifts) {
    const start = new Date(shift.start_time).getTime();
    const end = new Date(shift.end_time).getTime();
    totalHours += (end - start) / (1000 * 60 * 60);
  }

  return totalHours;
}

/**
 * Check if adding a shift of given duration would exceed the weekly max.
 */
export function wouldExceedOT(
  currentHours: number,
  shiftDurationHours: number,
  maxHours: number,
): boolean {
  return currentHours + shiftDurationHours > maxHours;
}

/**
 * Calculate the duration of a shift in hours.
 */
export function shiftDurationHours(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / (1000 * 60 * 60);
}
