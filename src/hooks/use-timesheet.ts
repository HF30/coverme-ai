"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { MOCK_EMPLOYEES, MOCK_LOCATIONS, MOCK_SHIFTS } from "@/lib/mock-data";
import { calculateWeeklyPay, calculatePayPeriod } from "@/lib/payroll/overtime";
import { generatePayrollCSV, downloadCSV } from "@/lib/payroll/export";
import type { Database } from "@/types/database";

type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
type PayPeriod = Database["public"]["Tables"]["pay_periods"]["Row"];
type PayStub = Database["public"]["Tables"]["pay_stubs"]["Row"];

const ORG_ID = "a1b2c3d4-0001-4000-8000-000000000001";

// --- Helper: get Monday of the week containing a date ---
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// --- Seeded pseudo-random for deterministic mock data (avoids hydration mismatch) ---
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return ((hash & 0x7fffffff) % 10000) / 10000;
}

// --- Generate realistic mock time entries from shifts ---
function generateMockTimeEntries(): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const now = new Date();
  const today = dateStr(now);
  const currentHour = now.getHours();

  for (const shift of MOCK_SHIFTS) {
    if (shift.is_open || !shift.employee_id) continue;

    const emp = MOCK_EMPLOYEES.find((e) => e.id === shift.employee_id);
    if (!emp) continue;

    const shiftStart = new Date(shift.start_time);
    const shiftEnd = new Date(shift.end_time);
    const isToday = shift.date === today;
    const isPast = shift.date < today;
    const isFuture = shift.date > today;

    if (isFuture) continue;

    // Deterministic variance per shift
    const r1 = seededRandom(shift.id + "clock_in");
    const r2 = seededRandom(shift.id + "clock_out");
    const r3 = seededRandom(shift.id + "break");

    const variance = (r1 - 0.3) * 10;
    const clockIn = new Date(shiftStart.getTime() + variance * 60 * 1000);

    let clockOut: Date | null = null;
    let status: string = "active";

    if (isPast) {
      const endVariance = (r2 - 0.5) * 15;
      clockOut = new Date(shiftEnd.getTime() + endVariance * 60 * 1000);
      status = "completed";
    } else if (isToday) {
      if (shiftStart.getUTCHours() <= currentHour + 5) {
        if (shiftEnd.getTime() < now.getTime()) {
          const endVariance = (r2 - 0.5) * 10;
          clockOut = new Date(shiftEnd.getTime() + endVariance * 60 * 1000);
          status = "completed";
        } else {
          clockOut = null;
          status = "active";
        }
      } else {
        continue;
      }
    }

    const breakMinutes = clockOut ? (r3 > 0.6 ? 30 : 0) : 0;
    const hoursWorked =
      clockOut
        ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) -
          breakMinutes / 60
        : null;
    const grossPay =
      hoursWorked != null ? hoursWorked * emp.hourly_rate : null;

    entries.push({
      id: `te-${shift.id}`,
      organization_id: ORG_ID,
      employee_id: emp.id,
      location_id: shift.location_id,
      shift_id: shift.id,
      clock_in: clockIn.toISOString(),
      clock_out: clockOut?.toISOString() ?? null,
      break_minutes: breakMinutes,
      hours_worked: hoursWorked != null ? Math.round(hoursWorked * 100) / 100 : null,
      hourly_rate: emp.hourly_rate,
      gross_pay: grossPay != null ? Math.round(grossPay * 100) / 100 : null,
      is_overtime: false,
      overtime_rate: 1.5,
      status,
      notes: null,
      edited_by: null,
      edited_at: null,
      created_at: clockIn.toISOString(),
      updated_at: clockIn.toISOString(),
    });
  }

  // Mark OT entries: for any employee with >44 hours in a week, flag entries beyond 44
  const byEmployeeWeek: Record<string, TimeEntry[]> = {};
  for (const entry of entries) {
    const monday = getMonday(new Date(entry.clock_in));
    const key = `${entry.employee_id}_${dateStr(monday)}`;
    if (!byEmployeeWeek[key]) byEmployeeWeek[key] = [];
    byEmployeeWeek[key].push(entry);
  }

  for (const weekEntries of Object.values(byEmployeeWeek)) {
    let cumHours = 0;
    // Sort by clock_in
    weekEntries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
    for (const entry of weekEntries) {
      if (entry.hours_worked == null) continue;
      cumHours += entry.hours_worked;
      if (cumHours > 44) {
        entry.is_overtime = true;
      }
    }
  }

  return entries;
}

