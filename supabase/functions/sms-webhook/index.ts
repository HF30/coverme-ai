/**
 * CoverMe.ai — SMS Webhook Edge Function
 *
 * Receives incoming SMS from Twilio, identifies the sender, parses intent,
 * routes to the appropriate handler, logs everything to sms_conversations,
 * and returns a TwiML response.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

// ── CORS ──────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ─────────────────────────────────────────────────────────
interface TwilioWebhookPayload {
  MessageSid: string
  AccountSid: string
  From: string
  To: string
  Body: string
  NumMedia: string
  NumSegments: string
  SmsStatus: string
}

type SMSIntent =
  | { type: 'callout'; shift_date?: string; reason?: string }
  | { type: 'shift_reply'; response: 'yes' | 'no' | 'maybe' }
  | { type: 'owner_command'; command: string; args?: string[] }
  | { type: 'swap_request'; target_date?: string }
  | { type: 'unknown'; raw: string }

// ── Intent parser (mirrors src/lib/sms/parser.ts for Deno) ───────
const YES_PATTERNS = [
  /^y(es|eah|ep|up|a)?$/i, /^sure$/i, /^ok(ay)?$/i,
  /^i('?m| am) (in|down|good)$/i, /^i can (do it|make it|cover|work)$/i,
  /^(sounds|looks) good$/i, /^(definitely|absolutely|for sure)$/i,
  /^count me in$/i, /^(bet|aight|ight)$/i,
]
const NO_PATTERNS = [
  /^n(o|ah|ope)?$/i, /^(sorry|sry),?\s*(can'?t|no|not|i can'?t).*$/i,
  /^can'?t( (do it|make it|cover|work))?$/i, /^i('?m| am) (not|busy|unavailable)$/i,
  /^(not|won'?t be) (available|able)$/i, /^pass$/i, /^no (thanks|way|can do)$/i,
]
const MAYBE_PATTERNS = [
  /^maybe$/i, /^(let me|i('?ll| will)) (check|think|see|get back).*$/i,
  /^not sure$/i, /^(possibly|perhaps)$/i, /^i('?ll| will) let you know$/i,
]
const CALLOUT_PATTERNS = [
  /can'?t (come|make|show|get) (in|it|up|there)/i,
  /not (going to|gonna) (make|come|show|be)/i,
  /call(ing)? (in|out|off)/i, /i('?m| am) sick/i,
  /don'?t feel (well|good)/i, /throwing up/i, /food poisoning/i,
  /car (broke|won'?t start|trouble|accident)/i,
  /family emergency/i, /emergency/i, /i('?m| am) (not well|ill|unwell)/i,
  /need(ing)? (the day|today|tomorrow) off/i,
  /won'?t be (in|there|at work|able)/i, /have to miss/i,
]
const OWNER_COMMANDS: Record<string, RegExp> = {
  TODAY: /^today$/i, YESTERDAY: /^yesterday$/i,
  DETAIL: /^detail\s+(\d+)$/i, LABOR: /^labor$/i,
  SCHEDULE: /^schedule$/i, APPROVE: /^approve$/i,
  DENY: /^deny$/i, HELP: /^help$/i,
}
const SWAP_PATTERNS = [/swap/i, /switch/i, /trade/i, /can (someone|anyone) take/i]

function extractDate(msg: string): string | undefined {
  const l = msg.toLowerCase()
  const today = new Date()
  if (l.includes('today')) return today.toISOString().split('T')[0]
  if (l.includes('tomorrow')) {
    const d = new Date(today); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  for (let i = 0; i < days.length; i++) {
    if (l.includes(days[i])) {
      let diff = i - today.getDay()
      if (diff <= 0) diff += 7
      const d = new Date(today); d.setDate(d.getDate() + diff)
      return d.toISOString().split('T')[0]
    }
  }
  return undefined
}

function extractReason(msg: string): string | undefined {
  const l = msg.toLowerCase()
  if (l.includes('sick') || l.includes("don't feel") || l.includes('throwing up') || l.includes('ill')) return 'sick'
  if (l.includes('car')) return 'transportation'
  if (l.includes('emergency')) return 'emergency'
  if (l.includes('family')) return 'family'
  return undefined
}

function parseIntent(message: string, role: string): SMSIntent {
  const t = message.trim()
  if (role === 'owner' || role === 'manager') {
    for (const [cmd, pat] of Object.entries(OWNER_COMMANDS)) {
      const m = t.match(pat)
      if (m) { const a = m.slice(1).filter(Boolean); return { type: 'owner_command', command: cmd, args: a.length ? a : undefined } }
    }
  }
  if (/^help$/i.test(t)) return { type: 'owner_command', command: 'HELP' }
  for (const p of YES_PATTERNS) if (p.test(t)) return { type: 'shift_reply', response: 'yes' }
  for (const p of NO_PATTERNS) if (p.test(t)) return { type: 'shift_reply', response: 'no' }
  for (const p of MAYBE_PATTERNS) if (p.test(t)) return { type: 'shift_reply', response: 'maybe' }
  for (const p of CALLOUT_PATTERNS) if (p.test(t)) return { type: 'callout', shift_date: extractDate(t), reason: extractReason(t) }
  for (const p of SWAP_PATTERNS) if (p.test(t)) return { type: 'swap_request', target_date: extractDate(t) }
  if (/^schedule$/i.test(t)) return { type: 'owner_command', command: 'SCHEDULE' }
  if (/^avail(ability)?$/i.test(t)) return { type: 'owner_command', command: 'AVAIL' }
  return { type: 'unknown', raw: t }
}

// ── Templates (mirrors src/lib/sms/templates.ts) ─────────────────
const templates = {
  calloutReceived: (name: string) => `Got it ${name}, we're finding a replacement now. Feel better!`,
  shiftConfirmed: (name: string, location: string, date: string, time: string) =>
    `Confirmed! You're working at ${location} on ${date} ${time}. Thanks ${name}!`,
  shiftDeclined: (name: string) => `No worries ${name}, we'll find someone else. Thanks for the quick reply!`,
  unknownMessage: () => `Thanks for your message. Reply HELP for available commands.`,
  swapReceived: (name: string) => `Got it ${name}, your swap request has been submitted. We'll let you know when it's approved.`,
  helpMenu: (role: string) =>
    (role === 'owner' || role === 'manager')
      ? 'CoverMe Commands:\nTODAY - today\'s overview\nYESTERDAY - yesterday\'s recap\nDETAIL [n] - location detail\nLABOR - labor % all stores\nSCHEDULE - today\'s staffing\nAPPROVE - pending approvals\nDENY - deny pending item\nHELP - this menu'
      : 'CoverMe Commands:\nSCHEDULE - your upcoming shifts\nSWAP - request a shift swap\nAVAIL - update your availability\nHELP - this menu',
}

// ── Twilio signature validation ──────────────────────────────────
function validateSignature(authToken: string, signature: string, url: string, params: Record<string, string>): boolean {
  const data = url + Object.keys(params).sort().reduce((a, k) => a + k + params[k], '')
  const computed = createHmac('sha1', authToken).update(data).digest('base64')
  if (computed.length !== signature.length) return false
  let result = 0
  for (let i = 0; i < computed.length; i++) result |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
  return result === 0
}

// ── TwiML helpers ────────────────────────────────────────────────
function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
function twiml(message?: string) {
  if (message) return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
}

// ── Main handler ─────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS preflight
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
    // ── Parse form body ────────────────────────────────────────
    const rawBody = await req.text()
    const formData = new URLSearchParams(rawBody)
    const params: Record<string, string> = {}
    formData.forEach((v, k) => { params[k] = v })

    const payload: TwilioWebhookPayload = {
      MessageSid: params.MessageSid ?? '',
      AccountSid: params.AccountSid ?? '',
      From: params.From ?? '',
      To: params.To ?? '',
      Body: params.Body ?? '',
      NumMedia: params.NumMedia ?? '0',
      NumSegments: params.NumSegments ?? '1',
      SmsStatus: params.SmsStatus ?? '',
    }

    // Validate required fields
    if (!payload.From || !payload.Body || !payload.MessageSid) {
      return new Response(
        JSON.stringify({ error: 'Missing required Twilio fields: From, Body, MessageSid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Validate Twilio signature ──────────────────────────────
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    if (twilioAuthToken) {
      const signature = req.headers.get('X-Twilio-Signature') ?? ''
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-webhook`
      if (!validateSignature(twilioAuthToken, signature, webhookUrl, params)) {
        console.error('Invalid Twilio signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    } else {
      console.warn('TWILIO_AUTH_TOKEN not set — skipping signature validation')
    }

    // ── Init Supabase (service role for full access) ───────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const phoneNumber = payload.From
    const messageBody = payload.Body.trim()

    console.log(`[sms-webhook] From: ${phoneNumber}, Body: "${messageBody}"`)

    // ── Look up sender ─────────────────────────────────────────
    const { data: employee } = await supabase
      .from('employees')
      .select('id, organization_id, first_name, last_name, primary_location_id')
      .eq('phone', phoneNumber)
      .eq('is_active', true)
      .limit(1)
      .single()

    // Check if sender is an owner/manager via organization owner_id or user role
    let senderRole = 'employee'
    let organizationId: string | null = null

    if (employee) {
      organizationId = employee.organization_id

      // Check if this employee's user_id matches the org owner
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', employee.organization_id)
        .single()

      if (org) {
        // Check if employee has a user_id that matches owner
        const { data: empFull } = await supabase
          .from('employees')
          .select('user_id')
          .eq('id', employee.id)
          .single()

        if (empFull?.user_id && empFull.user_id === org.owner_id) {
          senderRole = 'owner'
        }
      }
    } else {
      // Unknown number — check if it matches any org owner's phone
      // For now, log and return a generic response
      console.warn(`[sms-webhook] Unknown phone number: ${phoneNumber}`)

      return new Response(twiml('This number is not registered with CoverMe. Contact your manager to get set up.'), {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      })
    }

    // ── Check conversation context ─────────────────────────────
    const { data: ctx } = await supabase
      .from('conversation_context')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    const activeContext = ctx && ctx.expires_at && new Date(ctx.expires_at) > new Date()
      ? ctx
      : null

    // ── Parse intent ───────────────────────────────────────────
    const intent = parseIntent(messageBody, senderRole)
    console.log(`[sms-webhook] Intent:`, JSON.stringify(intent))

    let replyMessage: string | undefined
    let smsContext = 'general'
    let relatedCalloutId: string | null = null
    let relatedShiftId: string | null = null

    // ── Route by intent ────────────────────────────────────────
    switch (intent.type) {
      case 'shift_reply': {
        smsContext = 'shift_offer'

        // If we have an active shift offer context, use it
        if (activeContext?.current_context === 'awaiting_shift_reply') {
          const contextData = activeContext.context_data as { callout_id?: string; shift_id?: string } | null
          relatedCalloutId = contextData?.callout_id ?? null
          relatedShiftId = contextData?.shift_id ?? null

          if (intent.response === 'yes') {
            // Accept: calculate resolution time from callout creation
            let resolutionSeconds: number | null = null
            if (relatedCalloutId) {
              const { data: calloutData } = await supabase
                .from('callouts')
                .select('reported_at')
                .eq('id', relatedCalloutId)
                .single()
              if (calloutData) {
                resolutionSeconds = Math.floor(
                  (Date.now() - new Date(calloutData.reported_at).getTime()) / 1000,
                )
              }

              await supabase
                .from('callouts')
                .update({
                  status: 'filled',
                  filled_by_employee_id: employee.id,
                  filled_at: new Date().toISOString(),
                  resolution_time_seconds: resolutionSeconds,
                })
                .eq('id', relatedCalloutId)
            }

            // Update the shift assignment
            if (relatedShiftId) {
              await supabase
                .from('shifts')
                .update({
                  employee_id: employee.id,
                  is_open: false,
                  status: 'confirmed',
                })
                .eq('id', relatedShiftId)
            }

            // Mark this candidate as accepted in callout_candidates
            if (relatedCalloutId) {
              await supabase
                .from('callout_candidates')
                .update({ response: 'accepted', responded_at: new Date().toISOString() })
                .eq('callout_id', relatedCalloutId)
                .eq('employee_id', employee.id)
            }

            // Update reliability: +2 for accepting
            const { data: empScore } = await supabase
              .from('employees')
              .select('reliability_score')
              .eq('id', employee.id)
              .single()
            if (empScore) {
              const newScore = Math.min(100, empScore.reliability_score + 2)
              await supabase
                .from('employees')
                .update({ reliability_score: newScore })
                .eq('id', employee.id)
            }

            // Get shift details for confirmation message
            let shiftDetails: { date: string; start_time: string; end_time: string; location_id: string } | null = null
            if (relatedShiftId) {
              const { data: shift } = await supabase
                .from('shifts')
                .select('date, start_time, end_time, location_id')
                .eq('id', relatedShiftId)
                .single()
              shiftDetails = shift
            }

            if (shiftDetails) {
              const { data: location } = await supabase
                .from('locations')
                .select('name')
                .eq('id', shiftDetails.location_id)
                .single()

              const startTime = new Date(shiftDetails.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              replyMessage = templates.shiftConfirmed(
                employee.first_name,
                location?.name ?? 'the restaurant',
                shiftDetails.date,
                startTime,
              )
            } else {
              replyMessage = `Confirmed! Thanks ${employee.first_name}!`
            }

            // Cancel all other pending offers for this callout
            if (relatedCalloutId) {
              const { data: otherCandidates } = await supabase
                .from('callout_candidates')
                .select('id, employee_id')
                .eq('callout_id', relatedCalloutId)
                .neq('employee_id', employee.id)
                .is('response', null)

              for (const other of otherCandidates ?? []) {
                // Mark as cancelled
                await supabase
                  .from('callout_candidates')
                  .update({ response: 'cancelled', responded_at: new Date().toISOString() })
                  .eq('id', other.id)

                // Get their phone to send cancellation + clear context
                const { data: otherEmp } = await supabase
                  .from('employees')
                  .select('phone, first_name')
                  .eq('id', other.employee_id)
                  .single()

                if (otherEmp) {
                  // Clear their conversation context
                  await supabase
                    .from('conversation_context')
                    .update({ current_context: 'idle', context_data: null, expires_at: null })
                    .eq('phone_number', otherEmp.phone)

                  // Send "shift filled" notification
                  const cancelUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`
                  try {
                    await fetch(cancelUrl, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        to: otherEmp.phone,
                        body: `Hey ${otherEmp.first_name}, the shift has been filled. Thanks for being available!`,
                        context: 'shift_offer',
                        organization_id: organizationId,
                        employee_id: other.employee_id,
                        related_callout_id: relatedCalloutId,
                      }),
                    })
                  } catch (e) {
                    console.error(`[sms-webhook] Failed to cancel offer for ${otherEmp.phone}:`, e)
                  }
                }
              }

              // Notify manager that callout was filled
              const { data: org } = await supabase
                .from('organizations')
                .select('owner_id')
                .eq('id', organizationId)
                .single()

              if (org) {
                const { data: ownerEmp } = await supabase
                  .from('employees')
                  .select('id, phone, first_name')
                  .eq('user_id', org.owner_id)
                  .eq('organization_id', organizationId)
                  .limit(1)
                  .single()

                if (ownerEmp && shiftDetails) {
                  // Get original employee name
                  const { data: origCallout } = await supabase
                    .from('callouts')
                    .select('employee_id')
                    .eq('id', relatedCalloutId)
                    .single()

                  let origName = 'Employee'
                  if (origCallout) {
                    const { data: origEmp } = await supabase
                      .from('employees')
                      .select('first_name, last_name')
                      .eq('id', origCallout.employee_id)
                      .single()
                    if (origEmp) origName = `${origEmp.first_name} ${origEmp.last_name}`
                  }

                  const { data: loc } = await supabase
                    .from('locations')
                    .select('name')
                    .eq('id', shiftDetails.location_id)
                    .single()

                  const startT = new Date(shiftDetails.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  const shiftDesc = `${shiftDetails.date} ${startT} at ${loc?.name ?? 'location'}`

                  const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`
                  try {
                    await fetch(notifyUrl, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        to: ownerEmp.phone,
                        body: `${origName}'s shift covered by ${employee.first_name} ${employee.last_name} (${shiftDesc}). Auto-filled by CoverMe.`,
                        context: 'shift_offer',
                        organization_id: organizationId,
                        employee_id: ownerEmp.id,
                        related_callout_id: relatedCalloutId,
                        related_shift_id: relatedShiftId,
                      }),
                    })
                  } catch (e) {
                    console.error('[sms-webhook] Failed to notify manager:', e)
                  }
                }
              }
            }

            // Clear context for the accepting employee
            await supabase
              .from('conversation_context')
              .update({ current_context: 'idle', context_data: null, expires_at: null })
              .eq('phone_number', phoneNumber)

          } else if (intent.response === 'no') {
            replyMessage = templates.shiftDeclined(employee.first_name)

            // Mark this candidate as declined in callout_candidates
            if (relatedCalloutId) {
              await supabase
                .from('callout_candidates')
                .update({ response: 'declined', responded_at: new Date().toISOString() })
                .eq('callout_id', relatedCalloutId)
                .eq('employee_id', employee.id)

              // Check if all candidates in this batch have responded
              const batchNumber = (activeContext.context_data as { batch_number?: number } | null)?.batch_number ?? 1
              const { data: batchCandidates } = await supabase
                .from('callout_candidates')
                .select('id, response')
                .eq('callout_id', relatedCalloutId)
                .eq('batch_number', batchNumber)

              const allResponded = (batchCandidates ?? []).every(
                (c: { response: string | null }) => c.response !== null,
              )
              const anyAccepted = (batchCandidates ?? []).some(
                (c: { response: string | null }) => c.response === 'accepted',
              )

              // If all 3 declined (none accepted), immediately trigger next batch
              if (allResponded && !anyAccepted) {
                console.log(`[sms-webhook] All batch ${batchNumber} candidates declined, triggering next batch`)
                try {
                  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/callout-timeout`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ callout_id: relatedCalloutId, batch: batchNumber }),
                  })
                } catch (e) {
                  console.error('[sms-webhook] Failed to trigger next batch:', e)
                }
              }
            }

            // Clear context
            await supabase
              .from('conversation_context')
              .update({ current_context: 'idle', context_data: null, expires_at: null })
              .eq('phone_number', phoneNumber)

          } else {
            // Maybe — acknowledge but keep context active
            replyMessage = `No rush ${employee.first_name}, but we need an answer soon. Reply YES or NO.`
          }
        } else {
          // No active context — they replied yes/no to nothing
          replyMessage = templates.unknownMessage()
        }
        break
      }

      case 'callout': {
        smsContext = 'callout'

        // Find the employee's next upcoming shift
        const today = new Date().toISOString().split('T')[0]
        const targetDate = intent.shift_date ?? today

        const { data: shift } = await supabase
          .from('shifts')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('organization_id', organizationId)
          .gte('date', targetDate)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        if (shift) {
          // Create callout record
          const { data: callout } = await supabase
            .from('callouts')
            .insert({
              organization_id: organizationId!,
              shift_id: shift.id,
              employee_id: employee.id,
              reason: intent.reason ?? null,
              reported_at: new Date().toISOString(),
              status: 'pending',
            })
            .select('id')
            .single()

          if (callout) {
            relatedCalloutId = callout.id
            relatedShiftId = shift.id

            // Mark shift as open
            await supabase
              .from('shifts')
              .update({ is_open: true, employee_id: null })
              .eq('id', shift.id)

            // ── Phase 4: Trigger auto-fill engine ─────────────
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            try {
              const autoFillRes = await fetch(`${supabaseUrl}/functions/v1/auto-fill`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ callout_id: callout.id }),
              })
              const autoFillResult = await autoFillRes.json()
              console.log(`[sms-webhook] Auto-fill triggered for callout ${callout.id}:`, autoFillResult)
            } catch (autoFillErr) {
              console.error(`[sms-webhook] Auto-fill trigger failed:`, autoFillErr)
              // Don't fail the webhook — the callout was still created
            }
          }

          replyMessage = templates.calloutReceived(employee.first_name)
        } else {
          replyMessage = `Hey ${employee.first_name}, we couldn't find an upcoming shift for you. Contact your manager directly.`
        }
        break
      }

      case 'owner_command': {
        smsContext = 'owner_command'

        switch (intent.command) {
          case 'HELP':
            replyMessage = templates.helpMenu(senderRole)
            break

          case 'TODAY':
          case 'YESTERDAY':
          case 'LABOR':
          case 'DETAIL':
          case 'APPROVE':
          case 'DENY': {
            // Route to owner-chat edge function for AI-powered responses
            if (senderRole === 'owner' || senderRole === 'manager') {
              try {
                const chatUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/owner-chat`
                const chatRes = await fetch(chatUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    organization_id: organizationId,
                    phone_number: phoneNumber,
                    message: messageBody,
                    command: intent.command,
                    args: intent.args,
                  }),
                })
                const chatResult = await chatRes.json()
                replyMessage = chatResult.response ?? `Could not process ${intent.command} command. Try again later.`
              } catch (chatErr) {
                console.error(`[sms-webhook] owner-chat call failed:`, chatErr)
                replyMessage = `Sorry, having trouble processing that command. Try again in a moment.`
              }
            } else {
              replyMessage = `That command is for managers only. Reply HELP for your available commands.`
            }
            break
          }

          case 'SCHEDULE': {
            // Owners/managers get routed to owner-chat, employees get their own shifts
            const todayStr = new Date().toISOString().split('T')[0]
            if (senderRole === 'owner' || senderRole === 'manager') {
              try {
                const chatUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/owner-chat`
                const chatRes = await fetch(chatUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    organization_id: organizationId,
                    phone_number: phoneNumber,
                    message: messageBody,
                    command: 'SCHEDULE',
                  }),
                })
                const chatResult = await chatRes.json()
                replyMessage = chatResult.response ?? `Could not load schedule. Try again later.`
              } catch (chatErr) {
                console.error(`[sms-webhook] owner-chat SCHEDULE call failed:`, chatErr)
                replyMessage = `Sorry, having trouble loading the schedule. Try again in a moment.`
              }
            } else {
              const { data: myShifts } = await supabase
                .from('shifts')
                .select('date, start_time, end_time, location_id')
                .eq('employee_id', employee.id)
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .limit(5)

              if (!myShifts || myShifts.length === 0) {
                replyMessage = `No upcoming shifts found for you ${employee.first_name}.`
              } else {
                const lines = myShifts.map(s => {
                  const start = new Date(s.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  const end = new Date(s.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  return `${s.date}: ${start}-${end}`
                })
                replyMessage = `Your shifts:\n${lines.join('\n')}`
              }
            }
            break
          }

          case 'AVAIL':
            replyMessage = `Availability updates coming soon. Contact your manager for now.`
            break

          default:
            replyMessage = templates.unknownMessage()
        }
        break
      }

      case 'swap_request': {
        smsContext = 'general'
        replyMessage = templates.swapReceived(employee.first_name)
        // Phase 5 will implement swap logic
        break
      }

      case 'unknown':
      default: {
        // Owners/managers get natural language AI chat; employees get the help prompt
        if (senderRole === 'owner' || senderRole === 'manager') {
          smsContext = 'owner_command'
          try {
            const chatUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/owner-chat`
            const chatRes = await fetch(chatUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                organization_id: organizationId,
                phone_number: phoneNumber,
                message: messageBody,
                command: null,
              }),
            })
            const chatResult = await chatRes.json()
            replyMessage = chatResult.response ?? templates.unknownMessage()
          } catch (chatErr) {
            console.error(`[sms-webhook] owner-chat NL call failed:`, chatErr)
            replyMessage = templates.unknownMessage()
          }
        } else {
          smsContext = 'general'
          replyMessage = templates.unknownMessage()
        }
        break
      }
    }

    // ── Log inbound message ────────────────────────────────────
    await supabase.from('sms_conversations').insert({
      organization_id: organizationId!,
      phone_number: phoneNumber,
      employee_id: employee.id,
      direction: 'inbound',
      message: messageBody,
      context: smsContext,
      related_callout_id: relatedCalloutId,
      related_shift_id: relatedShiftId,
      twilio_sid: payload.MessageSid,
    })

    // ── Log outbound reply (if any) ────────────────────────────
    if (replyMessage) {
      await supabase.from('sms_conversations').insert({
        organization_id: organizationId!,
        phone_number: phoneNumber,
        employee_id: employee.id,
        direction: 'outbound',
        message: replyMessage,
        context: smsContext,
        related_callout_id: relatedCalloutId,
        related_shift_id: relatedShiftId,
        twilio_sid: null, // TwiML replies don't get a separate SID
      })
    }

    // ── Return TwiML ───────────────────────────────────────────
    return new Response(twiml(replyMessage), {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    })

  } catch (error) {
    console.error('[sms-webhook] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
