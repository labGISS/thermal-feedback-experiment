import { useRef, useState } from "react";
import type {
  ExperimentStage,
  SessionTrial,
  FeedbackData,
  ValuesMessage,
  DemographicsData,
  PostSessionData,
  Handedness,
  TrialProgress,
  TwoBackStats,
} from "./types";
import { COUNTDOWN_SECONDS, experiments, NUM_FACES, PAUSE_MS, PULSE_DURATION_MS } from "./experimentConfig";
import { useMqtt } from "./hooks/useMqtt";
import {
  saveFeedback,
  saveDemographics,
  savePostSession,
  saveTwoBackTutorialStats,
  incrementParticipantCount,
  fetchParticipantNumber,
  submitSessionData,
} from "./storage";
import { getTrialSequence } from "./counterbalancing";
import { DemographicsScreen } from "./components/DemographicsScreen";
import { ExperimentIntro } from "./components/ExperimentIntro";
import { CountdownScreen } from "./components/CountdownScreen";
import { ExperimentInProgress } from "./components/ExperimentInProgress";
import { FeedbackForm } from "./components/FeedbackForm";
import { PostSessionQuestionnaire } from "./components/PostSessionQuestionnaire";
import { CompletionScreen } from "./components/CompletionScreen";
import { TwoBackTutorial } from "./components/TwoBackTutorial";

type AppPhase = "demographics" | "experiments" | "two-back-tutorial" | "post-session" | "done";

