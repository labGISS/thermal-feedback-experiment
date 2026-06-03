# Thermal Feedback API

FastAPI backend that stores thermal experiment data in a local SQLite database.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Starting the app

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## Exporting data to CSV

Run the export utility from the project root:

```bash
python export_csv.py
```

This reads `thermal_feedback.db` and writes CSV files into a `csv_export/` folder:

**Analysis file**

| File                  | Contents                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `wide_sessions.csv`   | One row per participant; trial fields are pivoted into columns prefixed `e{n}_t{n}_` (e.g. `e1_t0_heating_path`) — use this for stats |

**Raw tables (one file per table)**

| File                    | Contents                                          |
| ----------------------- | ------------------------------------------------- |
| `sessions.csv`          | One row per participant                           |
| `demographics.csv`      | Age, gender, handedness                           |
| `feedback.csv`          | Per-trial responses (11 rows per participant)     |
| `two_back_tutorial.csv` | 2-back tutorial performance (one row per participant) |
| `post_session.csv`      | End-of-session questionnaire                      |
