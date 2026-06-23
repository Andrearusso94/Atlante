import { useEffect, useRef, useState, type PointerEvent } from "react";
import { byName } from "../../data/peste";
import { IC_ACTS, IC_BOOK, IC_PIN, IC_SKULL, plate } from "../../engine/plates";
import { clampIgIndex, igCountText, swipeStep } from "./igCardLogic";
import styles from "./IgCard.module.css";

/** Apertura della card per una regione Peste, instradata qui dal coordinatore in
 * App.tsx (click sul globo, blocco 10) o dalle tappe del Tour (blocco 15). `seq`
 * distingue due aperture sulla stessa regione di fila — stesso pattern di
 * features/quiz/Quiz.tsx `QuizClick`. */
export interface IgCardOpen {
  name: string;
  seq: number;
}

export interface IgCardProps {
  /** Ultima apertura richiesta; null finché non ne arriva nessuna. */
  open: IgCardOpen | null;
}

// v12 (openIgCard/igGo/igClose, sezione "CARD RULLINO"). La regione mostrata si risolve
// da `open.name` via byName ad ogni apertura (RICOGNIZIONE-v12.md §5: 'name' deve
// combaciare col dataset). L'indice di slide è stato locale effimero, non Redux (stesso
// principio del tick della timeline, RICOGNIZIONE-v12.md §4): chiudere e riaprire su una
// nuova regione lo azzera da solo via `lastSeqRef`, senza dover avvisare il coordinatore.
export default function IgCard({ open }: IgCardProps) {
  const [visible, setVisible] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const lastSeqRef = useRef<number | null>(null);
  const actsRef = useRef<HTMLSpanElement>(null);
  const swipeRef = useRef({ x: 0, active: false });

  useEffect(() => {
    if (!open || open.seq === lastSeqRef.current) return;
    lastSeqRef.current = open.seq;
    setVisible(true);
    setSlideIdx(0);
  }, [open]);

  const region = open ? byName(open.name) : undefined;
  const slides = region?.slides ?? [];
  const n = slides.length;

  function step(delta: number) {
    setSlideIdx((cur) => clampIgIndex(cur + delta, n));
  }

  function handleClose() {
    setVisible(false);
  }

  // v12 (`igOverlay.classList.add("on");document.body.classList.add("modal-open")`):
  // stessa gestione della classe sul body, anche se qui non esiste (ancora) un CSS
  // globale che la legga — la teniamo per fedeltà e per non bloccare uno scroll/focus
  // della pagina dietro la card.
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, n]);

  // v12: il cuoricino è un mi-piace puramente decorativo, non legato a stato/dati. Il
  // markup di IC_ACTS arriva via dangerouslySetInnerHTML e non cambia mai mentre la card
  // resta montata, quindi il nodo DOM persiste e il listener si attacca una sola volta
  // (stesso approccio del v12: `heart.addEventListener("click",()=>heart.classList.toggle("liked"))`).
  useEffect(() => {
    const heart = actsRef.current?.querySelector(".heart");
    if (!heart) return;
    const toggleLiked = () => heart.classList.toggle("liked");
    heart.addEventListener("click", toggleLiked);
    return () => heart.removeEventListener("click", toggleLiked);
  }, []);

  // v12 (swipe sul rullino): ignora il gesto se parte su una freccia di navigazione, che
  // gestisce già da sé il proprio click.
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(`.${styles.nav}`)) return;
    swipeRef.current = { x: e.clientX, active: true };
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!swipeRef.current.active) return;
    swipeRef.current.active = false;
    step(swipeStep(e.clientX - swipeRef.current.x));
  }

  if (!visible || !region) return null;
  const slide = slides[slideIdx];

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={styles.card} role="dialog" aria-modal="true" aria-label="Scheda peste nera">
        <div className={styles.head}>
          <div className={styles.avatar} dangerouslySetInnerHTML={{ __html: IC_SKULL }} />
          <div className={styles.id}>
            <div className={styles.name}>{region.label}</div>
            <div className={styles.sub}>
              <span dangerouslySetInnerHTML={{ __html: IC_PIN }} />
              <span>Peste Nera · Europa · 1347–1351</span>
            </div>
          </div>
          <button type="button" className={styles.close} aria-label="Chiudi" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div
          className={styles.stage}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <i
                key={i}
                className={i === slideIdx ? `${styles.dot} ${styles.dotOn}` : styles.dot}
              />
            ))}
          </div>
          <div className={styles.track} style={{ transform: `translateX(${-slideIdx * 100}%)` }}>
            {slides.map((s, i) => (
              <div
                key={i}
                className={styles.slide}
                dangerouslySetInnerHTML={{ __html: plate(s.scene, `ig${i}`) }}
              />
            ))}
          </div>
          <button
            type="button"
            className={
              slideIdx === 0
                ? `${styles.nav} ${styles.prev} ${styles.hide}`
                : `${styles.nav} ${styles.prev}`
            }
            aria-label="Precedente"
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className={
              slideIdx === n - 1
                ? `${styles.nav} ${styles.next} ${styles.hide}`
                : `${styles.nav} ${styles.next}`
            }
            aria-label="Successiva"
            onClick={() => step(1)}
          >
            ›
          </button>
          <div className={styles.capover}>
            <div className={styles.capt}>{slide?.tag}</div>
          </div>
        </div>

        <div className={styles.actions}>
          <span ref={actsRef} dangerouslySetInnerHTML={{ __html: IC_ACTS }} />
          <span className={styles.count}>{igCountText(slideIdx, n)}</span>
          <span dangerouslySetInnerHTML={{ __html: IC_BOOK }} />
        </div>

        <div className={styles.body}>
          {/* v12 (#igText.innerHTML=s.text): testo curato a mano con markup minimo (<b>),
              stesso livello di fiducia di data/peste.ts (vedi features/tour/Tour.tsx). */}
          <p className={styles.text} dangerouslySetInnerHTML={{ __html: slide?.text ?? "" }} />
          <div className={styles.foot}>
            ☩ Quadro storico sintetico sulla peste nera (1347–1351) — illustrazioni d'autore, non
            fotografie d'epoca. Verifica le date prima dell'uso in classe.
          </div>
        </div>
      </div>
    </div>
  );
}
