import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  advanceQuiz,
  answerQuiz,
  endQuiz,
  selectBordersOn,
  selectPlagueActive,
  selectQuiz,
  setBordersOn,
  setPlagueActive,
  startQuiz,
} from "../../store/modeSlice";
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
}

// v12 (startQuiz/quizAnswer/quizEnd/quizExit). quizActive/quizScore/quizPos/quizOrder
// vivono in modeSlice (blocco 9): qui dispatchiamo le transizioni, non duplichiamo lo
// stato. bordersOn/plagueActive forzati e ripristinati come in features/tour
// (RICOGNIZIONE-v12.md §5): stesso bookkeeping ownedBordersRef/ownedPlagueRef, non
// Redux perché effimero alla singola sessione di quiz. Il confronto vero (regione
// cliccata vs risposta attesa, punteggio, messaggi) è puro e vive in ./quizLogic,
// testabile senza montare il globo.
export default function Quiz({ onFlyTo, click }: QuizProps) {
  const dispatch = useAppDispatch();
  const { active: quizActive, score: quizScore, pos: quizPos, order: quizOrder } = useAppSelector(selectQuiz);
  const bordersOn = useAppSelector(selectBordersOn);
  const plagueActive = useAppSelector(selectPlagueActive);

  const ownedBordersRef = useRef(false);
  const ownedPlagueRef = useRef(false);
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

  function handleStart() {
    if (quizActive) return;
    ownedBordersRef.current = !bordersOn;
    ownedPlagueRef.current = !plagueActive;
    if (!bordersOn) dispatch(setBordersOn(true));
    if (!plagueActive) dispatch(setPlagueActive(true));
    lockRef.current = false;
    setFeedback(null);
    dispatch(startQuiz(buildQuizOrder(QUIZ.length)));
    onFlyTo(OVERVIEW[0], OVERVIEW[1]);
  }

  function handleExit() {
    if (ownedPlagueRef.current) dispatch(setPlagueActive(false));
    if (ownedBordersRef.current) dispatch(setBordersOn(false));
    ownedPlagueRef.current = false;
    ownedBordersRef.current = false;
    lockRef.current = false;
    setFeedback(null);
    dispatch(endQuiz());
  }

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
      <button type="button" className={styles.launch} onClick={handleStart}>
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
