import type { ExperimentConfig, TrialProgress, TwoBackStats } from "../types";
import { TwoBackTask } from "./TwoBackTask";

interface Props {
  experiment: ExperimentConfig;
  isConnected: boolean;
  trialProgress?: TrialProgress;
  onTwoBackStats?: (stats: TwoBackStats) => void;
}

export const ExperimentInProgress = ({ experiment, isConnected, trialProgress, onTwoBackStats }: Props) => {
  // Experiment 3: show the 2-back cognitive task
  if (experiment.type === "pattern-cognitive") {
    return (
      <div className="flex-1 flex flex-col">
        <p className="text-center text-sm text-gray-400 pt-6 uppercase tracking-widest">
          Posiziona le dita sul cubo e inizia il compito
        </p>
        <TwoBackTask onStatsUpdate={onTwoBackStats} />
      </div>
    );
  }

  // Experiments 1 & 2: place-fingers waiting screen
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full text-center mx-auto">
        <h1 className="text-3xl font-semibold mb-2 text-primary">{experiment.title}</h1>
        {trialProgress && (
          <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest">
            Prova {trialProgress.current} di {trialProgress.total}
          </p>
        )}
        <div className="mt-12">
          <p className="text-xl text-gray-700 mb-3">Posiziona le dita sul cubo per iniziare</p>
          <p className="text-sm text-gray-400">L'esperimento inizia automaticamente al contatto</p>
          {!isConnected && (
            <p className="text-danger text-sm mt-6">In attesa della connessione al dispositivo</p>
          )}
        </div>
      </div>
    </div>
  );
};
