"use client";

import { useState, useMemo } from "react";
import { useTimesheet } from "@/hooks/use-timesheet";
import { useLocations } from "@/hooks/use-locations";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";

// --- Helpers ---
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const TABS = [
  { id: "live", label: "Live Clock" },
  { id: "weekly", label: "Weekly Timesheet" },
  { id: "payperiods", label: "Pay Periods" },
];

export default function TimesheetPage() {
  const [activeTab, setActiveTab] = useState("live");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const weekStart = useMemo(
    () => addDays(getMonday(new Date()), weekOffset * 7),
    [weekOffset],
  );

  const { locations } = useLocations();

  const {
    liveClocks,
    weeklyRows,
    weeklyStats,
    payPeriods,
    currentPayPeriod,
    payStubs,
    clockIn,
    clockOut,
    finalizePeriod,
    exportCSV,
    clockedInCount,
  } = useTimesheet({
    locationId: selectedLocation || undefined,
    weekStart,
    payPeriodId: selectedPeriodId ?? undefined,
  });

  const locationOptions = useMemo(
    () => [
      { value: "", label: "All Locations" },
      ...locations.map((l) => ({
        value: l.id,
        label: l.name.replace("Wingporium ", ""),
      })),
    ],
    [locations],
  );

  // Count scheduled employees for today
  const totalScheduledToday = useMemo(() => {
    // rough estimate from weekly rows
    const today = dateStr(new Date());
    let count = 0;
    for (const row of weeklyRows) {
      if (row.days[today] && row.days[today].scheduled > 0) count++;
    }
    return count;
  }, [weeklyRows]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Time tracking, weekly hours, and payroll
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Location Filter */}
      <div className="max-w-xs">
        <Select
          options={locationOptions}
          value={selectedLocation}
          onChange={setSelectedLocation}
          placeholder="All Locations"
        />
      </div>

      {/* ==================== LIVE CLOCK TAB ==================== */}
      {activeTab === "live" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-900">
                {clockedInCount} clocked in
              </span>
            </div>
            <span className="text-sm text-gray-500">
              / {totalScheduledToday} scheduled today
            </span>
          </div>

          {liveClocks.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-gray-500">
                  No employees currently clocked in
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {liveClocks.map((clock) => (
                <Card key={clock.entryId}>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {clock.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {clock.locationName}
                        </p>
                      </div>
                      <Badge variant="success">
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {formatDuration(clock.durationMinutes)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <span>In: {formatTime(clock.clockIn)}</span>
                      {clock.scheduledStart && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>
                            Sched: {formatTime(clock.scheduledStart)}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant={
                          clock.punctuality === "early"
                            ? "info"
                            : clock.punctuality === "on_time"
                              ? "success"
                              : "error"
                        }
                      >
                        {clock.punctuality === "early"
                          ? "Early"
                          : clock.punctuality === "on_time"
                            ? "On Time"
                            : "Late"}
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <Button
                        variant="danger"
                        size="lg"
                        fullWidth
                        onClick={() => clockOut(clock.employeeId)}
                      >
                        Clock Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick clock-in section */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Quick Clock In
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Tap an employee to clock them in at their primary location
            </p>
            <div className="flex flex-wrap gap-2">
              {locations
                .filter(
                  (l) => !selectedLocation || l.id === selectedLocation,
                )
                .slice(0, 3)
                .map((loc) => {
                  // Find employees not currently clocked in at this location
                  const clockedInIds = liveClocks.map((c) => c.employeeId);
                  const available = MOCK_EMPLOYEES.filter(
                    (e) =>
                      e.primary_location_id === loc.id &&
                      !clockedInIds.includes(e.id),
                  );

                  if (available.length === 0) return null;

                  return (
                    <div key={loc.id} className="space-y-1">
                      <p className="text-xs font-medium text-gray-500">
                        {loc.name.replace("Wingporium ", "")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {available.slice(0, 4).map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => clockIn(emp.id, loc.id)}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {emp.first_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== WEEKLY TIMESHEET TAB ==================== */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          {/* Week selector */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </Button>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(dateStr(weekStart))} -{" "}
              {formatDate(dateStr(addDays(weekStart, 6)))}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWeekOffset((o) => o + 1)}
              disabled={weekOffset >= 0}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </Button>
            {weekOffset !== 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset(0)}
              >
                This week
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="sticky left-0 bg-white pb-3 pr-3 font-semibold text-gray-900">
                    Employee
                  </th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(weekStart, i);
                    return (
                      <th
                        key={i}
                        className="pb-3 px-2 text-center font-medium text-gray-500"
                      >
                        <div>
                          {day.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </div>
                        <div className="text-xs">
                          {day.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </th>
                    );
                  })}
                  <th className="pb-3 px-2 text-center font-semibold text-gray-900">
                    Total
                  </th>
                  <th className="pb-3 px-2 text-center font-semibold text-gray-900">
                    Reg
                  </th>
                  <th className="pb-3 px-2 text-center font-semibold text-gray-900">
                    OT
                  </th>
                  <th className="pb-3 px-2 text-right font-semibold text-gray-900">
                    Gross
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="py-8 text-center text-gray-500"
                    >
                      No time entries for this week
                    </td>
                  </tr>
                ) : (
                  weeklyRows.map((row) => {
                    const days = Array.from({ length: 7 }, (_, i) =>
                      dateStr(addDays(weekStart, i)),
                    );
                    return (
                      <tr
                        key={row.employeeId}
                        className="border-b border-gray-100"
                      >
                        <td className="sticky left-0 bg-white py-3 pr-3">
                          <div className="font-medium text-gray-900">
                            {row.employeeName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.locationName} &middot; ${row.hourlyRate}/hr
                          </div>
                        </td>
                        {days.map((day) => {
                          const d = row.days[day];
                          if (!d || (d.worked === 0 && d.scheduled === 0)) {
                            return (
                              <td
                                key={day}
                                className="px-2 py-3 text-center text-gray-300"
                              >
                                -
                              </td>
                            );
                          }

                          const diff = Math.abs(d.worked - d.scheduled);
                          const color =
                            d.worked === 0 && d.scheduled > 0
                              ? "text-red-600 bg-red-50"
                              : diff > 1
                                ? "text-amber-700 bg-amber-50"
                                : "text-emerald-700 bg-emerald-50";

                          return (
                            <td key={day} className="px-2 py-3 text-center">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${color}`}
                              >
                                {d.worked.toFixed(1)}
                              </span>
                              {d.scheduled > 0 &&
                                Math.abs(d.worked - d.scheduled) > 0.5 && (
                                  <div className="mt-0.5 text-[10px] text-gray-400">
                                    /{d.scheduled.toFixed(1)}
                                  </div>
                                )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 text-center font-semibold text-gray-900">
                          {row.totalHours.toFixed(1)}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">
                          {row.regularHours.toFixed(1)}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {row.overtimeHours > 0 ? (
                            <Badge variant="warning">
                              {row.overtimeHours.toFixed(1)}
                            </Badge>
                          ) : (
                            <span className="text-gray-300">0</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(row.grossPay)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Summary row */}
              {weeklyRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td className="sticky left-0 bg-white py-3 pr-3 font-bold text-gray-900">
                      Totals
                    </td>
                    {Array.from({ length: 7 }, (_, i) => (
                      <td key={i} className="px-2 py-3" />
                    ))}
                    <td className="px-2 py-3 text-center font-bold text-gray-900">
                      {weeklyStats.totalHours.toFixed(1)}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-gray-600">
                      {weeklyStats.regularHours.toFixed(1)}
                    </td>
                    <td className="px-2 py-3 text-center font-bold">
                      {weeklyStats.otHours > 0 ? (
                        <Badge variant="warning">
                          {weeklyStats.otHours.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(weeklyStats.grossPay)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ==================== PAY PERIODS TAB ==================== */}
      {activeTab === "payperiods" && (
        <div className="space-y-4">
          {/* Period list */}
          <div className="grid gap-3 sm:grid-cols-2">
            {payPeriods.map((period) => (
              <Card
                key={period.id}
                className={`${
                  selectedPeriodId === period.id
                    ? "border-blue-400 ring-1 ring-blue-400"
                    : period.status === "open"
                      ? "border-emerald-200"
                      : ""
                }`}
                onClick={() => setSelectedPeriodId(period.id)}
              >
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatDate(period.start_date)} -{" "}
                        {formatDate(period.end_date)}
                      </p>
                      <p className="text-xs text-gray-500">Bi-weekly period</p>
                    </div>
                    <Badge
                      variant={
                        period.status === "open"
                          ? "success"
                          : period.status === "finalized"
                            ? "info"
                            : "warning"
                      }
                    >
                      {period.status === "open"
                        ? "Open"
                        : period.status === "finalized"
                          ? "Finalized"
                          : "Processing"}
                    </Badge>
                  </div>
                  {period.total_gross_pay != null && (
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        <span className="font-semibold text-gray-900">
                          {period.total_regular_hours?.toFixed(1)}
                        </span>{" "}
                        reg hrs
                      </span>
                      <span>
                        <span className="font-semibold text-gray-900">
                          {period.total_overtime_hours?.toFixed(1)}
                        </span>{" "}
                        OT hrs
                      </span>
                      <span className="ml-auto font-semibold text-gray-900">
                        {formatCurrency(period.total_gross_pay)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Period detail */}
          {selectedPeriodId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Period Breakdown
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportCSV(selectedPeriodId)}
                  >
                    <svg
                      className="mr-1.5 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    Export CSV
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    Export PDF
                  </Button>
                  {payPeriods.find((p) => p.id === selectedPeriodId)
                    ?.status === "open" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => finalizePeriod(selectedPeriodId)}
                    >
                      Finalize Period
                    </Button>
                  )}
                </div>
              </div>

              {/* Pay stubs table */}
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-3 pr-3 font-semibold text-gray-900">
                        Employee
                      </th>
                      <th className="pb-3 px-2 text-center font-medium text-gray-500">
                        Reg Hrs
                      </th>
                      <th className="pb-3 px-2 text-center font-medium text-gray-500">
                        OT Hrs
                      </th>
                      <th className="pb-3 px-2 text-center font-medium text-gray-500">
                        Rate
                      </th>
                      <th className="pb-3 px-2 text-right font-medium text-gray-500">
                        Reg Pay
                      </th>
                      <th className="pb-3 px-2 text-right font-medium text-gray-500">
                        OT Pay
                      </th>
                      <th className="pb-3 px-2 text-right font-semibold text-gray-900">
                        Gross
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payStubs.map((stub) => {
                      const emp = MOCK_EMPLOYEES.find(
                        (e) => e.id === stub.employee_id,
                      );
                      return (
                        <tr
                          key={stub.id}
                          className="border-b border-gray-100"
                        >
                          <td className="py-3 pr-3">
                            <div className="font-medium text-gray-900">
                              {emp
                                ? `${emp.first_name} ${emp.last_name}`
                                : "Unknown"}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center text-gray-600">
                            {stub.regular_hours.toFixed(1)}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {stub.overtime_hours > 0 ? (
                              <Badge variant="warning">
                                {stub.overtime_hours.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-600">
                            ${(stub.regular_rate ?? 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-600">
                            {formatCurrency(stub.regular_pay)}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-600">
                            {stub.overtime_pay > 0
                              ? formatCurrency(stub.overtime_pay)
                              : "-"}
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(stub.gross_pay)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-3 pr-3 font-bold text-gray-900">
                        Total ({payStubs.length} employees)
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-gray-900">
                        {payStubs
                          .reduce((s, p) => s + p.regular_hours, 0)
                          .toFixed(1)}
                      </td>
                      <td className="px-2 py-3 text-center font-bold">
                        {payStubs.reduce((s, p) => s + p.overtime_hours, 0) >
                        0 ? (
                          <Badge variant="warning">
                            {payStubs
                              .reduce((s, p) => s + p.overtime_hours, 0)
                              .toFixed(1)}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-2 py-3" />
                      <td className="px-2 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(
                          payStubs.reduce((s, p) => s + p.regular_pay, 0),
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(
                          payStubs.reduce((s, p) => s + p.overtime_pay, 0),
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(
                          payStubs.reduce((s, p) => s + p.gross_pay, 0),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
