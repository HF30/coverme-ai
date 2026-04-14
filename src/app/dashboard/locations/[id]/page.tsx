"use client";

import { use, useState, useMemo } from "react";
import { useLocations } from "@/hooks/use-locations";
import { useSchedule } from "@/hooks/use-schedule";
import { useCallouts } from "@/hooks/use-callouts";
import { useStaff } from "@/hooks/use-staff";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { WeekCalendar } from "@/components/ui/calendar";
import { CardSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";

function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function formatTime(isoTime: string): string {
  const d = new Date(isoTime);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: locationId } = use(params);
  const [weekStart] = useState<string>(getMonday());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const { locations, loading: locLoading } = useLocations();
  const { shifts, loading: shiftLoading } = useSchedule(locationId, weekStart);
  const { callouts, loading: calloutLoading } = useCallouts(locationId);
  const { staff, loading: staffLoading } = useStaff({ locationId });

  const location = locations.find((l) => l.id === locationId);

  const todayShifts = useMemo(
    () => shifts.filter((s) => s.date === selectedDate),
    [shifts, selectedDate]
  );

  const openShiftsThisWeek = useMemo(
    () => shifts.filter((s) => s.is_open),
    [shifts]
  );

  // Labor cost estimate for the week
  const weeklyLaborCost = useMemo(() => {
    return shifts
      .filter((s) => s.employee_id)
      .reduce((total, shift) => {
        const emp = MOCK_EMPLOYEES.find((e) => e.id === shift.employee_id);
        if (!emp) return total;
        const start = new Date(shift.start_time);
        const end = new Date(shift.end_time);
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (hours < 0) hours += 24;
        return total + emp.hourly_rate * hours;
      }, 0);
  }, [shifts]);

  const loading = locLoading || shiftLoading;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 pb-20 sm:pb-6">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-20 sm:pb-6">
      {/* Header */}
      <div>
        <a
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </a>
        <h1 className="text-2xl font-bold text-gray-900">
          {location?.name ?? "Location"}
        </h1>
        <p className="text-sm text-gray-500">{location?.address}</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Today&apos;s Shifts
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {todayShifts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Open This Week
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${openShiftsThisWeek.length > 0 ? "text-amber-600" : "text-gray-900"}`}
            >
              {openShiftsThisWeek.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Weekly Labor
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              ${Math.round(weeklyLaborCost).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Staff
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {staff.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Week calendar */}
      <WeekCalendar
        weekStart={weekStart}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {/* Today's schedule */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {selectedDate === new Date().toISOString().split("T")[0]
            ? "Today's"
            : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
              }) + "'s"}{" "}
          Schedule
        </h2>
        {todayShifts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No shifts scheduled
          </p>
        ) : (
          <div className="space-y-2">
            {todayShifts
              .sort(
                (a, b) =>
                  new Date(a.start_time).getTime() -
                  new Date(b.start_time).getTime()
              )
              .map((shift) => (
                <Card
                  key={shift.id}
                  className={
                    shift.is_open ? "border-dashed border-amber-300" : ""
                  }
                >
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {shift.employee ? (
                        <Avatar
                          firstName={shift.employee.first_name}
                          lastName={shift.employee.last_name}
                          size="sm"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-amber-400 bg-amber-50 text-amber-600">
                          <span className="text-xs font-bold">?</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">
                          {shift.employee
                            ? `${shift.employee.first_name} ${shift.employee.last_name}`
                            : "Open Shift"}
                        </span>
                        <p className="text-xs text-gray-500">
                          {formatTime(shift.start_time)} -{" "}
                          {formatTime(shift.end_time)}
                        </p>
                      </div>
                      <RoleBadge role={shift.role?.name ?? "Unknown"} />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Staffing gaps */}
      {openShiftsThisWeek.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Staffing Gaps This Week
          </h2>
          <div className="space-y-2">
            {openShiftsThisWeek.map((shift) => (
              <Card
                key={shift.id}
                className="border-dashed border-amber-300 bg-amber-50/30"
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(shift.date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          { weekday: "short", month: "short", day: "numeric" }
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(shift.start_time)} -{" "}
                        {formatTime(shift.end_time)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={shift.role?.name ?? "Unknown"} />
                      <Badge variant="warning">Open</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent callouts */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Recent Callouts
        </h2>
        {calloutLoading ? (
          <ListSkeleton rows={3} />
        ) : callouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No recent callouts
          </p>
        ) : (
          <div className="space-y-2">
            {callouts.slice(0, 5).map((callout) => (
              <Card key={callout.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {callout.employeeName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {callout.reason ?? "No reason"} --{" "}
                        {new Date(callout.reported_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={callout.status} />
                      {callout.filledByName && (
                        <span className="text-xs text-gray-500">
                          Filled by {callout.filledByName}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Staff at this location */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Staff ({staff.length})
        </h2>
        {staffLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <div className="space-y-2">
            {staff.map((emp) => (
              <Card key={emp.id}>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={emp.first_name}
                      lastName={emp.last_name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">
                        {emp.first_name} {emp.last_name}
                      </span>
                      <div className="flex gap-1 mt-0.5">
                        {emp.roles.map((r) => (
                          <RoleBadge key={r} role={r} />
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {emp.reliability_score}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {emp.hoursThisWeek}h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
