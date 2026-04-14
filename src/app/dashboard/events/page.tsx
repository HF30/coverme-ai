"use client";

import { useState, useMemo } from "react";
import { useEvents, type EventWithSuggestions } from "@/hooks/use-events";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CardSkeleton } from "@/components/ui/skeleton";

const EVENT_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  nhl: { icon: "\u{1F3D2}", color: "blue", label: "Hockey" },
  nba: { icon: "\u{1F3C0}", color: "orange", label: "Basketball" },
  nfl: { icon: "\u{1F3C8}", color: "green", label: "Football" },
  mlb: { icon: "\u{26BE}", color: "red", label: "Baseball" },
  ufc: { icon: "\u{1F94A}", color: "red", label: "UFC" },
  concert: { icon: "\u{1F3B5}", color: "purple", label: "Concert" },
  custom: { icon: "\u{1F4C5}", color: "gray", label: "Event" },
};

function DemandBadge({ multiplier }: { multiplier: number }) {
  let variant: "info" | "warning" | "error" = "info";
  if (multiplier >= 1.5) variant = "error";
  else if (multiplier >= 1.2) variant = "warning";

  return <Badge variant={variant}>{multiplier}x demand</Badge>;
}

function StaffingStatusBadge({
  status,
  count,
}: {
  status: EventWithSuggestions["staffingStatus"];
  count: number;
}) {
  switch (status) {
    case "fully_staffed":
      return <Badge variant="success">Fully Staffed</Badge>;
    case "needs_staff":
      return (
        <Badge variant="warning">
          Need {count} more
        </Badge>
      );
    case "pending_approval":
      return <Badge variant="purple">Pending Approval</Badge>;
  }
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });
}

