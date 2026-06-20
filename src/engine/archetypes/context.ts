// Dipendenze condivise iniettate in ogni archetipo da engine/scene.ts (il dispatcher).
// Evita import circolari: gli archetipi non importano da scene.ts (che li importa loro),
// quindi tutto ciò che vive in scene.ts (aiLayer, materiali, makeLabel/makeShip/placeShip)
// arriva qui come parametro.

import type { Group, Material, Object3D, Vector3 } from "three";

export interface ArchetypeContext {
  /** Il Group del motore in cui aggiungere mesh/linee/etichette di questa scena. */
  aiLayer: Group;
  /** Callback eseguite ogni frame con la `progress` (0..1) corrente — vedi engine/loop.ts. */
  updaters: ((progress: number) => void)[];
  /** Sprite-etichette la cui visibilità dipende dalla normale rispetto alla camera. */
  sceneLabels: Object3D[];
  matGold: Material;
  matHalo: Material;
  makeLabel: (text: string) => Object3D;
  makeShip: () => Group;
  placeShip: (ship: Group, pts: Vector3[], t: number, lateralOffset: number) => void;
}

/** Quello che un archetipo può sovrascrivere dei default impostati da renderScene
 * (yearAt/curYearFn/lastDataNote) — campi omessi = lascia il default del dispatcher,
 * esattamente come nel v12 i rami che non toccano quelle variabili. */
export interface ArchetypeResult {
  yearAt?: (p: number) => string;
  curYearFn?: (p: number) => number;
  lastDataNote?: string;
}
