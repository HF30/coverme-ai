/**
 * SMS Message Templates
 *
 * All outbound SMS copy lives here. Keep messages under 160 chars where
 * possible (single SMS segment) to reduce costs.
 */

export const templates = {
  /** Offer a shift to a candidate */
  shiftOffer: (
    name: string,
    location: string,
    role: string,
    date: string,
    time: string,
  ): string =>
    `Hey ${name}, can you cover a ${role} shift at ${location} on ${date} ${time}? Reply YES or NO`,

  /** Confirm a shift acceptance */
  shiftConfirmed: (
    name: string,
    location: string,
    date: string,
    time: string,
  ): string =>
    `Confirmed! You're working at ${location} on ${date} ${time}. Thanks ${name}!`,

  /** Shift was declined, moving to next candidate */
  shiftDeclined: (name: string): string =>
    `No worries ${name}, we'll find someone else. Thanks for the quick reply!`,

  /** Acknowledge a callout was received */
  calloutReceived: (name: string): string =>
    `Got it ${name}, we're finding a replacement now. Feel better!`,

  /** Notify manager that a callout was auto-filled */
  calloutFilled: (
    managerName: string,
    originalEmployee: string,
    replacement: string,
    shift: string,
  ): string =>
    `${originalEmployee}'s shift covered by ${replacement} (${shift}). Auto-filled by CoverMe.`,

  /** Escalation: could not auto-fill a shift */
  escalation: (managerName: string, shift: string): string =>
    `Warning: Can't auto-fill ${shift}. Need your help finding coverage. Reply with a name or call the team.`,

  /** Owner daily briefing (AI-generated in Phase 6) */
  ownerBriefing: (summary: string): string => summary,

  /** Response to unrecognized message */
  unknownMessage: (): string =>
    `Thanks for your message. Reply HELP for available commands.`,

  /** Help menu based on role */
  helpMenu: (role: string): string =>
    role === 'owner' || role === 'manager'
      ? [
          'CoverMe Commands:',
          'TODAY - today\'s overview',
          'YESTERDAY - yesterday\'s recap',
          'DETAIL [n] - location detail',
          'LABOR - labor % all stores',
          'SCHEDULE - today\'s staffing',
          'APPROVE - pending approvals',
          'DENY - deny pending item',
          'HELP - this menu',
        ].join('\n')
      : [
          'CoverMe Commands:',
          'SCHEDULE - your upcoming shifts',
          'SWAP - request a shift swap',
          'AVAIL - update your availability',
          'HELP - this menu',
        ].join('\n'),

  /** Confirmation that swap request was received */
  swapReceived: (name: string): string =>
    `Got it ${name}, your swap request has been submitted. We'll let you know when it's approved.`,

  /** No upcoming shifts found */
  noShifts: (name: string): string =>
    `No upcoming shifts found for you ${name}. Check with your manager if this seems wrong.`,
} as const;
