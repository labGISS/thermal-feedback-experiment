import type { ExperimentConfig, Handedness, TrialProgress } from "../types";
import handImg from "../assets/hand_positioning_above.png";

interface ExperimentIntroProps {
  experiment: ExperimentConfig;
  trialProgress?: TrialProgress;
  handedness?: Handedness;
  onStart: () => void;
}

export const ExperimentIntro = ({ experiment, trialProgress, handedness, onStart }: ExperimentIntroProps) => {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full text-center mx-auto">
        <h1 className="text-3xl font-semibold mb-2 text-primary">{experiment.title}</h1>
        {trialProgress && (
          <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest">
            Prova {trialProgress.current} di {trialProgress.total}
          </p>
        )}
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">{experiment.description}</p>
        <img
          src={handImg}
          alt="Posizionamento delle dita sul cubo"
          className="w-68 h-68 object-contain mx-auto mb-8"
          style={handedness === "Sinistra" ? { transform: "scaleX(-1)" } : undefined}
        />
        <button
          onClick={onStart}
          className="bg-primary text-white border-0 px-12 py-4 text-base font-medium rounded-lg cursor-pointer hover:bg-[#34495e] transition-colors"
        >
          Inizia l'esperimento
        </button>
      </div>
    </div>
  );
};
