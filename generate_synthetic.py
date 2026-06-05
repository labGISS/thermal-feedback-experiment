"""
Generate synthetic participants for the thermal feedback experiment.

Participants 2-12 are inserted with realistic variation across:
  - Demographics (age, gender, handedness)
  - Accuracy profiles (high / medium / low)
  - Cognitive-load effect (strong / mild / reversed speed-accuracy trade-off)
  - Subjective ratings, 2-back performance

Run:  python3 generate_synthetic.py [--db PATH] [--reset]
"""
import argparse
import json
import random
import sqlite3
import time

# ── trial structure (same 7 patterns per condition as the real experiment) ───
TRIAL_PATTERNS = [
    [0],        # single – index
    [1],        # single – middle
    [2],        # single – ring
    [0, 1],     # two fingers
    [0, 2],
    [1, 2],
    [0, 1, 2],  # all three
]

# pulse_ms maps active fingers: 145 if heated, 0 if not
def pulse_for(pattern):
    return [145 if i in pattern else 0 for i in range(3)]

def touched_for(pattern):
    # device_touched: which physical pads were in contact (simulated)
    active = set(pattern)
    # always at least the heated pads, sometimes a neighbour too
    touched = [1 if i in active else random.choice([0, 1]) for i in range(3)]
    return touched


# ── response simulation ──────────────────────────────────────────────────────

def simulate_response(pattern, hit_rate, far, rng):
    """
    For each finger decide independently whether it is reported.
      - heated finger: reported with prob=hit_rate
      - unheated finger: reported with prob=far (false alarm)
    Returns list of reported finger indices.
    """
    reported = []
    for f in range(3):
        if f in pattern:
            if rng.random() < hit_rate:
                reported.append(f)
        else:
            if rng.random() < far:
                reported.append(f)
    return sorted(reported)


def rt_ms(n_fingers, condition, profile, rng):
    """Response time: increases with finger count, varies by condition/profile."""
    base = profile["rt_base_ms"]
    load_factor = profile["rt_dual_factor"] if condition == "dual" else 1.0
    finger_penalty = n_fingers * rng.gauss(600, 150)
    noise = rng.gauss(0, profile["rt_sd"])
    return max(800, int((base + finger_penalty) * load_factor + noise))


def clarity(n_fingers, condition, profile, rng):
    base = profile["clarity_base"] - (n_fingers - 1) * 0.3
    if condition == "dual":
        base -= profile["clarity_dual_drop"]
    val = round(rng.gauss(base, 0.7))
    return max(1, min(5, val))


def temp_estimate(profile, rng):
    val = round(rng.gauss(profile["temp_est_base"], 0.6))
    return max(1, min(5, val))


def two_back_trial(profile, rng):
    """Simulate 2-back performance for one thermal trial block."""
    total_matches = rng.randint(1, 3)
    correct = sum(1 for _ in range(total_matches) if rng.random() < profile["two_back_hr"])
    wrong   = sum(1 for _ in range(rng.randint(0, 2)) if rng.random() < profile["two_back_far"])
    missed  = total_matches - correct
    # some trials have no matches
    if rng.random() < 0.2:
        total_matches = 0
        correct = wrong = missed = 0
    return correct, wrong, missed, total_matches


# ── participant profiles ─────────────────────────────────────────────────────

