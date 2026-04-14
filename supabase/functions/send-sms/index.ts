/**
 * CoverMe.ai — Send SMS Edge Function
 *
 * Outbound SMS utility. Called by the auto-fill engine (Phase 4), daily
 * briefings (Phase 6), or manual sends from the dashboard.
 *
 * POST /functions/v1/send-sms
 * Authorization: Bearer <service_role_key or user JWT>
 * Body: {
 *   to: "+1XXXXXXXXXX",
 *   body: "message text",
 *   context: "shift_offer" | "callout" | "owner_briefing" | "owner_command" | "general",
 *   related_callout_id?: "uuid",
 *   related_shift_id?: "uuid",
 *   organization_id: "uuid",
 *   employee_id?: "uuid",
 *   set_context?: { current_context: string, context_data: object, expires_in_minutes: number }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendSMSRequest {
  to: string
  body: string
  context?: string
  related_callout_id?: string
  related_shift_id?: string
  organization_id: string
  employee_id?: string
  set_context?: {
    current_context: string
    context_data: Record<string, unknown>
    expires_in_minutes: number
  }
}

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
    // ── Auth check ─────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify caller is authorized (service role or authenticated user)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    // Allow service role key (token === supabaseKey) or authenticated users
    const isServiceRole = token === supabaseKey
    if (!isServiceRole && (authError || !user)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Parse & validate body ──────────────────────────────────
    const body: SendSMSRequest = await req.json()

    if (!body.to || !body.body || !body.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, body, organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate E.164 phone format
    if (!/^\+1\d{10}$/.test(body.to)) {
      return new Response(
        JSON.stringify({ error: 'Phone number must be in E.164 format: +1XXXXXXXXXX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate context value
    const validContexts = ['callout', 'shift_offer', 'owner_briefing', 'owner_command', 'general']
    const smsContext = body.context && validContexts.includes(body.context) ? body.context : 'general'

    // ── Send via Twilio ────────────────────────────────────────
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
    const credentials = btoa(`${twilioSid}:${twilioAuth}`)

    const twilioParams = new URLSearchParams({
      To: body.to,
      From: twilioFrom,
      Body: body.body,
    })

    console.log(`[send-sms] Sending to ${body.to}: "${body.body.substring(0, 50)}..."`)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioParams.toString(),
    })

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.json()
      console.error('[send-sms] Twilio error:', twilioError)
      return new Response(
        JSON.stringify({ error: `Twilio error: ${twilioError.message || 'Unknown error'}`, code: twilioError.code }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const twilioResult = await twilioResponse.json()

    // ── Log to sms_conversations ───────────────────────────────
    const { error: insertError } = await supabase.from('sms_conversations').insert({
      organization_id: body.organization_id,
      phone_number: body.to,
      employee_id: body.employee_id ?? null,
      direction: 'outbound',
      message: body.body,
      context: smsContext,
      related_callout_id: body.related_callout_id ?? null,
      related_shift_id: body.related_shift_id ?? null,
      twilio_sid: twilioResult.sid,
    })

    if (insertError) {
      console.error('[send-sms] Failed to log message:', insertError)
      // Don't fail the request — SMS was already sent
    }

    // ── Set conversation context (if requested) ────────────────
    if (body.set_context) {
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + body.set_context.expires_in_minutes)

      await supabase
        .from('conversation_context')
        .upsert({
          phone_number: body.to,
          organization_id: body.organization_id,
          current_context: body.set_context.current_context,
          context_data: body.set_context.context_data,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'phone_number' })
    }

    // ── Return success ─────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioResult.sid,
        status: twilioResult.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('[send-sms] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
