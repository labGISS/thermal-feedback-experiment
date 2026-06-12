from __future__ import annotations

import json
from typing import Any, List, Optional

from pydantic import BaseModel, field_validator


# ── Inbound (from React app) ──────────────────────────────────────────────────

class DeviceValues(BaseModel):
    """Mirrors ValuesMessage in the React app's types.ts (current firmware).
    All fields are optional so that sessions recorded with old firmware
    (duration/t_on_ms/t_off_ms/heating_path/touches) are still accepted —
    the unknown old fields are silently dropped by Pydantic, and the new
    fields will simply be None for those legacy rows.
    """
    touch_time_ms: Optional[float] = None
    touched: Optional[List[int]] = None
    temp_setpoint_c: Optional[float] = None
    channels: Optional[List[int]] = None
    temps_max_c: Optional[List[Optional[float]]] = None
    temps_avg_c: Optional[List[Optional[float]]] = None


class TwoBackStatsIn(BaseModel):
    """Mirrors TwoBackStats in the React app's types.ts."""
    correct: int
    wrong: int
    missed: int
    totalMatches: int


class FeedbackItem(BaseModel):
    experimentId: int
    trialIndex: Optional[int] = None
    heatingPath: Optional[List[int]] = None
    selectedFaces: Optional[List[int]] = None
    temperatureEstimate: Optional[str] = None
    clarityEstimate: Optional[int] = None       # 1–5 per-trial confidence
    deviceValues: Optional[DeviceValues] = None
    twoBackStats: Optional[TwoBackStatsIn] = None  # Exp 3 only
    timestamp: int
    participantNumber: Optional[int] = None  # ignored; session-level value is used


class DemographicsIn(BaseModel):
    age: int
    gender: str
    handedness: str
    timestamp: int
    participantNumber: Optional[int] = None  # ignored; session-level value is used


class PostSessionIn(BaseModel):
    overallComfort: int
    perceivedIntensity: int
    twoBackDifficulty: int
    # feedbackClarity: Optional[int] = None
    discomfortOrPain: bool
    timestamp: int
    participantNumber: Optional[int] = None  # ignored; session-level value is used


class TwoBackTutorialIn(BaseModel):
    """Tutorial completion data sent once per session."""
    stats: TwoBackStatsIn
    timestamp: int
    participantNumber: Optional[int] = None  # ignored; session-level value is used


class SessionPayload(BaseModel):
    participantNumber: int
    submittedAt: str
    demographics: Optional[DemographicsIn] = None
    feedback: List[FeedbackItem]
    twoBackTutorial: Optional[TwoBackTutorialIn] = None
    postSession: Optional[PostSessionIn] = None


# ── Outbound (API responses) ──────────────────────────────────────────────────

class ParticipantCountResponse(BaseModel):
    count: int


class SessionCreatedResponse(BaseModel):
    participantNumber: int


class DemographicsOut(BaseModel):
    age: int
    gender: str
    handedness: str
    timestamp: int

    model_config = {"from_attributes": True}


class TwoBackStatsOut(BaseModel):
    correct: int
    wrong: int
    missed: int
    totalMatches: int


class FeedbackOut(BaseModel):
    experimentId: int
    trialIndex: Optional[int]
    heatingPath: Optional[List[int]]
    selectedFaces: Optional[List[int]]
    temperatureEstimate: Optional[str]
    clarityEstimate: Optional[int]
    twoBackStats: Optional[TwoBackStatsOut]
    timestamp: int

    model_config = {"from_attributes": True}

    @field_validator("heatingPath", "selectedFaces", mode="before")
    @classmethod
    def parse_json_list(cls, v: Any) -> Optional[List[int]]:
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("twoBackStats", mode="before")
    @classmethod
    def build_two_back_stats(cls, v: Any) -> Optional[TwoBackStatsOut]:
        # v is None when called via model_validate on a Feedback ORM row;
        # the actual values come from the sibling fields two_back_* which are
        # assembled in _build_feedback_out() before validation.
        return v


class TwoBackTutorialOut(BaseModel):
    stats: TwoBackStatsOut
    timestamp: int

    model_config = {"from_attributes": True}


class PostSessionOut(BaseModel):
    overallComfort: int
    perceivedIntensity: int
    twoBackDifficulty: int
    # feedbackClarity: Optional[int] = None
    discomfortOrPain: bool
    timestamp: int

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    participantNumber: int
    submittedAt: str
    demographics: Optional[DemographicsOut]
    feedback: List[FeedbackOut]
    twoBackTutorial: Optional[TwoBackTutorialOut]
    postSession: Optional[PostSessionOut]
