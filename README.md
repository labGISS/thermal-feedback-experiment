# Thermal Feedback Experiment

Software for a user study on the perception of thermal feedback delivered by a cube-shaped device with three heatable faces (index, middle and ring finger). Participants rest their fingers on the cube. One or more faces heat up, and the participant lifts their fingers when they notice the change, then reports which faces felt warm. The study compares perception with and without cognitive load (a 2-back task).

The system has three services, run together with Docker Compose:

| Service    | Folder                                           | Stack                             | Role                                                                            |
| ---------- | ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------- |
| `frontend` | [thermal-feedback/](thermal-feedback/)           | React + TypeScript + Vite, nginx  | Participant-facing app; drives the cube over MQTT and collects responses        |
| `api`      | [thermal-feedback-api/](thermal-feedback-api/)   | FastAPI + SQLAlchemy + SQLite     | Stores sessions; assigns participant numbers                                    |
| `results`  | [thermal-results/](thermal-results/)             | Flask + gunicorn                  | Live statistics dashboard read directly from the same SQLite database          |

```
Browser ──HTTP──► nginx (frontend, :80) ──/cube2/api/──► api (:8000) ──► api-db/thermal_feedback.db
   │                                                                              ▲
   └──MQTT over WebSocket──► broker ◄──► cube device             results (:5001) ─┘
```

## Experimental design

Each participant completes **14 trials** in two experiments:

| Experiment | Condition                     | Trials |
| ---------- | ----------------------------- | ------ |
| 1          | Thermal pattern only          | 7      |
| 2          | Thermal pattern + 2-back task | 7      |

Both experiments use the same 7 stimulus conditions: three single faces `[0] [1] [2]` and four combinations `[0,1] [0,2] [1,2] [0,1,2]`. The order comes from a cyclic 7×7 Latin square ([counterbalancing.ts](thermal-feedback/src/counterbalancing.ts)). Experiment 2 uses a row offset by 4 from Experiment 1 to reduce carry-over effects. Recruit participants in multiples of 7 so the Latin square is complete.

Session flow: demographics → Experiment 1 → 2-back tutorial → Experiment 2 → post-session questionnaire. Each trial runs intro/confirmation → countdown → stimulus in progress → feedback (heated faces, estimated temperature per face, clarity). The UI is in Italian.

Main parameters are in [experimentConfig.ts](thermal-feedback/src/experimentConfig.ts): set point 41 °C, validity tolerance 4 °C, 5 s countdown, and a 3 s thermal delay in Experiment 2.

## Running with Docker

```bash
docker compose up -d --build
```

| URL                                  | What                                  |
| ------------------------------------ | ------------------------------------- |
| `http://<host>/cube2/`               | Participant app                       |
| `http://<host>/cube2/accuracy`       | Live accuracy page                    |
| `http://<host>:5001/`                | Results dashboard                     |
| `http://<host>:5001/api/stats`       | Statistics as JSON (`/api/stats/<n>` for one participant) |

The API is not exposed directly; nginx proxies `/cube2/api/` to it. The SQLite database is kept on the host in `api-db/thermal_feedback.db`, which both `api` and `results` mount. It is git-ignored.

## Configuration

**MQTT broker:** set in [connection.ts](thermal-feedback/src/connection.ts). It currently points to `ws://172.16.165.12:7080`, the broker on the geosciences machine. Earlier addresses are left there as comments.

| Topic                | Direction     | Content                                  |
| -------------------- | ------------- | ---------------------------------------- |
| `/commands/`         | app → device  | Heating command for the current trial    |
| `/values/`           | device → app  | Touch time, contact and temperatures at the end of a cycle |
| `cubetto2/feedback/` | app → broker  | Participant feedback after each trial    |

**API URL:** set at build time with the `VITE_API_URL` build arg (default `/cube2/api`). The app is served under the `/cube2/` base path ([vite.config.ts](thermal-feedback/vite.config.ts), [nginx.conf](thermal-feedback/nginx.conf)).

## Local development

```bash
# API
cd thermal-feedback-api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload            # http://127.0.0.1:8000

# Frontend
cd thermal-feedback
npm install
VITE_API_URL=http://localhost:8000 npm run dev

# Results dashboard
cd thermal-results
pip install -r requirements.txt
DB_PATH=../api-db/thermal_feedback.db flask --app app run
```

## Data

The frontend saves each trial to `localStorage` as it goes. When the post-session questionnaire is submitted, it sends the whole session to `POST /session`. If the API cannot be reached, participant numbering falls back to a local counter.

Tables: `sessions`, `demographics`, `feedback` (one row per trial, including the raw device values and 2-back scores), `two_back_tutorial` and `post_session`. See [models.py](thermal-feedback-api/models.py).

**Export to CSV:** [export_csv.py](thermal-feedback-api/export_csv.py) writes one CSV per table plus `wide_sessions.csv`, which has one row per participant with trial fields pivoted into `e{exp}_t{trial}_…` columns, ready for R, SPSS or pandas. The script reads `thermal_feedback.db` from its own folder, so copy the database there or edit `DB_PATH` first.

**Synthetic data:** to test the dashboard and the analysis pipeline, run:

```bash
python3 generate_synthetic.py [--db api-db/thermal_feedback.db] [--reset]
```

It adds simulated participants with a range of accuracy and cognitive-load profiles. Do not run it against the real study database.
