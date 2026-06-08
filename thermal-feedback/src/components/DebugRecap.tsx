import type { Handedness, TrialProgress } from "../types";

const getFaceConfigs = (handedness: Handedness) =>
  [
    { index: 1 as const, label: "Indice", points: "90,15 155,52 90,88 25,52", cx: 90, cy: 52 },
    {
      index: 0 as const,
      label: handedness === "Destra" ? "Pollice" : "Medio",
      points: "25,52 90,88 90,143 25,107",
      cx: 57,
      cy: 98,
    },
    {
      index: 2 as const,
      label: handedness === "Destra" ? "Medio" : "Pollice",
      points: "90,88 155,52 155,107 90,143",
      cx: 123,
      cy: 98,
    },
  ] as const;

interface Props {
  heatingPath: number[];
  selectedFaces: number[];
  handedness: Handedness;
  trialProgress?: TrialProgress;
  onContinue: () => void;
}

export const DebugRecap = ({ heatingPath, selectedFaces, handedness, trialProgress, onContinue }: Props) => {
  const faceConfigs = getFaceConfigs(handedness);

  const getFaceColors = (faceIndex: number) => {
    const heated = heatingPath.includes(faceIndex);
    const selected = selectedFaces.includes(faceIndex);
    if (heated && selected) return { fill: "#4ade80", stroke: "#16a34a", textFill: "#fff" };
    if (heated && !selected) return { fill: "#f87171", stroke: "#dc2626", textFill: "#fff" };
    if (!heated && selected) return { fill: "#fb923c", stroke: "#ea580c", textFill: "#fff" };
    return { fill: "#d0d0d0", stroke: "#888888", textFill: "#333" };
  };

  const isCorrect =
    heatingPath.length === selectedFaces.length &&
    heatingPath.every((f) => selectedFaces.includes(f));

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full text-center mx-auto">
        <h1 className="text-3xl font-semibold mb-2 text-primary">Riepilogo</h1>
        {trialProgress && (
          <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest">
            Prova {trialProgress.current} di {trialProgress.total}
          </p>
        )}

        <p className={`text-xl font-semibold mb-6 ${isCorrect ? "text-green-600" : "text-red-500"}`}>
          {isCorrect ? "Corretto!" : "Non corretto"}
        </p>

        <div className="flex justify-center gap-10 mb-6">
          {/* Correct answer */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-gray-600">Riscaldato</p>
            <svg viewBox="0 0 180 158" className="w-40">
              {faceConfigs.map((face) => {
                const heated = heatingPath.includes(face.index);
                return (
                  <g key={face.index}>
                    <polygon
                      points={face.points}
                      fill={heated ? "#e8956d" : "#d0d0d0"}
                      stroke={heated ? "#c05a32" : "#888"}
                      strokeWidth="1.5"
                    />
                    <text
                      x={face.cx}
                      y={face.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="13"
                      fontWeight="500"
                      fill={heated ? "#fff" : "#333"}
                      style={{ userSelect: "none" }}
                    >
                      {face.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* User answer with color coding */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-gray-600">Risposta</p>
            <svg viewBox="0 0 180 158" className="w-40">
              {faceConfigs.map((face) => {
                const { fill, stroke, textFill } = getFaceColors(face.index);
                return (
                  <g key={face.index}>
                    <polygon points={face.points} fill={fill} stroke={stroke} strokeWidth="1.5" />
                    <text
                      x={face.cx}
                      y={face.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="13"
                      fontWeight="500"
                      fill={textFill}
                      style={{ userSelect: "none" }}
                    >
                      {face.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mb-8 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-400" />
            Corretto
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
            Mancato
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />
            Falso positivo
          </span>
        </div>

        <button
          onClick={onContinue}
          className="px-8 py-3 bg-primary text-white rounded-xl text-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          Continua
        </button>
      </div>
    </div>
  );
};
