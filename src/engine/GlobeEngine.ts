// La classe motore vera, dietro l'interfaccia di comando descritta in
// RICOGNIZIONE-v12.md ("Interfaccia di comando GlobeEngine"). React non tocca
// three.js: chiama solo metodi su un'istanza di questa classe.
//
// Possiede come campi d'istanza PRIVATI tutto lo stato che nel v12 era `let`/`const`
// di modulo e che nei blocchi 2-4 di questa migrazione era ancora condiviso a livello
// di modulo (engine/borders.ts, engine/scene.ts) — niente più singleton: ogni
// GlobeEngine ha la sua copia, isolata dalle altre eventuali istanze.
//
// Stato ancora di modulo, di proposito non toccato in questo blocco (vedi
// RICOGNIZIONE-v12.md): engine/controls.ts (dragging/autoPause/qTarget) — non era
// nell'elenco di questo blocco ("i let di borders.ts e scene.ts"); globe.ts/loop.ts
// non hanno mai avuto stato di modulo, restituiscono già un oggetto per chiamata.

import type { SceneSpec } from "../types/scene";
import { createGlobe, setBordersBlend, setTheme as setGlobeTheme, type Globe, type ThemeName } from "./globe";
import { attachPointerControls, flyTo as flyToCommand } from "./controls";
import { createSceneState, makeLabel, renderScene as renderSceneInto, type SceneRuntimeState } from "./scene";
import {
  createBordersState,
  setBordersOn,
  updateBorders,
  type BordersRuntimeState,
  type BordersUpdate,
} from "./borders";
import { createLoop, type LoopHandle, type TickPayload } from "./loop";

export interface GlobeEngineCallbacks {
  /** Stato di animazione (progress/playing/anno) — mai via Redux, vedi engine/loop.ts. */
  onTick?: (payload: TickPayload) => void;
  /** Click su una regione Peste — in attesa di engine/plague.ts (nessuno lo chiama ancora). */
  onPlagueRegionClick?: (name: string) => void;
  /** renderScene ha finito di costruire la nuova scena. */
  onSceneReady?: () => void;
  /** Etichetta dell'epoca quando i confini cambiano file (v12: testo di #bEra). */
  onBordersEraChange?: (eraLabel: string) => void;
}

export class GlobeEngine {
  private readonly sceneState: SceneRuntimeState = createSceneState();
  private readonly bordersState: BordersRuntimeState = createBordersState();

  private globeHandle: Globe | null = null;
  private loopHandle: LoopHandle | null = null;
  private detachControls: (() => void) | null = null;
  private idleSpinSuppressed = false;

  // Un solo campo per tutte le callback (invece di uno per ciascuna): `onPlagueRegionClick`
  // non viene ancora letto da nessun metodo (engine/plague.ts non esiste), e un campo
  // privato dedicato solo a quella callback risulterebbe "mai letto" per TS — qui invece
  // è `this.callbacks` ad essere letto (per le altre callback), quindi resta accettata
  // nell'interfaccia pubblica senza essere già cablata.
  private readonly callbacks: GlobeEngineCallbacks;

