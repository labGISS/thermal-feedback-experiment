// Experiment flow stages
export type ExperimentStage = "intro" | "countdown" | "in-progress" | "feedback" | "debug-recap";

// Experiment behavioural type
export type ExperimentType = "pattern" | "pattern-cognitive";

export type Handedness = "Destra" | "Sinistra";

export interface ExperimentState {
  currentExperiment: number; // 1, 2, or 3
  stage: ExperimentStage;
}

// Message published to /commands/ — received by the device
export interface CommandMessage {
  temp_setpoint_c: number;
  channels: number[];
}

// Message published by the device to /values/ when a heating cycle ends
export interface ValuesMessage {
  touch_time_ms: number;
  touched: number[];
  temp_setpoint_c: number;
  channels: number[];
  temps_max_c: number[];
  temps_avg_c: number[];
}

export interface TrialProgress {
  current: number;
  total: number;
}

export interface TwoBackStats {
  correct: number;     // space pressed on a true 2-back match
  wrong: number;       // space pressed on a non-match (false alarm)
  missed: number;      // match occurred but space was not pressed
  totalMatches: number; // total positions that were genuine matches
}

export interface TwoBackTutorialData {
  participantNumber?: number;
  stats: TwoBackStats;
  timestamp: number;
}

export interface FeedbackData {
  participantNumber?: number;
  heatingPath?: number[]; // heating_path sent to the device for this trial
  trialIndex?: number; // 0-based position within the experiment type
  experimentId: number;
  selectedFaces?: number[]; // cube faces the user identified
  temperatureEstimate?: string; // 1–5 heat intensity
  clarityEstimate?: number; // 1–5 confidence in identifying the heated faces
  deviceValues?: ValuesMessage; // raw values from device
  twoBackStats?: TwoBackStats;  // only present for Exp 2 trials
  timestamp: number;
}

export interface ExperimentConfig {
  id: number;
  type: ExperimentType;
  title: string;
  description: string;
  /** Step-by-step instructions shown on the confirmation screen before each trial */
  confirmationInstructions: string[];
  command?: CommandMessage;
  /** Milliseconds to wait after entering in-progress before sending the MQTT command */
  thermalDelay_ms?: number;
  feedbackConfig: {
    faceSelection: "single" | "multi";
    showTemperatureEstimate?: boolean;
  };
}

export interface DemographicsData {
  participantNumber?: number;
  age: number;
  gender: string;
  handedness: Handedness;
  timestamp: number;
}

export interface PostSessionData {
  participantNumber?: number;
  overallComfort: number; // 1–5
  perceivedIntensity: number; // 1=too weak, 3=just right, 5=too strong
  twoBackDifficulty: number; // 1–5
  feedbackClarity?: number; // 1–5, optional
  discomfortOrPain: boolean;
  timestamp: number;
}

export interface SessionTrial {
  experimentType: 1 | 2; // which experiment type
  trialIndex: number; // 0-based position within this experiment type
  totalTrials: number; // total trials for this experiment type (7)
  heatingPath: number[]; // the specific heating path for this trial
}
