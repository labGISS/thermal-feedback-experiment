/** Letters available for the 2-back task sequence */
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Milliseconds each letter is displayed */
export const LETTER_INTERVAL_MS = 2500;

/** Target proportion of letters that are 2-back matches */
export const MATCH_PROBABILITY = 0.3;

export const randomLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];

/**
 * Picks the next letter for a 2-back stream.
 * With MATCH_PROBABILITY chance it returns the letter from 2 steps ago (a match).
 * Otherwise it returns a random letter that is guaranteed NOT to be a match,
 * so accidental matches never inflate the target rate.
 */
export function nextLetter(history: string[]): string {
  if (history.length >= 2 && Math.random() < MATCH_PROBABILITY) {
    return history[history.length - 2];
  }
  const avoidTwoBack = history.length >= 2 ? history[history.length - 2] : null;
  const avoidPrev    = history.length >= 1 ? history[history.length - 1] : null;
  let letter: string;
  do {
    letter = randomLetter();
  } while (letter === avoidTwoBack || letter === avoidPrev);
  return letter;
}
