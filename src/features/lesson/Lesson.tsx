import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  closeLessonModal,
  loadLesson,
  openLessonEvent,
  selectLessonCard,
  selectLessonError,
  selectLessonModalOpen,
  selectLessonOpenEventIndex,
  selectLessonStatus,
  setLessonCard,
} from "../../store/lessonSlice";
import { selectCurrentSpec, selectSpecStatus, setCurrentSpec } from "../../store/specSlice";
import { safeParseSceneSpec, type LessonCard } from "../../types/scene";
import { fmtY } from "../../engine/geo";
import { describeSpecError } from "../generator/errorMessages";
import styles from "./Lesson.module.css";

type Origin = "ai" | "curated" | null;

// v12 (openLesson): se l'evento ha già un `detail` curato a mano, lo mostra com'è e non
// chiama mai l'IA — qui costruiamo una LessonCard "parziale" (campi vuoti, le sezioni
// corrispondenti restano nascoste in renderSection).
function curatedCard(detail: string): LessonCard {
  return { context: detail, what: "", causes: [], consequences: [], quote: "", classroom: [] };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </>
  );
}

// Cablaggio store Redux (specSlice/lessonSlice) <-> pannello lezione + modale, in un solo
// componente come nel v12 (renderLesson/renderFullLesson/openLesson/openModal/closeModal
// condividevano stato di modulo) — qui condividono stato locale React invece di Redux per
// `origin`/`fallbackNotice`, che sono solo UI effimera (stessa disciplina di features/generator/).
export default function Lesson() {
  const dispatch = useAppDispatch();
  const currentSpec = useAppSelector(selectCurrentSpec);
  // v12 (onGenerate, riga 642): mentre l'IA costruisce una nuova scena, il testo di
  // caricamento sovrascrive il pannello lezione (#lessonBody) — non il generatore.
  const specStatus = useAppSelector(selectSpecStatus);
  const modalOpen = useAppSelector(selectLessonModalOpen);
  const openEventIndex = useAppSelector(selectLessonOpenEventIndex);
  const card = useAppSelector(selectLessonCard);
  const status = useAppSelector(selectLessonStatus);
  const error = useAppSelector(selectLessonError);

  const [origin, setOrigin] = useState<Origin>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timeline = currentSpec?.teaching?.timeline ?? [];
  const keyPoints = currentSpec?.teaching?.keyPoints ?? [];
  const questions = currentSpec?.teaching?.questions ?? [];
  const entry = openEventIndex != null ? timeline[openEventIndex] : undefined;

  // v12 (openModal/closeModal, righe 547-548): stessa gestione della classe sul body di
  // IgCard.tsx per `body.modal-open` — letta da styles/global.css (#scene),
  // App.module.css (head/ctrlR/bottomStack) e Lesson.module.css (.panel, qui sotto:
  // deve restare locale, non in App.tsx — vedi nota nel CSS).
  useEffect(() => {
    if (!modalOpen) return;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dispatch(closeLessonModal());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, dispatch]);

  // v12 (openLesson): apre la modale, poi decide come riempirla — detail locale se c'è
  // (mai l'IA), altrimenti aiLesson(); sul fallimento, lo stesso controllo del `detail`
  // resta come rete di sicurezza (nel v12 era nel catch, qui prima e dopo per simmetria).
  async function openLesson(index: number) {
    const ev = timeline[index];
    if (!ev) return;
    dispatch(openLessonEvent(index));
    setFallbackNotice(null);

    if (ev.detail) {
      setOrigin("curated");
      dispatch(setLessonCard(curatedCard(ev.detail)));
      return;
    }

    setOrigin(null);
    dispatch(setLessonCard(null));
    const action = await dispatch(loadLesson({ title: currentSpec!.title, event: ev.event, year: ev.year }));
    if (loadLesson.fulfilled.match(action)) {
      setOrigin("ai");
    } else if (loadLesson.rejected.match(action) && ev.detail) {
      setOrigin("curated");
      dispatch(setLessonCard(curatedCard(ev.detail)));
      setFallbackNotice("Non ho raggiunto l'IA: mostro l'esempio offline.");
    }
  }

  // v12 (P5 — Salva/Carica lezione): salva l'intera SceneSpec corrente come file JSON,
  // niente localStorage — ricaricarla evita di richiamare l'IA.
  function handleSave() {
    if (!currentSpec) return;
    const blob = new Blob([JSON.stringify(currentSpec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentSpec.title || "lezione").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLoadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoadError(null);
    try {
      const parsed = JSON.parse(await file.text());
      const result = safeParseSceneSpec(parsed);
      if (!result.success) {
        setLoadError("File lezione non valido.");
        return;
      }
      dispatch(setCurrentSpec(result.data));
    } catch {
      setLoadError("File lezione non valido.");
    }
  }

  return (
    <>
      <div className={styles.panel}>
        {specStatus === "loading" ? (
          <p className={styles.placeholder}>
            <span className={styles.spin} />
            L'IA sta costruendo la scena…
          </p>
        ) : !currentSpec ? (
          <p className={styles.placeholder}>
            <strong>Pronto per la lezione.</strong> Scrivi una richiesta nel generatore o tocca un esempio.
          </p>
        ) : (
          <>
            {/* v12 riga 540: titolo/periodo/riassunto sono SEMPRE renderizzati (anche
                vuoti, `esc(s.period||"")`), non condizionati alla presenza del campo —
                a differenza delle sezioni sotto (cronologia/punti chiave/domande), che
                il v12 omette per intero se l'array è vuoto. */}
            <h2 className={styles.title}>{currentSpec.title}</h2>
            <p className={styles.period}>{currentSpec.period ?? ""}</p>
            <p className={styles.summary}>{currentSpec.summary ?? ""}</p>

            {timeline.length > 0 && (
              <>
                <div className={styles.heading}>Cronologia · tocca per la lezione</div>
                {timeline.map((e, i) => (
                  <button key={i} type="button" className={styles.card} onClick={() => void openLesson(i)}>
                    <strong>{fmtY(e.year)}</strong>
                    <span>{e.event}</span>
                    {/* v12 riga 536: <span class="card-x">›</span> — chevron che indica
                        che la voce è cliccabile, mancante nel porting. */}
                    <span className={styles.cardChevron} aria-hidden="true">
                      ›
                    </span>
                  </button>
                ))}
              </>
            )}

            {keyPoints.length > 0 && (
              <>
                <div className={styles.heading}>Punti chiave</div>
                {keyPoints.map((k, i) => (
                  <p key={i} className={styles.keyPoint}>
                    {k}
                  </p>
                ))}
              </>
            )}

            {questions.length > 0 && (
              <>
                <div className={styles.heading}>Domande per la classe</div>
                {questions.map((q, i) => (
                  <p key={i} className={styles.question}>
                    {q}
                  </p>
                ))}
              </>
            )}
          </>
        )}

        {/* Carica non richiede una scena corrente (è così che se ne carica una prima
            volta, v12: loadBtn/loadFile erano sempre presenti in #aiBar, non condizionati
            a currentSpec). Il `disabled` su Salva quando `!currentSpec` è un'aggiunta
            rispetto al v12 (riga 938: `if(!currentSpec)return` è un no-op silenzioso nel
            click handler, il bottone non viene mai disabilitato visivamente) — scelta
            UX deliberata, non un comportamento portato 1:1 dal v12 (Blocco 11). */}
        <div className={styles.saveLoad}>
          <button type="button" className={styles.button} onClick={handleSave} disabled={!currentSpec}>
            ⤓ Salva lezione
          </button>
          <button type="button" className={styles.button} onClick={handleLoadClick}>
            ⤴ Carica lezione
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => void handleFileChange(e)}
          />
        </div>
        {loadError && <p className={styles.error}>{loadError}</p>}
      </div>

      {modalOpen && entry && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) dispatch(closeLessonModal());
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true">
            <button
              type="button"
              className={styles.close}
              aria-label="Chiudi"
              onClick={() => dispatch(closeLessonModal())}
            >
              ✕
            </button>
            <p className={styles.eyebrow}>{fmtY(entry.year)}</p>
            <h2 className={styles.modalTitle}>{entry.event}</h2>
            <div className={styles.modalBody}>
              {status === "loading" && (
                <div className={styles.modalLoad}>
                  <span className={styles.modalSpin} />
                  Sto preparando la lezione…
                </div>
              )}
              {status === "error" && error && !card && <p className={styles.error}>{describeSpecError(error.code)}</p>}
              {card && (
                <>
                  {fallbackNotice && <p className={styles.notice}>{fallbackNotice}</p>}
                  {card.context && (
                    <Section title="Contesto">
                      <p>{card.context}</p>
                    </Section>
                  )}
                  {card.what && (
                    <Section title="Che cosa accadde">
                      <p>{card.what}</p>
                    </Section>
                  )}
                  {card.causes.length > 0 && (
                    <Section title="Cause">
                      <ul>
                        {card.causes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {card.consequences.length > 0 && (
                    <Section title="Conseguenze">
                      <ul>
                        {card.consequences.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {card.quote && (
                    <Section title="Una voce dell'epoca">
                      <p className={styles.quote}>{card.quote}</p>
                    </Section>
                  )}
                  {card.classroom.length > 0 && (
                    <Section title="Da chiedere alla classe">
                      <ul>
                        {card.classroom.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {origin && (
                    <p className={styles.disclaimer}>
                      ⚠︎{" "}
                      {origin === "ai"
                        ? "Lezione redatta dall'IA con ricerca web — verifica i dettagli prima dell'aula."
                        : "Lezione di esempio curata a mano."}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
