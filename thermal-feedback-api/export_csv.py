"""Export all tables from thermal_feedback.db to CSV files.

Produces two kinds of output:
  - One CSV per raw table (for reference / archiving).
  - wide_sessions.csv — one row per participant; trial-level fields are pivoted
    into columns prefixed by e{experiment_id}_t{trial_index}_ so the file
    loads directly into R / SPSS / pandas for analysis.
"""

import csv
import os
import sqlite3
from collections import defaultdict

DB_PATH = os.path.join(os.path.dirname(__file__), "thermal_feedback.db")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "csv_export")

TABLES = ["sessions", "demographics", "feedback", "two_back_tutorial", "post_session"]

# Participant-level columns (appear once per row, in order)
_PARTICIPANT_COLS = [
    "participant_number", "submitted_at",
    # demographics
    "age", "gender", "handedness",
    # 2-back tutorial baseline
    "tutorial_correct", "tutorial_wrong", "tutorial_missed", "tutorial_total_matches",
    # post-session questionnaire
    "overall_comfort", "perceived_intensity", "two_back_difficulty",
    "feedback_clarity", "discomfort_or_pain",
]

# Per-trial columns that will be prefixed with e{n}_t{n}_
_TRIAL_COLS = [
    "heating_path",
    "selected_faces",
    "temperature_estimate",       # exp 1 only
    "device_touch_time_ms",
    "device_touched",
    "device_pulse_ms",
    "device_pause_ms",
    "two_back_correct",           # exp 3 only
    "two_back_wrong",
    "two_back_missed",
    "two_back_total_matches",
]


def _write_csv(path: str, rows, cursor, table: str | None = None) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if rows:
            writer.writerow(rows[0].keys())
            writer.writerows(rows)
        elif table:
            cursor.execute(f"PRAGMA table_info({table})")  # noqa: S608
            writer.writerow([col["name"] for col in cursor.fetchall()])


def _export_wide(cursor, output_dir: str) -> int:
    """One row per participant; trial fields pivoted into e{exp}_t{idx}_ columns."""

    # Discover all (experiment_id, trial_index) combinations present in the data
    cursor.execute(
        "SELECT DISTINCT experiment_id, trial_index FROM feedback "
        "ORDER BY experiment_id, trial_index"
    )
    trial_keys = [(r["experiment_id"], r["trial_index"]) for r in cursor.fetchall()]

    # Participant-level data
    cursor.execute("""
        SELECT
            s.participant_number, s.submitted_at,
            d.age, d.gender, d.handedness,
            tbt.correct      AS tutorial_correct,
            tbt.wrong        AS tutorial_wrong,
            tbt.missed       AS tutorial_missed,
            tbt.total_matches AS tutorial_total_matches,
            ps.overall_comfort, ps.perceived_intensity,
            ps.two_back_difficulty, ps.feedback_clarity,
            ps.discomfort_or_pain
        FROM sessions s
        LEFT JOIN demographics      d   ON d.participant_number  = s.participant_number
        LEFT JOIN two_back_tutorial tbt ON tbt.participant_number = s.participant_number
        LEFT JOIN post_session      ps  ON ps.participant_number  = s.participant_number
        ORDER BY s.participant_number
    """)
    participants = {r["participant_number"]: dict(r) for r in cursor.fetchall()}

    # Trial data keyed by (participant_number, experiment_id, trial_index)
    cursor.execute(
        "SELECT * FROM feedback ORDER BY participant_number, experiment_id, trial_index"
    )
    trials: dict[int, dict] = defaultdict(dict)
    for r in cursor.fetchall():
        trials[r["participant_number"]][(r["experiment_id"], r["trial_index"])] = dict(r)

    # Build header
    pivot_header = [
        f"e{exp}_t{idx}_{col}"
        for (exp, idx) in trial_keys
        for col in _TRIAL_COLS
    ]
    header = _PARTICIPANT_COLS + pivot_header

    # Build rows
    out_rows = []
    for pnum, pdata in sorted(participants.items()):
        row = [pdata.get(col) for col in _PARTICIPANT_COLS]
        ptrial = trials.get(pnum, {})
        for (exp, idx) in trial_keys:
            tdata = ptrial.get((exp, idx), {})
            for col in _TRIAL_COLS:
                row.append(tdata.get(col))
        out_rows.append(row)

    out_path = os.path.join(output_dir, "wide_sessions.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(out_rows)

    print(f"  wide_sessions.csv — {len(out_rows)} rows, {len(header)} columns")
    return len(out_rows)


def export_to_csv(db_path: str = DB_PATH, output_dir: str = OUTPUT_DIR) -> None:
    os.makedirs(output_dir, exist_ok=True)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print("Raw tables:")
        for table in TABLES:
            cursor.execute(f"SELECT * FROM {table}")  # noqa: S608
            rows = cursor.fetchall()
            _write_csv(os.path.join(output_dir, f"{table}.csv"), rows, cursor, table)
            print(f"  {table}.csv — {len(rows)} rows")

        print("Wide export (for stats):")
        _export_wide(cursor, output_dir)


if __name__ == "__main__":
    export_to_csv()
    print("Done.")
