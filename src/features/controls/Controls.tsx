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
  /** v12: testo di `#bEra` ("mappa del mondo: 1500" / "mappa del 1300 · ☩ Peste Nera —
   * tocca un territorio"). Arriva da `GlobeEngine.onBordersEraChange` via App.tsx, mai
   * da Redux (stesso principio di onTick, RICOGNIZIONE-v12.md §4). */
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
        <div className={styles.era}>{eraLabel}</div>
      </div>
    </div>
  );
}
