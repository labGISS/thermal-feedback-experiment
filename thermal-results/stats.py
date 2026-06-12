"""
Compute all statistics for the thermal feedback experiment.

Returns a structured dict consumed by both the HTML template and the JSON endpoint.
"""
import json
import sqlite3
import statistics
from collections import defaultdict


FINGER_NAMES = ["Index", "Middle", "Ring"]


def _load_records(db_path: str) -> tuple[list[dict], list, list, list]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM feedback ORDER BY participant_number, experiment_id, trial_index, id"
    )
    feedback_rows = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM demographics ORDER BY participant_number")
    demographics = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM post_session ORDER BY participant_number")
    post_sessions = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM two_back_tutorial ORDER BY participant_number")
    tutorials = [dict(r) for r in cur.fetchall()]

    conn.close()

    for r in feedback_rows:
        r["heating_path"] = json.loads(r["heating_path"]) if r["heating_path"] else []
        r["selected_faces"] = json.loads(r["selected_faces"]) if r["selected_faces"] else []
        r["device_touched"] = json.loads(r["device_touched"]) if r["device_touched"] else []
        r["condition"] = "Normal" if r["experiment_id"] == 1 else "Dual-Task"

    return feedback_rows, demographics, post_sessions, tutorials


def _dedup(records: list[dict]) -> list[dict]:
    """Keep only the last run per (participant, experiment, trial)."""
    seen = {}
    for r in records:
        key = (r["participant_number"], r["experiment_id"], r["trial_index"])
        seen[key] = r
    return list(seen.values())


def _safe_stdev(values: list) -> float:
    return statistics.stdev(values) if len(values) > 1 else 0.0


def _finger_stats(trials: list[dict]) -> list[dict]:
    stats = [{
        "name": FINGER_NAMES[i],
        "presented": 0, "detected": 0,
        "false_alarms": 0, "not_presented": 0,
    } for i in range(3)]

    for r in trials:
        heated = set(r["heating_path"])
        selected = set(r["selected_faces"])
        for f in range(3):
            if f in heated:
                stats[f]["presented"] += 1
                if f in selected:
                    stats[f]["detected"] += 1
            else:
                stats[f]["not_presented"] += 1
                if f in selected:
                    stats[f]["false_alarms"] += 1

    for s in stats:
        s["hit_rate"] = (
            round(s["detected"] / s["presented"] * 100, 1) if s["presented"] else None
        )
        s["false_alarm_rate"] = (
            round(s["false_alarms"] / s["not_presented"] * 100, 1) if s["not_presented"] else None
        )
    return stats


def _confusion_matrix(trials: list[dict]) -> list[list[int]]:
    """3×3 confusion matrix for single-finger trials only."""
    matrix = [[0] * 3 for _ in range(3)]
    for r in trials:
        if len(r["heating_path"]) == 1 and len(r["selected_faces"]) == 1:
            actual = r["heating_path"][0]
            predicted = r["selected_faces"][0]
            matrix[actual][predicted] += 1
    return matrix


def _condition_summary(trials: list[dict], condition: str) -> dict:
    exact = [r for r in trials if set(r["heating_path"]) == set(r["selected_faces"])]
    total_heated = sum(len(r["heating_path"]) for r in trials)
    total_detected = sum(
        len(set(r["heating_path"]) & set(r["selected_faces"])) for r in trials
    )
    fps = sum(len(set(r["selected_faces"]) - set(r["heating_path"])) for r in trials)
    fns = sum(len(set(r["heating_path"]) - set(r["selected_faces"])) for r in trials)
    rts = [r["device_touch_time_ms"] for r in trials if r["device_touch_time_ms"] is not None]
    clarity = [r["clarity_estimate"] for r in trials if r["clarity_estimate"] is not None]
    temp_est = [int(r["temperature_estimate"]) for r in trials if r["temperature_estimate"] is not None]

    single_trials = [r for r in trials if len(r["heating_path"]) == 1]
    single_correct = sum(
        1 for r in single_trials if set(r["heating_path"]) == set(r["selected_faces"])
    )

    per_trial = []
    for r in sorted(trials, key=lambda x: x["trial_index"]):
        heated = set(r["heating_path"])
        selected = set(r["selected_faces"])
        per_trial.append({
            "trial_index": r["trial_index"],
            "heated": [FINGER_NAMES[i] for i in sorted(heated)],
            "selected": [FINGER_NAMES[i] for i in sorted(selected)],
            "exact_match": heated == selected,
            "tp": len(heated & selected),
            "fp": len(selected - heated),
            "fn": len(heated - selected),
            "rt_ms": int(r["device_touch_time_ms"]) if r["device_touch_time_ms"] is not None else None,
            "clarity": r["clarity_estimate"],
            "temp_estimate": r["temperature_estimate"],
            "n_fingers": len(heated),
        })

    return {
        "condition": condition,
        "n_trials": len(trials),
        "exact_match_count": len(exact),
        "exact_match_pct": round(len(exact) / len(trials) * 100, 1) if trials else 0,
        "per_finger_hit_rate": round(total_detected / total_heated * 100, 1) if total_heated else 0,
        "total_detected": total_detected,
        "total_heated": total_heated,
        "false_positives": fps,
        "false_negatives": fns,
        "mean_rt_ms": round(statistics.mean(rts)) if rts else None,
        "sd_rt_ms": round(_safe_stdev(rts)) if rts else None,
        "min_rt_ms": int(min(rts)) if rts else None,
        "max_rt_ms": int(max(rts)) if rts else None,
        "mean_clarity": round(statistics.mean(clarity), 2) if clarity else None,
        "sd_clarity": round(_safe_stdev(clarity), 2) if clarity else None,
        "mean_temp_estimate": round(statistics.mean(temp_est), 2) if temp_est else None,
        "sd_temp_estimate": round(_safe_stdev(temp_est), 2) if temp_est else None,
        "single_finger_correct": single_correct,
        "single_finger_total": len(single_trials),
        "single_finger_pct": round(single_correct / len(single_trials) * 100, 1) if single_trials else None,
        "finger_stats": _finger_stats(trials),
        "confusion_matrix": _confusion_matrix(trials),
        "per_trial": per_trial,
    }