// --- Generate mock pay periods ---
function generateMockPayPeriods(): PayPeriod[] {
  const now = new Date();
  const currentMonday = getMonday(now);

  // Current open bi-weekly period
  const currentStart = addDays(currentMonday, -7); // started last Monday
  const currentEnd = addDays(currentStart, 13); // 2 weeks

  // Previous finalized period
  const prevStart = addDays(currentStart, -14);
  const prevEnd = addDays(prevStart, 13);

  return [
    {
      id: "pp-001",
      organization_id: ORG_ID,
      start_date: dateStr(prevStart),
      end_date: dateStr(prevEnd),
      status: "finalized",
      total_regular_hours: 1247.5,
      total_overtime_hours: 18.5,
      total_gross_pay: 23842.75,
      finalized_at: addDays(prevEnd, 1).toISOString(),
      finalized_by: null,
      notes: null,
      created_at: prevStart.toISOString(),
    },
    {
      id: "pp-002",
      organization_id: ORG_ID,
      start_date: dateStr(currentStart),
      end_date: dateStr(currentEnd),
      status: "open",
      total_regular_hours: null,
      total_overtime_hours: null,
      total_gross_pay: null,
      finalized_at: null,
      finalized_by: null,
      notes: null,
      created_at: currentStart.toISOString(),
    },
  ];
}

// --- Generate mock pay stubs for finalized period ---
function generateMockPayStubs(periodId: string): PayStub[] {
  return MOCK_EMPLOYEES.map((emp) => {
    const r = seededRandom(periodId + emp.id);
    const baseHours = 70 + r * 20; // 70-90 hours in a 2-week period
    const hasOT = seededRandom(periodId + emp.id + "ot") > 0.7;
    const regularHours = hasOT ? 88 : Math.round(baseHours * 10) / 10;
    const overtimeHours = hasOT ? Math.round((baseHours - 88 + 8) * 10) / 10 : 0;

    const regularPay = Math.round(regularHours * emp.hourly_rate * 100) / 100;
    const overtimePay = Math.round(overtimeHours * emp.hourly_rate * 1.5 * 100) / 100;
    const grossPay = Math.round((regularPay + overtimePay) * 100) / 100;

    return {
      id: `ps-${periodId}-${emp.id.slice(-4)}`,
      organization_id: ORG_ID,
      pay_period_id: periodId,
      employee_id: emp.id,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      regular_rate: emp.hourly_rate,
      overtime_rate: 1.5,
      regular_pay: regularPay,
      overtime_pay: overtimePay,
      gross_pay: grossPay,
      deductions: {},
      net_pay: grossPay,
      status: periodId === "pp-001" ? "paid" : "draft",
      paid_at: periodId === "pp-001" ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    };
  });
}

// --- Computed types ---
export interface LiveClock {
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  clockIn: string;
  durationMinutes: number;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  punctuality: "early" | "on_time" | "late";
  entryId: string;
}

export interface WeeklyEmployeeRow {
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  hourlyRate: number;
  days: Record<string, { worked: number; scheduled: number }>;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
}

export interface WeeklyStats {
  totalHours: number;
  regularHours: number;
  otHours: number;
  grossPay: number;
}

export interface TimesheetOptions {
  locationId?: string;
  weekStart?: Date;
  payPeriodId?: string;
}

// Singleton caches so mock data is stable across re-renders
let _cachedEntries: TimeEntry[] | null = null;
let _cachedPayPeriods: PayPeriod[] | null = null;
const _cachedStubs: Record<string, PayStub[]> = {};

