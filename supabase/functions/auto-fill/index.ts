/**
 * CoverMe.ai — Auto-Fill Orchestrator (Phase 4)
 *
 * Triggered when a callout is created. Finds replacement candidates,
 * sends shift offer SMS messages in batches of 3, and schedules timeouts.
 *
 * POST /functions/v1/auto-fill
 * Authorization: Bearer <service_role_key>
 * Body: { "callout_id": "uuid" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Inline ranker (Deno edge functions can't import from src/) ──────

interface CandidateScore {
  employee_id: string
  employee_name: string
  phone: string
  score: number
  factors: {
    available: boolean
    qualified: boolean
    certified: boolean
    ot_safe: boolean
    reliability: number
    proximity: number
    hours_this_week: number
    is_home_location: boolean
    can_float: boolean
  }
  disqualified: boolean
  disqualify_reason?: string
}

interface ShiftToFill {
  id: string
  organization_id: string
  location_id: string
  role_id: string
  date: string
  start_time: string
  end_time: string
}

// ── OT helpers ───────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

async function getHoursThisWeek(
  supabase: SupabaseClient,
  employeeId: string,
  weekOf: Date,
): Promise<number> {
  const weekStart = getWeekStart(weekOf)
  const weekEnd = getWeekEnd(weekOf)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('start_time, end_time')
    .eq('employee_id', employeeId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .not('status', 'in', '("cancelled","missed")')

  if (!shifts || shifts.length === 0) return 0

  let total = 0
  for (const s of shifts) {
    total += (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 3600000
  }
  return total
}

function shiftDurationHours(startTime: string, endTime: string): number {
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000
}

// ── Haversine ────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Ranking ──────────────────────────────────────────────────────────

const WEIGHTS = { reliability: 0.30, home_location: 0.20, hours_balance: 0.20, proximity: 0.15, response_rate: 0.15 }

async function rankCandidates(
  supabase: SupabaseClient,
  shift: ShiftToFill,
  excludeIds: string[],
): Promise<CandidateScore[]> {
  const shiftDate = new Date(shift.date)
  const shiftDur = shiftDurationHours(shift.start_time, shift.end_time)
  const shiftStartMs = new Date(shift.start_time).getTime()
  const shiftEndMs = new Date(shift.end_time).getTime()

  // Load employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, phone, primary_location_id, can_float, max_hours_per_week, reliability_score, is_active')
    .eq('organization_id', shift.organization_id)
    .eq('is_active', true)

  if (!employees || employees.length === 0) return []

  const candidates = employees.filter((e: { id: string }) => !excludeIds.includes(e.id))
  if (candidates.length === 0) return []

  const candidateIds = candidates.map((c: { id: string }) => c.id)

  // Load role
  const { data: role } = await supabase
    .from('roles')
    .select('id, name, requires_smart_serve, requires_food_handler')
    .eq('id', shift.role_id)
    .single()

  // Load employee_roles for this role
  const { data: empRoles } = await supabase
    .from('employee_roles')
    .select('employee_id, location_id')
    .eq('role_id', shift.role_id)

  const qualifiedMap = new Map<string, string[]>()
  for (const er of empRoles ?? []) {
    const list = qualifiedMap.get(er.employee_id) ?? []
    list.push(er.location_id)
    qualifiedMap.set(er.employee_id, list)
  }

  // Load certs
  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('employee_id, cert_type, expires_at')
    .in('employee_id', candidateIds)

  const certMap = new Map<string, { cert_type: string; expires_at: string }[]>()
  for (const c of certs ?? []) {
    const list = certMap.get(c.employee_id) ?? []
    list.push(c)
    certMap.set(c.employee_id, list)
  }

  // Load existing shifts on same date
  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('employee_id, start_time, end_time')
    .eq('organization_id', shift.organization_id)
    .eq('date', shift.date)
    .not('status', 'eq', 'cancelled')

  const shiftsByEmployee = new Map<string, { start: number; end: number }[]>()
  for (const s of existingShifts ?? []) {
    if (!s.employee_id) continue
    const list = shiftsByEmployee.get(s.employee_id) ?? []
    list.push({ start: new Date(s.start_time).getTime(), end: new Date(s.end_time).getTime() })
    shiftsByEmployee.set(s.employee_id, list)
  }

  // Load shift location
  const { data: shiftLoc } = await supabase
    .from('locations')
    .select('id, lat, lng')
    .eq('id', shift.location_id)
    .single()

  // Load all locations for proximity
  const locIds = [...new Set(candidates.map((c: { primary_location_id: string }) => c.primary_location_id))]
  const { data: locs } = await supabase.from('locations').select('id, lat, lng').in('id', locIds)
  const locMap = new Map<string, { lat: number | null; lng: number | null }>()
  for (const l of locs ?? []) locMap.set(l.id, l)

  // Load recent response rates
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: recentOffers } = await supabase
    .from('callout_candidates')
    .select('employee_id, response')
    .in('employee_id', candidateIds)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const responseRateMap = new Map<string, number>()
  if (recentOffers && recentOffers.length > 0) {
    const byEmp = new Map<string, { total: number; accepted: number }>()
    for (const o of recentOffers) {
      const s = byEmp.get(o.employee_id) ?? { total: 0, accepted: 0 }
      s.total++
      if (o.response === 'accepted') s.accepted++
      byEmp.set(o.employee_id, s)
    }
    for (const [id, s] of byEmp) responseRateMap.set(id, s.total > 0 ? (s.accepted / s.total) * 100 : 50)
  }

  // Score each
  const results: CandidateScore[] = []
  const today = new Date().toISOString().split('T')[0]

  for (const emp of candidates) {
    const isHome = emp.primary_location_id === shift.location_id
    const factors: CandidateScore['factors'] = {
      available: true, qualified: false, certified: true, ot_safe: true,
      reliability: emp.reliability_score, proximity: 50,
      hours_this_week: 0, is_home_location: isHome, can_float: emp.can_float,
    }
    let dq = false
    let dqReason: string | undefined

    // Float check
    if (!isHome && !emp.can_float) { dq = true; dqReason = 'Cannot float' }

    // Role check
    if (!dq) {
      const qLocs = qualifiedMap.get(emp.id) ?? []
      if (qLocs.length === 0) { dq = true; dqReason = 'Missing required role' }
      else {
        const atShiftLoc = qLocs.includes(shift.location_id)
        if (atShiftLoc || (emp.can_float && qLocs.length > 0)) { factors.qualified = true }
        else { dq = true; dqReason = 'Role not at this location' }
      }
    }

    // Cert check
    if (!dq && role) {
      const ec = certMap.get(emp.id) ?? []
      if (role.requires_smart_serve && !ec.some((c: { cert_type: string; expires_at: string }) => c.cert_type === 'smart_serve' && c.expires_at >= today)) {
        dq = true; dqReason = 'Missing Smart Serve'; factors.certified = false
      }
      if (!dq && role.requires_food_handler && !ec.some((c: { cert_type: string; expires_at: string }) => c.cert_type === 'food_handler' && c.expires_at >= today)) {
        dq = true; dqReason = 'Missing Food Handler'; factors.certified = false
      }
    }

    // Overlap check
    if (!dq) {
      const existing = shiftsByEmployee.get(emp.id) ?? []
      for (const ex of existing) {
        if (shiftStartMs < ex.end && shiftEndMs > ex.start) {
          dq = true; dqReason = 'Schedule overlap'; factors.available = false; break
        }
      }
    }

    // OT check
    if (!dq) {
      const hrs = await getHoursThisWeek(supabase, emp.id, shiftDate)
      factors.hours_this_week = hrs
      if (hrs + shiftDur > emp.max_hours_per_week) {
        dq = true; dqReason = `Would exceed ${emp.max_hours_per_week}h/week`; factors.ot_safe = false
      }
    }

    // Soft scoring
    let score = 0
    if (!dq) {
      const reliComp = factors.reliability * WEIGHTS.reliability
      const homeComp = isHome ? 100 * WEIGHTS.home_location : 0
      const hrsComp = Math.max(0, 100 * (1 - factors.hours_this_week / emp.max_hours_per_week)) * WEIGHTS.hours_balance

      let proxComp = 50 * WEIGHTS.proximity
      if (shiftLoc?.lat != null && shiftLoc?.lng != null) {
        const eLoc = locMap.get(emp.primary_location_id)
        if (eLoc?.lat != null && eLoc?.lng != null) {
          const dist = haversineKm(eLoc.lat, eLoc.lng, shiftLoc.lat, shiftLoc.lng)
          factors.proximity = Math.max(0, 100 - dist * 2)
          proxComp = factors.proximity * WEIGHTS.proximity
        }
      }

      const rr = responseRateMap.get(emp.id) ?? 50
      const rrComp = rr * WEIGHTS.response_rate

      score = reliComp + homeComp + hrsComp + proxComp + rrComp
    }

    results.push({
      employee_id: emp.id, employee_name: `${emp.first_name} ${emp.last_name}`,
      phone: emp.phone, score: Math.round(score * 100) / 100,
      factors, disqualified: dq, disqualify_reason: dqReason,
    })
  }

  results.sort((a, b) => {
    if (a.disqualified && !b.disqualified) return 1
    if (!a.disqualified && b.disqualified) return -1
    return b.score - a.score
  })

  return results
}

// ── Send SMS helper ──────────────────────────────────────────────────

async function sendSMS(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    to: string
    body: string
    context: string
    organization_id: string
    employee_id: string
    related_callout_id?: string
    related_shift_id?: string
    set_context?: {
      current_context: string
      context_data: Record<string, unknown>
      expires_in_minutes: number
    }
  },
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error(`[auto-fill] send-sms error for ${payload.to}:`, err)
      return false
    }
    return true
  } catch (e) {
    console.error(`[auto-fill] send-sms exception for ${payload.to}:`, e)
    return false
  }
}

// ── Schedule timeout ─────────────────────────────────────────────────

async function scheduleTimeout(
  supabaseUrl: string,
  serviceRoleKey: string,
  calloutId: string,
  batchNumber: number,
  delayMinutes: number,
): Promise<void> {
  // Use setTimeout to call the callout-timeout function after delay.
  // In production this would be a pg_cron job or external scheduler.
  // For now we use a fire-and-forget fetch with a delay.
  setTimeout(async () => {
    try {
      console.log(`[auto-fill] Triggering timeout for callout ${calloutId}, batch ${batchNumber}`)
      await fetch(`${supabaseUrl}/functions/v1/callout-timeout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callout_id: calloutId, batch: batchNumber }),
      })
    } catch (e) {
      console.error(`[auto-fill] timeout trigger failed:`, e)
    }
  }, delayMinutes * 60 * 1000)
}

// ── Main handler ─────────────────────────────────────────────────────

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
    // ── Auth ───────────────────────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────────────
    const { callout_id } = await req.json()
    if (!callout_id) {
      return new Response(
        JSON.stringify({ error: 'callout_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[auto-fill] Starting for callout ${callout_id}`)

    // ── Load callout + shift ──────────────────────────────────────
    const { data: callout, error: calloutErr } = await supabase
      .from('callouts')
      .select('id, organization_id, shift_id, employee_id, status, reported_at')
      .eq('id', callout_id)
      .single()

    if (calloutErr || !callout) {
      return new Response(
        JSON.stringify({ error: `Callout not found: ${callout_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Only process pending callouts
    if (callout.status !== 'pending' && callout.status !== 'auto_filling') {
      return new Response(
        JSON.stringify({ error: `Callout already in status: ${callout.status}`, callout_id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: shift, error: shiftErr } = await supabase
      .from('shifts')
      .select('id, organization_id, location_id, role_id, date, start_time, end_time')
      .eq('id', callout.shift_id)
      .single()

    if (shiftErr || !shift) {
      return new Response(
        JSON.stringify({ error: `Shift not found: ${callout.shift_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Update callout status ─────────────────────────────────────
    await supabase
      .from('callouts')
      .update({ status: 'auto_filling' })
      .eq('id', callout_id)

    // ── Update reliability for the calling-out employee ───────────
    const { data: callingOutEmp } = await supabase
      .from('employees')
      .select('reliability_score')
      .eq('id', callout.employee_id)
      .single()

    if (callingOutEmp) {
      const newScore = Math.max(0, callingOutEmp.reliability_score - 5)
      await supabase
        .from('employees')
        .update({ reliability_score: newScore })
        .eq('id', callout.employee_id)
      console.log(`[auto-fill] Reliability updated for calling-out employee ${callout.employee_id}: ${callingOutEmp.reliability_score} -> ${newScore}`)
    }

    // ── Rank candidates ───────────────────────────────────────────
    const shiftToFill: ShiftToFill = {
      id: shift.id,
      organization_id: shift.organization_id,
      location_id: shift.location_id,
      role_id: shift.role_id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
    }

    const excludeIds = [callout.employee_id] // exclude the calling-out employee
    const allCandidates = await rankCandidates(supabase, shiftToFill, excludeIds)
    const qualifiedCandidates = allCandidates.filter((c) => !c.disqualified)

    console.log(`[auto-fill] ${qualifiedCandidates.length} qualified candidates out of ${allCandidates.length} total`)

    if (qualifiedCandidates.length === 0) {
      // No candidates — escalate immediately
      console.log(`[auto-fill] No candidates available, escalating`)
      await supabase
        .from('callouts')
        .update({ status: 'escalated', escalated_at: new Date().toISOString() })
        .eq('id', callout_id)

      // Notify manager
      await escalateToManager(supabase, supabaseUrl, supabaseKey, callout, shift)

      return new Response(
        JSON.stringify({
          success: true,
          callout_id,
          status: 'escalated',
          reason: 'No qualified candidates available',
          total_candidates: allCandidates.length,
          disqualified_reasons: allCandidates.map((c) => ({ name: c.employee_name, reason: c.disqualify_reason })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Send first batch of 3 ─────────────────────────────────────
    const batchSize = 3
    const batch = qualifiedCandidates.slice(0, batchSize)
    const batchNumber = 1

    // Load role name + location name for the offer message
    const { data: roleName } = await supabase
      .from('roles')
      .select('name')
      .eq('id', shift.role_id)
      .single()

    const { data: locationName } = await supabase
      .from('locations')
      .select('name')
      .eq('id', shift.location_id)
      .single()

    const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const endTime = new Date(shift.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const timeRange = `${startTime}-${endTime}`

    for (const candidate of batch) {
      // Insert callout_candidate record
      await supabase.from('callout_candidates').insert({
        callout_id: callout_id,
        employee_id: candidate.employee_id,
        batch_number: batchNumber,
        score: candidate.score,
        offered_at: new Date().toISOString(),
        response: null,
      })

      // Build offer message
      const firstName = candidate.employee_name.split(' ')[0]
      const offerMsg = `Hey ${firstName}, can you cover a ${roleName?.name ?? 'shift'} at ${locationName?.name ?? 'the restaurant'} on ${shift.date} ${timeRange}? Reply YES or NO`

      // Send SMS with context
      await sendSMS(supabaseUrl, supabaseKey, {
        to: candidate.phone,
        body: offerMsg,
        context: 'shift_offer',
        organization_id: shift.organization_id,
        employee_id: candidate.employee_id,
        related_callout_id: callout_id,
        related_shift_id: shift.id,
        set_context: {
          current_context: 'awaiting_shift_reply',
          context_data: {
            callout_id: callout_id,
            shift_id: shift.id,
            batch_number: batchNumber,
          },
          expires_in_minutes: 12, // slightly more than the 10min timeout
        },
      })

      console.log(`[auto-fill] Offer sent to ${candidate.employee_name} (score: ${candidate.score})`)
    }

    // ── Schedule timeout ──────────────────────────────────────────
    scheduleTimeout(supabaseUrl, supabaseKey, callout_id, batchNumber, 10)

    return new Response(
      JSON.stringify({
        success: true,
        callout_id,
        status: 'auto_filling',
        batch: batchNumber,
        candidates_offered: batch.map((c) => ({
          name: c.employee_name,
          score: c.score,
        })),
        total_qualified: qualifiedCandidates.length,
        total_candidates: allCandidates.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('[auto-fill] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ── Escalation helper ────────────────────────────────────────────────

async function escalateToManager(
  supabase: SupabaseClient,
  supabaseUrl: string,
  supabaseKey: string,
  callout: { id: string; organization_id: string; shift_id: string; employee_id: string },
  shift: { id: string; location_id: string; date: string; start_time: string; end_time: string; role_id: string },
): Promise<void> {
  // Find the org owner
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', callout.organization_id)
    .single()

  if (!org) return

  // Find the owner's employee record (for phone)
  const { data: ownerEmp } = await supabase
    .from('employees')
    .select('id, phone, first_name')
    .eq('user_id', org.owner_id)
    .eq('organization_id', callout.organization_id)
    .limit(1)
    .single()

  if (!ownerEmp) {
    console.warn('[auto-fill] No owner employee record found for escalation')
    return
  }

  const { data: locationName } = await supabase
    .from('locations')
    .select('name')
    .eq('id', shift.location_id)
    .single()

  const { data: roleName } = await supabase
    .from('roles')
    .select('name')
    .eq('id', shift.role_id)
    .single()

  const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const shiftDesc = `${roleName?.name ?? 'shift'} at ${locationName?.name ?? 'location'} on ${shift.date} ${startTime}`

  await sendSMS(supabaseUrl, supabaseKey, {
    to: ownerEmp.phone,
    body: `Warning: Can't auto-fill ${shiftDesc}. Need your help finding coverage. Reply with a name or call the team.`,
    context: 'shift_offer',
    organization_id: callout.organization_id,
    employee_id: ownerEmp.id,
    related_callout_id: callout.id,
    related_shift_id: shift.id,
  })

  console.log(`[auto-fill] Escalation SMS sent to owner ${ownerEmp.first_name} at ${ownerEmp.phone}`)
}