def _two_back_summary(trials: list[dict]) -> dict:
    tracked = [r for r in trials if r.get("two_back_total_matches") is not None]
    total_correct = sum(r["two_back_correct"] or 0 for r in tracked)
    total_wrong = sum(r["two_back_wrong"] or 0 for r in tracked)
    total_missed = sum(r["two_back_missed"] or 0 for r in tracked)
    total_matches = sum(r["two_back_total_matches"] or 0 for r in tracked)

    per_trial = []
    for r in sorted(tracked, key=lambda x: x["trial_index"]):
        tm = r["two_back_total_matches"] or 0
        tc = r["two_back_correct"] or 0
        per_trial.append({
            "trial_index": r["trial_index"],
            "total_matches": tm,
            "correct": tc,
            "wrong": r["two_back_wrong"] or 0,
            "missed": r["two_back_missed"] or 0,
            "hit_rate": round(tc / tm * 100, 1) if tm else None,
        })

    return {
        "trials_with_data": len(tracked),
        "total_trials": len(trials),
        "total_matches": total_matches,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_missed": total_missed,
        "hit_rate": round(total_correct / total_matches * 100, 1) if total_matches else None,
        "miss_rate": round(total_missed / total_matches * 100, 1) if total_matches else None,
        "per_trial": per_trial,
    }


def compute(db_path: str) -> dict:
    feedback_rows, demographics, post_sessions, tutorials = _load_records(db_path)
    all_records = _dedup(feedback_rows)

    participants = sorted({r["participant_number"] for r in all_records})
    n_participants = len(participants)

    # --- per-participant breakdown ---
    participant_data = []
    for pnum in participants:
        p_records = [r for r in all_records if r["participant_number"] == pnum]
        demo = next((d for d in demographics if d["participant_number"] == pnum), None)
        post = next((p for p in post_sessions if p["participant_number"] == pnum), None)
        tut = next((t for t in tutorials if t["participant_number"] == pnum), None)

        normal = [r for r in p_records if r["experiment_id"] == 1]
        dual = [r for r in p_records if r["experiment_id"] == 2]

        participant_data.append({
            "participant_number": pnum,
            "demographics": demo,
            "post_session": post,
            "tutorial": tut,
            "normal": _condition_summary(normal, "Normal") if normal else None,
            "dual_task": _condition_summary(dual, "Dual-Task") if dual else None,
            "two_back": _two_back_summary(dual) if dual else None,
        })

    # --- aggregate across all participants ---
    all_normal = [r for r in all_records if r["experiment_id"] == 1]
    all_dual = [r for r in all_records if r["experiment_id"] == 2]

    aggregate = {
        "n_participants": n_participants,
        "total_trials": len(all_records),
        "normal": _condition_summary(all_normal, "Normal") if all_normal else None,
        "dual_task": _condition_summary(all_dual, "Dual-Task") if all_dual else None,
        "two_back": _two_back_summary(all_dual) if all_dual else None,
    }

    return {
        "aggregate": aggregate,
        "participants": participant_data,
        "finger_names": FINGER_NAMES,
    }
