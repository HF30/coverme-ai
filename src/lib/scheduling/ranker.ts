/**
 * Replacement Ranking Algorithm
 *
 * Given a shift that needs filling, ranks ALL eligible employees across
 * ALL locations in the organization by qualification, reliability,
 * availability, proximity, and hours balance.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getHoursThisWeek, shiftDurationHours, wouldExceedOT } from './overtime';

// ── Types ────────────────────────────────────────────────────────────

export interface CandidateScore {
  employee_id: string;
  employee_name: string;
  phone: string;
  score: number; // 0-100, higher = better
  factors: {
    available: boolean;
    qualified: boolean;
    certified: boolean;
    ot_safe: boolean;
    reliability: number;    // 0-100
    proximity: number;      // 0-100
    hours_this_week: number;
    is_home_location: boolean;
    can_float: boolean;
  };
  disqualified: boolean;
  disqualify_reason?: string;
}

interface ShiftToFill {
  id: string;
  organization_id: string;
  location_id: string;
  role_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  primary_location_id: string;
  can_float: boolean;
  max_hours_per_week: number;
  reliability_score: number;
  is_active: boolean;
}

interface LocationRow {
  id: string;
  lat: number | null;
  lng: number | null;
}

// ── Scoring weights ──────────────────────────────────────────────────

const WEIGHTS = {
  reliability: 0.30,
  home_location: 0.20,
  hours_balance: 0.20,
  proximity: 0.15,
  response_rate: 0.15,
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Haversine distance between two lat/lng points in km.
 */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert distance in km to a 0-100 proximity score.
 * 0 km = 100, 50+ km = 0 (linear decay).
 */
function proximityScore(distKm: number): number {
  return Math.max(0, 100 - distKm * 2);
}

/**
 * Convert hours worked to a 0-100 "hours balance" score.
 * Fewer hours = higher score. 0h = 100, maxHours = 0.
 */
function hoursBalanceScore(hoursThisWeek: number, maxHours: number): number {
  if (maxHours <= 0) return 50;
  return Math.max(0, 100 * (1 - hoursThisWeek / maxHours));
}

// ── Main Ranker ──────────────────────────────────────────────────────

