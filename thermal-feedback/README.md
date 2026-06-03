# Thermal Feedback

## Experiment

Each participant completes **11 trials** across three experiment types:

| Type                          | Trials | Heating                  |
| ----------------------------- | ------ | ------------------------ |
| Exp 1 — Reaction              | 3      | Single face (0, 1, or 2) |
| Exp 2 — Pattern               | 4      | Multi-face combination   |
| Exp 3 — Pattern + 2-back task | 4      | Same ordering as Exp 2   |

Trial order is fully counterbalanced: each participant gets a unique permutation (3! = 6 for Exp 1, 4! = 24 for Exp 2/3), cycling as participant numbers increase.

Flow per trial: **Intro → Confirm → Countdown → In progress → Feedback**  
(Intro/Confirm are skipped for subsequent trials within the same experiment type.)  
A 2-back task tutorial runs before the first Exp 3 trial.

## Setup

```bash
npm install
npm run dev
```

## Configuration

Edit `src/connection.ts`:

```ts
export const API_BASE_URL = "http://localhost:8000";

export const MQTT_BROKER_URL = "ws://192.168.1.214:9001";
export const MQTT_USERNAME = "user";
export const MQTT_PASSWORD = "password";
export const MQTT_TOPICS = {
  commands: "/commands/", // app → device
  values: "/values/", // device → app
};
```

## Data flow

1. On demographics submit the app calls `GET /participant-count` to assign the participant number (falls back to localStorage counter if the API is unreachable).
2. Trial feedback is saved to `localStorage` after each trial.
3. On post-session submit the full session is `POST`ed to `/session` on the FastAPI backend.
