/**
 * CoverMe.ai — Owner Chat Edge Function (Phase 6)
 *
 * Handles structured commands (TODAY, DETAIL, LABOR, etc.) and natural
 * language queries from the owner via SMS. Called by sms-webhook.
 *
 * POST /functions/v1/owner-chat
 * Authorization: Bearer <service_role_key>
 * Body: {
 *   organization_id: "uuid",
 *   phone_number: "+1...",
 *   message: "how did Hamilton do last week?",
 *   command: "DETAIL" | "TODAY" | "YESTERDAY" | "LABOR" | "SCHEDULE" | "APPROVE" | "DENY" | null,
 *   args?: string[]
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ────────────────────────────────────────────────────────

interface OwnerChatRequest {
  organization_id: string
  phone_number: string
  message: string
  command: string | null
  args?: string[]
}

interface LocationStaffing {
  location_name: string
  location_id: string
  total_shifts: number
  filled_shifts: number
  open_shifts: number
  open_roles: string[]
  labor_cost_estimate: number
  total_hours: number
}

// ── Date helpers ────────────────────────────────────────────────

function todayET(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  return et.toISOString().split('T')[0]
}

function yesterdayET(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  et.setDate(et.getDate() - 1)
  return et.toISOString().split('T')[0]
}

function weekStartET(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const dayOfWeek = et.getDay()
  et.setDate(et.getDate() - dayOfWeek) // Sunday = start of week
  return et.toISOString().split('T')[0]
}

function weekEndET(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const dayOfWeek = et.getDay()
  et.setDate(et.getDate() + (6 - dayOfWeek)) // Saturday = end of week
  return et.toISOString().split('T')[0]
}

// ── Data helpers ────────────────────────────────────────────────

async function getLocations(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('locations')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name', { ascending: true })
  return data ?? []
}

async function getStaffingForDate(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  date: string,
  locations: { id: string; name: string }[],
): Promise<LocationStaffing[]> {
  const results: LocationStaffing[] = []

  for (const loc of locations) {
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, employee_id, is_open, role_id, start_time, end_time')
      .eq('organization_id', orgId)
      .eq('location_id', loc.id)
      .eq('date', date)

    const allShifts = shifts ?? []
    const filled = allShifts.filter(s => !s.is_open && s.employee_id)
    const open = allShifts.filter(s => s.is_open || !s.employee_id)

    const openRoleIds = [...new Set(open.map(s => s.role_id))]
    let openRoles: string[] = []
    if (openRoleIds.length > 0) {
      const { data: roles } = await supabase
        .from('roles')
        .select('name')
        .in('id', openRoleIds)
      openRoles = (roles ?? []).map(r => r.name)
    }

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
      location_id: loc.id,
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

async function getCalloutsSummary(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  date: string,
) {
  const { data: callouts } = await supabase
    .from('callouts')
    .select('id, status, resolution_time_seconds, shift_id, reason, filled_by_employee_id')
    .eq('organization_id', orgId)

  const dateCallouts: typeof callouts = []
  for (const c of callouts ?? []) {
    const { data: shift } = await supabase
      .from('shifts')
      .select('date')
      .eq('id', c.shift_id)
      .single()
    if (shift?.date === date) dateCallouts.push(c)
  }

  return {
    total: dateCallouts.length,
    auto_filled: dateCallouts.filter(c => c.status === 'filled').length,
    escalated: dateCallouts.filter(c => c.status === 'escalated').length,
    unfilled: dateCallouts.filter(c => c.status === 'pending' || c.status === 'unfilled').length,
  }
}

// ── Claude API call ─────────────────────────────────────────────

async function askClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
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

// ── Command handlers ────────────────────────────────────────────

async function handleToday(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  const today = todayET()
  const locations = await getLocations(supabase, orgId)
  const staffing = await getStaffingForDate(supabase, orgId, today, locations)

  const totalShifts = staffing.reduce((s, l) => s + l.total_shifts, 0)
  const filledShifts = staffing.reduce((s, l) => s + l.filled_shifts, 0)
  const openShifts = staffing.reduce((s, l) => s + l.open_shifts, 0)
  const laborTotal = staffing.reduce((s, l) => s + l.labor_cost_estimate, 0)
  const pct = totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 100

  let msg = `Today (${today}) across ${locations.length} stores:\n\n`
  msg += `Staff: ${filledShifts}/${totalShifts} shifts filled (${pct}%)\n`

  // Show locations with open shifts
  const problemLocations = staffing.filter(l => l.open_shifts > 0)
  if (problemLocations.length > 0) {
    for (const loc of problemLocations) {
      const roles = loc.open_roles.length > 0 ? loc.open_roles.join(', ') : 'staff'
      msg += `\u26a0\ufe0f ${loc.location_name}: needs ${loc.open_shifts} ${roles}\n`
    }
  } else {
    msg += `\u2705 All shifts filled!\n`
  }

  msg += `\nLabor est: $${laborTotal.toLocaleString()}`
  msg += `\n\nReply DETAIL [1-${locations.length}] for location details.`

  return msg
}

async function handleYesterday(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  const yesterday = yesterdayET()
  const locations = await getLocations(supabase, orgId)
  const staffing = await getStaffingForDate(supabase, orgId, yesterday, locations)
  const callouts = await getCalloutsSummary(supabase, orgId, yesterday)

  const totalShifts = staffing.reduce((s, l) => s + l.total_shifts, 0)
  const filledShifts = staffing.reduce((s, l) => s + l.filled_shifts, 0)
  const laborTotal = staffing.reduce((s, l) => s + l.labor_cost_estimate, 0)
  const pct = totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 100

  let msg = `Yesterday (${yesterday}) recap:\n\n`
  msg += `Shifts completed: ${filledShifts}/${totalShifts} (${pct}%)\n`

  if (callouts.total > 0) {
    msg += `\nCallouts: ${callouts.total}\n`
    if (callouts.auto_filled > 0) msg += `  \u2705 Auto-filled: ${callouts.auto_filled}\n`
    if (callouts.escalated > 0) msg += `  \u26a0\ufe0f Escalated: ${callouts.escalated}\n`
    if (callouts.unfilled > 0) msg += `  \u274c Unfilled: ${callouts.unfilled}\n`
  } else {
    msg += `\nNo callouts \u2705\n`
  }

  msg += `\nLabor: $${laborTotal.toLocaleString()}`

  return msg
}

async function handleDetail(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  locationNumber: number,
): Promise<string> {
  const locations = await getLocations(supabase, orgId)

  if (locationNumber < 1 || locationNumber > locations.length) {
    return `Invalid location number. You have ${locations.length} locations (1-${locations.length}). Reply DETAIL [number].`
  }

  const loc = locations[locationNumber - 1]
  const today = todayET()

  // Get today's shifts with employee and role details
  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, employee_id, is_open, role_id, start_time, end_time, status')
    .eq('organization_id', orgId)
    .eq('location_id', loc.id)
    .eq('date', today)
    .order('start_time', { ascending: true })

  const allShifts = shifts ?? []
  const filled = allShifts.filter(s => !s.is_open && s.employee_id)
  const open = allShifts.filter(s => s.is_open || !s.employee_id)

  let msg = `${loc.name} — Detail (${today}):\n\n`
  msg += `Shifts: ${filled.length}/${allShifts.length} filled\n\n`

  // Show who's working
  if (filled.length > 0) {
    msg += `Working today:\n`
    for (const shift of filled.slice(0, 10)) {
      const { data: emp } = await supabase
        .from('employees')
        .select('first_name, last_name')
        .eq('id', shift.employee_id!)
        .single()
      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', shift.role_id)
        .single()
      const start = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const end = new Date(shift.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      msg += `  ${emp?.first_name ?? '?'} ${emp?.last_name?.charAt(0) ?? ''} — ${role?.name ?? 'staff'} ${start}-${end}\n`
    }
    if (filled.length > 10) msg += `  ...and ${filled.length - 10} more\n`
  }

  // Show open shifts
  if (open.length > 0) {
    msg += `\n\u26a0\ufe0f Open shifts:\n`
    for (const shift of open) {
      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', shift.role_id)
        .single()
      const start = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const end = new Date(shift.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      msg += `  ${role?.name ?? 'staff'} ${start}-${end}\n`
    }
  }

  // Recent callouts at this location
  const { data: recentCallouts } = await supabase
    .from('callouts')
    .select('id, status, reason, employee_id, shift_id')
    .eq('organization_id', orgId)
    .order('reported_at', { ascending: false })
    .limit(20)

  let locCallouts = 0
  for (const c of recentCallouts ?? []) {
    const { data: shift } = await supabase
      .from('shifts')
      .select('location_id, date')
      .eq('id', c.shift_id)
      .single()
    if (shift?.location_id === loc.id && shift?.date === today) locCallouts++
  }

  if (locCallouts > 0) {
    msg += `\nCallouts today: ${locCallouts}`
  }

  // Labor estimate
  let laborCost = 0
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
      laborCost += hours * (emp?.hourly_rate ?? 15)
    }
  }
  msg += `\nLabor est: $${Math.round(laborCost).toLocaleString()}`

  return msg
}

async function handleLabor(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  const weekStart = weekStartET()
  const weekEnd = weekEndET()
  const locations = await getLocations(supabase, orgId)

  let msg = `Labor — Week of ${weekStart}:\n\n`
  let weekTotal = 0
  let weekHours = 0

  for (const loc of locations) {
    const { data: shifts } = await supabase
      .from('shifts')
      .select('employee_id, start_time, end_time')
      .eq('organization_id', orgId)
      .eq('location_id', loc.id)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .not('employee_id', 'is', null)

    let locCost = 0
    let locHours = 0
    for (const shift of shifts ?? []) {
      const { data: emp } = await supabase
        .from('employees')
        .select('hourly_rate')
        .eq('id', shift.employee_id!)
        .single()
      const start = new Date(shift.start_time)
      const end = new Date(shift.end_time)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      locHours += hours
      locCost += hours * (emp?.hourly_rate ?? 15)
    }

    weekTotal += locCost
    weekHours += locHours
    msg += `${loc.name}: $${Math.round(locCost).toLocaleString()} (${Math.round(locHours)}h)\n`
  }

  msg += `\nTotal: $${Math.round(weekTotal).toLocaleString()} (${Math.round(weekHours)}h)`
  msg += `\n\n(POS integration for labor % coming soon)`

  return msg
}

async function handleSchedule(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  const today = todayET()
  const locations = await getLocations(supabase, orgId)
  const staffing = await getStaffingForDate(supabase, orgId, today, locations)

  let msg = `Today's schedule (${today}):\n\n`

  for (let i = 0; i < staffing.length; i++) {
    const s = staffing[i]
    const status = s.open_shifts > 0 ? `\u26a0\ufe0f ${s.open_shifts} open` : '\u2705'
    msg += `${i + 1}. ${s.location_name}: ${s.filled_shifts}/${s.total_shifts} filled ${status}\n`
  }

  const totalFilled = staffing.reduce((sum, l) => sum + l.filled_shifts, 0)
  const totalShifts = staffing.reduce((sum, l) => sum + l.total_shifts, 0)
  msg += `\nTotal: ${totalFilled}/${totalShifts}`
  msg += `\nReply DETAIL [1-${locations.length}] for who's working.`

  return msg
}

async function handleApprove(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  // Find the most recent pending staffing suggestion
  const { data: pending } = await supabase
    .from('staffing_suggestions')
    .select('id, suggested_date, role_id, location_id, suggested_headcount, current_headcount')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!pending) {
    return 'No pending approvals right now. You\'re all caught up!'
  }

  // Approve it
  await supabase
    .from('staffing_suggestions')
    .update({
      status: 'approved',
      approved_headcount: pending.suggested_headcount,
    })
    .eq('id', pending.id)

  const { data: loc } = await supabase.from('locations').select('name').eq('id', pending.location_id).single()
  const { data: role } = await supabase.from('roles').select('name').eq('id', pending.role_id).single()

  return `\u2705 Approved: Add ${pending.suggested_headcount - pending.current_headcount} ${role?.name ?? 'staff'} at ${loc?.name ?? 'location'} on ${pending.suggested_date}.`
}

async function handleDeny(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<string> {
  const { data: pending } = await supabase
    .from('staffing_suggestions')
    .select('id, suggested_date, role_id, location_id')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!pending) {
    return 'No pending items to deny. You\'re all caught up!'
  }

  await supabase
    .from('staffing_suggestions')
    .update({ status: 'denied' })
    .eq('id', pending.id)

  const { data: loc } = await supabase.from('locations').select('name').eq('id', pending.location_id).single()

  return `Denied staffing suggestion for ${loc?.name ?? 'location'} on ${pending.suggested_date}.`
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
    // ── Auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = authHeader?.replace('Bearer ', '')

    if (token !== supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    // ── Parse request ────────────────────────────────────────────
    const body: OwnerChatRequest = await req.json()
    const { organization_id, phone_number, message, command, args } = body

    if (!organization_id || !phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, phone_number, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const startTime = Date.now()
    let responseText: string
    let aiModel: string | null = null

    // ── Route to command handler ─────────────────────────────────
    if (command) {
      switch (command) {
        case 'TODAY':
          responseText = await handleToday(supabase, organization_id)
          break
        case 'YESTERDAY':
          responseText = await handleYesterday(supabase, organization_id)
          break
        case 'DETAIL': {
          const locNum = args?.[0] ? parseInt(args[0], 10) : 1
          responseText = await handleDetail(supabase, organization_id, locNum)
          break
        }
        case 'LABOR':
          responseText = await handleLabor(supabase, organization_id)
          break
        case 'SCHEDULE':
          responseText = await handleSchedule(supabase, organization_id)
          break
        case 'APPROVE':
          responseText = await handleApprove(supabase, organization_id)
          break
        case 'DENY':
          responseText = await handleDeny(supabase, organization_id)
          break
        default:
          responseText = `Unknown command: ${command}. Reply HELP for available commands.`
      }
    } else {
      // ── Natural language query via Claude ───────────────────────
      if (!anthropicKey) {
        responseText = 'AI chat is not configured yet. Use commands: TODAY, YESTERDAY, DETAIL [n], LABOR, SCHEDULE, APPROVE, DENY, HELP.'
      } else {
        // Build context
        const locations = await getLocations(supabase, organization_id)
        const today = todayET()
        const staffing = await getStaffingForDate(supabase, organization_id, today, locations)
        const callouts = await getCalloutsSummary(supabase, organization_id, today)

        const { data: events } = await supabase
          .from('events')
          .select('name, event_date, event_type, demand_multiplier, is_playoff')
          .eq('organization_id', organization_id)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(5)

        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organization_id)
          .single()

        const { data: pendingSuggestions } = await supabase
          .from('staffing_suggestions')
          .select('id, suggested_date, role_id, location_id')
          .eq('organization_id', organization_id)
          .eq('status', 'pending')
          .limit(5)

        const pendingApprovals = []
        for (const s of pendingSuggestions ?? []) {
          const { data: loc } = await supabase.from('locations').select('name').eq('id', s.location_id).single()
          const { data: role } = await supabase.from('roles').select('name').eq('id', s.role_id).single()
          pendingApprovals.push({
            type: 'staffing_suggestion',
            description: `Add ${role?.name ?? 'staff'} at ${loc?.name ?? 'location'} on ${s.suggested_date}`,
            employee_name: '',
            created_at: '',
          })
        }

        const context = {
          org_name: org?.name ?? 'Your restaurant',
          locations: locations.map(l => ({ id: l.id, name: l.name })),
          today_staffing: staffing,
          recent_callouts: callouts,
          upcoming_events: (events ?? []).map(e => ({
            name: e.name,
            event_date: e.event_date,
            event_type: e.event_type,
            demand_multiplier: e.demand_multiplier,
            is_playoff: e.is_playoff,
          })),
          pending_approvals: pendingApprovals,
        }

        const systemPrompt = `You are CoverMe, an AI scheduling assistant for a multi-location restaurant group called "${context.org_name}".

Answer the owner's question about their restaurants using the provided data. Rules:
- Be concise (under 1500 characters, this is an SMS reply).
- Use numbers and be specific.
- If you don't have the data to answer, say so honestly.
- Use simple emoji sparingly for visual scanning.
- Format for SMS readability (short lines, no markdown).
- Keep the tone professional but friendly.
- If the owner asks about a specific location, focus on that one.
- Mention available commands (TODAY, DETAIL, LABOR, etc.) when relevant.
- Today's date is ${todayET()}.`

        responseText = await askClaude(
          systemPrompt,
          `Owner's question: "${message}"\n\nCURRENT DATA:\n${JSON.stringify(context, null, 2)}`,
          anthropicKey,
        )
        aiModel = 'claude-sonnet-4-20250514'
      }
    }

    const responseTimeMs = Date.now() - startTime

    // ── Log query ────────────────────────────────────────────────
    await supabase.from('owner_queries').insert({
      organization_id,
      query: message,
      parsed_command: command,
      response: responseText,
      response_time_ms: responseTimeMs,
      ai_model: aiModel,
    })

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        command,
        response_time_ms: responseTimeMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('[owner-chat] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
