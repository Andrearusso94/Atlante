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

// Dispatcha solo modeSlice (setTheme/setBordersOn, blocco 9) — il collegamento al motore
// (GlobeEngine.setTheme/setBorders) vive già negli useEffect di App.tsx (blocco 10): qui
// la feature dice "cosa" mostrare, non tocca mai tre.js né GlobeEngine direttamente.
export default function Controls() {
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

      <button
        type="button"
        className={styles.bordersToggle}
        aria-pressed={bordersOn}
        onClick={() => dispatch(setBordersOn(!bordersOn))}
      >
        <span>Confini reali dell'epoca</span>
        <span className={styles.switch} />
      </button>
    </div>
  );
}
