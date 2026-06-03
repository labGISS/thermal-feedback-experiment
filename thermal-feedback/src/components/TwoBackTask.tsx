import { useEffect, useRef, useState } from "react";
import { LETTER_INTERVAL_MS, randomLetter, nextLetter } from "../twoBackUtils";
import type { TwoBackStats } from "../types";

const FLASH_DURATION_MS = 400;

interface Props {
  onStatsUpdate?: (stats: TwoBackStats) => void;
}

export const TwoBackTask = ({ onStatsUpdate }: Props) => {
  const [currentLetter, setCurrentLetter] = useState("");
  const [pressed, setPressed] = useState(false);
  const pressFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const historyRef = useRef<string[]>([]);
  const trialCountRef = useRef(0);
  const pressedCurrentRef = useRef(false);
  const statsRef = useRef<TwoBackStats>({ correct: 0, wrong: 0, missed: 0, totalMatches: 0 });
  // Keep callback ref so the closed-over interval always calls the latest prop
  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => { onStatsUpdateRef.current = onStatsUpdate; }, [onStatsUpdate]);

  useEffect(() => {
    let cancelled = false;

    // Show first letter after a short delay so the screen isn't jarring
    const init = setTimeout(() => {
      if (cancelled) return;
      const first = randomLetter();
      historyRef.current = [first];
      trialCountRef.current = 1;
      setCurrentLetter(first);

      const interval = setInterval(() => {
        if (cancelled) return;

        // Check if outgoing letter was a match that wasn't pressed
        const history = historyRef.current;
        const lastIdx = history.length - 1;
        if (lastIdx >= 2 && history[lastIdx] === history[lastIdx - 2] && !pressedCurrentRef.current) {
          statsRef.current = { ...statsRef.current, missed: statsRef.current.missed + 1 };
          onStatsUpdateRef.current?.({ ...statsRef.current });
        }

        pressedCurrentRef.current = false;
        const next = nextLetter(history);
        trialCountRef.current += 1;
        history.push(next);

        // Count if the new letter is a match
        const newIdx = history.length - 1;
        if (newIdx >= 2 && history[newIdx] === history[newIdx - 2]) {
          statsRef.current = { ...statsRef.current, totalMatches: statsRef.current.totalMatches + 1 };
        }

        setCurrentLetter(next);
      }, LETTER_INTERVAL_MS);

      return () => clearInterval(interval);
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(init);
    };
  }, []);

  // Prevent page scroll on space; flash indicator and track stats
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();

        // UI flash (independent of whether it's a valid press)
        setPressed(true);
        if (pressFlashTimerRef.current) clearTimeout(pressFlashTimerRef.current);
        pressFlashTimerRef.current = setTimeout(() => setPressed(false), FLASH_DURATION_MS);

        // Only count the first press per displayed letter
        if (!pressedCurrentRef.current) {
          pressedCurrentRef.current = true;
          const history = historyRef.current;
          const lastIdx = history.length - 1;
          const isMatch = lastIdx >= 2 && history[lastIdx] === history[lastIdx - 2];
          if (isMatch) {
            statsRef.current = { ...statsRef.current, correct: statsRef.current.correct + 1 };
          } else {
            statsRef.current = { ...statsRef.current, wrong: statsRef.current.wrong + 1 };
          }
          onStatsUpdateRef.current?.({ ...statsRef.current });
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (pressFlashTimerRef.current) clearTimeout(pressFlashTimerRef.current);
    };
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="flex flex-col items-center gap-6">
        <div className="text-[120px] font-thin text-primary leading-none min-h-32.5 flex items-center">
          {currentLetter}
        </div>
        {/* Fixed-height press indicator */}
        <div className="h-8 flex items-center">
          {pressed && <span className="text-sm text-gray-400 tracking-wide">✓ registrato</span>}
        </div>
        <p className="text-sm text-gray-400 max-w-75 text-center">
          Premi{" "}
          <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono">
            SPAZIO
          </kbd>{" "}
          se questa lettera è uguale a quella mostrata 2 passi fa
        </p>
      </div>
    </div>
  );
};
