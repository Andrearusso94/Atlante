import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { advanceQuiz, answerQuiz, endQuiz, endTour, selectQuiz, startQuiz } from "../../store/modeSlice";
import { byName, QUIZ } from "../../data/peste";
import {
  buildQuizOrder,
  FEEDBACK_MS,
  isQuizFinished,
  OVERVIEW,
  quizFeedbackText,
  quizResultMessage,
  resolveQuizAnswer,
} from "./quizLogic";
import styles from "./Quiz.module.css";

/** Un tap su una regione Peste mentre il quiz è attivo, instradato qui dal coordinatore
 * in App.tsx (plagueClickRoute, blocco 10). `seq` distingue due tap sulla stessa
 * regione di fila: senza, l'effetto qui sotto non vedrebbe alcuna differenza di prop
 * tra un tap e il successivo e ignorerebbe il secondo. */
export interface QuizClick {
  name: string;
  seq: number;
}

export interface QuizProps {
  /** Comando al motore (GlobeEngine.flyTo) — stesso prop pattern di features/tour. */
  onFlyTo: (lat: number, lon: number) => void;
  /** Ultimo tap utile arrivato dal coordinatore; null finché non ne arriva nessuno. */
  click: QuizClick | null;
  /** features/plague/ensurePlagueReady, legato a engine+dispatch+bordersOn in App.tsx —
   * va atteso PRIMA di attivare il quiz (v12 righe 1066-1068). */
  onEnsurePlagueReady: () => Promise<boolean>;
  /** Prende possesso di bordersOn/plagueActive se non già accesi (mutua esclusione
   * Tour/Quiz, RICOGNIZIONE-v12.md §6) — implementato in App.tsx su plagueOwnership.ts,
   * condiviso con Tour: chi parte per primo possiede, chi subentra trova già posseduto. */
  onAcquirePlague: () => void;
  /** Rilascia bordersOn/plagueActive se posseduti da questa sessione (v12 li lascia
   * accesi per sempre; qui si ripristina lo stato precedente — decisione presa). */
  onReleasePlague: () => void;
}

