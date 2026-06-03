import { useState } from "react";
import type { PostSessionData } from "../types";

const choiceBtn = (selected: boolean) =>
  `px-5 py-3.5 border-2 rounded-lg text-base cursor-pointer transition-all ${
    selected
      ? "bg-accent text-white border-accent"
      : "border-gray-200 bg-white hover:border-primary"
  }`;

interface RatingProps {
  value: number | undefined;
  onChange: (v: number) => void;
  max?: number;
}

const RatingScale = ({ value, onChange, max = 5 }: RatingProps) => (
  <div className="flex gap-2">
    {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
      <button
        key={n}
        className={`w-14 h-14 border-2 rounded-lg text-lg font-semibold cursor-pointer transition-all hover:scale-105 ${
          value === n
            ? "bg-accent text-white border-accent"
            : "border-gray-200 bg-white hover:border-primary"
        }`}
        onClick={() => onChange(n)}
      >
        {n}
      </button>
    ))}
  </div>
);

interface Props {
  onSubmit: (data: PostSessionData) => void;
}

export const PostSessionQuestionnaire = ({ onSubmit }: Props) => {
  const [overallComfort, setOverallComfort] = useState<number | undefined>(undefined);
  const [perceivedIntensity, setPerceivedIntensity] = useState<number | undefined>(undefined);
  const [twoBackDifficulty, setTwoBackDifficulty] = useState<number | undefined>(undefined);
  const [discomfortOrPain, setDiscomfortOrPain] = useState<boolean | undefined>(undefined);

  const isValid =
    overallComfort !== undefined &&
    perceivedIntensity !== undefined &&
    twoBackDifficulty !== undefined &&
    discomfortOrPain !== undefined;

  const handleSubmit = () => {
    onSubmit({
      overallComfort: overallComfort!,
      perceivedIntensity: perceivedIntensity!,
      twoBackDifficulty: twoBackDifficulty!,
      discomfortOrPain: discomfortOrPain!,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-primary text-center">Domande finali</h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed text-center">
          Quasi finito, solo alcune ultime domande sulla sessione.
        </p>

        <div className="flex flex-col gap-8">
          {/* Overall comfort */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold text-gray-900">
              Comfort complessivo durante gli esperimenti
            </label>
            <div className="flex justify-between text-xs text-gray-400 w-78">
              <span>A disagio</span>
              <span>Molto a proprio agio</span>
            </div>
            <RatingScale value={overallComfort} onChange={setOverallComfort} />
          </div>

          {/* Perceived intensity */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold text-gray-900">
              Come hai percepito gli stimoli termici nel complesso?
            </label>
            <div className="flex justify-between text-xs text-gray-400 w-78">
              <span>Troppo deboli</span>
              <span>Troppo forti</span>
            </div>
            <RatingScale value={perceivedIntensity} onChange={setPerceivedIntensity} />
          </div>

          {/* 2-back difficulty */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold text-gray-900">
              Quanto è stato difficile il compito di memoria (Esperimento 2)?
            </label>
            <div className="flex justify-between text-xs text-gray-400 w-78">
              <span>Molto facile</span>
              <span>Molto difficile</span>
            </div>
            <RatingScale value={twoBackDifficulty} onChange={setTwoBackDifficulty} />
          </div>

          {/* Discomfort or pain */}
          <div className="flex flex-col gap-3">
            <label className="text-base font-semibold text-gray-900">
              Hai avvertito disagio o dolore?
            </label>
            <div className="flex flex-row flex-wrap gap-3">
              {(["Sì", "No"] as const).map((opt) => {
                const val = opt === "Sì";
                return (
                  <button
                    key={opt}
                    className={choiceBtn(discomfortOrPain === val)}
                    onClick={() => setDiscomfortOrPain(val)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="bg-primary text-white border-0 px-12 py-4 text-base font-medium rounded-lg cursor-pointer hover:bg-[#34495e] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Fine
          </button>
        </div>
      </div>
    </div>
  );
};
