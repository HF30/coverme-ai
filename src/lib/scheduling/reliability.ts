/**
 * Reliability Score Manager
 *
 * Tracks employee reliability based on behavior events.
 * Score is always clamped between 0 and 100.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ReliabilityEvent =
  | { type: 'callout' }              // -5 points
  | { type: 'no_show' }              // -10 points
  | { type: 'shift_accepted' }       // +2 points
  | { type: 'shift_completed' }      // +1 point
  | { type: 'late_arrival'; minutes: number }; // -1 to -5 based on severity

const EVENT_DELTAS: Record<string, number> = {
  callout: -5,
  no_show: -10,
  shift_accepted: 2,
  shift_completed: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate the score delta for a late arrival.
 * 1-10 min: -1, 11-20 min: -2, 21-30 min: -3, 31-45 min: -4, 46+ min: -5
 */
function lateArrivalDelta(minutes: number): number {
  if (minutes <= 10) return -1;
  if (minutes <= 20) return -2;
  if (minutes <= 30) return -3;
  if (minutes <= 45) return -4;
  return -5;
}

/**
 * Update an employee's reliability score based on a behavior event.
 * Returns the new score (clamped 0-100).
 */
export async function updateReliability(
  supabase: SupabaseClient,
  employeeId: string,
  event: ReliabilityEvent,
): Promise<number> {
  // Get current score
  const { data: employee, error: fetchError } = await supabase
    .from('employees')
    .select('reliability_score')
    .eq('id', employeeId)
    .single();

  if (fetchError || !employee) {
    console.error(`[reliability] Failed to fetch employee ${employeeId}:`, fetchError);
    throw new Error(`Employee not found: ${employeeId}`);
  }

  const currentScore = employee.reliability_score;

  // Calculate delta
  let delta: number;
  if (event.type === 'late_arrival') {
    delta = lateArrivalDelta(event.minutes);
  } else {
    delta = EVENT_DELTAS[event.type] ?? 0;
  }

  const newScore = clamp(currentScore + delta, 0, 100);

  // Update in database
  const { error: updateError } = await supabase
    .from('employees')
    .update({ reliability_score: newScore })
    .eq('id', employeeId);

  if (updateError) {
    console.error(`[reliability] Failed to update score for ${employeeId}:`, updateError);
    throw new Error(`Failed to update reliability: ${updateError.message}`);
  }

  console.log(
    `[reliability] Employee ${employeeId}: ${currentScore} -> ${newScore} (${event.type}, delta ${delta})`,
  );

  return newScore;
}