function getEntries(): TimeEntry[] {
  if (!_cachedEntries) _cachedEntries = generateMockTimeEntries();
  return _cachedEntries;
}

function getPayPeriods(): PayPeriod[] {
  if (!_cachedPayPeriods) _cachedPayPeriods = generateMockPayPeriods();
  return _cachedPayPeriods;
}

function getPayStubs(periodId: string): PayStub[] {
  if (!_cachedStubs[periodId]) _cachedStubs[periodId] = generateMockPayStubs(periodId);
  return _cachedStubs[periodId];
}

export function useTimesheet(options: TimesheetOptions = {}) {
  const [, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const allEntries = useMemo(() => mounted ? getEntries() : [], [mounted]);
  const payPeriods = useMemo(() => mounted ? getPayPeriods() : [], [mounted]);

  const currentPayPeriod = useMemo(
    () => payPeriods.find((p) => p.status === "open") ?? null,
    [payPeriods],
  );

  // --- Live Clocks ---
  const liveClocks: LiveClock[] = useMemo(() => {
    const now = new Date();
    let active = allEntries.filter((e) => e.status === "active" && !e.clock_out);

    if (options.locationId) {
      active = active.filter((e) => e.location_id === options.locationId);
    }

    return active.map((entry) => {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === entry.employee_id);
      const loc = MOCK_LOCATIONS.find((l) => l.id === entry.location_id);
      const shift = entry.shift_id
        ? MOCK_SHIFTS.find((s) => s.id === entry.shift_id)
        : null;

      const clockInTime = new Date(entry.clock_in);
      const durationMinutes = Math.round(
        (now.getTime() - clockInTime.getTime()) / (1000 * 60),
      );

      let punctuality: "early" | "on_time" | "late" = "on_time";
      if (shift) {
        const scheduledStart = new Date(shift.start_time);
        const diffMin =
          (clockInTime.getTime() - scheduledStart.getTime()) / (1000 * 60);
        if (diffMin < -5) punctuality = "early";
        else if (diffMin > 5) punctuality = "late";
      }

      return {
        employeeId: entry.employee_id,
        employeeName: emp
          ? `${emp.first_name} ${emp.last_name}`
          : "Unknown",
        locationId: entry.location_id,
        locationName: loc?.name.replace("Wingporium ", "") ?? "Unknown",
        clockIn: entry.clock_in,
        durationMinutes,
        scheduledStart: shift?.start_time ?? null,
        scheduledEnd: shift?.end_time ?? null,
        punctuality,
        entryId: entry.id,
      };
    });
  }, [allEntries, options.locationId]);

  // --- Weekly Entries ---
  const weekStart = useMemo(
    () => options.weekStart ?? getMonday(new Date()),
    [options.weekStart],
  );

  const weeklyEntries: TimeEntry[] = useMemo(() => {
    const start = weekStart;
    const end = addDays(start, 7);
    let filtered = allEntries.filter((e) => {
      const d = new Date(e.clock_in);
      return d >= start && d < end;
    });
    if (options.locationId) {
      filtered = filtered.filter((e) => e.location_id === options.locationId);
    }
    return filtered;
  }, [allEntries, weekStart, options.locationId]);

  // --- Weekly Timesheet Rows ---
  const weeklyRows: WeeklyEmployeeRow[] = useMemo(() => {
    const empMap: Record<string, TimeEntry[]> = {};
    for (const entry of weeklyEntries) {
      if (!empMap[entry.employee_id]) empMap[entry.employee_id] = [];
      empMap[entry.employee_id].push(entry);
    }

    const days = Array.from({ length: 7 }, (_, i) => dateStr(addDays(weekStart, i)));

    return Object.entries(empMap).map(([empId, entries]) => {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === empId);
      const loc = MOCK_LOCATIONS.find(
        (l) => l.id === emp?.primary_location_id,
      );

      const dayData: Record<string, { worked: number; scheduled: number }> = {};
      for (const day of days) {
        const dayEntries = entries.filter(
          (e) => new Date(e.clock_in).toISOString().split("T")[0] === day,
        );
        const worked = dayEntries.reduce(
          (sum, e) => sum + (e.hours_worked ?? 0),
          0,
        );

        // Find scheduled hours for this day
        const dayShifts = MOCK_SHIFTS.filter(
          (s) => s.employee_id === empId && s.date === day,
        );
        const scheduled = dayShifts.reduce((sum, s) => {
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          let h = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          if (h < 0) h += 24;
          return sum + h;
        }, 0);

        dayData[day] = {
          worked: Math.round(worked * 100) / 100,
          scheduled: Math.round(scheduled * 100) / 100,
        };
      }

      const pay = calculateWeeklyPay(entries, emp?.hourly_rate ?? 0);

      return {
        employeeId: empId,
        employeeName: emp
          ? `${emp.first_name} ${emp.last_name}`
          : "Unknown",
        locationId: emp?.primary_location_id ?? "",
        locationName: loc?.name.replace("Wingporium ", "") ?? "Unknown",
        hourlyRate: emp?.hourly_rate ?? 0,
        days: dayData,
        totalHours: pay.regularHours + pay.overtimeHours,
        regularHours: pay.regularHours,
        overtimeHours: pay.overtimeHours,
        grossPay: pay.grossPay,
      };
    });
  }, [weeklyEntries, weekStart]);

  // --- Weekly Stats ---
  const weeklyStats: WeeklyStats = useMemo(() => {
    return weeklyRows.reduce(
      (acc, row) => ({
        totalHours: acc.totalHours + row.totalHours,
        regularHours: acc.regularHours + row.regularHours,
        otHours: acc.otHours + row.overtimeHours,
        grossPay: acc.grossPay + row.grossPay,
      }),
      { totalHours: 0, regularHours: 0, otHours: 0, grossPay: 0 },
    );
  }, [weeklyRows]);

  // --- Pay Stubs ---
  const payStubs = useMemo(() => {
    const pid = options.payPeriodId ?? "pp-001";
    return getPayStubs(pid);
  }, [options.payPeriodId]);

  // --- Actions ---
  const clockIn = useCallback(
    (employeeId: string, locationId: string) => {
      const emp = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
      if (!emp || !_cachedEntries) return;

      const entry: TimeEntry = {
        id: `te-live-${Date.now()}`,
        organization_id: ORG_ID,
        employee_id: employeeId,
        location_id: locationId,
        shift_id: null,
        clock_in: new Date().toISOString(),
        clock_out: null,
        break_minutes: 0,
        hours_worked: null,
        hourly_rate: emp.hourly_rate,
        gross_pay: null,
        is_overtime: false,
        overtime_rate: 1.5,
        status: "active",
        notes: null,
        edited_by: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      _cachedEntries.push(entry);
      setRefreshKey((k) => k + 1);
    },
    [],
  );

  const clockOut = useCallback(
    (employeeId: string, breakMinutes?: number) => {
      if (!_cachedEntries) return;
      const entry = _cachedEntries.find(
        (e) =>
          e.employee_id === employeeId &&
          e.status === "active" &&
          !e.clock_out,
      );
      if (!entry) return;

      const now = new Date();
      entry.clock_out = now.toISOString();
      entry.break_minutes = breakMinutes ?? 0;
      entry.status = "completed";
      const hoursWorked =
        (now.getTime() - new Date(entry.clock_in).getTime()) /
          (1000 * 60 * 60) -
        (entry.break_minutes ?? 0) / 60;
      entry.hours_worked = Math.round(hoursWorked * 100) / 100;
      entry.gross_pay =
        Math.round(hoursWorked * entry.hourly_rate * 100) / 100;
      entry.updated_at = now.toISOString();

      setRefreshKey((k) => k + 1);
    },
    [],
  );

  const editEntry = useCallback(
    (entryId: string, updates: Partial<TimeEntry>) => {
      if (!_cachedEntries) return;
      const entry = _cachedEntries.find((e) => e.id === entryId);
      if (!entry) return;
      Object.assign(entry, updates, {
        status: "edited",
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setRefreshKey((k) => k + 1);
    },
    [],
  );

  const voidEntry = useCallback((entryId: string, _reason: string) => {
    if (!_cachedEntries) return;
    const entry = _cachedEntries.find((e) => e.id === entryId);
    if (!entry) return;
    entry.status = "void";
    entry.notes = _reason;
    entry.updated_at = new Date().toISOString();
    setRefreshKey((k) => k + 1);
  }, []);

  const finalizePeriod = useCallback((periodId: string) => {
    if (!_cachedPayPeriods) return;
    const period = _cachedPayPeriods.find((p) => p.id === periodId);
    if (!period) return;

    const stubs = getPayStubs(periodId);
    const totals = stubs.reduce(
      (acc, s) => ({
        reg: acc.reg + s.regular_hours,
        ot: acc.ot + s.overtime_hours,
        gross: acc.gross + s.gross_pay,
      }),
      { reg: 0, ot: 0, gross: 0 },
    );

    period.status = "finalized";
    period.total_regular_hours = Math.round(totals.reg * 100) / 100;
    period.total_overtime_hours = Math.round(totals.ot * 100) / 100;
    period.total_gross_pay = Math.round(totals.gross * 100) / 100;
    period.finalized_at = new Date().toISOString();

    setRefreshKey((k) => k + 1);
  }, []);

  const exportCSV = useCallback((periodId: string) => {
    const stubs = getPayStubs(periodId);
    const period = getPayPeriods().find((p) => p.id === periodId);
    const csv = generatePayrollCSV(stubs, MOCK_EMPLOYEES, MOCK_LOCATIONS);
    const filename = `payroll_${period?.start_date ?? "unknown"}_${period?.end_date ?? "unknown"}.csv`;
    downloadCSV(csv, filename);
  }, []);

  // --- Dashboard stats ---
  const todayEntries = useMemo(() => {
    const today = dateStr(new Date());
    return allEntries.filter(
      (e) => new Date(e.clock_in).toISOString().split("T")[0] === today,
    );
  }, [allEntries]);

  const todayLaborCost = useMemo(() => {
    return todayEntries.reduce((sum, e) => sum + (e.gross_pay ?? 0), 0);
  }, [todayEntries]);

  const weekToDateHours = useMemo(() => {
    return weeklyEntries.reduce(
      (sum, e) => sum + (e.hours_worked ?? 0),
      0,
    );
  }, [weeklyEntries]);

  const scheduledWeekHours = useMemo(() => {
    const start = weekStart;
    const end = addDays(start, 7);
    let shifts = MOCK_SHIFTS.filter((s) => {
      return s.date >= dateStr(start) && s.date < dateStr(end) && s.employee_id;
    });
    if (options.locationId) {
      shifts = shifts.filter((s) => s.location_id === options.locationId);
    }
    return shifts.reduce((sum, s) => {
      const st = new Date(s.start_time);
      const en = new Date(s.end_time);
      let h = (en.getTime() - st.getTime()) / (1000 * 60 * 60);
      if (h < 0) h += 24;
      return sum + h;
    }, 0);
  }, [weekStart, options.locationId]);

  return {
    liveClocks,
    weeklyEntries,
    weeklyRows,
    payPeriods,
    currentPayPeriod,
    payStubs,
    clockIn,
    clockOut,
    editEntry,
    voidEntry,
    finalizePeriod,
    exportCSV,
    weeklyStats,
    todayLaborCost: Math.round(todayLaborCost * 100) / 100,
    weekToDateHours: Math.round(weekToDateHours * 10) / 10,
    scheduledWeekHours: Math.round(scheduledWeekHours * 10) / 10,
    clockedInCount: liveClocks.length,
    loading: false,
  };
}
