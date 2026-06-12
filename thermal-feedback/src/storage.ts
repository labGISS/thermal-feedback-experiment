import { API_BASE_URL } from "./connection";
import type { FeedbackData, DemographicsData, PostSessionData, TwoBackTutorialData } from "./types";

const FEEDBACK_KEY = "thermal_feedback_data";
const DEMOGRAPHICS_KEY = "thermal_demographics";
const POST_SESSION_KEY = "thermal_post_session";
const TUTORIAL_TWOBACK_KEY = "thermal_tutorial_twoback";
const PARTICIPANT_COUNTER_KEY = "thermal_participant_count";

// ── Participant counter ───────────────────────────────────────────────────

export const getParticipantCount = (): number => {
  const v = localStorage.getItem(PARTICIPANT_COUNTER_KEY);
  return v ? parseInt(v, 10) : 0;
};

/** Increments the counter and returns the new (1-based) participant number. */
export const incrementParticipantCount = (): number => {
  const next = getParticipantCount() + 1;
  localStorage.setItem(PARTICIPANT_COUNTER_KEY, String(next));
  return next;
};

export const saveFeedback = (feedback: FeedbackData) => {
  try {
    const existing = getAllFeedback();
    existing.push(feedback);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));
    console.log("Feedback saved:", feedback);
  } catch (error) {
    console.error("Failed to save feedback:", error);
  }
};

export const getAllFeedback = (): FeedbackData[] => {
  try {
    const data = localStorage.getItem(FEEDBACK_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to retrieve feedback:", error);
    return [];
  }
};

export const saveDemographics = (data: DemographicsData) => {
  try {
    const existing = getAllDemographics();
    existing.push(data);
    localStorage.setItem(DEMOGRAPHICS_KEY, JSON.stringify(existing));
    console.log("Demographics saved:", data);
  } catch (error) {
    console.error("Failed to save demographics:", error);
  }
};

export const getAllDemographics = (): DemographicsData[] => {
  try {
    const raw = localStorage.getItem(DEMOGRAPHICS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Handle legacy single-object format
    return Array.isArray(parsed) ? (parsed as DemographicsData[]) : [parsed as DemographicsData];
  } catch {
    return [];
  }
};

export const savePostSession = (data: PostSessionData) => {
  try {
    const existing = getAllPostSessions();
    existing.push(data);
    localStorage.setItem(POST_SESSION_KEY, JSON.stringify(existing));
    console.log("Post-session data saved:", data);
  } catch (error) {
    console.error("Failed to save post-session data:", error);
  }
};

export const getAllPostSessions = (): PostSessionData[] => {
  try {
    const raw = localStorage.getItem(POST_SESSION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PostSessionData[]) : [parsed as PostSessionData];
  } catch {
    return [];
  }
};

// ── Two-back tutorial stats ──────────────────────────────────────────────────

export const saveTwoBackTutorialStats = (data: TwoBackTutorialData) => {
  try {
    const existing = getAllTwoBackTutorialStats();
    existing.push(data);
    localStorage.setItem(TUTORIAL_TWOBACK_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error("Failed to save tutorial stats:", error);
  }
};

export const getAllTwoBackTutorialStats = (): TwoBackTutorialData[] => {
  try {
    const raw = localStorage.getItem(TUTORIAL_TWOBACK_KEY);
    return raw ? (JSON.parse(raw) as TwoBackTutorialData[]) : [];
  } catch {
    return [];
  }
};

// ── API submission ───────────────────────────────────────────────────────────

/**
 * Fetches the current completed-session count from the API and returns
 * the next participant number (count + 1).
 * Throws if the request fails so the caller can decide how to handle it.
 */
export const fetchParticipantNumber = async (): Promise<number> => {
  const res = await fetch(`${API_BASE_URL}/participant-count`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { count: number };
  return data.count + 1;
};

//  Fire-and-forget: errors are logged but do not block the UI transition.
export const submitSessionData = (participantNumber: number): void => {
  const payload = {
    participantNumber,
    submittedAt: new Date().toISOString(),
    demographics:
      getAllDemographics().find((d) => d.participantNumber === participantNumber) ?? null,
    feedback: getAllFeedback().filter((f) => f.participantNumber === participantNumber),
    twoBackTutorial:
      getAllTwoBackTutorialStats().find((t) => t.participantNumber === participantNumber) ?? null,
    postSession: (() => {
      const ps = getAllPostSessions().find((p) => p.participantNumber === participantNumber);
      // Guard against legacy localStorage entries where numeric fields were stored as strings
      //if (!ps || typeof ps.perceivedIntensity !== "number") return null;
      return ps;
    })(),
  };

  console.log("Submitting session data to API:", payload);

  fetch(`${API_BASE_URL}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("API validation error:", JSON.stringify(body, null, 2));
        throw new Error(`HTTP ${res.status}`);
      }
      console.log("Session data submitted to API:", participantNumber);
    })
    .catch((err) => console.error("Failed to submit session data:", err));
};

export const clearAllData = () => {
  try {
    [FEEDBACK_KEY, DEMOGRAPHICS_KEY, POST_SESSION_KEY, TUTORIAL_TWOBACK_KEY, PARTICIPANT_COUNTER_KEY].forEach((k) =>
      localStorage.removeItem(k),
    );
    console.log("All data cleared");
  } catch (error) {
    console.error("Failed to clear data:", error);
  }
};
