/**
 * CoverMe.ai -- Smart Alert Engine (Phase 8)
 *
 * Scans for alert conditions across all organizations/locations and
 * creates/escalates/auto-resolves alerts. Can be triggered on-demand
 * or by cron.
 *
 * POST /functions/v1/alert-engine
 * Authorization: Bearer <service_role_key>
 * Body: { "check": "all" | "no_show" | "labor" | "certs" | "coverage" | "schedule" | "consecutive" | "callout_unfilled" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AlertType =
  | 'coverage_gap'
  | 'no_show'
  | 'labor_over'
  | 'cert_expiring'
  | 'cert_expired'
  | 'schedule_late'
  | 'callout_unfilled'
  | 'compliance_violation'
  | 'consecutive_days'

type Severity = 'critical' | 'warning' | 'info'

interface NewAlert {
  organization_id: string
  location_id?: string
  type: AlertType
  severity: Severity
  title: string
  message: string
  related_employee_id?: string
  related_shift_id?: string
  related_callout_id?: string
  escalation_level: number
}

// ── Dedup key: match on type + related entity + active status ──────
function alertDedup(a: NewAlert): string {
  return `${a.type}:${a.related_shift_id ?? ''}:${a.related_employee_id ?? ''}:${a.related_callout_id ?? ''}`
}

// ── Send SMS helper ────────────────────────────────────────────────
async function sendAlertSMS(
  supabaseUrl: string,
  serviceRoleKey: string,
  to: string,
  body: string,
  organizationId: string,
  employeeId?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        body,
        context: 'general',
        organization_id: organizationId,
        employee_id: employeeId,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Get manager/owner phone for escalation ─────────────────────────
async function getEscalationContacts(
  supabase: SupabaseClient,
  organizationId: string,
  locationId?: string,
): Promise<{ managers: { id: string; phone: string; name: string }[]; owner: { id: string; phone: string; name: string } | null }> {
  const managers: { id: string; phone: string; name: string }[] = []
  let owner: { id: string; phone: string; name: string } | null = null

  // Get org owner
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .single()

  if (org?.owner_id) {
    const { data: ownerEmp } = await supabase
      .from('employees')
      .select('id, phone, first_name, last_name')
      .eq('user_id', org.owner_id)
      .eq('organization_id', organizationId)
      .limit(1)
      .single()

    if (ownerEmp) {
      owner = { id: ownerEmp.id, phone: ownerEmp.phone, name: `${ownerEmp.first_name} ${ownerEmp.last_name}` }
    }
  }

  // TODO: When manager role tracking is added, query managers for the specific location
  // For now, owner is the escalation target for both levels

  return { managers, owner }
}

// ── Check: Coverage Gaps ───────────────────────────────────────────
async function checkCoverageGaps(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, organization_id, location_id, role_id, date, start_time, end_time, employee_id, status')
    .is('employee_id', null)
    .eq('is_open', true)
    .gte('start_time', now)
    .lte('start_time', twoHoursFromNow)
    .not('status', 'eq', 'cancelled')

  if (!shifts) return alerts

  // Get role/location names
  const roleIds = [...new Set(shifts.map(s => s.role_id))]
  const locIds = [...new Set(shifts.map(s => s.location_id))]

  const { data: roles } = await supabase.from('roles').select('id, name').in('id', roleIds)
  const { data: locs } = await supabase.from('locations').select('id, name').in('id', locIds)

  const roleMap = new Map((roles ?? []).map(r => [r.id, r.name]))
  const locMap = new Map((locs ?? []).map(l => [l.id, l.name]))

  for (const shift of shifts) {
    const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const roleName = roleMap.get(shift.role_id) ?? 'Unknown role'
    const locName = locMap.get(shift.location_id) ?? 'Unknown location'

    alerts.push({
      organization_id: shift.organization_id,
      location_id: shift.location_id,
      type: 'coverage_gap',
      severity: 'critical',
      title: 'Unfilled shift starting soon',
      message: `${roleName} at ${locName} starts at ${startTime} with no one assigned.`,
      related_shift_id: shift.id,
      escalation_level: 0,
    })
  }

  return alerts
}

// ── Check: No-shows ────────────────────────────────────────────────
async function checkNoShows(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  // Shifts that started 15+ min ago, still 'scheduled' (no clock-in)
  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, organization_id, location_id, role_id, employee_id, start_time')
    .eq('status', 'scheduled')
    .not('employee_id', 'is', null)
    .lte('start_time', fifteenMinAgo)
    .gte('start_time', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // only last 4 hours

  if (!shifts) return alerts

  const empIds = [...new Set(shifts.map(s => s.employee_id).filter(Boolean))]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .in('id', empIds)

  const empMap = new Map((employees ?? []).map(e => [e.id, `${e.first_name} ${e.last_name}`]))

  for (const shift of shifts) {
    if (!shift.employee_id) continue
    const empName = empMap.get(shift.employee_id) ?? 'Unknown'
    const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    alerts.push({
      organization_id: shift.organization_id,
      location_id: shift.location_id,
      type: 'no_show',
      severity: 'critical',
      title: 'Possible no-show',
      message: `${empName} has not clocked in for their ${startTime} shift.`,
      related_shift_id: shift.id,
      related_employee_id: shift.employee_id,
      escalation_level: 0,
    })
  }

  return alerts
}

// ── Check: Callout Unfilled ────────────────────────────────────────
async function checkCalloutUnfilled(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: callouts } = await supabase
    .from('callouts')
    .select('id, organization_id, shift_id, employee_id, escalated_at')
    .eq('status', 'escalated')
    .lte('escalated_at', thirtyMinAgo)

  if (!callouts) return alerts

  const empIds = [...new Set(callouts.map(c => c.employee_id))]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .in('id', empIds)

  const empMap = new Map((employees ?? []).map(e => [e.id, `${e.first_name} ${e.last_name}`]))

  for (const callout of callouts) {
    const empName = empMap.get(callout.employee_id) ?? 'Unknown'

    alerts.push({
      organization_id: callout.organization_id,
      type: 'callout_unfilled',
      severity: 'critical',
      title: 'Callout still unfilled',
      message: `${empName}'s callout has been escalated for 30+ minutes with no resolution.`,
      related_callout_id: callout.id,
      related_shift_id: callout.shift_id,
      related_employee_id: callout.employee_id,
      escalation_level: 1,
    })
  }

  return alerts
}

// ── Check: Labor Over Threshold ────────────────────────────────────
async function checkLaborOver(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []
  const today = new Date().toISOString().split('T')[0]

  // Get all active locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, organization_id, name')
    .eq('is_active', true)

  if (!locations) return alerts

  for (const loc of locations) {
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, employee_id, start_time, end_time')
      .eq('location_id', loc.id)
      .eq('date', today)
      .not('status', 'eq', 'cancelled')
      .not('employee_id', 'is', null)

    if (!shifts || shifts.length === 0) continue

    const empIds = [...new Set(shifts.map(s => s.employee_id).filter(Boolean))]
    const { data: employees } = await supabase
      .from('employees')
      .select('id, hourly_rate')
      .in('id', empIds)

    const rateMap = new Map((employees ?? []).map(e => [e.id, e.hourly_rate]))

    let totalLaborCost = 0
    for (const shift of shifts) {
      if (!shift.employee_id) continue
      const rate = rateMap.get(shift.employee_id) ?? 0
      const hours = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000
      totalLaborCost += rate * hours
    }

    // Fixed threshold: warn if daily labor exceeds $2000 per location
    const LABOR_THRESHOLD = 2000
    if (totalLaborCost > LABOR_THRESHOLD) {
      alerts.push({
        organization_id: loc.organization_id,
        location_id: loc.id,
        type: 'labor_over',
        severity: 'warning',
        title: 'Labor cost over threshold',
        message: `${loc.name} daily labor is $${Math.round(totalLaborCost)} (threshold: $${LABOR_THRESHOLD}).`,
        escalation_level: 0,
      })
    }
  }

  return alerts
}

// ── Check: Cert Expiring / Expired ─────────────────────────────────
async function checkCerts(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Expiring within 30 days
  const { data: expiring } = await supabase
    .from('employee_certifications')
    .select('id, employee_id, cert_type, expires_at')
    .gte('expires_at', today)
    .lte('expires_at', thirtyDaysOut)

  // Already expired
  const { data: expired } = await supabase
    .from('employee_certifications')
    .select('id, employee_id, cert_type, expires_at')
    .lt('expires_at', today)

  const allCerts = [...(expiring ?? []), ...(expired ?? [])]
  if (allCerts.length === 0) return alerts

  const empIds = [...new Set(allCerts.map(c => c.employee_id))]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, organization_id, first_name, last_name')
    .in('id', empIds)

  const empMap = new Map((employees ?? []).map(e => [e.id, e]))

  for (const cert of (expiring ?? [])) {
    const emp = empMap.get(cert.employee_id)
    if (!emp) continue
    const daysLeft = Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    alerts.push({
      organization_id: emp.organization_id,
      type: 'cert_expiring',
      severity: 'warning',
      title: 'Certification expiring soon',
      message: `${emp.first_name} ${emp.last_name}'s ${cert.cert_type.replace('_', ' ')} expires in ${daysLeft} days.`,
      related_employee_id: cert.employee_id,
      escalation_level: 0,
    })
  }

  for (const cert of (expired ?? [])) {
    const emp = empMap.get(cert.employee_id)
    if (!emp) continue

    alerts.push({
      organization_id: emp.organization_id,
      type: 'cert_expired',
      severity: 'warning',
      title: 'Certification expired',
      message: `${emp.first_name} ${emp.last_name}'s ${cert.cert_type.replace('_', ' ')} has expired.`,
      related_employee_id: cert.employee_id,
      escalation_level: 0,
    })
  }

  return alerts
}

// ── Check: Schedule Not Published ──────────────────────────────────
async function checkScheduleLate(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 3=Wed

  // Only check on Wednesday or later
  if (dayOfWeek < 3) return alerts

  // Next Monday
  const daysUntilMonday = (8 - dayOfWeek) % 7 || 7
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  const nextMondayStr = nextMonday.toISOString().split('T')[0]

  // Check all locations for unpublished schedules
  const { data: locations } = await supabase
    .from('locations')
    .select('id, organization_id, name')
    .eq('is_active', true)

  if (!locations) return alerts

  for (const loc of locations) {
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id, status')
      .eq('location_id', loc.id)
      .eq('week_start', nextMondayStr)
      .eq('status', 'published')

    if (!schedules || schedules.length === 0) {
      alerts.push({
        organization_id: loc.organization_id,
        location_id: loc.id,
        type: 'schedule_late',
        severity: 'info',
        title: 'Schedule not published',
        message: `Next week's schedule for ${loc.name} is not published yet.`,
        escalation_level: 0,
      })
    }
  }

  return alerts
}

// ── Check: Consecutive Days ────────────────────────────────────────
async function checkConsecutiveDays(supabase: SupabaseClient): Promise<NewAlert[]> {
  const alerts: NewAlert[] = []

  // Look at next 7 days from today
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const { data: shifts } = await supabase
    .from('shifts')
    .select('employee_id, date, organization_id')
    .in('date', dates)
    .not('employee_id', 'is', null)
    .not('status', 'eq', 'cancelled')

  if (!shifts || shifts.length === 0) return alerts

  // Group by employee
  const byEmployee = new Map<string, { dates: Set<string>; org: string }>()
  for (const s of shifts) {
    if (!s.employee_id) continue
    const entry = byEmployee.get(s.employee_id) ?? { dates: new Set(), org: s.organization_id }
    entry.dates.add(s.date)
    byEmployee.set(s.employee_id, entry)
  }

  const flaggedIds: string[] = []
  const flaggedOrgs = new Map<string, string>()

  for (const [empId, info] of byEmployee) {
    if (info.dates.size >= 6) {
      flaggedIds.push(empId)
      flaggedOrgs.set(empId, info.org)
    }
  }

  if (flaggedIds.length === 0) return alerts

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .in('id', flaggedIds)

  for (const emp of (employees ?? [])) {
    const info = byEmployee.get(emp.id)
    alerts.push({
      organization_id: flaggedOrgs.get(emp.id) ?? '',
      type: 'consecutive_days',
      severity: 'info',
      title: 'Employee scheduled 6+ consecutive days',
      message: `${emp.first_name} ${emp.last_name} is scheduled ${info?.dates.size ?? 6} out of the next 7 days.`,
      related_employee_id: emp.id,
      escalation_level: 0,
    })
  }

  return alerts
}

// ── Escalation Logic ───────────────────────────────────────────────
async function processEscalations(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ escalated: number }> {
  let escalated = 0

  // Level 0 -> 1: Critical alerts unresolved for 15 min
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: level0 } = await supabase
    .from('alerts')
    .select('id, organization_id, location_id, title, message, type')
    .eq('status', 'active')
    .eq('severity', 'critical')
    .eq('escalation_level', 0)
    .lte('created_at', fifteenMinAgo)

  for (const alert of (level0 ?? [])) {
    const contacts = await getEscalationContacts(supabase, alert.organization_id, alert.location_id ?? undefined)

    // SMS manager (or owner if no managers)
    const target = contacts.managers[0] ?? contacts.owner
    if (target) {
      await sendAlertSMS(
        supabaseUrl,
        serviceRoleKey,
        target.phone,
        `ALERT: ${alert.title} - ${alert.message}`,
        alert.organization_id,
        target.id,
      )
    }

    await supabase
      .from('alerts')
      .update({
        escalation_level: 1,
        notified_via: ['dashboard', 'sms'],
      })
      .eq('id', alert.id)

    escalated++
  }

  // Level 1 -> 2: Critical alerts unresolved for 30 min
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: level1 } = await supabase
    .from('alerts')
    .select('id, organization_id, location_id, title, message')
    .eq('status', 'active')
    .eq('severity', 'critical')
    .eq('escalation_level', 1)
    .lte('created_at', thirtyMinAgo)

  for (const alert of (level1 ?? [])) {
    const contacts = await getEscalationContacts(supabase, alert.organization_id, alert.location_id ?? undefined)

    if (contacts.owner) {
      await sendAlertSMS(
        supabaseUrl,
        serviceRoleKey,
        contacts.owner.phone,
        `URGENT: ${alert.title} - ${alert.message} (escalated to owner)`,
        alert.organization_id,
        contacts.owner.id,
      )
    }

    await supabase
      .from('alerts')
      .update({
        escalation_level: 2,
        notified_via: ['dashboard', 'sms'],
      })
      .eq('id', alert.id)

    escalated++
  }

  return { escalated }
}

// ── Auto-Resolve Logic ─────────────────────────────────────────────
async function autoResolve(supabase: SupabaseClient): Promise<{ resolved: number }> {
  let resolved = 0

  // Coverage gaps: if the shift got filled
  const { data: coverageAlerts } = await supabase
    .from('alerts')
    .select('id, related_shift_id')
    .eq('type', 'coverage_gap')
    .eq('status', 'active')

  for (const alert of (coverageAlerts ?? [])) {
    if (!alert.related_shift_id) continue
    const { data: shift } = await supabase
      .from('shifts')
      .select('employee_id, is_open, status')
      .eq('id', alert.related_shift_id)
      .single()

    if (shift && (shift.employee_id || !shift.is_open || shift.status === 'cancelled')) {
      await supabase
        .from('alerts')
        .update({ status: 'auto_resolved', resolved_at: new Date().toISOString(), resolution_note: 'Shift was filled or cancelled.' })
        .eq('id', alert.id)
      resolved++
    }
  }

  // No-shows: if shift status changed (confirmed, etc)
  const { data: noShowAlerts } = await supabase
    .from('alerts')
    .select('id, related_shift_id')
    .eq('type', 'no_show')
    .eq('status', 'active')

  for (const alert of (noShowAlerts ?? [])) {
    if (!alert.related_shift_id) continue
    const { data: shift } = await supabase
      .from('shifts')
      .select('status')
      .eq('id', alert.related_shift_id)
      .single()

    if (shift && shift.status !== 'scheduled') {
      await supabase
        .from('alerts')
        .update({ status: 'auto_resolved', resolved_at: new Date().toISOString(), resolution_note: 'Employee clocked in or shift updated.' })
        .eq('id', alert.id)
      resolved++
    }
  }

  // Callout unfilled: if callout got filled
  const { data: calloutAlerts } = await supabase
    .from('alerts')
    .select('id, related_callout_id')
    .eq('type', 'callout_unfilled')
    .eq('status', 'active')

  for (const alert of (calloutAlerts ?? [])) {
    if (!alert.related_callout_id) continue
    const { data: callout } = await supabase
      .from('callouts')
      .select('status')
      .eq('id', alert.related_callout_id)
      .single()

    if (callout && callout.status === 'filled') {
      await supabase
        .from('alerts')
        .update({ status: 'auto_resolved', resolved_at: new Date().toISOString(), resolution_note: 'Callout was filled.' })
        .eq('id', alert.id)
      resolved++
    }
  }

  return { resolved }
}

// ── Main Handler ───────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { check = 'all' } = await req.json().catch(() => ({ check: 'all' }))

    console.log(`[alert-engine] Running checks: ${check}`)

    // ── Gather new alerts ─────────────────────────────────────────
    let newAlerts: NewAlert[] = []

    const checks: Record<string, () => Promise<NewAlert[]>> = {
      coverage: () => checkCoverageGaps(supabase),
      no_show: () => checkNoShows(supabase),
      callout_unfilled: () => checkCalloutUnfilled(supabase),
      labor: () => checkLaborOver(supabase),
      certs: () => checkCerts(supabase),
      schedule: () => checkScheduleLate(supabase),
      consecutive: () => checkConsecutiveDays(supabase),
    }

    if (check === 'all') {
      const results = await Promise.all(Object.values(checks).map(fn => fn()))
      newAlerts = results.flat()
    } else if (checks[check]) {
      newAlerts = await checks[check]()
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown check type: ${check}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[alert-engine] Found ${newAlerts.length} potential alerts`)

    // ── Dedup against existing active alerts ──────────────────────
    const { data: existingAlerts } = await supabase
      .from('alerts')
      .select('id, type, related_shift_id, related_employee_id, related_callout_id')
      .in('status', ['active', 'acknowledged'])

    const existingKeys = new Set(
      (existingAlerts ?? []).map(a => `${a.type}:${a.related_shift_id ?? ''}:${a.related_employee_id ?? ''}:${a.related_callout_id ?? ''}`)
    )

    const dedupedAlerts = newAlerts.filter(a => !existingKeys.has(alertDedup(a)))
    console.log(`[alert-engine] ${dedupedAlerts.length} new after dedup`)

    // ── Insert new alerts ─────────────────────────────────────────
    let created = 0
    for (const alert of dedupedAlerts) {
      const { error } = await supabase.from('alerts').insert({
        organization_id: alert.organization_id,
        location_id: alert.location_id ?? null,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        related_employee_id: alert.related_employee_id ?? null,
        related_shift_id: alert.related_shift_id ?? null,
        related_callout_id: alert.related_callout_id ?? null,
        escalation_level: alert.escalation_level,
        notified_via: ['dashboard'],
      })

      if (!error) created++
      else console.error(`[alert-engine] Insert error:`, error)
    }

    // ── Auto-resolve stale alerts ─────────────────────────────────
    const { resolved } = await autoResolve(supabase)

    // ── Process escalations ───────────────────────────────────────
    const { escalated } = await processEscalations(supabase, supabaseUrl, supabaseKey)

    const summary = {
      success: true,
      check,
      detected: newAlerts.length,
      created,
      deduplicated: newAlerts.length - dedupedAlerts.length,
      auto_resolved: resolved,
      escalated,
    }

    console.log(`[alert-engine] Done:`, summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('[alert-engine] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
