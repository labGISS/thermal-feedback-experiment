import { getAllDemographics } from "./storage";
import { LiveAccuracyPage } from "./components/LiveAccuracyPage";
import type { Handedness } from "./types";

export const AccuracyApp = () => {
  const demos = getAllDemographics();
  const handedness: Handedness = demos.at(-1)?.handedness ?? "Destra";
  return <LiveAccuracyPage handedness={handedness} onClose={() => window.close()} />;
};
