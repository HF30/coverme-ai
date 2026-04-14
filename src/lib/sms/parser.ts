/**
 * SMS Intent Parser
 *
 * Parses incoming SMS messages into structured intents using keyword matching.
 * Phase 6 will replace this with Claude-powered NLU.
 */

export type SMSIntent =
  | { type: 'callout'; shift_date?: string; reason?: string }
  | { type: 'shift_reply'; response: 'yes' | 'no' | 'maybe' }
  | { type: 'owner_command'; command: string; args?: string[] }
  | { type: 'swap_request'; target_date?: string }
  | { type: 'unknown'; raw: string };

// ── Shift reply patterns ──────────────────────────────────────────
const YES_PATTERNS = [
  /^y(es|eah|ep|up|a)?$/i,
  /^sure$/i,
  /^ok(ay)?$/i,
  /^i('?m| am) (in|down|good)$/i,
  /^i can (do it|make it|cover|work)$/i,
  /^(sounds|looks) good$/i,
  /^(definitely|absolutely|for sure)$/i,
  /^count me in$/i,
  /^(bet|aight|ight)$/i,
];

const NO_PATTERNS = [
  /^n(o|ah|ope)?$/i,
  /^(sorry|sry),?\s*(can'?t|no|not|i can'?t).*$/i,
  /^can'?t( (do it|make it|cover|work))?$/i,
  /^i('?m| am) (not|busy|unavailable)$/i,
  /^(not|won'?t be) (available|able)$/i,
  /^pass$/i,
  /^no (thanks|way|can do)$/i,
];

const MAYBE_PATTERNS = [
  /^maybe$/i,
  /^(let me|i('?ll| will)) (check|think|see|get back).*$/i,
  /^not sure$/i,
  /^(possibly|perhaps)$/i,
  /^i('?ll| will) let you know$/i,
];

// ── Callout patterns ──────────────────────────────────────────────
const CALLOUT_PATTERNS = [
  /can'?t (come|make|show|get) (in|it|up|there)/i,
  /not (going to|gonna) (make|come|show|be)/i,
  /call(ing)? (in|out|off)/i,
  /i('?m| am) sick/i,
  /don'?t feel (well|good)/i,
  /throwing up/i,
  /food poisoning/i,
  /car (broke|won'?t start|trouble|accident)/i,
  /family emergency/i,
  /emergency/i,
  /i('?m| am) (not well|ill|unwell)/i,
  /need(ing)? (the day|today|tomorrow) off/i,
  /won'?t be (in|there|at work|able)/i,
  /have to miss/i,
];

// ── Owner command patterns ────────────────────────────────────────
const OWNER_COMMANDS: Record<string, RegExp> = {
  TODAY: /^today$/i,
  YESTERDAY: /^yesterday$/i,
  DETAIL: /^detail\s+(\d+)$/i,
  LABOR: /^labor$/i,
  SCHEDULE: /^schedule$/i,
  APPROVE: /^approve$/i,
  DENY: /^deny$/i,
  HELP: /^help$/i,
};

// ── Swap patterns ─────────────────────────────────────────────────
const SWAP_PATTERNS = [
  /swap/i,
  /switch/i,
  /trade/i,
  /can (someone|anyone) take/i,
];

// ── Date extraction (simple) ──────────────────────────────────────
function extractDate(message: string): string | undefined {
  const lower = message.toLowerCase();
  const today = new Date();

  if (lower.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  if (lower.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Match patterns like "Monday", "this Thursday", "next Friday"
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const currentDay = today.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7; // next occurrence
      const target = new Date(today);
      target.setDate(target.getDate() + diff);
      return target.toISOString().split('T')[0];
    }
  }

  return undefined;
}

// ── Reason extraction ─────────────────────────────────────────────
function extractReason(message: string): string | undefined {
  const lower = message.toLowerCase();
  if (lower.includes('sick') || lower.includes('don\'t feel') || lower.includes('throwing up') || lower.includes('ill')) return 'sick';
  if (lower.includes('car')) return 'transportation';
  if (lower.includes('emergency')) return 'emergency';
  if (lower.includes('family')) return 'family';
  if (lower.includes('food poisoning')) return 'sick';
  return undefined;
}

/**
 * Parse an incoming SMS message into a structured intent.
 *
 * @param message - Raw SMS body text
 * @param senderRole - The sender's role: 'owner', 'manager', or 'employee'
 */
export function parseIntent(message: string, senderRole: string): SMSIntent {
  const trimmed = message.trim();

  // 1. Check owner/manager commands first (exact matches take priority)
  if (senderRole === 'owner' || senderRole === 'manager') {
    for (const [command, pattern] of Object.entries(OWNER_COMMANDS)) {
      const match = trimmed.match(pattern);
      if (match) {
        const args = match.slice(1).filter(Boolean);
        return { type: 'owner_command', command, args: args.length > 0 ? args : undefined };
      }
    }
  }

  // Help command is available to all roles
  if (/^help$/i.test(trimmed)) {
    return { type: 'owner_command', command: 'HELP' };
  }

  // 2. Check shift reply (short responses)
  for (const pattern of YES_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'shift_reply', response: 'yes' };
    }
  }
  for (const pattern of NO_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'shift_reply', response: 'no' };
    }
  }
  for (const pattern of MAYBE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'shift_reply', response: 'maybe' };
    }
  }

  // 3. Check callout patterns
  for (const pattern of CALLOUT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: 'callout',
        shift_date: extractDate(trimmed),
        reason: extractReason(trimmed),
      };
    }
  }

  // 4. Check swap patterns
  for (const pattern of SWAP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: 'swap_request',
        target_date: extractDate(trimmed),
      };
    }
  }

  // 5. Schedule command is available to employees too
  if (/^schedule$/i.test(trimmed)) {
    return { type: 'owner_command', command: 'SCHEDULE' };
  }

  // 6. Availability command for employees
  if (/^avail(ability)?$/i.test(trimmed)) {
    return { type: 'owner_command', command: 'AVAIL' };
  }

  // 7. Unknown
  return { type: 'unknown', raw: trimmed };
}
