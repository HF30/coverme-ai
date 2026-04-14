"use client";

import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useEvents } from "@/hooks/use-events";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

const EVENT_ICONS: Record<string, string> = {
  nhl: "\u{1F3D2}",
  nba: "\u{1F3C0}",
  nfl: "\u{1F3C8}",
  mlb: "\u{26BE}",
  ufc: "\u{1F94A}",
  concert: "\u{1F3B5}",
  custom: "\u{1F4C5}",
};

export default function DashboardPage() {
  const { stats, loading } = useDashboardStats();
  const { upcomingEvents } = useEvents();
  const router = useRouter();

  if (loading || !stats) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-20 sm:pb-6">
        <div className="space-y-1">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-red-700">Active Alerts</h2>
            <button
              onClick={() => router.push("/dashboard/alerts")}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all alerts
            </button>
          </div>
          {stats.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                alert.severity === "critical"
                  ? "border-red-200 bg-red-50"
                  : alert.severity === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {alert.severity === "critical" ? (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  alert.severity === "critical" ? "text-red-800" : "text-amber-800"
                }`}>
                  {alert.message}
                </p>
                {alert.locationName && (
                  <p className={`text-xs ${
                    alert.severity === "critical" ? "text-red-600" : "text-amber-600"
                  }`}>
                    {alert.locationName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Staff On Duty
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {stats.totalStaffOnDuty}
              <span className="text-lg font-normal text-gray-400">
                /{stats.totalScheduledToday}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Open Shifts
            </p>
            <p className={`mt-1 text-3xl font-bold ${stats.totalOpenShifts > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {stats.totalOpenShifts}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Needs coverage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Fill Rate
            </p>
            <p className={`mt-1 text-3xl font-bold ${stats.fillRate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
              {stats.fillRate}%
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Callout auto-fill</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Labor Cost
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              ${stats.totalLaborCost.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Today estimate</p>
          </CardContent>
        </Card>
      </div>

      {/* Location cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Locations</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.locationStats.map((loc) => (
            <Card
              key={loc.locationId}
              onClick={() =>
                router.push(`/dashboard/locations/${loc.locationId}`)
              }
              className="hover:border-blue-200"
            >
              <CardContent>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {loc.locationName}
                  </h3>
                  {loc.openShifts > 0 ? (
                    <Badge variant="warning">{loc.openShifts} open</Badge>
                  ) : (
                    <Badge variant="success">Covered</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {loc.staffOnDuty}
                    </span>{" "}
                    staff
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {loc.totalScheduled}
                    </span>{" "}
                    shifts
                  </div>
                  <div className="ml-auto font-medium text-gray-700">
                    ${loc.laborCostEstimate}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Events
            </h2>
            <button
              onClick={() => router.push("/dashboard/events")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.slice(0, 3).map((event) => {
              const icon = EVENT_ICONS[event.event_type] ?? EVENT_ICONS.custom;
              return (
                <Card
                  key={event.id}
                  onClick={() => router.push("/dashboard/events")}
                  className="hover:border-blue-200"
                >
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {event.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.event_date + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Badge
                          variant={
                            event.demand_multiplier >= 1.5
                              ? "error"
                              : event.demand_multiplier >= 1.2
                                ? "warning"
                                : "info"
                          }
                        >
                          {event.demand_multiplier}x
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {event.staffingStatus === "fully_staffed" ? (
                        <Badge variant="success">Fully Staffed</Badge>
                      ) : event.staffingStatus === "needs_staff" ? (
                        <Badge variant="warning">
                          Need {event.additionalStaffNeeded} more
                        </Badge>
                      ) : (
                        <Badge variant="purple">Pending Approval</Badge>
                      )}
                      {event.is_playoff && (
                        <Badge variant="error">Playoff</Badge>
                      )}
                      {event.is_ppv && (
                        <Badge variant="purple">PPV</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <button
            onClick={() => router.push("/dashboard/schedule")}
            className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <svg className="h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              View Schedule
            </span>
          </button>
          <button
            onClick={() => router.push("/dashboard/staff")}
            className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              Browse Staff
            </span>
          </button>
          <button
            onClick={() => router.push("/dashboard/approvals")}
            className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <svg className="h-5 w-5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              Approvals
              {stats.pendingApprovals > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs text-white">
                  {stats.pendingApprovals}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => router.push("/dashboard/staff?filter=available")}
            className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">
              Available Now
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
