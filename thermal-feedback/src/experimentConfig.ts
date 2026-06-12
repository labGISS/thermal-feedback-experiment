import type { ExperimentConfig } from "./types";

/** Number of heatable faces on the cube */
export const NUM_FACES = 3;

export const COUNTDOWN_SECONDS = 0; // seconds for countdown before each trial

export const TEMP_SET_POINT = 41;

export const TEMP_TOLERANCE = 4; // minimum difference between "on" and "off" faces to consider the trial valid

export const FACE_ON = 1;
export const FACE_OFF = 0;

export const SHOW_DEBUG_RECAP = false;

export const experiments: ExperimentConfig[] = [
  {
    id: 1,
    type: "pattern",
    title: "Esperimento 1",
    description:
      "Una o più facce del cubo verranno riscaldate. Mantieni le dita sul cubo come indicato nell'immagine e sollevale quando avverti un cambiamento termico. Ti verrà poi chiesto di identificare le facce che hai sentito calde e la loro intensità.",
    confirmationInstructions: [
      "Posiziona le dita sul cubo come mostrato nell'immagine.",
      "Attendi l'inizio dello stimolo termico.",
      "Solleva le dita non appena avverti un cambiamento di temperatura.",
      "Indica le facce riscaldate e l'intensità percepita nel modulo di riscontro.",
    ],
    feedbackConfig: {
      faceSelection: "multi",
      showTemperatureEstimate: true,
    },
  },
  {
    id: 2,
    type: "pattern-cognitive",
    title: "Esperimento 2",
    description:
      "Come nel primo esperimento, una o più facce del cubo verranno riscaldate. Allo stesso tempo dovrai eseguire il 2-back task come nel tutorial. Non ti verrà detto se la risposta è corretta, ma vedrai una notifica quando premerai spazio. Mantieni le dita sul cubo come indicato nell'immagine e sollevale quando avverti un cambiamento termico.",
    confirmationInstructions: [
      "Posiziona le dita sul cubo come mostrato nell'immagine.",
      "Inizia il compito 2-back: premi spazio ogni volta che la lettera corrente è uguale a quella di due posizioni fa.",
      "Mentre esegui il 2-back, attendi lo stimolo termico.",
      "Solleva le dita non appena avverti un cambiamento di temperatura.",
      "Indica le facce riscaldate e l'intensità percepita nel modulo di riscontro.",
    ],
    feedbackConfig: {
      faceSelection: "multi",
      showTemperatureEstimate: true,
    },
    thermalDelay_ms: 3_000,
  },
];
