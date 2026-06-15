import { useEffect, useState } from "react";
import { getAllFeedback } from "../storage";
import type { FeedbackData, Handedness } from "../types";

const getFaceConfigs = (handedness: Handedness) => [
  { index: 1 as const, label: "Indice",  points: "90,15 155,52 90,88 25,52",      cx: 90,  cy: 52 },
  { index: 0 as const, label: handedness === "Destra" ? "Pollice" : "Medio", points: "25,52 90,88 90,143 25,107",  cx: 57,  cy: 98 },
  { index: 2 as const, label: handedness === "Destra" ? "Medio"   : "Pollice", points: "90,88 155,52 155,107 90,143", cx: 123, cy: 98 },
] as const;

const faceColor = (_faceIndex: number, heated: boolean, selected: boolean) => {
  if (heated && selected)  return { fill: "#4ade80", stroke: "#16a34a", text: "#fff" };
  if (heated && !selected) return { fill: "#f87171", stroke: "#dc2626", text: "#fff" };
  if (!heated && selected) return { fill: "#fb923c", stroke: "#ea580c", text: "#fff" };
  return { fill: "#d0d0d0", stroke: "#888", text: "#333" };
};

const isMatch = (fb: FeedbackData) => {
  const hp = fb.heatingPath ?? [];
  const sf = fb.selectedFaces ?? [];
  return hp.length === sf.length && hp.every((f) => sf.includes(f));
};

interface CubeProps {
  heatingPath: number[];
  selectedFaces: number[];
  handedness: Handedness;
}

const CubeDiagram = ({ heatingPath, selectedFaces, handedness }: CubeProps) => {
  const faces = getFaceConfigs(handedness);
  return (
    <svg viewBox="0 0 180 158" className="w-24">
      {faces.map((face) => {
        const { fill, stroke, text } = faceColor(
          face.index,
          heatingPath.includes(face.index),
          selectedFaces.includes(face.index),
        );
        return (
          <g key={face.index}>
            <polygon points={face.points} fill={fill} stroke={stroke} strokeWidth="1.5" />
            <text
              x={face.cx} y={face.cy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="500" fill={text}
              style={{ userSelect: "none" }}
            >
              {face.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface Props {
  handedness: Handedness;
  onClose: () => void;
}

export const LiveAccuracyPage = ({ handedness, onClose }: Props) => {
  const [rows, setRows] = useState<FeedbackData[]>([]);

  useEffect(() => {
    const load = () => setRows(getAllFeedback());
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, []);

  const correct = rows.filter(isMatch).length;

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-primary">Accuratezza in tempo reale</h2>
          {rows.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {correct} / {rows.length} corrette
              {" "}
              <span className="font-medium text-gray-700">
                ({Math.round((correct / rows.length) * 100)}%)
              </span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors text-gray-500 text-lg leading-none"
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {rows.length === 0 ? (
          <p className="text-center text-gray-400 mt-20">Nessun feedback ancora registrato.</p>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {rows.map((fb, i) => {
              const match = isMatch(fb);
              const hp = fb.heatingPath ?? [];
              const sf = fb.selectedFaces ?? [];
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${match ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                >
                  {/* Trial label */}
                  <div className="shrink-0 w-20 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Esp. {fb.experimentId}</p>
                    <p className="text-sm font-semibold text-gray-600">Prova {(fb.trialIndex ?? 0) + 1}</p>
                  </div>

                  {/* Cube diagram */}
                  <CubeDiagram heatingPath={hp} selectedFaces={sf} handedness={handedness} />

                  {/* Details */}
                  <div className="flex-1 text-sm text-gray-600 space-y-0.5">
                    <p>
                      <span className="text-gray-400">Riscaldato:</span>{" "}
                      <span className="font-medium">{hp.length ? hp.join(", ") : "—"}</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Risposta:</span>{" "}
                      <span className="font-medium">{sf.length ? sf.join(", ") : "—"}</span>
                    </p>
                    {fb.temperatureEstimate !== undefined && (
                      <p>
                        <span className="text-gray-400">Calore:</span>{" "}
                        <span className="font-medium">{fb.temperatureEstimate}</span>
                      </p>
                    )}
                    {fb.clarityEstimate !== undefined && (
                      <p>
                        <span className="text-gray-400">Sicurezza:</span>{" "}
                        <span className="font-medium">{fb.clarityEstimate}</span>
                      </p>
                    )}
                  </div>

                  {/* Match badge */}
                  <div className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${match ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                    {match ? "Corretto" : "Errato"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {rows.length > 0 && (
          <div className="flex justify-center gap-4 mt-6 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-400" />Corretto</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-400" />Mancato</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />Falso positivo</span>
          </div>
        )}
      </div>
    </div>
  );
};