function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>("demographics");
  const [handedness, setHandedness] = useState<Handedness>("Destra");
  const [participantNumber, setParticipantNumber] = useState(0);
  const [sessionTrials, setSessionTrials] = useState<SessionTrial[]>([]);
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  const [stage, setStage] = useState<ExperimentStage>("intro");

  // Holds the last /values/ message received from the device
  const pendingDeviceValues = useRef<ValuesMessage | undefined>(undefined);
  // Latest 2-back stats from the running TwoBackTask (Exp 2 trials)
  const twoBackStatsRef = useRef<TwoBackStats | undefined>(undefined);
  // Timeout handle for the deferred thermal command in Exp 2
  const thermalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Device publishes to /values/ when a heating cycle ends → go to feedback
  const handleValuesReceived = (values: ValuesMessage) => {
    console.log("Device values received:", values);
    pendingDeviceValues.current = values;
    setStage("feedback");
  };

  const { isConnected, publishCommand } = useMqtt(handleValuesReceived);

  // Demographics submitted → build full trial sequence and start experiments
  const handleDemographicsSubmit = async (data: DemographicsData) => {
    let pNum: number;
    try {
      pNum = await fetchParticipantNumber();
    } catch (err) {
      console.error("Could not reach API, falling back to local counter:", err);
      pNum = incrementParticipantCount();
    }
    const trials = getTrialSequence(pNum);
    setParticipantNumber(pNum);
    setSessionTrials(trials);
    setCurrentTrialIdx(0);
    setStage("intro");
    saveDemographics({ ...data, participantNumber: pNum });
    setHandedness(data.handedness);
    setAppPhase("experiments");
  };

  // All experiments use a countdown before in-progress
  const handleIntroNext = () => setStage("countdown");

  const handleCountdownComplete = () => startInProgress(currentTrialIdx);

  // Sends the MQTT command for the given trial index and enters the in-progress stage.
  // If the experiment defines thermalDelay_ms the command is deferred by that duration
  // so the participant can settle into the task before the thermal stimulus is applied.
  const startInProgress = (trialIdx: number) => {
    // Cancel any pending deferred command from a previous trial
    if (thermalTimeoutRef.current) {
      clearTimeout(thermalTimeoutRef.current);
      thermalTimeoutRef.current = null;
    }
    const trial = sessionTrials[trialIdx];
    const expConfig = experiments[trial.experimentType - 1];
    const pulse_ms = Array.from({ length: NUM_FACES }, (_, i) =>
      trial.heatingPath.includes(i) ? PULSE_DURATION_MS : 0,
    );
    const sendCommand = () => publishCommand({ pulse_ms, pause_ms: PAUSE_MS });
    if (expConfig.thermalDelay_ms && expConfig.thermalDelay_ms > 0) {
      thermalTimeoutRef.current = setTimeout(sendCommand, expConfig.thermalDelay_ms);
    } else {
      sendCommand();
    }
    setStage("in-progress");
    // Reset 2-back stats at the start of each in-progress phase
    twoBackStatsRef.current = undefined;
  };

  // Feedback submitted → advance to next trial (or tutorial / post-session)
  const handleSubmitFeedback = (feedback: FeedbackData) => {
    const trial = sessionTrials[currentTrialIdx];
    saveFeedback({
      ...feedback,
      participantNumber,
      heatingPath: trial.heatingPath,
      trialIndex: trial.trialIndex,
      deviceValues: pendingDeviceValues.current,
      twoBackStats: trial.experimentType === 2 ? twoBackStatsRef.current : undefined,
    });
    pendingDeviceValues.current = undefined;
    twoBackStatsRef.current = undefined;

    const nextIdx = currentTrialIdx + 1;
    if (nextIdx >= sessionTrials.length) {
      setAppPhase("post-session");
      return;
    }

    setCurrentTrialIdx(nextIdx);

    const nextTrial = sessionTrials[nextIdx];

    // Show 2-back tutorial before the very first Experiment 2 trial
    if (nextTrial.experimentType === 2 && nextTrial.trialIndex === 0) {
      setStage("intro");
      setAppPhase("two-back-tutorial");
      return;
    }

    // Between trials of the same experiment type skip intro and go to countdown
    if (nextTrial.experimentType === trial.experimentType) {
      setStage("countdown");
    } else {
      setStage("intro");
    }
  };

  const handleTutorialComplete = (stats: TwoBackStats) => {
    saveTwoBackTutorialStats({ stats, participantNumber, timestamp: Date.now() });
    setAppPhase("experiments");
  };

  // Post-session questionnaire submitted → completion
  const handlePostSessionSubmit = (data: PostSessionData) => {
    savePostSession({ ...data, participantNumber });
    submitSessionData(participantNumber);
    setAppPhase("done");
  };

  const currentTrial = sessionTrials[currentTrialIdx];
  const currentExpConfig = currentTrial
    ? experiments[currentTrial.experimentType - 1]
    : experiments[0];
  const trialProgress: TrialProgress | undefined = currentTrial
    ? { current: currentTrial.trialIndex + 1, total: currentTrial.totalTrials }
    : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      {/* MQTT connection indicator — hidden during demographics and tutorial */}
      {appPhase !== "demographics" && appPhase !== "two-back-tutorial" && (
        <div className="fixed top-5 right-5 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm z-50">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-ok" : "bg-danger"}`} />
          <span>{isConnected ? "Broker Connesso" : "Broker Disconnesso"}</span>
        </div>
      )}

      {appPhase === "demographics" && <DemographicsScreen onSubmit={handleDemographicsSubmit} />}

      {appPhase === "experiments" && currentTrial && (
        <>
          {stage === "intro" && (
            <ExperimentIntro
              experiment={currentExpConfig}
              trialProgress={trialProgress}
              handedness={handedness}
              onStart={handleIntroNext}
            />
          )}

          {stage === "countdown" && (
            <CountdownScreen onComplete={handleCountdownComplete} trialProgress={trialProgress} seconds={COUNTDOWN_SECONDS} handedness={handedness} />
          )}

          {stage === "in-progress" && (
            <ExperimentInProgress
              experiment={currentExpConfig}
              isConnected={isConnected}
              trialProgress={trialProgress}
              onTwoBackStats={(stats) => { twoBackStatsRef.current = stats; }}
            />
          )}

          {stage === "feedback" && (
            <FeedbackForm
              experiment={currentExpConfig}
              onSubmit={handleSubmitFeedback}
              handedness={handedness}
              trialProgress={trialProgress}
            />
          )}
        </>
      )}

      {appPhase === "two-back-tutorial" && <TwoBackTutorial onComplete={handleTutorialComplete} />}

      {appPhase === "post-session" && (
        <PostSessionQuestionnaire onSubmit={handlePostSessionSubmit} />
      )}

      {appPhase === "done" && <CompletionScreen />}
    </div>
  );
}

export default App;
