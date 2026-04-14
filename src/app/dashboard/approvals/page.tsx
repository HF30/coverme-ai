"use client";

import { useState, useMemo } from "react";
import { MOCK_APPROVALS, MOCK_EMPLOYEES } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";

interface Approval {
  id: string;
  type: "shift_swap" | "time_off" | "schedule_change";
  status: "pending" | "approved" | "denied";
  requested_at: string;
  from_employee_id: string;
  to_employee_id: string | null;
  shift_id: string | null;
  notes: string;
}

function getEmployee(id: string) {
  return MOCK_EMPLOYEES.find((e) => e.id === id);
}

function typeLabel(type: Approval["type"]): string {
  switch (type) {
    case "shift_swap":
      return "Shift Swap";
    case "time_off":
      return "Time Off";
    case "schedule_change":
      return "Schedule Change";
    default:
      return type;
  }
}

function typeBadgeVariant(
  type: Approval["type"]
): "info" | "purple" | "warning" {
  switch (type) {
    case "shift_swap":
      return "info";
    case "time_off":
      return "purple";
    case "schedule_change":
      return "warning";
    default:
      return "info";
  }
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null
  );
  const [approvals, setApprovals] = useState<Approval[]>(MOCK_APPROVALS);

  const tabs = useMemo(() => {
    const pending = approvals.filter((a) => a.status === "pending").length;
    return [
      { id: "pending", label: "Pending", count: pending },
      { id: "history", label: "History" },
    ];
  }, [approvals]);

  const filteredApprovals = useMemo(
    () =>
      activeTab === "pending"
        ? approvals.filter((a) => a.status === "pending")
        : approvals.filter((a) => a.status !== "pending"),
    [approvals, activeTab]
  );

  function handleApprove(id: string) {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
    setSelectedApproval(null);
  }

  function handleDeny(id: string) {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "denied" as const } : a))
    );
    setSelectedApproval(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-20 sm:pb-6">
      <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {filteredApprovals.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm font-medium">
            {activeTab === "pending"
              ? "No pending approvals"
              : "No approval history"}
          </p>
          <p className="text-xs text-gray-400">
            {activeTab === "pending"
              ? "All caught up!"
              : "Past approvals will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredApprovals.map((approval) => {
            const fromEmp = getEmployee(approval.from_employee_id);
            const toEmp = approval.to_employee_id
              ? getEmployee(approval.to_employee_id)
              : null;

            return (
              <Card
                key={approval.id}
                onClick={() => setSelectedApproval(approval)}
                className="hover:border-blue-200"
              >
                <CardContent>
                  <div className="flex items-start gap-3">
                    {fromEmp && (
                      <Avatar
                        firstName={fromEmp.first_name}
                        lastName={fromEmp.last_name}
                        size="sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {fromEmp
                            ? `${fromEmp.first_name} ${fromEmp.last_name}`
                            : "Unknown"}
                        </span>
                        <Badge variant={typeBadgeVariant(approval.type)}>
                          {typeLabel(approval.type)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                        {approval.notes}
                      </p>
                      {toEmp && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          Swap with {toEmp.first_name} {toEmp.last_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={approval.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(approval.requested_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Quick approve/deny for pending items */}
                  {approval.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(approval.id);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeny(approval.id);
                        }}
                      >
                        Deny
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approval detail sheet */}
      <Sheet
        open={!!selectedApproval}
        onClose={() => setSelectedApproval(null)}
        title="Request Details"
      >
        {selectedApproval && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={typeBadgeVariant(selectedApproval.type)}>
                {typeLabel(selectedApproval.type)}
              </Badge>
              <StatusBadge status={selectedApproval.status} />
            </div>

            <div>
              <p className="text-sm text-gray-500">Requested By</p>
              <div className="mt-1 flex items-center gap-2">
                {(() => {
                  const emp = getEmployee(selectedApproval.from_employee_id);
                  return emp ? (
                    <>
                      <Avatar
                        firstName={emp.first_name}
                        lastName={emp.last_name}
                        size="sm"
                      />
                      <span className="font-medium text-gray-900">
                        {emp.first_name} {emp.last_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500">Unknown</span>
                  );
                })()}
              </div>
            </div>

            {selectedApproval.to_employee_id && (
              <div>
                <p className="text-sm text-gray-500">Swap With</p>
                <div className="mt-1 flex items-center gap-2">
                  {(() => {
                    const emp = getEmployee(selectedApproval.to_employee_id!);
                    return emp ? (
                      <>
                        <Avatar
                          firstName={emp.first_name}
                          lastName={emp.last_name}
                          size="sm"
                        />
                        <span className="font-medium text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Unknown</span>
                    );
                  })()}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">Details</p>
              <p className="mt-1 text-sm text-gray-900">
                {selectedApproval.notes}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Requested</p>
              <p className="text-sm text-gray-900">
                {new Date(selectedApproval.requested_at).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )}
              </p>
            </div>

            {selectedApproval.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <Button
                  fullWidth
                  onClick={() => handleApprove(selectedApproval.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => handleDeny(selectedApproval.id)}
                >
                  Deny
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
