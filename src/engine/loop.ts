// Loop di animazione — PORTATO LETTERALMENTE dal v12 (funzione `animate`), con due
// cambiamenti voluti: (1) invece di scrivere su #curYear/#scrub (DOM), emette un
// callback `onTick({progress, playing, yearLabel})` — la UI lo riceve senza che il
// motore tocchi React; (2) lo stato di scena/confini non è più letto da `let` di
// modulo (scene.ts/borders.ts, blocco 4) ma passato per riferimento da chi crea il
// loop — GlobeEngine, che li possiede come campi privati (blocco 5).
// Stato animazione (progress/playing/anno) NON in Redux: vive qui, in closure.

import type { Group, Object3D, Quaternion } from "three";
import { Vector3 } from "three";
import type { Globe } from "./globe";
import { autoPause, clearFlyTarget, dragging, qA, qTarget } from "./controls";
import type { SceneRuntimeState } from "./scene";
import type { BordersRuntimeState } from "./borders";
import { nearestFile, updateBorders } from "./borders";

/** Avvicina `current` a `target` con uno slerp di fattore `factor` (mutando `current`,
 * come `Quaternion.slerp`); se l'angolo residuo è sotto `snapEps` scatta esattamente
 * su `target` e ritorna `true` (v12: lo slerp + snap di `qTarget` dentro `animate()`). */
export function approachQuaternion(
  current: Quaternion,
  target: Quaternion,
  factor: number,
  snapEps: number,
): boolean {
  current.slerp(target, factor);
  if (current.angleTo(target) < snapEps) {
    current.copy(target);
    return true;
  }
  return false;
}

/** Avanzamento della progress quando la timeline è in play (v12: `progress=(progress+.0014)%1`). */
export function stepProgress(progress: number, dt = 0.0014): number {
  return (progress + dt) % 1;
}

/** Passo di easing esponenziale verso un bersaglio (v12: usato per `uniforms.mode`,
 * stessa formula di `sun.lerp(sunTarget,.05)` ma su uno scalare invece che un Vector3). */
export function easeTowards(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export interface TickPayload {
  progress: number;
  playing: boolean;
  /** Etichetta anno/data per la progress corrente (v12: testo di #curYear). */
  yearLabel: string;
}

export interface LoopHandle {
  start: () => void;
  stop: () => void;
  /** Comando timeline `setPlaying(on)` (v12: click su #play). */
  setPlaying: (on: boolean) => void;
  /** Comando timeline `setProgress(p)` (v12: input su #scrub) — ferma anche il play,
   * esattamente come nel v12 (scrub manuale = pausa). */
  setProgress: (p: number) => void;
}

/** Le dipendenze che nel v12 erano lette da `let`/`const` di modulo (scene.ts/borders.ts)
 * o dal DOM (`makeLabel`): GlobeEngine le possiede e le passa qui per riferimento, così
 * la stessa istanza di stato è condivisa fra renderScene/setBorders e il loop senza che
 * nessuno dei due moduli abbia bisogno di un binding a livello di modulo. */
export interface LoopDeps {
  scene: SceneRuntimeState;
  borders: BordersRuntimeState;
  makeLabel: (text: string) => Object3D;
}

const _tmp = new Vector3();

/**
 * Crea il loop di animazione per il Globe `g`. Va avviato con `start()` da
 * GlobeEngine.mount() e fermato con `stop()` da GlobeEngine.dispose() — nel v12
 * `animate()` veniva chiamata una volta e girava per sempre (la pagina non si smontava).
 *
 * `onBordersEraChange` riceve l'etichetta dell'epoca quando i confini cambiano file
 * (v12: testo di #bEra) — non fa parte di onTick perché è un'informazione diversa
 * (l'epoca della mappa dei confini, non l'anno della scena/timeline).
 *
 * `tickPlague`, se passato, viene chiamato ad ogni frame con `performance.now()`: nel
 * v12 qui pulsava `plagueMarks` (layer Peste, engine/plague.ts — non ancora scritto).
 * GlobeEngine lo collegherà in fase di assemblaggio.
 *
 * `isIdleSpinSuppressed` sostituisce `!tourActive&&!quizActive` del v12: tour/quiz
 * sono stato React (modeSlice), non del motore, quindi arrivano come funzione iniettata
 * invece che letti da un modulo engine.
 */
export function createLoop(
  g: Globe,
  deps: LoopDeps,
  onTick: (payload: TickPayload) => void,
  onBordersEraChange?: (eraLabel: string) => void,
  tickPlague?: (t: number) => void,
  isIdleSpinSuppressed?: () => boolean,
): LoopHandle {
  let progress = 0;
  let playing = false;
  let curYearNum = 0;
  let rafId: number | null = null;

  function tick() {
    rafId = requestAnimationFrame(tick);
    const t = performance.now();

    if (qTarget) {
      if (approachQuaternion(g.globe.quaternion, qTarget, 0.07, 0.01)) clearFlyTarget();
    } else if (!dragging && t > autoPause && !isIdleSpinSuppressed?.()) {
      g.globe.quaternion.premultiply(qA(new Vector3(0, 1, 0), 0.0008));
    }

    tickPlague?.(t);

    g.sun.lerp(g.sunTarget, 0.05).normalize();
    g.uniforms.sunDir.value.copy(g.sun);
    g.uniforms.mode.value = easeTowards(g.uniforms.mode.value as number, g.modeTarget, 0.08);

    const { updaters, sceneLabels, yearAt, curYearFn } = deps.scene;
    if (playing && updaters.length) progress = stepProgress(progress);
    if (updaters.length) {
      updaters.forEach((u) => u(progress));
      curYearNum = curYearFn(progress);
      onTick({ progress, playing, yearLabel: yearAt(progress) });
    }

    const borders = deps.borders;
    if (borders.on && nearestFile(curYearNum).f !== borders.file && !borders.busy) {
      void updateBorders(borders, curYearNum, deps.makeLabel).then((result) => {
        if (!result) return;
        g.globe.add(result.group);
        if (result.previousGroup) g.globe.remove(result.previousGroup);
        onBordersEraChange?.(result.eraLabel);
      });
    }

    if (borders.on && borders.obj && borders.obj.userData.labels) {
      const lab = (borders.obj.userData.labels as Group).children;
      const shown: [number, number][] = [];
      const W = innerWidth;
      const H = innerHeight;
      const minD = Math.min(W, H) * 0.085;
      for (let i = 0; i < lab.length; i++) {
        const sp = lab[i];
        sp.getWorldPosition(_tmp);
        if (_tmp.z <= 0.3) {
          sp.visible = false;
          continue;
        }
        _tmp.project(g.camera);
        const sx = (_tmp.x * 0.5 + 0.5) * W;
        const sy = (-_tmp.y * 0.5 + 0.5) * H;
        let ok = true;
        for (let j = 0; j < shown.length; j++) {
          const dx = sx - shown[j][0];
          const dy = sy - shown[j][1];
          if (dx * dx + dy * dy < minD * minD) {
            ok = false;
            break;
          }
        }
        sp.visible = ok;
        if (ok) shown.push([sx, sy]);
      }
    }

    for (let i = 0; i < sceneLabels.length; i++) {
      sceneLabels[i].getWorldPosition(_tmp);
      sceneLabels[i].visible = _tmp.z > 0.15;
    }

    g.renderer.render(g.scene, g.camera);
  }

  return {
    start() {
      if (rafId == null) tick();
    },
    stop() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    setPlaying(on: boolean) {
      playing = on;
    },
    setProgress(p: number) {
      progress = p;
      playing = false;
    },
  };
}