function daysFromNow(dateStr: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

export default function EventsPage() {
  const {
    upcomingEvents,
    pastEvents,
    eventActuals,
    suggestions,
    approveSuggestion,
    adjustSuggestion,
    dismissSuggestion,
    pendingSuggestionsCount,
    locations,
    roles,
    loading,
  } = useEvents();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedEvent, setSelectedEvent] =
    useState<EventWithSuggestions | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState("");

  const tabs = useMemo(
    () => [
      {
        id: "upcoming",
        label: "Upcoming",
        count: upcomingEvents.length,
      },
      {
        id: "suggestions",
        label: "Suggestions",
        count: pendingSuggestionsCount > 0 ? pendingSuggestionsCount : undefined,
      },
      { id: "history", label: "History" },
    ],
    [upcomingEvents.length, pendingSuggestionsCount]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-20 sm:pb-6">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  function getRoleName(roleId: string): string {
    return roles.find((r) => r.id === roleId)?.name ?? "Unknown";
  }

  function getLocationName(locationId: string): string {
    return (
      locations.find((l) => l.id === locationId)?.name.replace("Wingporium ", "") ??
      "Unknown"
    );
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-20 sm:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sports and entertainment events affecting staffing
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Upcoming Events Tab */}
      {activeTab === "upcoming" && (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <EmptyState
              message="No upcoming events"
              detail="Events will appear here when synced from sports APIs or added manually."
            />
          ) : (
            upcomingEvents.map((event) => {
              const config = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.custom;
              return (
                <Card
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="hover:border-blue-200"
                >
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {event.name}
                          </span>
                          {event.is_playoff && (
                            <Badge variant="error">Playoff</Badge>
                          )}
                          {event.is_ppv && (
                            <Badge variant="purple">PPV</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatEventDate(event.event_date)}</span>
                          {event.start_time && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span>{formatEventTime(event.start_time)}</span>
                            </>
                          )}
                          {event.venue && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span>{event.venue}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <DemandBadge multiplier={event.demand_multiplier} />
                        <StaffingStatusBadge
                          status={event.staffingStatus}
                          count={event.additionalStaffNeeded}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-600">
                        {daysFromNow(event.event_date)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {event.affects_locations
                          ? `${event.affects_locations.length} locations`
                          : "All locations"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Staffing Suggestions Tab */}
      {activeTab === "suggestions" && (
        <div className="space-y-3">
          {pendingSuggestions.length === 0 ? (
            <EmptyState
              message="No pending suggestions"
              detail="All staffing suggestions have been reviewed."
            />
          ) : (
            pendingSuggestions.map((suggestion) => {
              const event = upcomingEvents.find(
                (e) => e.id === suggestion.event_id
              );
              const config = event
                ? EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.custom
                : EVENT_CONFIG.custom;
              const isAdjusting = adjustingId === suggestion.id;

              return (
                <Card key={suggestion.id}>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm">
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {event?.name ?? "Unknown Event"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatEventDate(suggestion.suggested_date)} &middot;{" "}
                          {getLocationName(suggestion.location_id)}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <Badge variant="outline">
                            {getRoleName(suggestion.role_id)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Current:{" "}
                            <span className="font-medium text-gray-700">
                              {suggestion.current_headcount}
                            </span>
                          </span>
                          <svg
                            className="h-3 w-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                            />
                          </svg>
                          <span className="text-xs text-gray-500">
                            Suggested:{" "}
                            <span className="font-semibold text-blue-600">
                              {suggestion.suggested_headcount}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdjusting ? (
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs text-gray-500">
                          Custom headcount:
                        </label>
                        <input
                          type="number"
                          min={suggestion.current_headcount}
                          value={adjustValue}
                          onChange={(e) => setAdjustValue(e.target.value)}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const val = parseInt(adjustValue, 10);
                            if (val && val > 0) {
                              adjustSuggestion(suggestion.id, val);
                            }
                            setAdjustingId(null);
                            setAdjustValue("");
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdjustingId(null);
                            setAdjustValue("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          fullWidth
                          onClick={() =>
                            approveSuggestion(suggestion.id)
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setAdjustingId(suggestion.id);
                            setAdjustValue(
                              String(suggestion.suggested_headcount)
                            );
                          }}
                        >
                          Adjust
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={() =>
                            dismissSuggestion(suggestion.id)
                          }
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {pastEvents.length === 0 ? (
            <EmptyState
              message="No event history"
              detail="Past events and their performance data will appear here."
            />
          ) : (
            pastEvents.map((event) => {
              const config =
                EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.custom;
              const actuals = eventActuals.filter(
                (a) => a.event_id === event.id
              );
              const totalCovers = actuals.reduce(
                (sum, a) => sum + (a.actual_covers ?? 0),
                0
              );
              const totalNormal = actuals.reduce(
                (sum, a) => sum + (a.normal_covers_estimate ?? 0),
                0
              );
              const totalRevenue = actuals.reduce(
                (sum, a) => sum + (a.actual_revenue ?? 0),
                0
              );

              return (
                <Card key={event.id}>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {event.name}
                          </span>
                          {event.is_playoff && (
                            <Badge variant="error">Playoff</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatEventDate(event.event_date)}
                          {event.venue ? ` \u00B7 ${event.venue}` : ""}
                        </p>
                      </div>
                      <DemandBadge multiplier={event.demand_multiplier} />
                    </div>

                    {actuals.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            Actual Covers
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {totalCovers}
                          </p>
                          {totalNormal > 0 && (
                            <p className="text-xs text-emerald-600">
                              +
                              {Math.round(
                                ((totalCovers - totalNormal) / totalNormal) *
                                  100
                              )}
                              % vs normal
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Revenue</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ${totalRevenue.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Locations</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {actuals.length}
                          </p>
                        </div>
                      </div>
                    )}

                    {actuals.length === 0 && (
                      <p className="mt-2 text-xs text-gray-400">
                        No performance data recorded yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Event Detail Sheet */}
      <Sheet
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Event Details"
      >
        {selectedEvent && (
          <EventDetailSheet
            event={selectedEvent}
            getLocationName={getLocationName}
            getRoleName={getRoleName}
            approveSuggestion={approveSuggestion}
            dismissSuggestion={dismissSuggestion}
          />
        )}
      </Sheet>
    </div>
  );
}

function EmptyState({
  message,
  detail,
}: {
  message: string;
  detail: string;
}) {
  return (
    <div className="py-12 text-center text-gray-500">
      <svg
        className="mx-auto h-12 w-12 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
        />
      </svg>
      <p className="mt-3 text-sm font-medium">{message}</p>
      <p className="text-xs text-gray-400">{detail}</p>
    </div>
  );
}

function EventDetailSheet({
  event,
  getLocationName,
  getRoleName,
  approveSuggestion,
  dismissSuggestion,
}: {
  event: EventWithSuggestions;
  getLocationName: (id: string) => string;
  getRoleName: (id: string) => string;
  approveSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
}) {
  const config = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.custom;

  // Group suggestions by location
  const byLocation = event.suggestions.reduce<
    Record<string, typeof event.suggestions>
  >((acc, s) => {
    const key = s.location_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Event info */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl">
          {config.icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{event.name}</h3>
          <p className="text-sm text-gray-500">
            {formatEventDate(event.event_date)}
            {event.start_time
              ? ` at ${formatEventTime(event.start_time)}`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{config.label}</Badge>
        <DemandBadge multiplier={event.demand_multiplier} />
        {event.is_playoff && <Badge variant="error">Playoff</Badge>}
        {event.is_ppv && <Badge variant="purple">PPV</Badge>}
        <StaffingStatusBadge
          status={event.staffingStatus}
          count={event.additionalStaffNeeded}
        />
      </div>

      {event.venue && (
        <div>
          <p className="text-xs text-gray-500">Venue</p>
          <p className="text-sm text-gray-900">{event.venue}</p>
        </div>
      )}

      {/* Staffing breakdown by location */}
      {Object.keys(byLocation).length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">
            Staffing Suggestions
          </p>
          <div className="space-y-3">
            {Object.entries(byLocation).map(([locId, locSuggestions]) => (
              <div
                key={locId}
                className="rounded-lg border border-gray-200 p-3"
              >
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {getLocationName(locId)}
                </p>
                <div className="space-y-2">
                  {locSuggestions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getRoleName(s.role_id)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {s.current_headcount} &rarr;{" "}
                          <span className="font-semibold text-blue-600">
                            {s.approved_headcount ?? s.suggested_headcount}
                          </span>
                        </span>
                      </div>
                      {s.status === "pending" ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => approveSuggestion(s.id)}
                            className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => dismissSuggestion(s.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <Badge
                          variant={
                            s.status === "approved" || s.status === "adjusted"
                              ? "success"
                              : "default"
                          }
                        >
                          {s.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {event.suggestions.length === 0 && (
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-sm text-emerald-700">
            No additional staffing needed for this event based on current
            multiplier ({event.demand_multiplier}x).
          </p>
        </div>
      )}
    </div>
  );
}
