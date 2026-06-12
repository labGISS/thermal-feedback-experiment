import { useEffect, useRef, useState } from "react";
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
import { COUNTDOWN_SECONDS, experiments, FACE_OFF, FACE_ON, NUM_FACES, TEMP_SET_POINT} from "./experimentConfig";
import { useMqtt } from "./hooks/useMqtt";
import {
  saveFeedback,
  saveDemographics,
  savePostSession,
  saveTwoBackTutorialStats,
  incrementParticipantCount,
  fetchParticipantNumber,
  submitSessionData,
  clearAllData,
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
import { DebugRecap } from "./components/DebugRecap";

type AppPhase = "demographics" | "experiments" | "two-back-tutorial" | "post-session" | "done";

function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>("demographics");
  const [handedness, setHandedness] = useState<Handedness>("Destra");
  const [participantNumber, setParticipantNumber] = useState(0);
  const [sessionTrials, setSessionTrials] = useState<SessionTrial[]>([]);
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  const [stage, setStage] = useState<ExperimentStage>("intro");
  const [recapData, setRecapData] = useState<{ heatingPath: number[]; selectedFaces: number[] } | null>(null);

  // Clear any leftover data from a previous session on mount
  useEffect(() => { clearAllData(); }, []);

  // Holds the last /values/ message received from the device
  const [pendingDeviceValues, setPendingDeviceValues] = useState<ValuesMessage | undefined>(undefined);
  // Latest 2-back stats from the running TwoBackTask (Exp 2 trials)
  const twoBackStatsRef = useRef<TwoBackStats>({ correct: 0, wrong: 0, missed: 0, totalMatches: 0 });
  // Timeout handle for the deferred thermal command in Exp 2
  const thermalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Device publishes to /values/ when a heating cycle ends → go to feedback
  const handleValuesReceived = (values: ValuesMessage) => {
    console.log("Device values received:", values);
    setPendingDeviceValues(values);
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
    const channels = Array.from({ length: NUM_FACES }, (_, i) =>
      trial.heatingPath.includes(i) ? FACE_ON : FACE_OFF,
    );
    const sendCommand = () => publishCommand({ temp_setpoint_c: TEMP_SET_POINT, channels });
    if (expConfig.thermalDelay_ms && expConfig.thermalDelay_ms > 0) {
      thermalTimeoutRef.current = setTimeout(sendCommand, expConfig.thermalDelay_ms);
    } else {
      sendCommand();
    }
    setStage("in-progress");
    // Reset 2-back stats at the start of each in-progress phase
    twoBackStatsRef.current = { correct: 0, wrong: 0, missed: 0, totalMatches: 0 };
  };

  // Feedback submitted → show debug recap
  const handleSubmitFeedback = (feedback: FeedbackData) => {
    const trial = sessionTrials[currentTrialIdx];
    saveFeedback({
      ...feedback,
      participantNumber,
      heatingPath: trial.heatingPath,
      trialIndex: trial.trialIndex,
      deviceValues: pendingDeviceValues,
      twoBackStats: trial.experimentType === 2 ? twoBackStatsRef.current : undefined,
    });
    setPendingDeviceValues(undefined);
    twoBackStatsRef.current = { correct: 0, wrong: 0, missed: 0, totalMatches: 0 };

    setRecapData({ heatingPath: trial.heatingPath, selectedFaces: feedback.selectedFaces ?? [] });
    setStage("debug-recap");
  };

  // Repeat the current trial after a malfunction — clear device values and re-run
  const handleRepeatTrial = () => {
    if (thermalTimeoutRef.current) {
      clearTimeout(thermalTimeoutRef.current);
      thermalTimeoutRef.current = null;
    }
    setPendingDeviceValues(undefined);
    twoBackStatsRef.current = { correct: 0, wrong: 0, missed: 0, totalMatches: 0 };
    startInProgress(currentTrialIdx);
  };

  // Debug recap dismissed → advance to next trial (or tutorial / post-session)
  const handleDebugRecapContinue = () => {
    const trial = sessionTrials[currentTrialIdx];
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
    clearAllData();
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
              heatingPath={currentTrial.heatingPath}
              deviceValues={pendingDeviceValues}
              onRepeat={handleRepeatTrial}
            />
          )}

          {stage === "debug-recap" && recapData && (
            <DebugRecap
              heatingPath={recapData.heatingPath}
              selectedFaces={recapData.selectedFaces}
              handedness={handedness}
              trialProgress={trialProgress}
              onContinue={handleDebugRecapContinue}
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