export async function rankCandidates(
  supabase: SupabaseClient,
  shiftToFill: ShiftToFill,
  excludeEmployeeIds: string[],
): Promise<CandidateScore[]> {
  const orgId = shiftToFill.organization_id;
  const shiftDate = new Date(shiftToFill.date);
  const shiftDuration = shiftDurationHours(shiftToFill.start_time, shiftToFill.end_time);

  // ── 1. Load all active employees in the org ─────────────────────
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, phone, primary_location_id, can_float, max_hours_per_week, reliability_score, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (empError || !employees) {
    console.error('[ranker] Failed to load employees:', empError);
    return [];
  }

  // Filter out excluded employees
  const candidates = (employees as EmployeeRow[]).filter(
    (e) => !excludeEmployeeIds.includes(e.id),
  );

  if (candidates.length === 0) return [];

  // ── 2. Load role info (what certs are required) ─────────────────
  const { data: role } = await supabase
    .from('roles')
    .select('id, name, requires_smart_serve, requires_food_handler')
    .eq('id', shiftToFill.role_id)
    .single();

  // ── 3. Load employee_roles for this role ────────────────────────
  const { data: empRoles } = await supabase
    .from('employee_roles')
    .select('employee_id, location_id')
    .eq('role_id', shiftToFill.role_id);

  const qualifiedMap = new Map<string, string[]>(); // employee_id -> location_ids
  for (const er of empRoles ?? []) {
    const list = qualifiedMap.get(er.employee_id) ?? [];
    list.push(er.location_id);
    qualifiedMap.set(er.employee_id, list);
  }

  // ── 4. Load certifications for all candidates ───────────────────
  const candidateIds = candidates.map((c) => c.id);
  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('employee_id, cert_type, expires_at')
    .in('employee_id', candidateIds);

  const certMap = new Map<string, { cert_type: string; expires_at: string }[]>();
  for (const cert of certs ?? []) {
    const list = certMap.get(cert.employee_id) ?? [];
    list.push(cert);
    certMap.set(cert.employee_id, list);
  }

  // ── 5. Load existing shifts on the same date (overlap check) ────
  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('employee_id, start_time, end_time')
    .eq('organization_id', orgId)
    .eq('date', shiftToFill.date)
    .not('status', 'eq', 'cancelled');

  const employeeShiftsOnDate = new Map<string, { start: number; end: number }[]>();
  for (const s of existingShifts ?? []) {
    if (!s.employee_id) continue;
    const list = employeeShiftsOnDate.get(s.employee_id) ?? [];
    list.push({
      start: new Date(s.start_time).getTime(),
      end: new Date(s.end_time).getTime(),
    });
    employeeShiftsOnDate.set(s.employee_id, list);
  }

  const shiftStart = new Date(shiftToFill.start_time).getTime();
  const shiftEnd = new Date(shiftToFill.end_time).getTime();

  // ── 6. Load shift location coords ──────────────────────────────
  const { data: shiftLocation } = await supabase
    .from('locations')
    .select('id, lat, lng')
    .eq('id', shiftToFill.location_id)
    .single();

  // ── 7. Load all location coords for proximity calc ─────────────
  const locationIds = Array.from(new Set(candidates.map((c) => c.primary_location_id)));
  const { data: locations } = await supabase
    .from('locations')
    .select('id, lat, lng')
    .in('id', locationIds);

  const locationMap = new Map<string, LocationRow>();
  for (const loc of (locations ?? []) as LocationRow[]) {
    locationMap.set(loc.id, loc);
  }

  // ── 8. Load recent response rates (last 30 days) ───────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentOffers } = await supabase
    .from('callout_candidates')
    .select('employee_id, response')
    .in('employee_id', candidateIds)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const responseRateMap = new Map<string, number>(); // employee_id -> 0-100
  if (recentOffers && recentOffers.length > 0) {
    const offersByEmployee = new Map<string, { total: number; accepted: number }>();
    for (const offer of recentOffers) {
      const stats = offersByEmployee.get(offer.employee_id) ?? { total: 0, accepted: 0 };
      stats.total++;
      if (offer.response === 'accepted') stats.accepted++;
      offersByEmployee.set(offer.employee_id, stats);
    }
    Array.from(offersByEmployee.entries()).forEach(([empId, stats]) => {
      responseRateMap.set(empId, stats.total > 0 ? (stats.accepted / stats.total) * 100 : 50);
    });
  }

  // ── 9. Score each candidate ─────────────────────────────────────
  const results: CandidateScore[] = [];

  for (const emp of candidates) {
    const factors: CandidateScore['factors'] = {
      available: true,
      qualified: false,
      certified: true,
      ot_safe: true,
      reliability: emp.reliability_score,
      proximity: 50, // default if no coords
      hours_this_week: 0,
      is_home_location: emp.primary_location_id === shiftToFill.location_id,
      can_float: emp.can_float,
    };

    let disqualified = false;
    let disqualify_reason: string | undefined;

    // ── Hard filter: is_active (already filtered above) ──────────

    // ── Hard filter: can_float ────────────────────────────────────
    if (!factors.is_home_location && !emp.can_float) {
      disqualified = true;
      disqualify_reason = 'Cannot float to other locations';
    }

    // ── Hard filter: has the required role ────────────────────────
    const qualifiedLocations = qualifiedMap.get(emp.id) ?? [];
    if (qualifiedLocations.length === 0) {
      disqualified = true;
      disqualify_reason = 'Does not have the required role';
    } else {
      // Must have the role at this location OR be floatable with the role at any location
      const hasRoleAtShiftLocation = qualifiedLocations.includes(shiftToFill.location_id);
      const hasRoleAnywhere = qualifiedLocations.length > 0;
      if (hasRoleAtShiftLocation || (emp.can_float && hasRoleAnywhere)) {
        factors.qualified = true;
      } else {
        disqualified = true;
        disqualify_reason = 'Role not assigned at this location and cannot float';
      }
    }

    // ── Hard filter: certifications ──────────────────────────────
    if (role && !disqualified) {
      const empCerts = certMap.get(emp.id) ?? [];
      const today = new Date().toISOString().split('T')[0];

      if (role.requires_smart_serve) {
        const hasCert = empCerts.some(
          (c) => c.cert_type === 'smart_serve' && c.expires_at >= today,
        );
        if (!hasCert) {
          disqualified = true;
          disqualify_reason = 'Missing or expired Smart Serve certification';
          factors.certified = false;
        }
      }

      if (role.requires_food_handler && !disqualified) {
        const hasCert = empCerts.some(
          (c) => c.cert_type === 'food_handler' && c.expires_at >= today,
        );
        if (!hasCert) {
          disqualified = true;
          disqualify_reason = 'Missing or expired Food Handler certification';
          factors.certified = false;
        }
      }
    }

    // ── Hard filter: schedule overlap ────────────────────────────
    if (!disqualified) {
      const existingOnDate = employeeShiftsOnDate.get(emp.id) ?? [];
      for (const existing of existingOnDate) {
        if (shiftStart < existing.end && shiftEnd > existing.start) {
          factors.available = false;
          disqualified = true;
          disqualify_reason = 'Already scheduled for overlapping time';
          break;
        }
      }
    }

    // ── Hard filter: OT check ────────────────────────────────────
    if (!disqualified) {
      const hoursThisWeek = await getHoursThisWeek(supabase, emp.id, shiftDate);
      factors.hours_this_week = hoursThisWeek;
      if (wouldExceedOT(hoursThisWeek, shiftDuration, emp.max_hours_per_week)) {
        factors.ot_safe = false;
        disqualified = true;
        disqualify_reason = `Would exceed ${emp.max_hours_per_week}h/week (currently at ${hoursThisWeek.toFixed(1)}h)`;
      }
    }

    // ── Soft scoring ─────────────────────────────────────────────
    let score = 0;

    if (!disqualified) {
      // Reliability (30%)
      const reliabilityComponent = factors.reliability * WEIGHTS.reliability;

      // Home location match (20%)
      const homeComponent = factors.is_home_location ? 100 * WEIGHTS.home_location : 0;

      // Hours balance (20%) — prefer employees with fewer hours
      const hoursComponent = hoursBalanceScore(factors.hours_this_week, emp.max_hours_per_week) * WEIGHTS.hours_balance;

      // Proximity (15%)
      let proxComponent = 50 * WEIGHTS.proximity; // default
      if (shiftLocation?.lat != null && shiftLocation?.lng != null) {
        const empLocation = locationMap.get(emp.primary_location_id);
        if (empLocation?.lat != null && empLocation?.lng != null) {
          const dist = haversineKm(
            empLocation.lat, empLocation.lng,
            shiftLocation.lat, shiftLocation.lng,
          );
          factors.proximity = proximityScore(dist);
          proxComponent = factors.proximity * WEIGHTS.proximity;
        }
      }

      // Response rate (15%)
      const responseRate = responseRateMap.get(emp.id) ?? 50; // default 50 if no history
      const responseComponent = responseRate * WEIGHTS.response_rate;

      score = reliabilityComponent + homeComponent + hoursComponent + proxComponent + responseComponent;
    }

    results.push({
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      phone: emp.phone,
      score: Math.round(score * 100) / 100,
      factors,
      disqualified,
      disqualify_reason,
    });
  }

  // Sort: qualified candidates by score desc, then disqualified at the bottom
  results.sort((a, b) => {
    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;
    return b.score - a.score;
  });

  return results;
}
