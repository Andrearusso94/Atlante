import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectBordersOn, selectTheme, setBordersOn, setTheme, type Theme } from "../../store/modeSlice";
import styles from "./Controls.module.css";

// v12 (#themeBox): esattamente questi 3 temi reali — icona + valore di engine/globe.ts
// THEMES (day/term/night). Non aggiungerne altri: il motore non ne conosce altri.
const THEMES: { value: Theme; icon: string; label: string }[] = [
  { value: "day", icon: "☀︎", label: "Giorno" },
  { value: "term", icon: "◐", label: "Crepuscolo" },
  { value: "night", icon: "☾", label: "Notte" },
];

export interface ControlsProps {
  /** v12: testo di `#bEra` — tre stati: "mappa del mondo: 1500 d.C." (confini attivi),
   * stringa vuota (confini spenti), o markup con uno `<span>` colorato quando la Peste
   * Nera è attiva (v12 riga 875: `bEra.innerHTML=...`, non solo testo). Arriva da
   * `GlobeEngine.onBordersEraChange` via App.tsx, mai da Redux (stesso principio di
   * onTick, RICOGNIZIONE-v12.md §4). */
  eraLabel: string;
}

// Dispatcha solo modeSlice (setTheme/setBordersOn, blocco 9) — il collegamento al motore
// (GlobeEngine.setTheme/setBorders) vive già negli useEffect di App.tsx (blocco 10): qui
// la feature dice "cosa" mostrare, non tocca mai tre.js né GlobeEngine direttamente.
export default function Controls({ eraLabel }: ControlsProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const bordersOn = useAppSelector(selectBordersOn);

  return (
    <div className={styles.panel}>
      <div className={styles.themeBox} role="group" aria-label="Tema">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={styles.themeButton}
            aria-pressed={theme === t.value}
            title={t.label}
            onClick={() => dispatch(setTheme(t.value))}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className={styles.bordersBox}>
        <button
          type="button"
          className={styles.bordersToggle}
          aria-pressed={bordersOn}
          onClick={() => dispatch(setBordersOn(!bordersOn))}
        >
          <span>Confini reali dell'epoca</span>
          <span className={styles.switch} />
        </button>
        {/* v12 riga 875: `bEra.innerHTML=...` — il caso "Peste Nera attiva" porta un
            <span style="color:var(--gold-2)"> reale, non testo letterale (stesso
            pattern già usato per il markup curato in features/igCard/IgCard.tsx). */}
        <div className={styles.era} dangerouslySetInnerHTML={{ __html: eraLabel }} />
      </div>
    </div>
  );
}
