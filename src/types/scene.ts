// Schema della "scene spec" generata dall'IA + validazione runtime (Zod).
// Fonte di verità: i prompt di sistema del v12 (generate / aiLesson) e il codice di render.
//
// Strategia: Zod è la fonte di verità, i tipi TS sono inferiti con z.infer.
// Così la stessa definizione tipizza il codice E valida a runtime la risposta del Worker
// (issue C2) — una spec malformata dà un errore chiaro invece di una scena rotta.
//
// Golden principle: l'IA sceglie archetipo, soggetto e prosa; coordinate/confini/date
// reali arrivano da historical-basemaps e Wikidata. Per `pulse` si preferisce un QID/nome
// cercabile, NON coordinate inventate.

import { z } from "zod";

/** [latitudine, longitudine] */
export const LatLon = z.tuple([z.number(), z.number()]);
export type LatLon = z.infer<typeof LatLon>;

export const Archetype = z.enum(["pulse", "journey", "spread", "network", "territory"]);
export type Archetype = z.infer<typeof Archetype>;

/* ---------------- items per archetipo ---------------- */

// pulse: nessuna coordinata. `query` = nome esatto cercabile su Wikidata.
// `qid` opzionale: predisposto per la issue B1 (match diretto, più robusto del nome).
export const PulseItem = z.object({
  query: z.string(),
  year: z.number().int().optional(),
  qid: z.string().regex(/^Q\d+$/).optional(),
});
export type PulseItem = z.infer<typeof PulseItem>;

// journey: waypoints reali; fromDate/toDate opzionali per lo scrubber su date vere.
export const JourneyItem = z.object({
  name: z.string(),
  waypoints: z.array(LatLon).min(2),
  fromYear: z.number().int(),
  toYear: z.number().int(),
  fromDate: z.string().optional(), // "YYYY-MM-DD"
  toDate: z.string().optional(),
});
export type JourneyItem = z.infer<typeof JourneyItem>;

// spread: origine + bersagli.
export const SpreadItem = z.object({
  name: z.string(),
  originLat: z.number(),
  originLon: z.number(),
  targets: z.array(LatLon).min(1),
  fromYear: z.number().int(),
  toYear: z.number().int(),
});
export type SpreadItem = z.infer<typeof SpreadItem>;

// network: archi da/a con etichetta.
export const NetworkItem = z.object({
  from: LatLon,
  to: LatLon,
  label: z.string(),
});
export type NetworkItem = z.infer<typeof NetworkItem>;

/* ---------------- teaching ---------------- */

export const TimelineEntry = z.object({
  year: z.number().int(),
  event: z.string(),
  // `detail` presente nei fallback offline e nelle lezioni: testo esteso per la modale.
  detail: z.string().optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const Teaching = z.object({
  timeline: z.array(TimelineEntry).max(6).optional(),
  keyPoints: z.array(z.string()).max(4).optional(),
  questions: z.array(z.string()).max(3).optional(),
});
export type Teaching = z.infer<typeof Teaching>;

/* ---------------- scene spec (unione discriminata) ---------------- */

const BaseSpec = z.object({
  title: z.string(),
  period: z.string().optional(),
  yearStart: z.number().int(), // negativo = a.C.
  yearEnd: z.number().int(),
  summary: z.string().optional(),
  teaching: Teaching.optional(),
});

export const SceneSpec = z.discriminatedUnion("archetype", [
  BaseSpec.extend({ archetype: z.literal("pulse"), items: z.array(PulseItem).max(6) }),
  BaseSpec.extend({ archetype: z.literal("journey"), items: z.array(JourneyItem).max(6) }),
  BaseSpec.extend({ archetype: z.literal("spread"), items: z.array(SpreadItem).max(6) }),
  BaseSpec.extend({ archetype: z.literal("network"), items: z.array(NetworkItem).max(6) }),
  // territory: NIENTE items/poligoni. subject + aliases (in inglese, per il dataset).
  BaseSpec.extend({
    archetype: z.literal("territory"),
    subject: z.string(),
    aliases: z.array(z.string()).min(1),
  }),
]);
export type SceneSpec = z.infer<typeof SceneSpec>;

/* ---------------- lezione per evento (aiLesson, con web_search) ---------------- */

export const LessonCard = z.object({
  context: z.string(),
  what: z.string(),
  causes: z.array(z.string()),
  consequences: z.array(z.string()),
  quote: z.string(),
  classroom: z.array(z.string()),
});
export type LessonCard = z.infer<typeof LessonCard>;

/* ---------------- helper di validazione ---------------- */

/** Valida una scene spec. Lancia z.ZodError se malformata (da catturare nel client). */
export function parseSceneSpec(data: unknown): SceneSpec {
  return SceneSpec.parse(data);
}

/** Variante "safe": non lancia, ritorna { success, data | error }. */
export function safeParseSceneSpec(data: unknown) {
  return SceneSpec.safeParse(data);
}

export function parseLessonCard(data: unknown): LessonCard {
  return LessonCard.parse(data);
}
