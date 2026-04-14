"use client";

import { useState, useMemo } from "react";
import { useOrgCompliance } from "@/hooks/use-compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCertType } from "@/lib/compliance/certifications";
import { Tabs } from "@/components/ui/tabs";

function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const color =
    score >= 90
      ? "text-green-600"
      : score >= 70
        ? "text-amber-500"
        : "text-red-600";
  const bgColor =
    score >= 90
      ? "bg-green-50 border-green-200"
      : score >= 70
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  if (size === "sm") {
    return (
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${bgColor}`}
      >
        <span className={`text-lg font-bold ${color}`}>{score}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${bgColor}`}
    >
      <div className="text-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "error" | "warning" }) {
  if (severity === "error") {
    return (
      <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

export default function CompliancePage() {
  const [weekStart] = useState<string>(getMonday());
  const [activeTab, setActiveTab] = useState("overview");

  const {
    locationResults,
    certAlerts,
    orgScore,
    errors,
    warnings,
  } = useOrgCompliance(weekStart);

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "violations", label: "Violations", count: errors.length + warnings.length },
      { id: "certifications", label: "Certifications", count: certAlerts.length },
    ],
    [errors.length, warnings.length, certAlerts.length]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ontario ESA compliance status for the current week
          </p>
        </div>
      </div>

      {/* Org-wide score */}
      <Card>
        <CardContent className="flex items-center gap-6 py-6">
          <ScoreCircle score={orgScore} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Organization Compliance Score
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {errors.length === 0
                ? "No blocking violations found. Schedule can be published."
                : `${errors.length} blocking violation${errors.length !== 1 ? "s" : ""} must be resolved before publishing.`}
            </p>
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">
                  {errors.length} error{errors.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-gray-600">
                  {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Per-Location Scores
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locationResults.map((lr) => {
              const locErrors = lr.result.violations.filter(
                (v) => v.severity === "error"
              );
              const locWarnings = lr.result.violations.filter(
                (v) => v.severity === "warning"
              );
              return (
                <Card key={lr.locationId}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <ScoreCircle score={lr.result.score} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lr.locationName.replace("Wingporium ", "")}
                      </p>
                      <div className="mt-1 flex gap-3 text-xs text-gray-500">
                        {locErrors.length > 0 && (
                          <span className="text-red-600">
                            {locErrors.length} error{locErrors.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {locWarnings.length > 0 && (
                          <span className="text-amber-600">
                            {locWarnings.length} warning{locWarnings.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {locErrors.length === 0 && locWarnings.length === 0 && (
                          <span className="text-green-600">All clear</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick cert alerts */}
          {certAlerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Certification Alerts
              </h3>
              <Card>
                <CardContent className="divide-y divide-gray-100 p-0">
                  {certAlerts.slice(0, 5).map((alert, i) => (
                    <div
                      key={`${alert.employee_id}-${alert.cert_type}-${i}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <CertStatusIcon status={alert.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.employee_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCertType(alert.cert_type)} &mdash;{" "}
                          {alert.status === "missing"
                            ? "Not on file"
                            : alert.status === "expired"
                              ? "Expired"
                              : `Expires in ${alert.days_until_expiry} days`}
                        </p>
                      </div>
                      <CertBadge status={alert.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
              {certAlerts.length > 5 && (
                <button
                  onClick={() => setActiveTab("certifications")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all {certAlerts.length} alerts
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Violations tab */}
      {activeTab === "violations" && (
        <div className="space-y-4">
          {errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                Errors &mdash; Must Resolve
              </h3>
              <div className="space-y-2">
                {errors.map((v, i) => (
                  <ViolationCard key={`err-${i}`} violation={v} />
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
                Warnings
              </h3>
              <div className="space-y-2">
                {warnings.map((v, i) => (
                  <ViolationCard key={`warn-${i}`} violation={v} />
                ))}
              </div>
            </div>
          )}

          {errors.length === 0 && warnings.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium">No violations</p>
              <p className="text-xs text-gray-400">
                All schedules are compliant with Ontario ESA.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Certifications tab */}
      {activeTab === "certifications" && (
        <div className="space-y-4">
          {certAlerts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium">All certifications valid</p>
              <p className="text-xs text-gray-400">
                No expired or expiring certifications found.
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Certification
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Expiry
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {certAlerts.map((alert, i) => (
                        <tr
                          key={`${alert.employee_id}-${alert.cert_type}-${i}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {alert.employee_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCertType(alert.cert_type)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {alert.expires_at
                              ? new Date(alert.expires_at).toLocaleDateString(
                                  "en-CA"
                                )
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <CertBadge status={alert.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function ViolationCard({
  violation,
}: {
  violation: import("@/lib/compliance/validator").ComplianceViolation;
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 py-3">
        <SeverityIcon severity={violation.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {violation.message}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{violation.details}</p>
          <p className="mt-1 text-xs font-mono text-gray-400">
            {violation.rule_reference}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CertStatusIcon({
  status,
}: {
  status: "expired" | "expiring_soon" | "missing";
}) {
  if (status === "expired" || status === "missing") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
        <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    </div>
  );
}

function CertBadge({
  status,
}: {
  status: "expired" | "expiring_soon" | "missing";
}) {
  if (status === "expired") return <Badge variant="error">Expired</Badge>;
  if (status === "missing") return <Badge variant="error">Missing</Badge>;
  return <Badge variant="warning">Expiring Soon</Badge>;
}
