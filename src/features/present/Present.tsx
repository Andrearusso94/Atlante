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

  useEffect(() => {
    if (!present) return;
    document.body.classList.add("present");
    return () => document.body.classList.remove("present");
  }, [present]);

  // v12 (riga 1105): Esc esce dalla presentazione.
  useEffect(() => {
    if (!present) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dispatch(setPresent(false));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [present, dispatch]);

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
