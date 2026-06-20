// Tipi del modulo Peste Nera.
// Derivati fedelmente dalla struttura del dataset PESTE nel v12.

/** Le 11 "scene" illustrate disponibili per le tavole SVG (plate()). */
export type PlagueSceneType =
  | "route"
  | "city"
  | "macabre"
  | "scroll"
  | "north"
  | "memorial"
  | "harbor"
  | "flagellants"
  | "ship"
  | "spared"
  | "crown";

/** Coppia [latitudine, longitudine] — convenzione usata in tutto il progetto. */
export type LatLon = [number, number];

/** Una "slide" del rullino di una regione. `text` può contenere markup minimo (<b>). */
export interface PlagueSlide {
  scene: PlagueSceneType;
  tag: string;
  text: string;
}

/**
 * Una regione del dataset Peste.
 * `name` DEVE combaciare col campo NAME di historical-basemaps (snapshot 1300),
 * altrimenti il click sul globo non trova la regione (golden principle: match sui dati reali).
 */
export interface PlagueRegion {
  name: string;
  label: string;
  ll: LatLon;
  slides: PlagueSlide[];
}

/** Una domanda del quiz; `a` è il `name` della regione corretta. */
export interface QuizItem {
  a: string;
  q: string;
}
