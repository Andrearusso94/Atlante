// Client di /api/lezione — porta lo stesso ruolo di `aiLesson()` nel v12, ma chiama il
// Worker (mai api.anthropic.com dal browser) e non include più il prompt di sistema né
// la dichiarazione del tool web_search (entrambi ora server-side, vedi worker/index.ts
// SYS_LEZIONE/handleLezione).

import { parseLessonCard } from "../types/scene";
import type { LessonCard } from "../types/scene";
import { ApiError } from "./errors";
import { postApi } from "./request";

/** Genera la scheda didattica per un evento (`title` = contesto/scena, `event`, `year`).
 * Lancia `ApiError` (vedi api/request.ts per i codici di trasporto, "invalid_response"
 * se l'IA risponde ma il JSON non è una LessonCard valida — issue C2). */
export async function aiLesson(title: string, event: string, year: number): Promise<LessonCard> {
  const data = await postApi("/api/lezione", { title, event, year });
  try {
    return parseLessonCard(data);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ApiError("invalid_response", 200, `La risposta dell'IA non è una lezione valida: ${detail}`);
  }
}
