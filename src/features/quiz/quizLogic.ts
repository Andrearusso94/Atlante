// Logica pura del quiz "clicca il territorio" — PORTATA dal v12 (shuffle/quizAnswer/
// quizEnd). Nessun riferimento a Redux/React/three.js: prende e restituisce solo dati,
// così è testabile con stato finto (RICOGNIZIONE-v12.md §5). modeSlice (blocco 9) resta
// l'unica fonte di verità per quizActive/quizScore/quizPos/quizOrder; queste funzioni
// calcolano cosa dispatchare, non lo stato stesso.

import type { QuizItem } from "../../types/peste";

// v12 (quizAnswer): il feedback corretto/sbagliato resta a video questa durata prima di
// passare alla domanda successiva (o terminare, se era l'ultima).
export const FEEDBACK_MS = 1650;
// v12 (startQuiz): vista d'insieme dell'Europa su cui la camera si posiziona all'avvio.
export const OVERVIEW: [number, number] = [54, 10];

/** Fisher-Yates — v12 `shuffle(a)`. Pura: non muta l'array passato. */
export function shuffleOrder(order: number[]): number[] {
  const result = order.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Ordine di partenza per un quiz su `total` domande, mescolato (v12 `startQuiz`:
 * `quizOrder=shuffle(QUIZ.map((_,i)=>i))`). */
export function buildQuizOrder(total: number): number[] {
  return shuffleOrder(Array.from({ length: total }, (_, i) => i));
}

export interface QuizAnswerResult {
  correct: boolean;
  targetName: string;
}

/** Confronta la regione cliccata con la risposta attesa della domanda corrente
 * (v12 `quizAnswer`: `target=QUIZ[quizOrder[quizPos]].a, ok=def.name===target`). */
export function resolveQuizAnswer(
  items: QuizItem[],
  order: number[],
  pos: number,
  clickedName: string,
): QuizAnswerResult {
  const targetName = items[order[pos]].a;
  return { correct: clickedName === targetName, targetName };
}

/** true quando non ci sono più domande da porre a `pos` (v12: `quizPos>=quizOrder.length`). */
export function isQuizFinished(order: number[], pos: number): boolean {
  return pos >= order.length;
}

/** Testo del feedback dopo una risposta (v12 `quizAnswer`: "✓ Esatto — …" / "✗ Era … — hai indicato …"). */
export function quizFeedbackText(correct: boolean, targetLabel: string, clickedLabel: string): string {
  return correct ? `✓ Esatto — ${clickedLabel}` : `✗ Era ${targetLabel} — hai indicato ${clickedLabel}`;
}

/** Messaggio di fine quiz in base al punteggio (v12 `quizEnd`: soglie .4/.75/1). */
export function quizResultMessage(score: number, total: number): string {
  if (total <= 0) return "";
  const ratio = score / total;
  if (ratio < 0.4) return "Riprova: rivedi le tappe col tour guidato.";
  if (ratio < 0.75) return "Buon lavoro!";
  if (ratio < 1) return "Ottimo!";
  return "Perfetto! Tutte giuste.";
}
