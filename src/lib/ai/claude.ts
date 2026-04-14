/**
 * CoverMe.ai — Claude API Integration (Phase 6)
 *
 * Lightweight wrapper for generating SMS briefings and answering
 * owner queries via the Anthropic Messages API.
 *
 * Uses fetch() directly — no SDK dependency.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface LocationStaffing {
  location_name: string;
  total_shifts: number;
  filled_shifts: number;
  open_shifts: number;
  open_roles: string[];
  labor_cost_estimate: number;
  total_hours: number;
}

export interface CalloutSummary {
  total: number;
  auto_filled: number;
  escalated: number;
  unfilled: number;
  avg_resolution_seconds: number | null;
}

export interface PendingApproval {
  type: string;
  description: string;
  employee_name: string;
  created_at: string;
}

export interface CertAlert {
  employee_name: string;
  cert_type: string;
  expires_at: string;
  days_until_expiry: number;
}

export interface UpcomingEvent {
  name: string;
  event_date: string;
  event_type: string;
  demand_multiplier: number;
  is_playoff: boolean;
}

export interface BriefingData {
  type: 'morning' | 'evening';
  org_name: string;
  location_count: number;
  today_staffing: LocationStaffing[];
  yesterday_callouts: CalloutSummary;
  labor_total: number;
  upcoming_events: UpcomingEvent[];
  pending_approvals: PendingApproval[];
  cert_alerts: CertAlert[];
  tomorrow_staffing?: LocationStaffing[];
}

export interface OrgContext {
  org_name: string;
  locations: { id: string; name: string }[];
  today_staffing: LocationStaffing[];
  recent_callouts: CalloutSummary;
  upcoming_events: UpcomingEvent[];
  pending_approvals: PendingApproval[];
}

// ── Claude API call ────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens = 400,
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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  const textBlock = result.content?.find(
    (b: { type: string; text?: string }) => b.type === 'text',
  );
  return textBlock?.text ?? '';
}

// ── Briefing generation ────────────────────────────────────────────

const BRIEFING_SYSTEM = `You are CoverMe, an AI scheduling assistant for a multi-location restaurant group.

Generate a concise SMS briefing (MUST be under 1500 characters). Rules:
- Only mention what NEEDS attention. If everything is fine, say so briefly.
- Use numbers and be specific.
- Use simple emoji sparingly for visual scanning (checkmarks, warnings).
- Format for SMS readability (short lines, no markdown).
- For morning: full overview + action items + what needs attention today.
- For evening: end-of-day recap + tomorrow preview.
- If there are open shifts, mention which location and role.
- If there are pending approvals, tell the owner to reply APPROVE or DETAIL.
- Keep the tone professional but friendly — like a sharp operations manager.`;

export async function generateBriefing(
  data: BriefingData,
  apiKey: string,
): Promise<string> {
  const userMessage = `Generate a ${data.type} briefing for ${data.org_name} (${data.location_count} locations).

DATA:
${JSON.stringify(data, null, 2)}

Remember: under 1500 characters, SMS format, only surface what needs attention.`;

  return callClaude(BRIEFING_SYSTEM, userMessage, apiKey, 500);
}

// ── Owner query answering ──────────────────────────────────────────

const CHAT_SYSTEM = `You are CoverMe, an AI scheduling assistant for a multi-location restaurant group.

Answer the owner's question about their restaurants using the provided data. Rules:
- Be concise (under 1500 characters, this is an SMS reply).
- Use numbers and be specific.
- If you don't have the data to answer, say so honestly.
- Use simple emoji sparingly for visual scanning.
- Format for SMS readability (short lines, no markdown).
- Keep the tone professional but friendly.
- If the owner asks about a specific location, focus on that one.
- Mention available commands (TODAY, DETAIL, LABOR, etc.) when relevant.`;

export async function answerOwnerQuery(
  query: string,
  context: OrgContext,
  apiKey: string,
): Promise<string> {
  const userMessage = `Owner's question: "${query}"

CURRENT DATA:
${JSON.stringify(context, null, 2)}

Answer concisely for SMS (under 1500 chars).`;

  return callClaude(CHAT_SYSTEM, userMessage, apiKey, 400);
}
