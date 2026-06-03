import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_db_path = os.environ.get("DB_PATH", "./thermal_feedback.db")
DATABASE_URL = f"sqlite:///{_db_path}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations(eng) -> None:
    """Additive schema migrations — safe to run on every startup.

    Only adds columns/tables that are missing; never drops existing data.
    """
    inspector = inspect(eng)
    existing_tables = set(inspector.get_table_names())

    with eng.connect() as conn:
        # ── feedback table ────────────────────────────────────────────────────
        if "feedback" in existing_tables:
            existing_cols = {col["name"] for col in inspector.get_columns("feedback")}
            new_cols = [
                ("device_touch_time_ms", "REAL"),
                ("device_touched",       "TEXT"),
                ("device_pulse_ms",      "TEXT"),
                ("device_pause_ms",      "REAL"),
                ("two_back_correct",     "INTEGER"),
                ("two_back_wrong",       "INTEGER"),
                ("two_back_missed",      "INTEGER"),
                ("two_back_total_matches", "INTEGER"),
                ("clarity_estimate",      "INTEGER"),
            ]
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE feedback ADD COLUMN {col_name} {col_type}"))

        # ── post_session table ────────────────────────────────────────────────
        if "post_session" in existing_tables:
            existing_cols = {col["name"] for col in inspector.get_columns("post_session")}
            if "feedback_clarity" not in existing_cols:
                conn.execute(text("ALTER TABLE post_session ADD COLUMN feedback_clarity INTEGER"))

        conn.commit()
