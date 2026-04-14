// Certification tracking for Ontario restaurant roles
// Checks Smart Serve, Food Handler, etc. against role requirements

import type { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Role = Database["public"]["Tables"]["roles"]["Row"];

export interface Certification {
  id: string;
  employee_id: string;
  cert_type: string;
  cert_number: string | null;
  issued_at: string;
  expires_at: string;
  is_verified: boolean;
  created_at: string;
}

export interface CertCheckResult {
  valid: boolean;
  missing: string[];
  expiring: string[]; // within 30 days
  expired: string[];
}

export interface CertAlert {
  employee_id: string;
  employee_name: string;
  cert_type: string;
  expires_at: string;
  status: "expired" | "expiring_soon" | "missing";
  days_until_expiry: number | null; // null if missing
}

/**
 * Check if an employee has valid certifications for a given role.
 */
export function hasValidCerts(
  employee: Employee,
  role: Role,
  certs: Certification[],
  referenceDate: Date = new Date()
): CertCheckResult {
  const requiredCerts: string[] = [];
  if (role.requires_smart_serve) requiredCerts.push("smart_serve");
  if (role.requires_food_handler) requiredCerts.push("food_handler");

  if (requiredCerts.length === 0) {
    return { valid: true, missing: [], expiring: [], expired: [] };
  }

  const employeeCerts = certs.filter((c) => c.employee_id === employee.id);

  const missing: string[] = [];
  const expiring: string[] = [];
  const expired: string[] = [];

  const thirtyDaysFromNow = new Date(referenceDate);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  for (const reqCert of requiredCerts) {
    const cert = employeeCerts.find((c) => c.cert_type === reqCert);

    if (!cert) {
      missing.push(reqCert);
      continue;
    }

    const expiryDate = new Date(cert.expires_at);

    if (expiryDate < referenceDate) {
      expired.push(reqCert);
    } else if (expiryDate < thirtyDaysFromNow) {
      expiring.push(reqCert);
    }
  }

  return {
    valid: missing.length === 0 && expired.length === 0,
    missing,
    expiring,
    expired,
  };
}

/**
 * Get all certification alerts across all employees.
 * Returns alerts for expired, expiring (30 days), and missing certs.
 */
export function getCertAlerts(
  employees: Employee[],
  roles: Role[],
  employeeRoles: Array<{ employee_id: string; role_id: string }>,
  certs: Certification[],
  referenceDate: Date = new Date()
): CertAlert[] {
  const alerts: CertAlert[] = [];
  const ninetyDaysFromNow = new Date(referenceDate);
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  for (const employee of employees) {
    if (!employee.is_active) continue;

    const empName = `${employee.first_name} ${employee.last_name}`;
    const empRoleIds = employeeRoles
      .filter((er) => er.employee_id === employee.id)
      .map((er) => er.role_id);
    const empRoles = roles.filter((r) => empRoleIds.includes(r.id));

    // Collect all required cert types for this employee
    const requiredCerts = new Set<string>();
    for (const role of empRoles) {
      if (role.requires_smart_serve) requiredCerts.add("smart_serve");
      if (role.requires_food_handler) requiredCerts.add("food_handler");
    }

    const employeeCerts = certs.filter((c) => c.employee_id === employee.id);

    for (const reqCert of requiredCerts) {
      const cert = employeeCerts.find((c) => c.cert_type === reqCert);

      if (!cert) {
        alerts.push({
          employee_id: employee.id,
          employee_name: empName,
          cert_type: reqCert,
          expires_at: "",
          status: "missing",
          days_until_expiry: null,
        });
        continue;
      }

      const expiryDate = new Date(cert.expires_at);
      const daysUntil = Math.floor(
        (expiryDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (expiryDate < referenceDate) {
        alerts.push({
          employee_id: employee.id,
          employee_name: empName,
          cert_type: reqCert,
          expires_at: cert.expires_at,
          status: "expired",
          days_until_expiry: daysUntil,
        });
      } else if (expiryDate < ninetyDaysFromNow) {
        alerts.push({
          employee_id: employee.id,
          employee_name: empName,
          cert_type: reqCert,
          expires_at: cert.expires_at,
          status: "expiring_soon",
          days_until_expiry: daysUntil,
        });
      }
    }
  }

  // Sort: expired first, then expiring soonest first, then missing
  return alerts.sort((a, b) => {
    const statusOrder = { expired: 0, missing: 1, expiring_soon: 2 };
    const aDiff = statusOrder[a.status] - statusOrder[b.status];
    if (aDiff !== 0) return aDiff;
    if (a.days_until_expiry !== null && b.days_until_expiry !== null) {
      return a.days_until_expiry - b.days_until_expiry;
    }
    return 0;
  });
}

/**
 * Format cert type for display.
 */
export function formatCertType(certType: string): string {
  const labels: Record<string, string> = {
    smart_serve: "Smart Serve",
    food_handler: "Food Handler",
    whmis: "WHMIS",
    first_aid: "First Aid",
  };
  return labels[certType] ?? certType;
}
