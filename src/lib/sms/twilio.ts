/**
 * Twilio REST API wrapper
 *
 * Uses fetch() directly against the Twilio API -- no heavy npm package needed.
 * Works in both Edge Functions (Deno) and Node.js (Next.js API routes).
 */

import { createHmac } from 'crypto';

export interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  error_code: string | null;
  error_message: string | null;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SendSMSOptions {
  statusCallback?: string;
}

/**
 * Send an SMS via Twilio REST API.
 */
export async function sendSMS(
  config: TwilioConfig,
  to: string,
  body: string,
  options?: SendSMSOptions,
): Promise<TwilioMessage> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

  const params = new URLSearchParams({
    To: to,
    From: config.fromNumber,
    Body: body,
  });

  if (options?.statusCallback) {
    params.set('StatusCallback', options.statusCallback);
  }

  const credentials = btoa(`${config.accountSid}:${config.authToken}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twilio API error: ${error.message || response.statusText} (${error.code || response.status})`);
  }

  return response.json() as Promise<TwilioMessage>;
}

/**
 * Validate a Twilio webhook signature.
 *
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 *
 * @param authToken - Your Twilio auth token
 * @param signature - The X-Twilio-Signature header value
 * @param url - The full URL Twilio sent the request to
 * @param params - The POST body parameters as key-value pairs
 */
export function validateWebhookSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  // Sort param keys alphabetically and concatenate key+value
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], '');

  const computed = createHmac('sha1', authToken).update(data).digest('base64');

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse Twilio webhook POST body (application/x-www-form-urlencoded) into a
 * typed object.
 */
export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  SmsStatus: string;
  ApiVersion: string;
  FromCity?: string;
  FromState?: string;
  FromCountry?: string;
}

export function parseWebhookBody(formData: URLSearchParams): TwilioWebhookPayload {
  return {
    MessageSid: formData.get('MessageSid') ?? '',
    AccountSid: formData.get('AccountSid') ?? '',
    From: formData.get('From') ?? '',
    To: formData.get('To') ?? '',
    Body: formData.get('Body') ?? '',
    NumMedia: formData.get('NumMedia') ?? '0',
    NumSegments: formData.get('NumSegments') ?? '1',
    SmsStatus: formData.get('SmsStatus') ?? '',
    ApiVersion: formData.get('ApiVersion') ?? '',
    FromCity: formData.get('FromCity') ?? undefined,
    FromState: formData.get('FromState') ?? undefined,
    FromCountry: formData.get('FromCountry') ?? undefined,
  };
}

/**
 * Generate TwiML response XML.
 * Pass a message to send a reply, or omit for an empty (acknowledgement) response.
 */
export function twiml(message?: string): string {
  if (message) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  }
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
