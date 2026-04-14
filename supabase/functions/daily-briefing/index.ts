/**
 * CoverMe.ai — Daily Briefing Edge Function (Phase 6)
 *
 * Called by a cron job at 7 AM ET (morning) and 10 PM ET (evening).
 * Aggregates staffing data across all orgs/locations and sends an
 * AI-generated SMS briefing to each org owner.
 *
 * POST /functions/v1/daily-briefing
 * Authorization: Bearer <service_role_key>
 * Body: { "type": "morning" | "evening" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types (mirrored from src/lib/ai/claude.ts for Deno) ─────────

interface LocationStaffing {
  location_name: string
  total_shifts: number
  filled_shifts: number
  open_shifts: number
  open_roles: string[]
  labor_cost_estimate: number
  total_hours: number
}

interface CalloutSummary {
  total: number
  auto_filled: number
  escalated: number
  unfilled: number
  avg_resolution_seconds: number | null
}

interface UpcomingEvent {
  name: string
  event_date: string
  event_type: string
  demand_multiplier: number
  is_playoff: boolean
}

interface PendingApproval {
  type: string
  description: string
  employee_name: string
  created_at: string
}

interface CertAlert {
  employee_name: string
  cert_type: string
  expires_at: string
  days_until_expiry: number
}

interface BriefingData {
  type: 'morning' | 'evening'
  org_name: string
  location_count: number
  today_staffing: LocationStaffing[]
  yesterday_callouts: CalloutSummary
  labor_total: number
  upcoming_events: UpcomingEvent[]
  pending_approvals: PendingApproval[]
  cert_alerts: CertAlert[]
  tomorrow_staffing?: LocationStaffing[]
}

// ── Claude API call (inline for Deno) ───────────────────────────

async function generateBriefing(data: BriefingData, apiKey: string): Promise<string> {
  const systemPrompt = `You are CoverMe, an AI scheduling assistant for a multi-location restaurant group.

Generate a concise SMS briefing (MUST be under 1500 characters). Rules:
- Only mention what NEEDS attention. If everything is fine, say so briefly.
- Use numbers and be specific.
- Use simple emoji sparingly for visual scanning (checkmarks, warnings).
- Format for SMS readability (short lines, no markdown).
- For morning: full overview + action items + what needs attention today.
- For evening: end-of-day recap + tomorrow preview.
- If there are open shifts, mention which location and role.
- If there are pending approvals, tell the owner to reply APPROVE or DETAIL.
- Keep the tone professional but friendly — like a sharp operations manager.`

  const userMessage = `Generate a ${data.type} briefing for ${data.org_name} (${data.location_count} locations).

DATA:
${JSON.stringify(data, null, 2)}

Remember: under 1500 characters, SMS format, only surface what needs attention.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error (${response.status}): ${err}`)
  }

  const result = await response.json()
  const textBlock = result.content?.find(
    (b: { type: string; text?: string }) => b.type === 'text',
  )
  return textBlock?.text ?? ''
}

// ── Date helpers ────────────────────────────────────────────────

function todayET(): string {
  const now = new Date()
  // Convert to ET (America/New_York)
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  return et.toISOString().split('T')[0]
}

function yesterdayET(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  et.setDate(et.getDate() - 1)
  return et.toISOString().split('T')[0]
}

function tomorrowET(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  et.setDate(et.getDate() + 1)
  return et.toISOString().split('T')[0]
}

function addDaysET(days: number): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  et.setDate(et.getDate() + days)
  return et.toISOString().split('T')[0]
}

// ── Data aggregation helpers ────────────────────────────────────

async function getStaffingByLocation(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  date: string,
  locations: { id: string; name: string }[],
): Promise<LocationStaffing[]> {
  const results: LocationStaffing[] = []

  for (const loc of locations) {
    // Get shifts for this location on this date
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, employee_id, is_open, role_id, start_time, end_time')
      .eq('organization_id', orgId)
      .eq('location_id', loc.id)
      .eq('date', date)

    const allShifts = shifts ?? []
    const filled = allShifts.filter(s => !s.is_open && s.employee_id)
    const open = allShifts.filter(s => s.is_open || !s.employee_id)

    // Get role names for open shifts
    const openRoleIds = [...new Set(open.map(s => s.role_id))]
    let openRoles: string[] = []
    if (openRoleIds.length > 0) {
      const { data: roles } = await supabase
        .from('roles')
        .select('name')
        .in('id', openRoleIds)
      openRoles = (roles ?? []).map(r => r.name)
    }

    // Calculate labor cost: get employee hourly rates for filled shifts
    let laborCost = 0
    let totalHours = 0
    for (const shift of filled) {
      if (shift.employee_id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('hourly_rate')
          .eq('id', shift.employee_id)
          .single()

        const start = new Date(shift.start_time)
        const end = new Date(shift.end_time)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        totalHours += hours
        laborCost += hours * (emp?.hourly_rate ?? 15)
      }
    }

    results.push({
      location_name: loc.name,
      total_shifts: allShifts.length,
      filled_shifts: filled.length,
      open_shifts: open.length,
      open_roles: openRoles,
      labor_cost_estimate: Math.round(laborCost),
      total_hours: Math.round(totalHours * 10) / 10,
    })
  }

  return results
}

async function getCalloutSummary(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  date: string,
): Promise<CalloutSummary> {
  // Get callouts where the related shift is on the given date
  const { data: callouts } = await supabase
    .from('callouts')
    .select('id, status, resolution_time_seconds, shift_id')
    .eq('organization_id', orgId)

  // Filter to callouts for shifts on the target date
  const dateCallouts: typeof callouts = []
  for (const c of callouts ?? []) {
    const { data: shift } = await supabase
      .from('shifts')
      .select('date')
      .eq('id', c.shift_id)
      .single()
    if (shift?.date === date) {
      dateCallouts.push(c)
    }
  }

  const total = dateCallouts.length
  const autoFilled = dateCallouts.filter(c => c.status === 'filled').length
  const escalated = dateCallouts.filter(c => c.status === 'escalated').length
  const unfilled = dateCallouts.filter(c => c.status === 'pending' || c.status === 'unfilled').length

  const resolutionTimes = dateCallouts
    .filter(c => c.resolution_time_seconds !== null)
    .map(c => c.resolution_time_seconds!)

  return {
    total,
    auto_filled: autoFilled,
    escalated,
    unfilled,
    avg_resolution_seconds: resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : null,
  }
}

async function getUpcomingEvents(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  fromDate: string,
  toDate: string,
): Promise<UpcomingEvent[]> {
  const { data: events } = await supabase
    .from('events')
    .select('name, event_date, event_type, demand_multiplier, is_playoff')
    .eq('organization_id', orgId)
    .gte('event_date', fromDate)
    .lte('event_date', toDate)
    .order('event_date', { ascending: true })
    .limit(10)

  return (events ?? []).map(e => ({
    name: e.name,
    event_date: e.event_date,
    event_type: e.event_type,
    demand_multiplier: e.demand_multiplier,
    is_playoff: e.is_playoff,
  }))
}

async function getPendingApprovals(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<PendingApproval[]> {
  // Check staffing suggestions that are pending
  const { data: suggestions } = await supabase
    .from('staffing_suggestions')
    .select('id, suggested_date, role_id, location_id, created_at')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const approvals: PendingApproval[] = []
  for (const s of suggestions ?? []) {
    const { data: loc } = await supabase
      .from('locations')
      .select('name')
      .eq('id', s.location_id)
      .single()

    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', s.role_id)
      .single()

    approvals.push({
      type: 'staffing_suggestion',
      description: `Add ${role?.name ?? 'staff'} at ${loc?.name ?? 'location'} on ${s.suggested_date}`,
      employee_name: '',
      created_at: s.created_at,
    })
  }

  return approvals
}

async function getCertAlerts(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<CertAlert[]> {
  const thirtyDaysFromNow = addDaysET(30)
  const today = todayET()

  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('employee_id, cert_type, expires_at')
    .lte('expires_at', thirtyDaysFromNow)
    .gte('expires_at', today)

  const alerts: CertAlert[] = []
  for (const cert of certs ?? []) {
    const { data: emp } = await supabase
      .from('employees')
      .select('first_name, last_name, organization_id')
      .eq('id', cert.employee_id)
      .single()

    if (emp?.organization_id === orgId) {
      const expiresDate = new Date(cert.expires_at)
      const todayDate = new Date(today)
      const daysUntil = Math.ceil((expiresDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

      alerts.push({
        employee_name: `${emp.first_name} ${emp.last_name}`,
        cert_type: cert.cert_type,
        expires_at: cert.expires_at,
        days_until_expiry: daysUntil,
      })
    }
  }

  return alerts.sort((a, b) => a.days_until_expiry - b.days_until_expiry).slice(0, 5)
}

// ── Main handler ────────────────────────────────────────────────

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
    // ── Auth check: service role only ───────────────────────────
    const authHeader = req.headers.get('Authorization')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = authHeader?.replace('Bearer ', '')

    if (token !== supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — service role key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Parse body ──────────────────────────────────────────────
    const { type } = await req.json() as { type: 'morning' | 'evening' }
    if (type !== 'morning' && type !== 'evening') {
      return new Response(
        JSON.stringify({ error: 'type must be "morning" or "evening"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ── Fetch all organizations ─────────────────────────────────
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, owner_id')

    if (orgsError || !orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No organizations found', briefings_sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const results: { org_id: string; org_name: string; success: boolean; error?: string }[] = []

    for (const org of orgs) {
      try {
        console.log(`[daily-briefing] Processing org: ${org.name} (${org.id})`)

        // ── Find the owner's phone number ─────────────────────
        const { data: ownerEmp } = await supabase
          .from('employees')
          .select('id, phone, first_name')
          .eq('organization_id', org.id)
          .eq('user_id', org.owner_id)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (!ownerEmp?.phone) {
          console.warn(`[daily-briefing] No phone found for owner of ${org.name}`)
          results.push({ org_id: org.id, org_name: org.name, success: false, error: 'No owner phone' })
          continue
        }

        // ── Get locations ─────────────────────────────────────
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name')
          .eq('organization_id', org.id)
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (!locations || locations.length === 0) {
          results.push({ org_id: org.id, org_name: org.name, success: false, error: 'No locations' })
          continue
        }

        // ── Aggregate data ────────────────────────────────────
        const today = todayET()
        const yesterday = yesterdayET()
        const tomorrow = tomorrowET()
        const threeDaysOut = addDaysET(3)

        const [
          todayStaffing,
          yesterdayCallouts,
          upcomingEvents,
          pendingApprovals,
          certAlerts,
        ] = await Promise.all([
          getStaffingByLocation(supabase, org.id, today, locations),
          getCalloutSummary(supabase, org.id, yesterday),
          getUpcomingEvents(supabase, org.id, today, threeDaysOut),
          getPendingApprovals(supabase, org.id),
          getCertAlerts(supabase, org.id),
        ])

        const laborTotal = todayStaffing.reduce((sum, l) => sum + l.labor_cost_estimate, 0)

        // For evening briefings, also get tomorrow's staffing
        let tomorrowStaffing: LocationStaffing[] | undefined
        if (type === 'evening') {
          tomorrowStaffing = await getStaffingByLocation(supabase, org.id, tomorrow, locations)
        }

        const briefingData: BriefingData = {
          type,
          org_name: org.name,
          location_count: locations.length,
          today_staffing: todayStaffing,
          yesterday_callouts: yesterdayCallouts,
          labor_total: laborTotal,
          upcoming_events: upcomingEvents,
          pending_approvals: pendingApprovals,
          cert_alerts: certAlerts,
          tomorrow_staffing: tomorrowStaffing,
        }

        // ── Generate briefing via Claude ──────────────────────
        const briefingContent = await generateBriefing(briefingData, anthropicKey)

        if (!briefingContent) {
          results.push({ org_id: org.id, org_name: org.name, success: false, error: 'Empty briefing generated' })
          continue
        }

        // ── Send via send-sms ─────────────────────────────────
        const sendUrl = `${supabaseUrl}/functions/v1/send-sms`
        const sendRes = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: ownerEmp.phone,
            body: briefingContent,
            context: 'owner_briefing',
            organization_id: org.id,
            employee_id: ownerEmp.id,
          }),
        })

        const sendResult = await sendRes.json()

        // ── Log briefing ──────────────────────────────────────
        await supabase.from('briefings').insert({
          organization_id: org.id,
          type,
          recipient_phone: ownerEmp.phone,
          content: briefingContent,
          data_snapshot: briefingData as unknown as Record<string, unknown>,
          twilio_sid: sendResult.message_sid ?? null,
        })

        console.log(`[daily-briefing] Sent ${type} briefing to ${ownerEmp.phone} for ${org.name}`)
        results.push({ org_id: org.id, org_name: org.name, success: true })

      } catch (orgError) {
        console.error(`[daily-briefing] Error for org ${org.name}:`, orgError)
        results.push({
          org_id: org.id,
          org_name: org.name,
          success: false,
          error: (orgError as Error).message,
        })
      }
    }

    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        type,
        briefings_sent: sent,
        briefings_failed: failed,
        details: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('[daily-briefing] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
