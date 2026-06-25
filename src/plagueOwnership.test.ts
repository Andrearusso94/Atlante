import { describe, expect, it } from "vitest";
import { acquirePlagueOwnership, createPlagueOwnershipState, releasePlagueOwnership } from "./plagueOwnership";

describe("acquirePlagueOwnership", () => {
  it("se entrambi spenti e non posseduti: li reclama entrambi", () => {
    const state = createPlagueOwnershipState();
    const result = acquirePlagueOwnership(state, { bordersOn: false, plagueActive: false });
    expect(result).toEqual({ claimedBorders: true, claimedPlague: true });
    expect(state).toEqual({ borders: true, plague: true });
  });

  it("se già accesi da qualcun altro (es. l'utente via Controls): non li reclama", () => {
    const state = createPlagueOwnershipState();
    const result = acquirePlagueOwnership(state, { bordersOn: true, plagueActive: true });
    expect(result).toEqual({ claimedBorders: false, claimedPlague: false });
    expect(state).toEqual({ borders: false, plague: false });
  });

  it("idempotente: una seconda acquisizione da parte di chi già possiede non duplica nulla", () => {
    const state = createPlagueOwnershipState();
    acquirePlagueOwnership(state, { bordersOn: false, plagueActive: false });

    // Il secondo "starter" (mutua esclusione Tour/Quiz) trova bordersOn/plagueActive
    // già accesi dal primo: non deve reclamarli di nuovo.
    const result = acquirePlagueOwnership(state, { bordersOn: true, plagueActive: true });

    expect(result).toEqual({ claimedBorders: false, claimedPlague: false });
    expect(state).toEqual({ borders: true, plague: true });
  });
});

describe("releasePlagueOwnership", () => {
  it("rilascia solo ciò che era posseduto, e azzera lo stato", () => {
    const state = createPlagueOwnershipState();
    acquirePlagueOwnership(state, { bordersOn: false, plagueActive: true }); // reclama solo borders

    const released = releasePlagueOwnership(state);

    expect(released).toEqual({ borders: true, plague: false });
    expect(state).toEqual({ borders: false, plague: false });
  });

  it("è sicuro chiamarla quando non si possiede nulla (no-op)", () => {
    const state = createPlagueOwnershipState();
    const released = releasePlagueOwnership(state);
    expect(released).toEqual({ borders: false, plague: false });
  });
});

describe("scenario: esclusione reciproca Tour/Quiz", () => {
  it("il possesso sopravvive al passaggio di mano (quiz parte, poi il tour subentra senza un'uscita normale)", () => {
    const shared = createPlagueOwnershipState();

    // Quiz parte per primo: bordersOn/plagueActive erano entrambi spenti, li reclama.
    const quizAcquire = acquirePlagueOwnership(shared, { bordersOn: false, plagueActive: false });
    expect(quizAcquire).toEqual({ claimedBorders: true, claimedPlague: true });

    // Tour parte mentre il quiz è ancora attivo (mutua esclusione: il quiz viene chiuso
    // con un semplice dispatch dell'azione "end", SENZA passare dal suo rilascio — qui
    // si verifica che il possesso resti comunque coerente): bordersOn/plagueActive sono
    // ormai accesi (dal quiz), quindi il tour non li reclama di nuovo.
    const tourAcquire = acquirePlagueOwnership(shared, { bordersOn: true, plagueActive: true });
    expect(tourAcquire).toEqual({ claimedBorders: false, claimedPlague: false });
    expect(shared).toEqual({ borders: true, plague: true });

    // Il tour esce per ultimo: rilascia correttamente lo stato originale (spento),
    // anche se è stato il QUIZ a reclamarlo per primo — nessuna perdita di stato.
    const released = releasePlagueOwnership(shared);
    expect(released).toEqual({ borders: true, plague: true });
    expect(shared).toEqual({ borders: false, plague: false });
  });

  it("non tocca bordersOn se l'utente lo aveva già acceso a mano prima di tour/quiz", () => {
    const shared = createPlagueOwnershipState();

    const acquire = acquirePlagueOwnership(shared, { bordersOn: true, plagueActive: false });
    expect(acquire).toEqual({ claimedBorders: false, claimedPlague: true });

    const released = releasePlagueOwnership(shared);
    expect(released).toEqual({ borders: false, plague: true }); // bordersOn resta affari dell'utente
  });
});