PROFILES = [
    # 1: high accuracy, mild cognitive-load effect (already in DB as P1)

    # 2: high accuracy, minimal load effect
    dict(hit_normal=0.97, far_normal=0.02, hit_dual=0.94, far_dual=0.04,
         rt_base_ms=1800, rt_sd=400, rt_dual_factor=1.1,
         clarity_base=4.5, clarity_dual_drop=0.3, temp_est_base=3.8,
         two_back_hr=0.95, two_back_far=0.05,
         age=24, gender="Femmina", handedness="Destra",
         comfort=5, intensity=4, difficulty=2),

    # 3: medium accuracy, moderate load effect
    dict(hit_normal=0.82, far_normal=0.08, hit_dual=0.68, far_dual=0.15,
         rt_base_ms=2500, rt_sd=700, rt_dual_factor=1.25,
         clarity_base=3.5, clarity_dual_drop=0.8, temp_est_base=3.2,
         two_back_hr=0.78, two_back_far=0.12,
         age=28, gender="Maschio", handedness="Destra",
         comfort=4, intensity=3, difficulty=3),

    # 4: low accuracy, strong load effect, many false alarms
    dict(hit_normal=0.65, far_normal=0.20, hit_dual=0.45, far_dual=0.30,
         rt_base_ms=3200, rt_sd=1100, rt_dual_factor=1.45,
         clarity_base=2.8, clarity_dual_drop=1.2, temp_est_base=2.5,
         two_back_hr=0.60, two_back_far=0.25,
         age=35, gender="Femmina", handedness="Sinistra",
         comfort=3, intensity=2, difficulty=4),

    # 5: high accuracy, speed-accuracy trade-off (fast but more errors under load)
    dict(hit_normal=0.95, far_normal=0.03, hit_dual=0.70, far_dual=0.12,
         rt_base_ms=1500, rt_sd=300, rt_dual_factor=0.85,  # faster under load!
         clarity_base=4.2, clarity_dual_drop=1.0, temp_est_base=4.0,
         two_back_hr=0.88, two_back_far=0.08,
         age=21, gender="Maschio", handedness="Destra",
         comfort=4, intensity=4, difficulty=3),

    # 6: very high accuracy both conditions (expert-like)
    dict(hit_normal=0.99, far_normal=0.01, hit_dual=0.96, far_dual=0.02,
         rt_base_ms=1600, rt_sd=250, rt_dual_factor=1.05,
         clarity_base=4.8, clarity_dual_drop=0.1, temp_est_base=4.5,
         two_back_hr=0.98, two_back_far=0.02,
         age=30, gender="Femmina", handedness="Destra",
         comfort=5, intensity=5, difficulty=1),

    # 7: medium accuracy, high FAR (systematic finger confusions)
    dict(hit_normal=0.78, far_normal=0.28, hit_dual=0.70, far_dual=0.32,
         rt_base_ms=2200, rt_sd=600, rt_dual_factor=1.15,
         clarity_base=3.0, clarity_dual_drop=0.5, temp_est_base=2.8,
         two_back_hr=0.72, two_back_far=0.18,
         age=45, gender="Maschio", handedness="Destra",
         comfort=3, intensity=3, difficulty=3),

    # 8: low accuracy, very slow RT (cautious responder)
    dict(hit_normal=0.70, far_normal=0.05, hit_dual=0.58, far_dual=0.08,
         rt_base_ms=4500, rt_sd=1500, rt_dual_factor=1.35,
         clarity_base=2.5, clarity_dual_drop=0.6, temp_est_base=2.2,
         two_back_hr=0.55, two_back_far=0.10,
         age=52, gender="Femmina", handedness="Destra",
         comfort=2, intensity=2, difficulty=5),

    # 9: medium-high accuracy, consistent across conditions
    dict(hit_normal=0.88, far_normal=0.06, hit_dual=0.84, far_dual=0.08,
         rt_base_ms=2100, rt_sd=500, rt_dual_factor=1.08,
         clarity_base=3.9, clarity_dual_drop=0.3, temp_est_base=3.5,
         two_back_hr=0.85, two_back_far=0.07,
         age=26, gender="Maschio", handedness="Destra",
         comfort=4, intensity=4, difficulty=2),

    # 10: medium accuracy, reversed load effect (better under load — arousal boost)
    dict(hit_normal=0.75, far_normal=0.10, hit_dual=0.82, far_dual=0.07,
         rt_base_ms=2800, rt_sd=800, rt_dual_factor=0.95,
         clarity_base=3.2, clarity_dual_drop=-0.4, temp_est_base=3.0,
         two_back_hr=0.80, two_back_far=0.10,
         age=23, gender="Non-binary", handedness="Destra",
         comfort=4, intensity=3, difficulty=3),

    # 11: very low accuracy, chance-level (simulate a problematic session)
    dict(hit_normal=0.50, far_normal=0.33, hit_dual=0.48, far_dual=0.35,
         rt_base_ms=3800, rt_sd=1800, rt_dual_factor=1.0,
         clarity_base=2.0, clarity_dual_drop=0.2, temp_est_base=2.0,
         two_back_hr=0.45, two_back_far=0.30,
         age=19, gender="Maschio", handedness="Ambidestro",
         comfort=2, intensity=1, difficulty=5),

    # 12: high accuracy normal, collapses under load (sensitive to dual-task)
    dict(hit_normal=0.93, far_normal=0.04, hit_dual=0.52, far_dual=0.22,
         rt_base_ms=2000, rt_sd=500, rt_dual_factor=1.55,
         clarity_base=4.3, clarity_dual_drop=1.8, temp_est_base=3.7,
         two_back_hr=0.65, two_back_far=0.20,
         age=31, gender="Femmina", handedness="Sinistra",
         comfort=3, intensity=4, difficulty=5),
]


# ── insertion ────────────────────────────────────────────────────────────────

