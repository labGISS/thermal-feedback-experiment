/**
 * Within-subjects counterbalancing for thermal feedback experiments.
 *
 * Both experiments share the same 7 stimulus conditions:
 *   3 single-face: [0], [1], [2]
 *   4 multi-face:  [0,1], [0,2], [1,2], [0,1,2]
 *
 * Ordering is assigned via a cyclic Latin square (7×7).
 * Row k = CONDITIONS shifted left by k positions.
 * This guarantees each condition appears in each serial position exactly once
 * across the first 7 participants, then repeats.
 *
 * Exp 1 uses row (n−1) % 7.
 * Exp 2 uses row (n−1+4) % 7 — offset by 4 (half the square) to maximise
 * ordering difference and reduce carry-over effects between experiments.
 *
 * Plan recruitment in multiples of 7 for a complete Latin square.
 */

import type { SessionTrial } from "./types";

/** All 7 stimulus conditions, in the base Latin-square order. */
const CONDITIONS: readonly (readonly number[])[] = [
  [0],
  [1],
  [2],
  [0, 1],
  [0, 2],
  [1, 2],
  [0, 1, 2],
];

const N = CONDITIONS.length; // 7

/** Returns the cyclic Latin-square row for shift k. */
function latinSquareRow(k: number): readonly (readonly number[])[] {
  const shift = ((k % N) + N) % N;
  return [...CONDITIONS.slice(shift), ...CONDITIONS.slice(0, shift)];
}

/**
 * Builds the full ordered trial sequence for a given 1-based participant number.
 * Returns 14 SessionTrials: 7 for Exp 1 (no cognitive load),
 * 7 for Exp 2 (2-back task).
 */
export function getTrialSequence(participantNumber: number): SessionTrial[] {
  const exp1Row = latinSquareRow((participantNumber - 1) % N);
  const exp2Row = latinSquareRow((participantNumber - 1 + 4) % N);

  const trials: SessionTrial[] = [];

  exp1Row.forEach((path, i) =>
    trials.push({
      experimentType: 1,
      trialIndex: i,
      totalTrials: N,
      heatingPath: [...path],
    }),
  );

  exp2Row.forEach((path, i) =>
    trials.push({
      experimentType: 2,
      trialIndex: i,
      totalTrials: N,
      heatingPath: [...path],
    }),
  );

  return trials;
}
