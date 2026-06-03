import { useState } from "react";
import type { DemographicsData, Handedness } from "../types";

const GENDER_OPTIONS = ["Maschio", "Femmina"];
const HANDEDNESS_OPTIONS = ["Sinistra", "Destra"];

const choiceBtn = (selected: boolean) =>
  `px-5 py-3.5 border-2 rounded-lg text-base cursor-pointer transition-all ${
    selected
      ? "bg-accent text-white border-accent"
      : "border-gray-200 bg-white hover:border-primary"
  }`;

interface Props {
  onSubmit: (data: DemographicsData) => void;
}

export const DemographicsScreen = ({ onSubmit }: Props) => {
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [handedness, setHandedness] = useState<Handedness | undefined>(undefined);

  const isValid = () => {
    const ageNum = parseInt(age, 10);
    return ageNum >= 1 && ageNum <= 100 && gender !== undefined && handedness !== undefined;
  };

  const handleSubmit = () => {
    onSubmit({
      age: parseInt(age, 10),
      gender: gender!,
      handedness: handedness!,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-primary text-center">Prima di iniziare</h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed text-center">
          Rispondi ad alcune brevi domande.
        </p>

        <div className="flex flex-col gap-8">
          {/* Age */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-gray-900" htmlFor="age-input">
              Età
            </label>
            <input
              id="age-input"
              className="w-28 px-3.5 py-2.5 border-2 border-gray-200 rounded-lg text-base outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              type="number"
              min={18}
              max={100}
              placeholder="La tua età"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          {/* Gender */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-gray-900">Genere</label>
            <div className="flex flex-row flex-wrap gap-3">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={choiceBtn(gender === opt)}
                  onClick={() => setGender(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Handedness */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-gray-900">Mano dominante</label>
            <div className="flex flex-row flex-wrap gap-3">
              {HANDEDNESS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={choiceBtn(handedness === opt)}
                  onClick={() => setHandedness(opt as Handedness)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <button
            className="bg-primary text-white border-0 px-12 py-4 text-base font-medium rounded-lg cursor-pointer hover:bg-[#34495e] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!isValid()}
          >
            Inizia la sessione
          </button>
        </div>
      </div>
    </div>
  );
};