def insert_participant(conn, pnum, profile, base_ts, rng):
    cur = conn.cursor()

    # ---- session ----
    submitted_at = f"2026-06-0{(pnum % 9) + 1}T{10 + pnum % 12:02d}:00:00.000Z"
    cur.execute(
        "INSERT INTO sessions (participant_number, submitted_at) VALUES (?,?)",
        (pnum, submitted_at),
    )

    # ---- demographics ----
    cur.execute(
        "INSERT INTO demographics (participant_number, age, gender, handedness, timestamp) VALUES (?,?,?,?,?)",
        (pnum, profile["age"], profile["gender"], profile["handedness"],
         base_ts + rng.randint(0, 300_000)),
    )

    ts = base_ts + 400_000  # feedback starts after demographics

    # ---- feedback: experiment 1 (normal) ----
    for trial_idx, pattern in enumerate(TRIAL_PATTERNS):
        reported = simulate_response(pattern, profile["hit_normal"], profile["far_normal"], rng)
        pulse = json.dumps(pulse_for(pattern))
        touched = json.dumps(touched_for(pattern))
        rt = rt_ms(len(pattern), "normal", profile, rng)
        clar = clarity(len(pattern), "normal", profile, rng)
        t_est = str(temp_estimate(profile, rng))
        ts += rt + rng.randint(500, 3000)
        cur.execute(
            """INSERT INTO feedback
               (participant_number, experiment_id, trial_index,
                heating_path, selected_faces, temperature_estimate, clarity_estimate,
                device_touch_time_ms, device_touched, device_pulse_ms, device_pause_ms,
                two_back_correct, two_back_wrong, two_back_missed, two_back_total_matches,
                timestamp)
               VALUES (?,?,?, ?,?,?,?, ?,?,?,?, ?,?,?,?, ?)""",
            (pnum, 1, trial_idx,
             json.dumps(pattern), json.dumps(reported), t_est, clar,
             float(rt), touched, pulse, 1000.0,
             None, None, None, None,
             ts),
        )

    # ---- two_back_tutorial ----
    tut_total = rng.randint(2, 4)
    tut_correct = round(tut_total * rng.uniform(0.4, 1.0))
    tut_wrong   = rng.randint(0, 2)
    tut_missed  = tut_total - tut_correct
    ts += rng.randint(30_000, 120_000)
    cur.execute(
        "INSERT INTO two_back_tutorial (participant_number, correct, wrong, missed, total_matches, timestamp) VALUES (?,?,?,?,?,?)",
        (pnum, tut_correct, tut_wrong, tut_missed, tut_total, ts),
    )

    # ---- feedback: experiment 2 (dual-task) ----
    for trial_idx, pattern in enumerate(TRIAL_PATTERNS):
        reported = simulate_response(pattern, profile["hit_dual"], profile["far_dual"], rng)
        pulse = json.dumps(pulse_for(pattern))
        touched = json.dumps(touched_for(pattern))
        rt = rt_ms(len(pattern), "dual", profile, rng)
        clar = clarity(len(pattern), "dual", profile, rng)
        t_est = str(temp_estimate(profile, rng))
        tc, tw, tm, ttm = two_back_trial(profile, rng)
        ts += rt + rng.randint(500, 3000)
        cur.execute(
            """INSERT INTO feedback
               (participant_number, experiment_id, trial_index,
                heating_path, selected_faces, temperature_estimate, clarity_estimate,
                device_touch_time_ms, device_touched, device_pulse_ms, device_pause_ms,
                two_back_correct, two_back_wrong, two_back_missed, two_back_total_matches,
                timestamp)
               VALUES (?,?,?, ?,?,?,?, ?,?,?,?, ?,?,?,?, ?)""",
            (pnum, 2, trial_idx,
             json.dumps(pattern), json.dumps(reported), t_est, clar,
             float(rt), touched, pulse, 1000.0,
             tc, tw, tm, ttm,
             ts),
        )

    # ---- post_session ----
    ts += rng.randint(60_000, 300_000)
    cur.execute(
        """INSERT INTO post_session
           (participant_number, overall_comfort, perceived_intensity,
            two_back_difficulty, discomfort_or_pain, timestamp)
           VALUES (?,?,?,?,?,?)""",
        (pnum,
         max(1, min(5, profile["comfort"] + rng.randint(-1, 1))),
         max(1, min(5, profile["intensity"] + rng.randint(-1, 1))),
         max(1, min(5, profile["difficulty"] + rng.randint(-1, 1))),
         1 if rng.random() < 0.05 else 0,
         ts),
    )

    conn.commit()
    print(f"  Inserted participant {pnum}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="api-db/thermal_feedback.db")
    parser.add_argument("--reset", action="store_true",
                        help="Remove synthetic participants (2-12) before inserting")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()

    if args.reset:
        print("Removing existing synthetic participants (2–12)…")
        for t in ["sessions", "demographics", "feedback", "two_back_tutorial", "post_session"]:
            cur.execute(f"DELETE FROM {t} WHERE participant_number BETWEEN 2 AND 12")
        conn.commit()
        print("Done.")

    # Check which participants already exist
    cur.execute("SELECT participant_number FROM sessions")
    existing = {r[0] for r in cur.fetchall()}

    # Base timestamp: 2026-06-04 08:00 UTC in ms
    base_ts = 1780560000000

    rng = random.Random(42)  # fixed seed → reproducible data

    for i, profile in enumerate(PROFILES):
        pnum = i + 2  # participants 2..12
        if pnum in existing:
            print(f"  Skipping participant {pnum} (already exists)")
            continue
        p_base = base_ts + i * 7_200_000  # each participant ~2h apart
        insert_participant(conn, pnum, profile, p_base, rng)

    conn.close()
    print("\nDone. Synthetic participants inserted.")


if __name__ == "__main__":
    main()
