import type { ExperimentConfig, Handedness } from "../types";
import handImgR from "../assets/hand_positioning_nobg_r.png";
import handImgL from "../assets/hand_positioning_nobg_l.png";

interface Props {
  experiment: ExperimentConfig;
  handedness: Handedness;
  trialProgress?: { current: number; total: number };
  onConfirm: () => void;
}

const getHandImg = (handedness: Handedness) => {
  if (handedness === "Destra") return handImgR;
  if (handedness === "Sinistra") return handImgL;
};

export const ConfirmationScreen = ({ experiment, handedness, trialProgress, onConfirm }: Props) => (
  <div className="flex-1 flex items-center justify-center px-5 py-10">
    <div className="max-w-3xl w-full text-center mx-auto">
      <h1 className="text-3xl font-semibold mb-2 text-primary">{experiment.title}</h1>
      {trialProgress && (
        <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest">
          Prova {trialProgress.current} di {trialProgress.total}
        </p>
      )}

      <div className="flex flex-col gap-2 items-start mb-8">
        <img
          src={getHandImg(handedness)}
          alt="Posizionamento della mano sul dispositivo"
          className="w-68 h-auto shrink-0 rounded-lg mx-auto"
        />
        <ol className="flex flex-col gap-4 text-left flex-1 w-full list-none p-0">
          {experiment.confirmationInstructions.map((instruction, i) => (
            <li
              key={i}
              className="relative pl-11 pr-5 py-4 bg-white border border-gray-200 rounded-lg text-base leading-relaxed"
            >
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              {instruction}
            </li>
          ))}
        </ol>
      </div>

      <button
        className="bg-primary text-white border-0 px-12 py-4 text-base font-medium rounded-lg cursor-pointer hover:bg-[#34495e] transition-colors"
        onClick={onConfirm}
      >
        Ho capito
      </button>
    </div>
  </div>
);
