import { useState } from "react";
import type {
  ExperimentConfig,
  FeedbackData,
  Handedness,
  TrialProgress,
  ValuesMessage,
} from "../types";
import { CubeFaceSelector } from "./CubeFaceSelector";
import { TEMP_TOLERANCE } from "../experimentConfig";

interface Props {
  experiment: ExperimentConfig;
  onSubmit: (feedback: FeedbackData) => void;
  handedness: Handedness;
  trialProgress?: TrialProgress;
  heatingPath?: number[];
  deviceValues?: ValuesMessage;
  onRepeat?: () => void;
  tempSetPoint: number;
}

export const FeedbackForm = ({
  experiment,
  onSubmit,
  handedness,
  trialProgress,
  heatingPath,
  deviceValues,
  onRepeat,
  tempSetPoint,
}: Props) => {
  const [selectedFaces, setSelectedFaces] = useState<number[]>([]);
  // const [temperatureEstimate, setTemperatureEstimate] = useState<string | undefined>(undefined);
  const [clarityEstimate, setClarityEstimate] = useState<number | undefined>(undefined);
  const [tempFaces, setTempFaces] = useState<number[]>([0, 0, 0]);

  const malfunction =
    !!deviceValues?.temps_max_c &&
    !!heatingPath &&
    heatingPath.some((face) => {
      const t = deviceValues.temps_max_c![face];
      return typeof t === "number" && t <= tempSetPoint - TEMP_TOLERANCE;
    });

  const isValid =
    selectedFaces.length > 0 &&
    (!experiment.feedbackConfig.showTemperatureEstimate || tempFaces.some((t) => t > 0)) &&
    clarityEstimate !== undefined;

  const handleSubmit = () => {
    onSubmit({
      experimentId: experiment.id,
      selectedFaces,
      temperatureEstimate: tempFaces,
      clarityEstimate,
      timestamp: Date.now(),
    });
  };

  const handleSubmitNoFeedback = () => {
    onSubmit({
      experimentId: experiment.id,
      selectedFaces: [],
      temperatureEstimate: tempFaces,
      // temperatureEstimate: "0",
      clarityEstimate: 0,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full text-center mx-auto">
        <h1 className="text-3xl font-semibold mb-2 text-primary">Riscontro</h1>

        {trialProgress && (
          <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest">
            Prova {trialProgress.current} di {trialProgress.total}
          </p>
        )}

        {malfunction && (
          <div className="mb-4 p-4 rounded-lg border border-yellow-400 bg-yellow-50 text-left">
            <p className="text-yellow-800 font-medium text-sm">
              E&apos; possibile che si sia verificato un malfunzionamento del dispositivo. Se non
              hai sentito un cambiamento di temperatura ti preghiamo di avvisare il Tutor.
            </p>
            <div className="mt-3 flex justify-center">
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-6 py-2 rounded-lg cursor-pointer transition-colors"
                onClick={onRepeat}
              >
                Ripeti test
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 mt-8">
          {/* Cube face selection */}
          <div className="flex flex-col gap-4">
            <label className="text-lg font-medium text-gray-900 text-left">
              {experiment.feedbackConfig.faceSelection === "single"
                ? "Su quale faccia hai sentito il calore?"
                : "Su quali facce hai sentito il calore? Seleziona tutte quelle applicabili."}
            </label>
            <CubeFaceSelector
              mode={experiment.feedbackConfig.faceSelection}
              selected={selectedFaces}
              onChange={setSelectedFaces}
              onChangeTempFaces={setTempFaces}
              handedness={handedness}
            />
          </div>

          {/* Temperature estimate
          {experiment.feedbackConfig.showTemperatureEstimate && (
            <div className="flex flex-col gap-2">
              <label className="text-lg font-medium text-gray-900 text-left">
                Quanto era caldo?
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`w-14 h-14 rounded-xl border-2 text-xl font-semibold cursor-pointer transition-all ${
                      temperatureEstimate === String(n)
                        ? "bg-accent border-accent text-white"
                        : "bg-white border-gray-200 hover:border-primary"
                    }`}
                    onClick={() => setTemperatureEstimate(String(n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>Poco caldo</span>
                <span>Molto caldo</span>
              </div>
            </div>
          )} */}

          {/* Clarity estimate — every trial */}
          <div className="flex flex-col gap-2">
            <label className="text-lg font-medium text-gray-900 text-left">
              Quanto eri sicuro/a nell'identificare le facce riscaldate?
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`w-14 h-14 rounded-xl border-2 text-xl font-semibold cursor-pointer transition-all ${
                    clarityEstimate === n
                      ? "bg-accent border-accent text-white"
                      : "bg-white border-gray-200 hover:border-primary"
                  }`}
                  onClick={() => setClarityEstimate(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>Per niente sicuro</span>
              <span>Molto sicuro</span>
            </div>
          </div>

          <button
            className="bg-primary text-white border-0 px-12 py-4 text-base font-medium rounded-lg cursor-pointer hover:bg-[#34495e] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Invia riscontro
          </button>

          <div className="mt-12 p-4 rounded-lg border border-red-400 bg-red-50 text-left">
            <p className="text-red-800 font-medium text-sm">
              Se non hai avvertito alcuno stimolo termico, puoi saltare questa sezione cliccando sul
              pulsante "Salta test".
            </p>
            <div className="mt-3 flex justify-center">
              <button
                className="bg-red-400 hover:bg-red-500 text-white font-semibold px-6 py-2 rounded-lg cursor-pointer transition-colors"
                onClick={handleSubmitNoFeedback}
              >
                Salta test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
