export interface PlagueOwnershipState {
  borders: boolean;
  plague: boolean;
}

export function createPlagueOwnershipState(): PlagueOwnershipState {
  return { borders: false, plague: false };
}

export interface AcquireResult {
  /** `true` se questa chiamata ha appena preso possesso di `bordersOn` (era spento e
   * nessuno lo possedeva già) — il chiamante non deve dispatchare nulla per questo:
   * l'accensione vera resta compito di ensurePlagueReady (features/plague/), qui si
   * decide solo "chi dovrà spegnerlo dopo". */
  claimedBorders: boolean;
  /** `true` se questa chiamata ha appena preso possesso di `plagueActive` — a differenza
   * di bordersOn, nessun'altra funzione lo accende: il chiamante deve dispatchare
   * `setPlagueActive(true)`. */
  claimedPlague: boolean;
}

/**
 * v12 non aveva questo concetto (lasciava bordersOn/plagueActive accesi per sempre dopo
 * tour/quiz, righe 1027/1031); qui invece si ripristina lo stato precedente alla
 * chiusura (decisione presa nella migrazione). Tour e Quiz condividono UNA sola
 * "proprietà" (non una per feature) perché sono in esclusione reciproca: chi parte per
 * primo la acquisisce, chi subentra (l'altro che chiude e il nuovo che parte, blocco
 * mutua esclusione) la trova già presa e non la tocca, chi esce per ultimo la rilascia.
 *
 * Pura e testabile senza Redux/React, sullo stesso principio di plagueClickRoute.ts: il
 * chiamante (App.tsx) traduce il risultato in dispatch/GlobeEngine.
 */
export function acquirePlagueOwnership(
  state: PlagueOwnershipState,
  current: { bordersOn: boolean; plagueActive: boolean },
): AcquireResult {
  const claimedBorders = !state.borders && !current.bordersOn;
  const claimedPlague = !state.plague && !current.plagueActive;
  if (claimedBorders) state.borders = true;
  if (claimedPlague) state.plague = true;
  return { claimedBorders, claimedPlague };
}

export interface ReleaseResult {
  /** `true` se il chiamante possedeva bordersOn ed è quindi responsabile di spegnerlo. */
  borders: boolean;
  /** `true` se il chiamante possedeva plagueActive ed è quindi responsabile di spegnerlo. */
  plague: boolean;
}

/** Rilascia il possesso (se presente) e lo azzera — idempotente: chiamarla quando non
 * si possiede nulla ritorna `{borders:false,plague:false}` senza effetti. */
export function releasePlagueOwnership(state: PlagueOwnershipState): ReleaseResult {
  const released: ReleaseResult = { borders: state.borders, plague: state.plague };
  state.borders = false;
  state.plague = false;
  return released;
}
