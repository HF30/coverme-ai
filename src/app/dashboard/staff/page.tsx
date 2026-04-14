"use client";

import { useState, useMemo } from "react";
import { useStaff, type EmployeeWithDetails } from "@/hooks/use-staff";
import { useLocations } from "@/hooks/use-locations";
import { MOCK_ROLES } from "@/lib/mock-data";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge, Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function StaffPageInner() {
  const searchParams = useSearchParams();
  const initialAvailable = searchParams.get("filter") === "available";

  const [activeTab, setActiveTab] = useState(
    initialAvailable ? "available" : "all"
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithDetails | null>(null);

  const { locations } = useLocations();
  const { staff, loading } = useStaff({
    locationId: selectedLocation || null,
    roleId: selectedRole || null,
    availableNow: activeTab === "available",
    searchQuery: searchQuery || undefined,
  });

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name.replace("Wingporium ", ""),
  }));

  const roleOptions = MOCK_ROLES.map((r) => ({
    value: r.id,
    label: r.name,
  }));

  const tabs = useMemo(
    () => [
      { id: "all", label: "All Staff", count: staff.length },
      { id: "available", label: "Available Now" },
      { id: "floaters", label: "Can Float" },
    ],
    [staff.length]
  );

  const filteredStaff = useMemo(() => {
    if (activeTab === "floaters") {
      return staff.filter((e) => e.can_float);
    }
    return staff;
  }, [staff, activeTab]);

  function reliabilityColor(score: number): string {
    if (score >= 90) return "text-emerald-600";
    if (score >= 80) return "text-amber-600";
    return "text-red-600";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-20 sm:pb-6">
      <h1 className="text-2xl font-bold text-gray-900">Staff</h1>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Select
          options={locationOptions}
          value={selectedLocation}
          onChange={setSelectedLocation}
          placeholder="All Locations"
          className="sm:w-40"
        />
        <Select
          options={roleOptions}
          value={selectedRole}
          onChange={setSelectedRole}
          placeholder="All Roles"
          className="sm:w-36"
        />
      </div>

      {/* Staff list */}
      {loading ? (
        <ListSkeleton rows={8} />
      ) : filteredStaff.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="mt-3 text-sm font-medium">No staff found</p>
          <p className="text-xs text-gray-400">
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStaff.map((employee) => {
            const loc = locations.find(
              (l) => l.id === employee.primary_location_id
            );

            return (
              <Card
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className="hover:border-blue-200"
              >
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={employee.first_name}
                      lastName={employee.last_name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {employee.first_name} {employee.last_name}
                        </span>
                        {employee.can_float && (
                          <Badge variant="purple">Float</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {loc?.name.replace("Wingporium ", "") ?? "Unknown"} --{" "}
                        {employee.hoursThisWeek}h this week
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-sm font-bold ${reliabilityColor(employee.reliability_score)}`}
                      >
                        {employee.reliability_score}%
                      </span>
                      <div className="flex gap-1">
                        {employee.roles.slice(0, 2).map((role) => (
                          <RoleBadge key={role} role={role} />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Employee detail sheet */}
      <Sheet
        open={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title={
          selectedEmployee
            ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
            : undefined
        }
      >
        {selectedEmployee && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                firstName={selectedEmployee.first_name}
                lastName={selectedEmployee.last_name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {locations.find(
                    (l) => l.id === selectedEmployee.primary_location_id
                  )?.name ?? "Unknown"}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedEmployee.reliability_score}%
                </p>
                <p className="text-xs text-gray-500">Reliability</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedEmployee.hoursThisWeek}
                </p>
                <p className="text-xs text-gray-500">Hours/wk</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  ${selectedEmployee.hourly_rate.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">Hourly</p>
              </div>
            </div>

            {/* Roles */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">Roles</p>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee.roles.map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
                {selectedEmployee.roles.length === 0 && (
                  <span className="text-sm text-gray-400">No roles assigned</span>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">
                Certifications
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee.certifications.map((cert) => (
                  <Badge key={cert} variant="success">
                    {cert === "smart_serve"
                      ? "Smart Serve"
                      : cert === "food_handler"
                        ? "Food Handler"
                        : cert}
                  </Badge>
                ))}
                {selectedEmployee.certifications.length === 0 && (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">Contact</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-900">{selectedEmployee.phone}</p>
                {selectedEmployee.email && (
                  <p className="text-gray-600">{selectedEmployee.email}</p>
                )}
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              {selectedEmployee.can_float && (
                <Badge variant="purple">Can Float Between Locations</Badge>
              )}
              <Badge variant="outline">
                Max {selectedEmployee.max_hours_per_week}h/week
              </Badge>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <StaffPageInner />
    </Suspense>
  );
}
