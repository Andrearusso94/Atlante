// Helper condiviso dai test dei 5 archetipi (non è un file di test: nessun describe/it qui).
// Un ArchetypeContext "finto" ma con pezzi three.js reali (Group/Material sono leggeri da
// istanziare) — solo makeLabel/makeShip/placeShip sono stub, perché in produzione vivono
// in engine/scene.ts e qui testiamo gli archetipi in isolamento.

import { Group, MeshBasicMaterial, Object3D } from "three";
import type { ArchetypeContext } from "./context";

export function createTestContext(): ArchetypeContext {
  return {
    aiLayer: new Group(),
    updaters: [],
    sceneLabels: [],
    matGold: new MeshBasicMaterial({ color: 0xe3ac46 }),
    matHalo: new MeshBasicMaterial({ color: 0xe3ac46, transparent: true, opacity: 0.3 }),
    makeLabel: () => new Object3D(),
    makeShip: () => new Group(),
    placeShip: () => {},
  };
}
