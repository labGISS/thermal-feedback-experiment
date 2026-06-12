import json
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session as DbSession

from database import Base, engine, get_db
from models import Demographics, Feedback, PostSession, Session, TwoBackTutorial
from schemas import (
    DemographicsOut,
    FeedbackOut,
    ParticipantCountResponse,
    PostSessionOut,
    SessionCreatedResponse,
    SessionOut,
    TwoBackStatsOut,
    TwoBackTutorialOut,
    SessionPayload,
)

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Thermal Feedback API", version="1.0.0")

# Allow requests from the Vite dev server and any local origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to specific origin in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _json_to_list(value: Optional[str]) -> Optional[List[int]]:
    if value is None:
        return None
    return json.loads(value)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/participant-count", response_model=ParticipantCountResponse)
def get_participant_count(db: DbSession = Depends(get_db)):
    """Return the number of completed sessions stored so far."""
    count = db.query(Session).count()
    return ParticipantCountResponse(count=count)


@app.post("/session", response_model=SessionCreatedResponse, status_code=201)
def create_session(payload: SessionPayload, db: DbSession = Depends(get_db)):
    """
    Store a complete participant session.
    Returns 409 if a session for this participant number already exists.
    """
    if db.query(Session).filter(Session.participant_number == payload.participantNumber).first():
        raise HTTPException(
            status_code=409,
            detail=f"Session already exists for participant {payload.participantNumber}",
        )

    db.add(Session(
        participant_number=payload.participantNumber,
        submitted_at=payload.submittedAt,
    ))

    if payload.demographics:
        d = payload.demographics
        db.add(Demographics(
            participant_number=payload.participantNumber,
            age=d.age,
            gender=d.gender,
            handedness=d.handedness,
            timestamp=d.timestamp,
        ))

    for fb in payload.feedback:
        dv = fb.deviceValues
        tbs = fb.twoBackStats
        db.add(Feedback(
            participant_number=payload.participantNumber,
            experiment_id=fb.experimentId,
            trial_index=fb.trialIndex,
            heating_path=json.dumps(fb.heatingPath) if fb.heatingPath is not None else None,
            selected_faces=json.dumps(fb.selectedFaces) if fb.selectedFaces is not None else None,
            temperature_estimate=fb.temperatureEstimate,
            clarity_estimate=fb.clarityEstimate,
            device_touch_time_ms=dv.touch_time_ms if dv else None,
            device_touched=json.dumps(dv.touched) if dv else None,
            device_temp_setpoint_c=dv.temp_setpoint_c if dv else None,
            device_channels=json.dumps(dv.channels) if dv and dv.channels is not None else None,
            device_temps_max_c=json.dumps(dv.temps_max_c) if dv and dv.temps_max_c is not None else None,
            device_temps_avg_c=json.dumps(dv.temps_avg_c) if dv and dv.temps_avg_c is not None else None,
            two_back_correct=tbs.correct if tbs else None,
            two_back_wrong=tbs.wrong if tbs else None,
            two_back_missed=tbs.missed if tbs else None,
            two_back_total_matches=tbs.totalMatches if tbs else None,
            timestamp=fb.timestamp,
        ))

    if payload.twoBackTutorial:
        tbt = payload.twoBackTutorial
        db.add(TwoBackTutorial(
            participant_number=payload.participantNumber,
            correct=tbt.stats.correct,
            wrong=tbt.stats.wrong,
            missed=tbt.stats.missed,
            total_matches=tbt.stats.totalMatches,
            timestamp=tbt.timestamp,
        ))

    if payload.postSession:
        ps = payload.postSession
        db.add(PostSession(
            participant_number=payload.participantNumber,
            overall_comfort=ps.overallComfort,
            perceived_intensity=ps.perceivedIntensity,
            two_back_difficulty=ps.twoBackDifficulty,
            # feedback_clarity=ps.feedbackClarity,
            discomfort_or_pain=ps.discomfortOrPain,
            timestamp=ps.timestamp,
        ))

    db.commit()
    return SessionCreatedResponse(participantNumber=payload.participantNumber)


@app.get("/sessions", response_model=List[SessionOut])
def list_sessions(db: DbSession = Depends(get_db)):
    """Return all sessions with their full data."""
    sessions = db.query(Session).order_by(Session.participant_number).all()
    return [_build_session_out(s, db) for s in sessions]


@app.get("/sessions/{participant_number}", response_model=SessionOut)
def get_session(participant_number: int, db: DbSession = Depends(get_db)):
    """Return a single session by participant number."""
    session = (
        db.query(Session)
        .filter(Session.participant_number == participant_number)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _build_session_out(session, db)


# ── Response builder ──────────────────────────────────────────────────────────

def _build_session_out(session: Session, db: DbSession) -> SessionOut:
    demographics = (
        db.query(Demographics)
        .filter(Demographics.participant_number == session.participant_number)
        .first()
    )
    feedback_rows = (
        db.query(Feedback)
        .filter(Feedback.participant_number == session.participant_number)
        .order_by(Feedback.id)
        .all()
    )
    two_back_tutorial = (
        db.query(TwoBackTutorial)
        .filter(TwoBackTutorial.participant_number == session.participant_number)
        .first()
    )
    post_session = (
        db.query(PostSession)
        .filter(PostSession.participant_number == session.participant_number)
        .first()
    )

    return SessionOut(
        participantNumber=session.participant_number,
        submittedAt=session.submitted_at,
        demographics=DemographicsOut(
            age=demographics.age,
            gender=demographics.gender,
            handedness=demographics.handedness,
            timestamp=demographics.timestamp,
        ) if demographics else None,
        feedback=[
            FeedbackOut(
                experimentId=fb.experiment_id,
                trialIndex=fb.trial_index,
                heatingPath=_json_to_list(fb.heating_path),
                selectedFaces=_json_to_list(fb.selected_faces),
                temperatureEstimate=fb.temperature_estimate,
                clarityEstimate=fb.clarity_estimate,
                twoBackStats=TwoBackStatsOut(
                    correct=fb.two_back_correct,
                    wrong=fb.two_back_wrong,
                    missed=fb.two_back_missed,
                    totalMatches=fb.two_back_total_matches,
                ) if fb.two_back_correct is not None else None,
                timestamp=fb.timestamp,
            )
            for fb in feedback_rows
        ],
        twoBackTutorial=TwoBackTutorialOut(
            stats=TwoBackStatsOut(
                correct=two_back_tutorial.correct,
                wrong=two_back_tutorial.wrong,
                missed=two_back_tutorial.missed,
                totalMatches=two_back_tutorial.total_matches,
            ),
            timestamp=two_back_tutorial.timestamp,
        ) if two_back_tutorial else None,
        postSession=PostSessionOut(
            overallComfort=post_session.overall_comfort,
            perceivedIntensity=post_session.perceived_intensity,
            twoBackDifficulty=post_session.two_back_difficulty,
            # feedbackClarity=post_session.feedback_clarity,
            discomfortOrPain=post_session.discomfort_or_pain,
            timestamp=post_session.timestamp,
        ) if post_session else None,
    )
