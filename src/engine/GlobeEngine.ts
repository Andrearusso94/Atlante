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
import {
  createPlagueState,
  resolvePlagueRegion,
  syncPlague,
  teardownPlague,
  tickPlagueMarks,
  type PlagueRuntimeState,
} from "./plague";
import { createLoop, type LoopHandle, type TickPayload } from "./loop";

export interface GlobeEngineCallbacks {
  /** Stato di animazione (progress/playing/anno) — mai via Redux, vedi engine/loop.ts. */
  onTick?: (payload: TickPayload) => void;
  /** Click/tap su una regione Peste risolto (engine/plague.ts: resolvePlagueRegion). */
  onPlagueRegionClick?: (name: string) => void;
  /** renderScene ha finito di costruire la nuova scena. */
  onSceneReady?: () => void;
  /** Etichetta dell'epoca quando i confini (o la Peste) cambiano — v12: testo di #bEra. */
  onBordersEraChange?: (eraLabel: string) => void;
}

export class GlobeEngine {
  private readonly sceneState: SceneRuntimeState = createSceneState();
  private readonly bordersState: BordersRuntimeState = createBordersState();
  private readonly plagueState: PlagueRuntimeState = createPlagueState();

  private globeHandle: Globe | null = null;
  private loopHandle: LoopHandle | null = null;
  private detachControls: (() => void) | null = null;
  private idleSpinSuppressed = false;

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

    this.detachControls = attachPointerControls(container, g.globe, (x, y) => {
      // v12: questo stesso punto (pointerup) chiamava resolvePlagueRegion e instradava
      // fra quiz/card/niente-in-tour — quella decisione resta al coordinatore in App.tsx
      // (deve conoscere quiz/tour insieme), qui ci limitiamo a risolvere la regione.
      const name = this.pickPlagueRegionAt(x, y);
      if (name) this.callbacks.onPlagueRegionClick?.(name);
    });

    this.loopHandle = createLoop(
      g,
      { scene: this.sceneState, borders: this.bordersState, plague: this.plagueState, makeLabel },
      (payload) => this.callbacks.onTick?.(payload),
      (eraLabel) => this.callbacks.onBordersEraChange?.(eraLabel),
      (t) => tickPlagueMarks(this.plagueState, t),
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
   * nello stesso click handler (`bordersOn=...`, `modeTarget=...`), che poi chiamava
   * `updateBorders`/`teardownPlague`. Qui richiamiamo syncPlague subito dopo, per
   * restare coerenti (v12: syncPlague() era l'ultima riga di updateBorders). */
  setBorders(on: boolean): void {
    setBordersOn(this.bordersState, on);
    if (this.globeHandle) setBordersBlend(this.globeHandle, on);
    this.syncPlagueWithBorders();
  }

  /** Carica/attiva i confini per un anno specifico, indipendentemente dallo scrubber
   * (v12: `ensurePlagueReady` chiamava `updateBorders(1349)` così). NON accende da
   * solo `bordersOn` — esattamente come nel v12, dove quel comando arrivava separato. */
  async setYear(year: number): Promise<void> {
    const result = await updateBorders(this.bordersState, year, makeLabel);
    this.applyBordersResult(result);
    this.syncPlagueWithBorders();
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

  /** Risolve un punto schermo nella regione Peste cliccata, se c'è (engine/plague.ts:
   * resolvePlagueRegion) — ritorna solo il `name`, non l'intero PlagueRegion: è quanto
   * basta al chiamante (`byName` in data/peste.ts resta l'unico modo per i dettagli). */
  pickPlagueRegionAt(x: number, y: number): string | null {
    if (!this.globeHandle) return null;
    const hit = resolvePlagueRegion(this.plagueState, this.globeHandle, x, y);
    return hit ? hit.name : null;
  }

  /**
   * Monta/smonta SOLO la parte motore del layer Peste (engine/plague.ts) — non carica
   * la scena Peste, la lezione, l'anno 1349 né ferma il play: quella è orchestrazione
   * (v12: `ensurePlagueReady`) e resta a livello feature/React per un blocco successivo.
   *
   * `on=true` chiama `syncPlague`, che da solo decide se costruire/mostrare il layer
   * (richiede `bordersOn` + confini sul 1300, già in cache) o non fare nulla. `on=false`
   * chiama `teardownPlague` direttamente, **non** `syncPlague`: deve smontare il layer
   * comunque, anche se `bordersOn`/`bordersFile` farebbero risultare "voluto" un layer
   * attivo (v12: il ramo "off" di `bToggle` chiamava `teardownPlague()` direttamente,
   * non passava da `syncPlague`).
   */
  enablePlague(on: boolean): void {
    if (on) {
      this.syncPlagueWithBorders();
    } else if (this.globeHandle) {
      teardownPlague(this.plagueState, this.globeHandle.globe);
    }
  }

  private applyBordersResult(result: BordersUpdate | null): void {
    if (!result || !this.globeHandle) return;
    this.globeHandle.globe.add(result.group);
    if (result.previousGroup) this.globeHandle.globe.remove(result.previousGroup);
    this.callbacks.onBordersEraChange?.(result.eraLabel);
  }

  /** Richiama syncPlague (engine/plague.ts) per restare coerenti con bordersState.on/file
   * — nel v12 era l'ultima riga di `updateBorders`, quindi richiamata ad ogni cambio di
   * confini; qui `setBorders`/`setYear` sono gli unici due comandi pubblici che possono
   * cambiare `bordersState.on`/`bordersState.file`, quindi è qui che la richiamiamo.
   * syncPlague gestisce già da solo sia il teardown (confini spenti o file diverso dal
   * 1300) sia la costruzione/visibilità (confini accesi sul 1300): non serve replicare i
   * due rami separati del v12 (bToggle chiamava teardownPlague() direttamente sull'off,
   * updateBorders+syncPlague sull'on) — una chiamata sola, idempotente, basta. */
  private syncPlagueWithBorders(): void {
    if (!this.globeHandle) return;
    const result = syncPlague(this.plagueState, this.globeHandle.globe, this.bordersState);
    if (result) this.callbacks.onBordersEraChange?.(result.eraLabel);
  }
}
