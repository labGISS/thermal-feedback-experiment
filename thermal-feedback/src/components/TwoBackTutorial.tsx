import { useCallback, useEffect, useRef, useState } from "react";
import { LETTER_INTERVAL_MS as PRACTICE_INTERVAL_MS, randomLetter, nextLetter } from "../twoBackUtils";
import type { TwoBackStats } from "../types";

type Phase = "intro" | "practice" | "complete";
type FeedbackType = "correct" | "wrong" | "missed";

interface FeedbackMsg {
  text: string;
  type: FeedbackType;
}

interface Score {
  correct: number;
  wrong: number;
  missed: number;
}

interface Props {
  onComplete: (stats: TwoBackStats) => void;
}

const PRACTICE_COUNT = 10;

function generateSequence(n: number): string[] {
  let seq: string[];
  // Retry until at least 2 matches exist — safety net for the rare low-match outcome
  do {
    seq = [randomLetter(), randomLetter()];
    for (let i = 2; i < n; i++) {
      seq.push(nextLetter(seq));
    }
  } while (seq.filter((l, i) => i >= 2 && l === seq[i - 2]).length < 2);
  return seq;
}

export const TwoBackTutorial = ({ onComplete }: Props) => {
  const [phase, setPhase] = useState<Phase>("intro");
  const [sequence] = useState<string[]>(() => generateSequence(PRACTICE_COUNT));
  const [letterIndex, setLetterIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackMsg | null>(null);
  const [score, setScore] = useState<Score>({ correct: 0, wrong: 0, missed: 0 });

  const currentIdxRef = useRef(0);
  const pressedRef = useRef(false);
  const sequenceRef = useRef(sequence);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showFeedback = useCallback((fb: FeedbackMsg) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(fb);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 1300);
  }, []);

  // Letter advancement interval — runs for the entire practice phase
  useEffect(() => {
    if (phase !== "practice") return;
    currentIdxRef.current = 0;
    pressedRef.current = false;

    const seq = sequenceRef.current;
    const interval = setInterval(() => {
      const idx = currentIdxRef.current;

      // Check for a missed match on the outgoing letter
      if (idx >= 2 && seq[idx] === seq[idx - 2] && !pressedRef.current) {
        setScore((prev) => ({ ...prev, missed: prev.missed + 1 }));
        showFeedback({
          text: `✗ Mancato! ${seq[idx]} era uguale a 2 fa`,
          type: "missed",
        });
      }

      const nextIdx = idx + 1;
      if (nextIdx >= seq.length) {
        clearInterval(interval);
        setTimeout(() => setPhase("complete"), 900);
        return;
      }

      pressedRef.current = false;
      currentIdxRef.current = nextIdx;
      setLetterIndex(nextIdx);
    }, PRACTICE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phase, showFeedback]);

  // Spacebar handler during practice
  const handleSpace = useCallback(() => {
    if (pressedRef.current) return;
    pressedRef.current = true;

    const idx = currentIdxRef.current;
    const seq = sequenceRef.current;
    const isMatch = idx >= 2 && seq[idx] === seq[idx - 2];

    if (isMatch) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      showFeedback({ text: "✓ Corretto!", type: "correct" });
    } else {
      setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      showFeedback({ text: "✗ Non corrispondono", type: "wrong" });
    }
  }, [showFeedback]);

  useEffect(() => {
    if (phase !== "practice") return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleSpace();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleSpace]);

  const totalMatches = sequence.filter((l, i) => i >= 2 && l === sequence[i - 2]).length;

  // ── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="max-w-xl w-full flex flex-col gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">
              Prima dell'Esperimento 2
            </p>
            <h1 className="text-3xl font-semibold text-primary">Tutorial 2-back</h1>
          </div>

          <p className="text-gray-700 leading-relaxed text-center">
            Ora eseguirai un compito cognitivo chiamato "2-back". Questo compito misura la tua memoria 
            di lavoro e la tua attenzione. Vedrai lettere apparire una alla volta. 
             <strong> Premi SPAZIO</strong> ogni volta che la lettera attuale è uguale a quella 
            mostrata <strong>2 lettere prima</strong>. Per questo tutorial, non dovrai mantenere 
            le dita sul cubo. 
          </p>

          {/* Example 1 — should press */}
          <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Esempio — premi SPAZIO
            </p>
            <div className="flex items-end gap-4 justify-center">
              {(["A", "B", "A"] as const).map((letter, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-semibold border-2 ${
                      i === 2
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    {letter}
                  </div>
                  <span className="text-xs text-gray-400">
                    {i === 0 ? "2 fa" : i === 1 ? "1 fa" : "ORA"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-green-700 font-medium">
              A (ORA) = A (2 fa) → Premi SPAZIO ✓
            </p>
          </div>

          {/* Example 2 — should NOT press */}
          <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Esempio — non premere
            </p>
            <div className="flex items-end gap-4 justify-center">
              {(["B", "C", "X"] as const).map((letter, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-semibold border-2 ${
                      i === 2
                        ? "border-gray-400 bg-gray-100 text-gray-600"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {letter}
                  </div>
                  <span className="text-xs text-gray-400">
                    {i === 0 ? "2 fa" : i === 1 ? "1 fa" : "ORA"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 font-medium">
              X (ORA) ≠ B (2 fa) → Non premere
            </p>
          </div>

          <button
            className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-[#34495e] active:scale-95 transition-all cursor-pointer"
            onClick={() => setPhase("practice")}
          >
            Inizia esercizio
          </button>
        </div>
      </div>
    );
  }

  // ── PRACTICE ─────────────────────────────────────────────────────────────
  if (phase === "practice") {
    const letter = sequence[letterIndex];
    const feedbackColors: Record<FeedbackType, string> = {
      correct: "text-green-700 bg-green-50 border-green-300",
      wrong: "text-orange-700 bg-orange-50 border-orange-300",
      missed: "text-red-700 bg-red-50 border-red-300",
    };

    return (
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm text-gray-400 uppercase tracking-widest">
            Lettera {letterIndex + 1} / {PRACTICE_COUNT}
          </p>
          <div className="text-[120px] font-thin text-primary leading-none min-h-32.5 flex items-center">
            {letter}
          </div>

          {/* Fixed-height feedback area to prevent layout shifts */}
          <div className="h-10 flex items-center">
            {feedback && (
              <span
                className={`px-5 py-2 rounded-full border text-sm font-semibold ${feedbackColors[feedback.type]}`}
              >
                {feedback.text}
              </span>
            )}
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
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold text-primary">Esercizio completato</h1>
        <p className="text-gray-500">
          {totalMatches > 0
            ? `C'erano ${totalMatches} corrispondenze nell'esercizio.`
            : "Nessuna corrispondenza nell'esercizio."}
        </p>

        <div className="w-full flex flex-col gap-3 text-left">
          <div className="flex justify-between items-center rounded-xl bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-700 font-medium">✓ Corrette</span>
            <span className="text-green-700 font-bold text-xl">{score.correct}</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
            <span className="text-orange-700 font-medium">✗ False risposte</span>
            <span className="text-orange-700 font-bold text-xl">{score.wrong}</span>
          </div>
          <div className="flex justify-between items-center rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <span className="text-red-700 font-medium">✗ Mancate</span>
            <span className="text-red-700 font-bold text-xl">{score.missed}</span>
          </div>
        </div>

        <p className="text-gray-500 text-sm">
          Ora esegui lo stesso compito durante l'Esperimento 2, mantenendo le dita sul cubo.
        </p>

        <button
          className="w-full px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-[#34495e] active:scale-95 transition-all cursor-pointer"
          onClick={() => onComplete({ correct: score.correct, wrong: score.wrong, missed: score.missed, totalMatches })}
        >
          Inizia l'Esperimento 2 →
        </button>
      </div>
    </div>
  );
};
