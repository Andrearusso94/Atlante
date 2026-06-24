import { useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { generateScene, selectSpecError, selectSpecStatus, setCurrentSpec } from "../../store/specSlice";
import { FALLBACK, pickFallback } from "../../data/fallback";
import type { SceneSpec } from "../../types/scene";
import { describeSpecError } from "./errorMessages";
import styles from "./Generator.module.css";

// Suggerimenti di esempio — testo identico al v12 (i tre `<button>` di `#chips`).
const CHIPS = ["L'espansione dell'impero romano", "I viaggi di Colombo", "La peste nera"];

// v12 (engine/scene.ts:145): avviso di default mostrato per ogni scena generata dall'IA,
// prima che l'archetipo lo eventualmente specializzi (Wikidata/confini reali) — quella
// specializzazione vive nel motore e non ha ancora un canale verso React (fuori scope qui).
const AI_DATA_NOTE = "Coordinate generate dall'IA — verifica prima dell'uso in classe.";

// Scorciatoia separata e chiaramente etichettata: carica un esempio curato a mano senza
// mai chiamare l'IA (utile in aula senza rete) — distinta dalle chips sopra, che invece
// chiamano generateScene esattamente come le chips del v12 chiamavano onGenerate().
const OFFLINE_EXAMPLES: { label: string; spec: SceneSpec }[] = [
  { label: "Impero romano", spec: FALLBACK.roma },
  { label: "Viaggi di Colombo", spec: FALLBACK.colombo },
  { label: "Peste nera", spec: FALLBACK.peste },
];

export default function Generator() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSpecStatus);
  const error = useAppSelector(selectSpecError);

  const [q, setQ] = useState("");
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // v12 (onGenerate, catch): se l'IA non risponde, prova un esempio offline per la
  // stessa richiesta prima di arrendersi — automatico, non è il bottone "esempi offline"
  // qui sotto (quello carica un esempio a scelta dell'insegnante, senza nemmeno provare l'IA).
  async function runGenerate(query: string) {
    const trimmed = query.trim();
    if (!trimmed || status === "loading") return;
    setAiNotice(null);
    setFallbackNotice(null);
    const action = await dispatch(generateScene(trimmed));
    if (generateScene.fulfilled.match(action)) {
      setAiNotice(AI_DATA_NOTE);
    } else if (generateScene.rejected.match(action)) {
      const fb = pickFallback(trimmed);
      if (fb) {
        dispatch(setCurrentSpec(fb));
        setFallbackNotice(`Non ho raggiunto l'IA: mostro l'esempio offline "${fb.title}".`);
      }
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void runGenerate(q);
  }

  function handleChipClick(label: string) {
    setQ(label);
    void runGenerate(label);
  }

  function handleOfflineExample(spec: SceneSpec) {
    setAiNotice(null);
    setFallbackNotice(`Esempio offline caricato: "${spec.title}".`);
    dispatch(setCurrentSpec(spec));
  }

  return (
    <div className={styles.panel}>
      <form className={styles.row} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          autoComplete="off"
          placeholder="es. l'espansione dell'impero romano · i viaggi di Colombo · la peste nera"
          aria-label="Richiesta per il generatore"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={status === "loading"}
        />
        <button className={styles.button} type="submit" disabled={status === "loading" || !q.trim()}>
          Genera
        </button>
      </form>

      <div className={styles.chips}>
        {CHIPS.map((label) => (
          <button
            key={label}
            type="button"
            className={styles.chip}
            disabled={status === "loading"}
            onClick={() => handleChipClick(label)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* v12 (riga 642): il testo "L'IA sta costruendo la scena…" sovrascrive il
          pannello lezione, non l'area del generatore — vedi features/lesson/Lesson.tsx. */}
      {status === "error" && error && !fallbackNotice && <p className={styles.error}>{describeSpecError(error.code)}</p>}
      {aiNotice && <p className={styles.notice}>⚠ {aiNotice}</p>}
      {fallbackNotice && <p className={styles.notice}>{fallbackNotice}</p>}

      <div className={styles.offline}>
        <span className={styles.offlineLabel}>Esempi offline (senza IA):</span>
        <div className={styles.chips}>
          {OFFLINE_EXAMPLES.map(({ label, spec }) => (
            <button key={label} type="button" className={styles.chip} onClick={() => handleOfflineExample(spec)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
