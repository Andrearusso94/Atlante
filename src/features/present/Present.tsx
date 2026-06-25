import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectPresent, setPresent } from "../../store/modeSlice";
import styles from "./Present.module.css";

// v12 (setPresent/presentBtn, righe 987-994): la modalità presentazione (LIM) non è un
// metodo di GlobeEngine — è solo la classe `present` su <body> (RICOGNIZIONE-v12.md §4/
// interfaccia GlobeEngine), che qui applichiamo/rimuoviamo in un useEffect a partire da
// modeSlice.present, stesso pattern di IgCard per `body.modal-open`. Le regole CSS gated
// da body.present per igCard/quiz/tour/timeline vivono nei moduli di quelle feature
// (vedi i rispettivi *.module.css): questo file possiede solo il bottone, il toggle della
// classe sul body e l'uscita via Esc.
export default function Present() {
  const dispatch = useAppDispatch();
  const present = useAppSelector(selectPresent);
  const tourActive = useAppSelector((state) => state.mode.tourActive);
  const quizActive = useAppSelector((state) => state.mode.quizActive);

  useEffect(() => {
    if (!present) return;
    document.body.classList.add("present");
    return () => document.body.classList.remove("present");
  }, [present]);

  // v12 (catena Esc righe 1100-1106): quiz e tour hanno SEMPRE la precedenza su
  // "esci dalla presentazione" — qui Tour.tsx/Quiz.tsx hanno ciascuno il proprio
  // listener indipendente (non toccato), quindi la priorità va garantita facendo sì che
  // QUESTO listener non faccia nulla quando uno dei due è attivo: sullo stesso evento,
  // ognuno legge lo stato del render precedente (i dispatch sincroni di Redux non
  // invalidano le closure già in esecuzione), quindi l'ordine di registrazione dei tre
  // listener non conta — con tour attivo e presenting attivo insieme, Esc chiude solo
  // il tour, non la presentazione (esempio esplicito del brief).
  useEffect(() => {
    if (!present) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (quizActive || tourActive) return;
      dispatch(setPresent(false));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [present, tourActive, quizActive, dispatch]);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={present}
      onClick={() => dispatch(setPresent(!present))}
    >
      🖥 {present ? "Esci" : "Presentazione"}
    </button>
  );
}
