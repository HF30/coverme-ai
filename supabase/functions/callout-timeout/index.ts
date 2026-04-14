/**
 * CoverMe.ai — Callout Timeout Handler (Phase 4)
 *
 * Called after the 10-minute timeout for a batch of shift offers.
 * If no one accepted, marks non-responders as 'no_response',
 * sends the next batch, or escalates.
 *
 * POST /functions/v1/callout-timeout
 * Authorization: Bearer <service_role_key>
 * Body: { "callout_id": "uuid", "batch": 1 }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    return res.ok
  } catch (e) {
    console.error(`[callout-timeout] send-sms error:`, e)
    return false
  }
}

// ── Escalation ───────────────────────────────────────────────────────

async function escalateToManager(
  supabase: SupabaseClient,
  supabaseUrl: string,
  supabaseKey: string,
  callout: { id: string; organization_id: string; shift_id: string },
  shift: { id: string; location_id: string; date: string; start_time: string; role_id: string },
): Promise<void> {
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', callout.organization_id)
    .single()

  if (!org) return

  const { data: ownerEmp } = await supabase
    .from('employees')
    .select('id, phone, first_name')
    .eq('user_id', org.owner_id)
    .eq('organization_id', callout.organization_id)
    .limit(1)
    .single()

  if (!ownerEmp) {
    console.warn('[callout-timeout] No owner employee record for escalation')
    return
  }

  const { data: loc } = await supabase.from('locations').select('name').eq('id', shift.location_id).single()
  const { data: role } = await supabase.from('roles').select('name').eq('id', shift.role_id).single()
  const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const shiftDesc = `${role?.name ?? 'shift'} at ${loc?.name ?? 'location'} on ${shift.date} ${startTime}`

  await sendSMS(supabaseUrl, supabaseKey, {
    to: ownerEmp.phone,
    body: `Warning: Can't auto-fill ${shiftDesc}. Need your help finding coverage. Reply with a name or call the team.`,
    context: 'shift_offer',
    organization_id: callout.organization_id,
    employee_id: ownerEmp.id,
    related_callout_id: callout.id,
    related_shift_id: shift.id,
  })

  console.log(`[callout-timeout] Escalation sent to owner ${ownerEmp.first_name}`)
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { callout_id, batch } = await req.json()
    if (!callout_id || batch == null) {
      return new Response(
        JSON.stringify({ error: 'callout_id and batch are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[callout-timeout] Processing timeout for callout ${callout_id}, batch ${batch}`)

    // ── Check callout status ──────────────────────────────────────
    const { data: callout } = await supabase
      .from('callouts')
      .select('id, organization_id, shift_id, employee_id, status')
      .eq('id', callout_id)
      .single()

    if (!callout) {
      return new Response(
        JSON.stringify({ error: 'Callout not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Already resolved — nothing to do
    if (callout.status === 'filled') {
      console.log(`[callout-timeout] Callout ${callout_id} already filled, skipping`)
      return new Response(
        JSON.stringify({ success: true, status: 'already_filled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (callout.status !== 'auto_filling') {
      return new Response(
        JSON.stringify({ success: true, status: callout.status, message: 'Not in auto_filling state' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Check if someone accepted in this batch ───────────────────
    const { data: acceptedCandidate } = await supabase
      .from('callout_candidates')
      .select('id')
      .eq('callout_id', callout_id)
      .eq('batch_number', batch)
      .eq('response', 'accepted')
      .limit(1)
      .single()

    if (acceptedCandidate) {
      console.log(`[callout-timeout] Batch ${batch} had an acceptance, callout should be filled`)
      return new Response(
        JSON.stringify({ success: true, status: 'accepted_in_batch' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Mark non-responders as 'no_response' ──────────────────────
    const { data: pendingCandidates } = await supabase
      .from('callout_candidates')
      .select('id, employee_id')
      .eq('callout_id', callout_id)
      .eq('batch_number', batch)
      .is('response', null)

    for (const pc of pendingCandidates ?? []) {
      await supabase
        .from('callout_candidates')
        .update({ response: 'no_response', responded_at: new Date().toISOString() })
        .eq('id', pc.id)

      // Clear their conversation context
      await supabase
        .from('conversation_context')
        .update({ current_context: 'idle', context_data: null, expires_at: null })
        .eq('phone_number', (
          await supabase.from('employees').select('phone').eq('id', pc.employee_id).single()
        ).data?.phone ?? '')
    }

    // ── Get all previously contacted employees ────────────────────
    const { data: allPrevious } = await supabase
      .from('callout_candidates')
      .select('employee_id')
      .eq('callout_id', callout_id)

    const excludeIds = [
      callout.employee_id,
      ...(allPrevious ?? []).map((p: { employee_id: string }) => p.employee_id),
    ]

    // ── Load shift for re-ranking ─────────────────────────────────
    const { data: shift } = await supabase
      .from('shifts')
      .select('id, organization_id, location_id, role_id, date, start_time, end_time')
      .eq('id', callout.shift_id)
      .single()

    if (!shift) {
      return new Response(
        JSON.stringify({ error: 'Shift not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Try next batch by calling auto-fill again ─────────────────
    // We call the auto-fill function logic inline since we already have all the data.
    // For the next batch, we need to re-rank excluding all previous candidates.

    // Quick inline rank: just call the auto-fill endpoint with the same callout
    // But first check if there are any candidates left
    // Load remaining employees
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', callout.organization_id)
      .eq('is_active', true)

    const remainingCount = (allEmployees ?? []).filter(
      (e: { id: string }) => !excludeIds.includes(e.id),
    ).length

    if (remainingCount === 0) {
      // No more candidates — escalate
      console.log(`[callout-timeout] No more candidates, escalating callout ${callout_id}`)
      await supabase
        .from('callouts')
        .update({ status: 'escalated', escalated_at: new Date().toISOString() })
        .eq('id', callout_id)

      await escalateToManager(supabase, supabaseUrl, supabaseKey, callout, shift)

      return new Response(
        JSON.stringify({ success: true, status: 'escalated', reason: 'No more candidates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Send next batch ───────────────────────────────────────────
    // Re-trigger auto-fill. The auto-fill function will see status='auto_filling'
    // and re-rank excluding all previous candidates.
    // We need to implement the next-batch logic here directly.
    console.log(`[callout-timeout] Sending next batch for callout ${callout_id}`)

    const nextBatch = batch + 1
    await processNextBatch(supabase, supabaseUrl, supabaseKey, callout, shift, excludeIds, nextBatch)

    return new Response(
      JSON.stringify({ success: true, status: 'next_batch_sent', batch: nextBatch }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('[callout-timeout] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ── Process next batch (inline mini-ranker + send) ───────────────────

async function processNextBatch(
  supabase: SupabaseClient,
  supabaseUrl: string,
  supabaseKey: string,
  callout: { id: string; organization_id: string; shift_id: string; employee_id: string },
  shift: { id: string; organization_id: string; location_id: string; role_id: string; date: string; start_time: string; end_time: string },
  excludeIds: string[],
  batchNumber: number,
): Promise<void> {
  // Call auto-fill endpoint to do the ranking and sending.
  // But the auto-fill function checks for 'pending' or 'auto_filling' status,
  // so it will work since we're still in 'auto_filling'.

  // Actually, let's inline the ranking and sending to avoid circular calls.
  // We need the same ranking logic. For efficiency, we call the auto-fill function
  // but it will skip the reliability update since it's already done.

  // Simpler approach: just call auto-fill again. It accepts 'auto_filling' status.
  // But it doesn't know about excludeIds from previous batches.
  // So we need to inline the logic here.

  // Load employees (excluding previous)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, phone, primary_location_id, can_float, max_hours_per_week, reliability_score')
    .eq('organization_id', callout.organization_id)
    .eq('is_active', true)

  const candidates = (employees ?? []).filter(
    (e: { id: string }) => !excludeIds.includes(e.id),
  )

  if (candidates.length === 0) {
    // Escalate
    await supabase
      .from('callouts')
      .update({ status: 'escalated', escalated_at: new Date().toISOString() })
      .eq('id', callout.id)
    await escalateToManager(supabase, supabaseUrl, supabaseKey, callout, shift)
    return
  }

  // Quick check: do they have the role?
  const { data: empRoles } = await supabase
    .from('employee_roles')
    .select('employee_id')
    .eq('role_id', shift.role_id)
    .in('employee_id', candidates.map((c: { id: string }) => c.id))

  const qualifiedIds = new Set((empRoles ?? []).map((er: { employee_id: string }) => er.employee_id))
  const qualified = candidates
    .filter((c: { id: string }) => qualifiedIds.has(c.id))
    .sort((a: { reliability_score: number }, b: { reliability_score: number }) => b.reliability_score - a.reliability_score)

  if (qualified.length === 0) {
    await supabase
      .from('callouts')
      .update({ status: 'escalated', escalated_at: new Date().toISOString() })
      .eq('id', callout.id)
    await escalateToManager(supabase, supabaseUrl, supabaseKey, callout, shift)
    return
  }

  // Take top 3
  const batch = qualified.slice(0, 3)

  const { data: roleName } = await supabase.from('roles').select('name').eq('id', shift.role_id).single()
  const { data: locName } = await supabase.from('locations').select('name').eq('id', shift.location_id).single()
  const startTime = new Date(shift.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTime = new Date(shift.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const timeRange = `${startTime}-${endTime}`

  for (const emp of batch) {
    await supabase.from('callout_candidates').insert({
      callout_id: callout.id,
      employee_id: emp.id,
      batch_number: batchNumber,
      score: emp.reliability_score, // simplified score for subsequent batches
      offered_at: new Date().toISOString(),
      response: null,
    })

    const offerMsg = `Hey ${emp.first_name}, can you cover a ${roleName?.name ?? 'shift'} at ${locName?.name ?? 'the restaurant'} on ${shift.date} ${timeRange}? Reply YES or NO`

    await sendSMS(supabaseUrl, supabaseKey, {
      to: emp.phone,
      body: offerMsg,
      context: 'shift_offer',
      organization_id: callout.organization_id,
      employee_id: emp.id,
      related_callout_id: callout.id,
      related_shift_id: shift.id,
      set_context: {
        current_context: 'awaiting_shift_reply',
        context_data: {
          callout_id: callout.id,
          shift_id: shift.id,
          batch_number: batchNumber,
        },
        expires_in_minutes: 12,
      },
    })

    console.log(`[callout-timeout] Batch ${batchNumber} offer sent to ${emp.first_name} ${emp.last_name}`)
  }

  // Schedule next timeout
  setTimeout(async () => {
    try {
      await fetch(`${supabaseUrl}/functions/v1/callout-timeout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callout_id: callout.id, batch: batchNumber }),
      })
    } catch (e) {
      console.error('[callout-timeout] next timeout trigger failed:', e)
    }
  }, 10 * 60 * 1000)
}
