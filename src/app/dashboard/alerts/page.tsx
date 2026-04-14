"use client";

import { useState } from "react";
import { useAlerts, type Alert, type AlertSeverity, type AlertType } from "@/hooks/use-alerts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { MOCK_LOCATIONS } from "@/lib/mock-data";

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const TYPE_LABELS: Record<AlertType, string> = {
  coverage_gap: "Coverage Gap",
  no_show: "No-Show",
  labor_over: "Labor Over",
  cert_expiring: "Cert Expiring",
  cert_expired: "Cert Expired",
  schedule_late: "Schedule Late",
  callout_unfilled: "Callout Unfilled",
  compliance_violation: "Compliance",
  consecutive_days: "Consecutive Days",
};

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; variant: "error" | "warning" | "info"; bg: string; border: string; icon: string }> = {
  critical: {
    label: "Critical",
    variant: "error",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
  },
  warning: {
    label: "Warning",
    variant: "warning",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-500",
  },
  info: {
    label: "Info",
    variant: "info",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
  },
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AlertIcon({ severity }: { severity: AlertSeverity }) {
  const color = SEVERITY_CONFIG[severity].icon;
  if (severity === "critical") {
    return (
      <svg className={`h-5 w-5 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }
  if (severity === "warning") {
    return (
      <svg className={`h-5 w-5 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className={`h-5 w-5 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function AlertCard({
  alert,
  expanded,
  onToggle,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  expanded: boolean;
  onToggle: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string, note: string) => void;
}) {
  const [resolveNote, setResolveNote] = useState("");
  const config = SEVERITY_CONFIG[alert.severity];
  const isResolved = alert.status === "resolved" || alert.status === "auto_resolved";

  return (
    <Card
      className={`${isResolved ? "opacity-60" : ""} ${!isResolved ? config.border : ""}`}
      onClick={onToggle}
    >
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertIcon severity={alert.severity} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {alert.title}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-xs text-gray-400">
                  {timeAgo(alert.created_at)}
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {alert.location_name && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {alert.location_name}
                </span>
              )}
              <Badge variant="outline">
                {TYPE_LABELS[alert.type] ?? alert.type}
              </Badge>
              {alert.escalation_level > 0 && (
                <Badge variant="purple">
                  Escalation L{alert.escalation_level}
                </Badge>
              )}
              {isResolved && (
                <Badge variant="success">
                  {alert.status === "auto_resolved" ? "Auto-Resolved" : "Resolved"}
                </Badge>
              )}
              {alert.status === "acknowledged" && (
                <Badge variant="info">Acknowledged</Badge>
              )}
            </div>

            {/* Expanded details */}
            {expanded && (
              <div
                className="mt-3 border-t border-gray-100 pt-3 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {alert.related_employee_name && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Employee:</span>{" "}
                    {alert.related_employee_name}
                  </div>
                )}

                {alert.notified_via.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Notified via:</span>{" "}
                    {alert.notified_via.join(", ")}
                  </div>
                )}

                {alert.resolution_note && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Resolution:</span>{" "}
                    {alert.resolution_note}
                  </div>
                )}

                {!isResolved && (
                  <div className="flex flex-col gap-2">
                    {alert.status === "active" && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
                      >
                        Acknowledge
                      </button>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        placeholder="Resolution note..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          onResolve(alert.id, resolveNote || "Manually resolved");
                          setResolveNote("");
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const { alerts, activeCount, criticalCount, acknowledge, resolve } =
    useAlerts();

  // Filter by tab
  const tabFiltered = alerts.filter((a) => {
    if (activeTab === "active")
      return a.status === "active" || a.status === "acknowledged";
    if (activeTab === "resolved")
      return a.status === "resolved" || a.status === "auto_resolved";
    return true; // 'all'
  });

  // Apply dropdown filters
  const filtered = tabFiltered.filter((a) => {
    if (locationFilter && a.location_id !== locationFilter) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    if (severityFilter && a.severity !== severityFilter) return false;
    return true;
  });

  // Sort: critical first, then by time
  const sorted = [...filtered].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const resolvedCount = alerts.filter(
    (a) => a.status === "resolved" || a.status === "auto_resolved"
  ).length;

  const tabs = [
    { id: "active", label: "Active", count: activeCount },
    { id: "resolved", label: "Resolved", count: resolvedCount },
    { id: "all", label: "All", count: alerts.length },
  ];

  // Unique types/locations in current alerts for filters
  const alertTypes = [...new Set(alerts.map((a) => a.type))];
  const alertLocationIds = [
    ...new Set(alerts.map((a) => a.location_id).filter(Boolean)),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="mt-1 text-sm text-gray-500">
            {criticalCount > 0
              ? `${criticalCount} critical alert${criticalCount > 1 ? "s" : ""} need attention`
              : "All clear -- no critical alerts"}
          </p>
        </div>
        {criticalCount > 0 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <span className="text-sm font-bold text-red-600">
              {criticalCount}
            </span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Critical
            </p>
            <p className={`mt-1 text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {criticalCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Warnings
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {alerts.filter((a) => a.severity === "warning" && (a.status === "active" || a.status === "acknowledged")).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-medium text-gray-500 uppercase">
              Info
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {alerts.filter((a) => a.severity === "info" && (a.status === "active" || a.status === "acknowledged")).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Locations</option>
          {alertLocationIds.map((locId) => {
            const loc = MOCK_LOCATIONS.find((l) => l.id === locId);
            return (
              <option key={locId} value={locId ?? ""}>
                {loc?.name.replace("Wingporium ", "") ?? locId}
              </option>
            );
          })}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {alertTypes.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Alert list */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No alerts to show</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              expanded={expandedId === alert.id}
              onToggle={() =>
                setExpandedId(expandedId === alert.id ? null : alert.id)
              }
              onAcknowledge={acknowledge}
              onResolve={resolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
