import type { FeedbackData } from "../types";

interface Props {
  experimentId: number;
  trials: FeedbackData[];
  onContinue: () => void;
}

/** Returns true if the selected faces exactly match the heated faces. */
function isExactMatch(heated: number[], selected: number[]): boolean {
  if (heated.length !== selected.length) return false;
  const a = [...heated].sort((x, y) => x - y);
  const b = [...selected].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

export const DebugRecap = ({ experimentId, trials, onContinue }: Props) => {
  const correct = trials.filter(
    (t) => isExactMatch(t.heatingPath ?? [], t.selectedFaces ?? []),
  ).length;

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-2xl w-full mx-auto">
        <div className="inline-block mb-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full text-xs font-semibold text-yellow-700 uppercase tracking-widest">
          Debug
        </div>
        <h1 className="text-3xl font-semibold mb-1 text-primary">
          Recap — Esperimento {experimentId}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {correct}/{trials.length} corrispondenze esatte
        </p>

        <div className="flex flex-col gap-3">
          {trials.map((trial, i) => {
            const heated = [...(trial.heatingPath ?? [])].sort((a, b) => a - b);
            const selected = [...(trial.selectedFaces ?? [])].sort((a, b) => a - b);
            const exact = isExactMatch(heated, selected);

            return (
              <div
                key={i}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 ${
                  exact ? "border-ok bg-green-50" : "border-danger bg-red-50"
                }`}
              >
                {/* Trial number */}
                <span className="text-sm font-semibold text-gray-500 w-16 shrink-0">
                  Prova {(trial.trialIndex ?? i) + 1}
                </span>

                {/* Heated faces */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-gray-400">Riscaldate</span>
                  <span className="font-mono text-sm">
                    {heated.length > 0 ? heated.map((f) => `F${f}`).join(", ") : "—"}
                  </span>
                </div>

                {/* Selected faces */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-gray-400">Selezionate</span>
                  <span className="font-mono text-sm">
                    {selected.length > 0 ? selected.map((f) => `F${f}`).join(", ") : "—"}
                  </span>
                </div>

                {/* Temperature estimate */}
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-xs text-gray-400">Intensità</span>
                  <span className="font-semibold text-sm">
                    {trial.temperatureEstimate ?? "—"}
                  </span>
                </div>

                {/* Result icon */}
                <span className={`text-xl shrink-0 ${exact ? "text-ok" : "text-danger"}`}>
                  {exact ? "✓" : "✗"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          className="mt-8 bg-primary text-white border-0 px-12 py-4 text-base font-medium rounded-lg cursor-pointer hover:bg-[#34495e] transition-colors"
          onClick={onContinue}
        >
          Continua
        </button>
      </div>
    </div>
  );
};
