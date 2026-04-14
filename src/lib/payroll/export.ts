/**
 * Payroll CSV export utilities.
 */

import type { Database } from "@/types/database";

type PayStub = Database["public"]["Tables"]["pay_stubs"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

const CSV_HEADERS = [
  "Employee Name",
  "Employee ID",
  "Location",
  "Regular Hours",
  "OT Hours",
  "Regular Rate",
  "OT Rate",
  "Regular Pay",
  "OT Pay",
  "Gross Pay",
];

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a payroll-ready CSV string from pay stubs.
 */
export function generatePayrollCSV(
  payStubs: PayStub[],
  employees: Employee[],
  locations: Location[],
): string {
  const rows: string[] = [CSV_HEADERS.join(",")];

  for (const stub of payStubs) {
    const emp = employees.find((e) => e.id === stub.employee_id);
    const loc = locations.find((l) => l.id === emp?.primary_location_id);

    const name = emp
      ? `${emp.first_name} ${emp.last_name}`
      : "Unknown Employee";
    const locationName = loc?.name ?? "Unknown";

    const row = [
      escapeCSV(name),
      stub.employee_id.slice(0, 8),
      escapeCSV(locationName),
      stub.regular_hours.toFixed(2),
      stub.overtime_hours.toFixed(2),
      (stub.regular_rate ?? 0).toFixed(2),
      stub.overtime_rate.toFixed(2),
      stub.regular_pay.toFixed(2),
      stub.overtime_pay.toFixed(2),
      stub.gross_pay.toFixed(2),
    ];

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * Trigger a browser download of a CSV string.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