  constructor(callbacks: GlobeEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Costruisce scena/camera/renderer (engine/globe.ts) dentro `container`, aggancia
   * drag pointer + tap (engine/controls.ts) e avvia il loop di animazione
   * (engine/loop.ts). Una sola volta per vita del componente React che possiede
   * il container.
   */
  mount(container: HTMLElement): void {
    const g = createGlobe(container);
    // v12: `globe.add(aiLayer)` viveva dentro il setup della scena; aiLayer ora è
    // privato di questa istanza (sceneState), quindi è mount() ad aggiungerlo.
    g.globe.add(this.sceneState.aiLayer);
    this.globeHandle = g;

    this.detachControls = attachPointerControls(container, g.globe, () => {
      // TODO(engine/plague.ts): risolvere il tap in una regione Peste (resolvePlagueRegion)
      // e chiamare this.callbacks.onPlagueRegionClick(name). Per ora nessuna feature lo usa
      // ancora — nel v12 questo stesso punto instradava fra quiz/card/niente-in-tour,
      // decisione che per RICOGNIZIONE-v12.md spetta al coordinatore in App.tsx, non qui.
    });

    this.loopHandle = createLoop(
      g,
      { scene: this.sceneState, borders: this.bordersState, makeLabel },
      (payload) => this.callbacks.onTick?.(payload),
      (eraLabel) => this.callbacks.onBordersEraChange?.(eraLabel),
      undefined, // tickPlague: engine/plague.ts non esiste ancora
      () => this.idleSpinSuppressed,
    );
    this.loopHandle.start();
  }

  /** Ferma il loop, stacca i listener del drag e libera il renderer (v12 non si
   * smontava mai: qui serve per il ciclo di vita di un componente React). */
  dispose(): void {
    this.loopHandle?.stop();
    this.detachControls?.();
    this.globeHandle?.dispose();
    this.loopHandle = null;
    this.detachControls = null;
    this.globeHandle = null;
  }

  /** Disegna la scena per l'archetipo della SceneSpec data (engine/scene.ts). */
  async renderScene(spec: SceneSpec): Promise<void> {
    await renderSceneInto(this.sceneState, spec);
    this.callbacks.onSceneReady?.();
  }

  /** Confini reali on/off: visibilità del gruppo già caricato (engine/borders.ts) +
   * blend dello shader del globo (engine/globe.ts) — nel v12 erano due righe vicine
   * nello stesso click handler (`bordersOn=...`, `modeTarget=...`). */
  setBorders(on: boolean): void {
    setBordersOn(this.bordersState, on);
    if (this.globeHandle) setBordersBlend(this.globeHandle, on);
  }

  /** Carica/attiva i confini per un anno specifico, indipendentemente dallo scrubber
   * (v12: `ensurePlagueReady` chiamava `updateBorders(1349)` così). NON accende da
   * solo `bordersOn` — esattamente come nel v12, dove quel comando arrivava separato. */
  async setYear(year: number): Promise<void> {
    const result = await updateBorders(this.bordersState, year, makeLabel);
    this.applyBordersResult(result);
  }

  /** Tema luce del globo (engine/globe.ts: "day" | "term" | "night"). */
  setTheme(theme: ThemeName): void {
    if (this.globeHandle) setGlobeTheme(this.globeHandle, theme);
  }

  /** Punta la camera verso lat/lon (engine/controls.ts; lo slerp vero lo fa il loop). */
  flyTo(lat: number, lon: number): void {
    flyToCommand(lat, lon);
  }

  /** Comandi della timeline (engine/loop.ts). */
  setPlaying(on: boolean): void {
    this.loopHandle?.setPlaying(on);
  }

  setProgress(p: number): void {
    this.loopHandle?.setProgress(p);
  }

  /** Sospende la rotazione automatica del globo mentre un tour/quiz è attivo (v12:
   * `!tourActive&&!quizActive` dentro animate()). Tour/quiz sono stato React
   * (modeSlice), non del motore: arrivano qui come comando invece che da un modulo. */
  setIdleSpinSuppressed(on: boolean): void {
    this.idleSpinSuppressed = on;
  }

  // --- Layer Peste — in attesa di engine/plague.ts (non ancora scritto) ---
  //
  // pickPlagueRegionAt(x: number, y: number): string | null {
  //   // Raycast/picking sul layer cliccabile della Peste: ritorna il `name` (PESTE)
  //   // sotto (x,y) sullo schermo, o null. Lo chiamerà il coordinatore in App.tsx
  //   // dentro l'onTap passato ad attachPointerControls (vedi mount()).
  // }
  //
  // enablePlague(on: boolean): void {
  //   // Monta/smonta il layer cliccabile Peste sul globo e i marker pulsanti
  //   // (il `tickPlague` già previsto come parametro opzionale di createLoop, qui
  //   // passato `undefined`, andrà collegato quando questo metodo esisterà).
  // }

  private applyBordersResult(result: BordersUpdate | null): void {
    if (!result || !this.globeHandle) return;
    this.globeHandle.globe.add(result.group);
    if (result.previousGroup) this.globeHandle.globe.remove(result.previousGroup);
    this.callbacks.onBordersEraChange?.(result.eraLabel);
  }
}