// v12 (startQuiz/quizAnswer/quizEnd/quizExit). quizActive/quizScore/quizPos/quizOrder
// vivono in modeSlice (blocco 9): qui dispatchiamo le transizioni, non duplichiamo lo
// stato. bordersOn/plagueActive forzati e ripristinati tramite plagueOwnership.ts
// (condiviso con features/tour, RICOGNIZIONE-v12.md §5/§6), non più bookkeeping locale:
// serve a far convivere correttamente l'esclusione reciproca col ripristino allo stato
// precedente. Il confronto vero (regione cliccata vs risposta attesa, punteggio,
// messaggi) è puro e vive in ./quizLogic, testabile senza montare il globo.
export default function Quiz({ onFlyTo, click, onEnsurePlagueReady, onAcquirePlague, onReleasePlague }: QuizProps) {
  const dispatch = useAppDispatch();
  const { active: quizActive, score: quizScore, pos: quizPos, order: quizOrder } = useAppSelector(selectQuiz);
  const tourActive = useAppSelector((state) => state.mode.tourActive);

  // v12 `quizLock`: impedisce di contare un secondo tap arrivato durante la finestra di
  // feedback della risposta precedente. Bookkeeping effimero, non vive in Redux.
  const lockRef = useRef(false);
  const lastSeqRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Pulizia alla sola unmount: il timer del feedback vive in feedbackTimerRef, non nel
  // cleanup dell'effetto qui sotto (vedi commento lì) — qui lo richiudiamo solo se il
  // componente sparisce mentre è ancora in sospeso.
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  async function handleStart() {
    if (quizActive) return;
    // v12 riga 1064: avviare il quiz chiude il tour (esclusione reciproca) — il
    // ripristino di bordersOn/plagueActive eventualmente posseduti dal tour resta
    // compito di plagueOwnership.ts (onAcquirePlague subito sotto), non di endTour qui.
    if (tourActive) dispatch(endTour());
    onAcquirePlague();
    lockRef.current = false;
    setFeedback(null);
    const ok = await onEnsurePlagueReady();
    if (!ok) return;
    dispatch(startQuiz(buildQuizOrder(QUIZ.length)));
    onFlyTo(OVERVIEW[0], OVERVIEW[1]);
  }

  function handleExit() {
    onReleasePlague();
    lockRef.current = false;
    setFeedback(null);
    dispatch(endQuiz());
  }

  // v12 (Esc globale, riga 1102: `if(quizActive...){quizExit();return;}`) — qui come
  // listener proprio del Quiz, condizionato/staccato su quizActive (stesso pattern di
  // Esc-per-modale in features/lesson/Lesson.tsx e features/igCard/IgCard.tsx). Mai
  // insieme al Tour: con l'esclusione reciproca sopra, al più uno dei due è attivo.
  useEffect(() => {
    if (!quizActive) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleExit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [quizActive]);

  // v12 (quizAnswer, righe 1072-1083): confronta la regione cliccata con la risposta
  // attesa, aggiorna SUBITO il punteggio e mostra il feedback; l'avanzamento alla
  // domanda successiva (`advanceQuiz`) arriva solo allo scadere di FEEDBACK_MS, dentro
  // il setTimeout — durante la finestra di lock la domanda a video resta quella appena
  // risposta, non la successiva (prima del fix qui, `quizPos` avanzava insieme al
  // feedback). Se era l'ultima domanda, esce da sola come in fondo al Tour. Il timer
  // vive in feedbackTimerRef, non nel
  // cleanup di questo effetto: un tap arrivato (e ignorato) durante il lock cambia
  // comunque `click` e farebbe scattare il cleanup, cancellando il timer appena creato
  // prima ancora che scada — esattamente il tap che il lock dovrebbe lasciare senza
  // effetto, non silenziare lo sblocco della domanda corrente. Niente quizOrder/quizPos
  // tra le dipendenze per lo stesso motivo per cui Tour non mette `handleExit` tra le
  // dipendenze del suo timer di slide: cambiano per effetto del dispatch qui sotto.
  useEffect(() => {
    if (!quizActive || !click) return;
    if (click.seq === lastSeqRef.current) return;
    if (lockRef.current) return;
    if (isQuizFinished(quizOrder, quizPos)) return;
    lastSeqRef.current = click.seq;

    const { correct, targetName } = resolveQuizAnswer(QUIZ, quizOrder, quizPos, click.name);
    const targetDef = byName(targetName);
    const clickedDef = byName(click.name);
    lockRef.current = true;
    setFeedback({
      ok: correct,
      text: quizFeedbackText(correct, targetDef?.label ?? targetName, clickedDef?.label ?? click.name),
    });
    dispatch(answerQuiz({ correct }));
    if (targetDef) onFlyTo(targetDef.ll[0], targetDef.ll[1]);

    const wasLast = isQuizFinished(quizOrder, quizPos + 1);
    if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      lockRef.current = false;
      setFeedback(null);
      dispatch(advanceQuiz());
      if (wasLast) handleExit();
    }, FEEDBACK_MS);
  }, [click]);

  if (!quizActive) {
    return (
      <button type="button" className={styles.launch} onClick={() => void handleStart()}>
        ❓ Quiz
      </button>
    );
  }

  const finished = isQuizFinished(quizOrder, quizPos);
  const item = finished ? null : QUIZ[quizOrder[quizPos]];

  return (
    <div className={styles.bar} role="group" aria-label="Quiz">
      <div className={styles.top}>
        <p className={styles.eyebrow}>❓ Quiz · clicca il territorio giusto</p>
        <button type="button" className={styles.exit} aria-label="Chiudi quiz" onClick={handleExit}>
          ✕
        </button>
      </div>
      <p className={styles.question}>{finished ? "Quiz completato!" : item?.q ?? "—"}</p>
      <p className={styles.meta}>
        {finished ? (
          <>
            <b>
              {quizScore} / {quizOrder.length}
            </b>{" "}
            · {quizResultMessage(quizScore, quizOrder.length)}
          </>
        ) : (
          <>
            Domanda {quizPos + 1} / {quizOrder.length} · <b>{quizScore} punti</b>
          </>
        )}
      </p>
      {feedback && <p className={feedback.ok ? styles.fxGood : styles.fxBad}>{feedback.text}</p>}
    </div>
  );
}
