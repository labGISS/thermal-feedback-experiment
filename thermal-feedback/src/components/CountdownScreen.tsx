import { useEffect, useRef, useState } from "react";
import type { Handedness, TrialProgress } from "../types";
import handImg from "../assets/hand_positioning_above.png";

interface Props {
  onComplete: () => void;
  seconds: number;
  trialProgress?: TrialProgress;
  handedness?: Handedness;
}

export const CountdownScreen = ({ onComplete, seconds, trialProgress, handedness }: Props) => {
  const [count, setCount] = useState(seconds);
  // Keep callback in ref to avoid restarting the effect on re-renders
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (count === 0) {
      onCompleteRef.current();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="max-w-xl w-full text-center mx-auto">
        <p className="text-3xl font-semibold mb-2 text-primary">Preparati</p>
        {trialProgress && (
          <p className="text-sm text-gray-400 mb-2 uppercase tracking-widest">
            Prova {trialProgress.current} di {trialProgress.total}
          </p>
        )}
        <div className="text-[120px] font-thin text-primary leading-none mb-6 md:text-8xl">
          {count}
        </div>
        <img
          src={handImg}
          alt="Posizionamento delle dita sul cubo"
          className="w-68 h-68 object-contain mx-auto mb-4"
          style={handedness === "Sinistra" ? { transform: "scaleX(-1)" } : undefined}
        />
        <p className="text-lg text-red-400">Attendi il conto alla rovescia prima di toccare il cubo</p>
      </div>
    </div>
  );
};
