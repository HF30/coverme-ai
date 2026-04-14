"use client";

import { useState, useMemo } from "react";
import { useLocations } from "@/hooks/use-locations";
import { useSchedule, type ShiftWithDetails } from "@/hooks/use-schedule";
import { Select } from "@/components/ui/select";
import { WeekCalendar } from "@/components/ui/calendar";
import { RoleBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { ScheduleSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

const ROLE_COLORS: Record<string, string> = {
  Cook: "border-l-red-500 bg-red-50/50",
  Server: "border-l-blue-500 bg-blue-50/50",
  Bartender: "border-l-purple-500 bg-purple-50/50",
  Manager: "border-l-emerald-500 bg-emerald-50/50",
};

export default function SchedulePage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [weekStart, setWeekStart] = useState<string>(getMonday());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedShift, setSelectedShift] = useState<ShiftWithDetails | null>(
    null
  );

  const { locations, loading: locLoading } = useLocations();
  const { shifts, loading: shiftLoading } = useSchedule(
    selectedLocation || null,
    weekStart
  );

  const locationOptions = useMemo(
    () => [
      { value: "", label: "All Locations" },
      ...locations.map((l) => ({
        value: l.id,
        label: l.name.replace("Wingporium ", ""),
      })),
    ],
    [locations]
  );

  const filteredShifts = useMemo(
    () =>
      selectedDate
        ? shifts.filter((s) => s.date === selectedDate)
        : shifts,
    [shifts, selectedDate]
  );

  // Group shifts by location
  const shiftsByLocation = useMemo(() => {
    const grouped: Record<string, ShiftWithDetails[]> = {};
    for (const shift of filteredShifts) {
      const locId = shift.location_id;
      if (!grouped[locId]) grouped[locId] = [];
      grouped[locId].push(shift);
    }
    return grouped;
  }, [filteredShifts]);

  function navigateWeek(direction: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    const newMonday = d.toISOString().split("T")[0];
    setWeekStart(newMonday);
    // Also update selected date to same day of new week
    const sd = new Date(selectedDate);
    sd.setDate(sd.getDate() + direction * 7);
    setSelectedDate(sd.toISOString().split("T")[0]);
  }

  const loading = locLoading || shiftLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <Select
          options={locationOptions.slice(1)}
          value={selectedLocation}
          onChange={setSelectedLocation}
          placeholder="All Locations"
          className="w-44"
        />
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateWeek(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Previous week"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <WeekCalendar
          weekStart={weekStart}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          className="flex-1"
        />
        <button
          onClick={() => navigateWeek(1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label="Next week"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="text-gray-600">Cook</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-blue-500" />
          <span className="text-gray-600">Server</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-purple-500" />
          <span className="text-gray-600">Bartender</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-gray-600">Manager</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border-2 border-dashed border-amber-400 bg-amber-50" />
          <span className="text-gray-600">Open Shift</span>
        </div>
      </div>

      {/* Shifts list */}
      {loading ? (
        <ScheduleSkeleton />
      ) : filteredShifts.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="mt-3 text-sm font-medium">No shifts scheduled</p>
          <p className="text-xs text-gray-400">
            No shifts found for this date.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(shiftsByLocation).map(([locId, locShifts]) => {
            const loc = locations.find((l) => l.id === locId);
            const locationLabel = loc?.name.replace("Wingporium ", "") ?? locId;

            return (
              <div key={locId}>
                {!selectedLocation && (
                  <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {locationLabel}
                  </h2>
                )}
                <div className="space-y-2">
                  {locShifts
                    .sort(
                      (a, b) =>
                        new Date(a.start_time).getTime() -
                        new Date(b.start_time).getTime()
                    )
                    .map((shift) => {
                      const roleName = shift.role?.name ?? "Unknown";
                      const colorClass =
                        ROLE_COLORS[roleName] ?? "border-l-gray-300 bg-gray-50/50";

                      return (
                        <button
                          key={shift.id}
                          onClick={() => setSelectedShift(shift)}
                          className={`flex w-full min-h-[56px] items-center gap-3 rounded-lg border border-l-4 px-3 py-3 text-left transition-colors hover:shadow-sm ${colorClass} ${
                            shift.is_open
                              ? "border-dashed border-amber-300 bg-amber-50/60"
                              : "border-gray-200"
                          }`}
                        >
                          {shift.employee ? (
                            <Avatar
                              firstName={shift.employee.first_name}
                              lastName={shift.employee.last_name}
                              size="sm"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-amber-400 bg-amber-50 text-amber-600">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {shift.employee
                                  ? `${shift.employee.first_name} ${shift.employee.last_name}`
                                  : "Open Shift"}
                              </span>
                              {shift.employee &&
                                shift.employee.primary_location_id !==
                                  shift.location_id && (
                                  <Badge variant="purple">Float</Badge>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatTime(shift.start_time)} -{" "}
                              {formatTime(shift.end_time)}
                            </p>
                          </div>
                          <RoleBadge role={roleName} />
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shift detail sheet */}
      <Sheet
        open={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title="Shift Details"
      >
        {selectedShift && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <RoleBadge role={selectedShift.role?.name ?? "Unknown"} />
                {selectedShift.is_open ? (
                  <Badge variant="warning">Open - Needs Coverage</Badge>
                ) : (
                  <Badge variant="success">Filled</Badge>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium text-gray-900">
                  {formatTime(selectedShift.start_time)} -{" "}
                  {formatTime(selectedShift.end_time)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedShift.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium text-gray-900">
                  {locations.find((l) => l.id === selectedShift.location_id)
                    ?.name ?? "Unknown"}
                </p>
              </div>

              {selectedShift.employee && (
                <div>
                  <p className="text-sm text-gray-500">Assigned To</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar
                      firstName={selectedShift.employee.first_name}
                      lastName={selectedShift.employee.last_name}
                      size="sm"
                    />
                    <span className="font-medium text-gray-900">
                      {selectedShift.employee.first_name}{" "}
                      {selectedShift.employee.last_name}
                    </span>
                  </div>
                </div>
              )}

              {selectedShift.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm text-gray-900">
                    {selectedShift.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {selectedShift.is_open && (
                <Button fullWidth>Find Coverage</Button>
              )}
              <Button variant="secondary" fullWidth>
                Edit Shift
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
