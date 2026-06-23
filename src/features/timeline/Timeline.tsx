import type { ChangeEvent } from "react";
import { useAppDispatch } from "../../store/hooks";
import { setPlaying } from "../../store/modeSlice";
import type { TickPayload } from "../../engine/loop";
import styles from "./Timeline.module.css";

export interface TimelineProps {
  /** progress/playing/yearLabel dal loop del motore (App.tsx, blocco 10) — MAI da Redux:
   * questo componente non chiama mai useAppSelector per questi valori (RICOGNIZIONE-v12.md §4). */
  tick: TickPayload | null;
  /** Comando al motore (GlobeEngine.setPlaying, engine/loop.ts) — l'istanza vive in App.tsx. */
  onSetPlaying: (on: boolean) => void;
  /** Comando al motore (GlobeEngine.setProgress) — ferma anche il play, come nel v12. */
  onSetProgress: (p: number) => void;
}

// v12 (#timeline/#play/#scrub/#curYear). Il dato vivo (progress/playing/anno) arriva via
// `tick` (props, dal loop del motore); modeSlice.playing registra solo l'intento
// dell'utente (scritto qui, mai letto qui) — distinzione esplicita da RICOGNIZIONE-v12.md §4.
export default function Timeline({ tick, onSetPlaying, onSetProgress }: TimelineProps) {
  const dispatch = useAppDispatch();
  const playing = tick?.playing ?? false;
  const progress = tick?.progress ?? 0;
  const yearLabel = tick?.yearLabel ?? "—";

  function handleTogglePlay() {
    const next = !playing;
    dispatch(setPlaying(next));
    onSetPlaying(next);
  }

  function handleScrub(e: ChangeEvent<HTMLInputElement>) {
    const p = Number(e.target.value) / 1000;
    // v12 (scrub "input"): lo scrub manuale ferma sempre il play (anche GlobeEngine.setProgress
    // lo fa internamente, engine/loop.ts) — qui teniamo l'intento in modeSlice coerente.
    dispatch(setPlaying(false));
    onSetProgress(p);
  }

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.play} aria-label="Play/Pausa" onClick={handleTogglePlay}>
        {playing ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        aria-label="Avanzamento"
        className={styles.scrub}
        onChange={handleScrub}
      />
      <div className={styles.year}>{yearLabel}</div>
    </div>
  );
}
