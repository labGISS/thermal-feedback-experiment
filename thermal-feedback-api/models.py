from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, Text

from database import Base


class Session(Base):
    """One row per participant — the anchor for all other tables."""

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    participant_number = Column(Integer, unique=True, nullable=False, index=True)
    submitted_at = Column(Text, nullable=False)  # ISO-8601


class Demographics(Base):
    __tablename__ = "demographics"

    id = Column(Integer, primary_key=True)
    participant_number = Column(
        Integer, ForeignKey("sessions.participant_number"), nullable=False, index=True
    )
    age = Column(Integer, nullable=False)
    gender = Column(Text, nullable=False)
    handedness = Column(Text, nullable=False)
    timestamp = Column(Integer, nullable=False)  # Unix ms


class Feedback(Base):
    """One row per trial (11 rows per participant)."""

    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)
    participant_number = Column(
        Integer, ForeignKey("sessions.participant_number"), nullable=False, index=True
    )
    experiment_id = Column(Integer, nullable=False)    # 1 | 2
    trial_index = Column(Integer, nullable=True)        # 0-based within experiment type
    heating_path = Column(Text, nullable=True)          # JSON array, e.g. "[0,1]"
    selected_faces = Column(Text, nullable=True)        # JSON array
    temperature_estimate = Column(Text, nullable=True)  # JSON array, e.g. "[0,1]"
    clarity_estimate = Column(Integer, nullable=True)    # 1–5 per-trial confidence
    # Raw values echoed back by the device
    device_touch_time_ms = Column(Float, nullable=True)
    device_touched = Column(Text, nullable=True)        # JSON array
    device_temp_setpoint_c = Column(Float, nullable=True)
    device_channels = Column(Text, nullable=True)       # JSON array
    device_temps_max_c = Column(Text, nullable=True)    # JSON array
    device_temps_avg_c = Column(Text, nullable=True)    # JSON array
    # 2-back task performance (Exp 3 only)
    two_back_correct = Column(Integer, nullable=True)
    two_back_wrong = Column(Integer, nullable=True)
    two_back_missed = Column(Integer, nullable=True)
    two_back_total_matches = Column(Integer, nullable=True)
    timestamp = Column(Integer, nullable=False)         # Unix ms


class TwoBackTutorial(Base):
    """Performance stats from the 2-back tutorial (one row per participant)."""

    __tablename__ = "two_back_tutorial"

    id = Column(Integer, primary_key=True)
    participant_number = Column(
        Integer, ForeignKey("sessions.participant_number"), nullable=False, index=True
    )
    correct = Column(Integer, nullable=False)
    wrong = Column(Integer, nullable=False)
    missed = Column(Integer, nullable=False)
    total_matches = Column(Integer, nullable=False)
    timestamp = Column(Integer, nullable=False)  # Unix ms


class PostSession(Base):
    __tablename__ = "post_session"

    id = Column(Integer, primary_key=True)
    participant_number = Column(
        Integer, ForeignKey("sessions.participant_number"), nullable=False, index=True
    )
    overall_comfort = Column(Integer, nullable=False)       # 1–5
    perceived_intensity = Column(Integer, nullable=False)      # 1–5
    two_back_difficulty = Column(Integer, nullable=False)   # 1–5
    # feedback_clarity = Column(Integer, nullable=True)        # 1–5, optional
    discomfort_or_pain = Column(Boolean, nullable=False)
    timestamp = Column(Integer, nullable=False)             # Unix ms
