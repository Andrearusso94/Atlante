import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { autoPause, flyTo, qA, qTarget } from "./controls";
import { ll2v } from "./geo";

describe("qA (quaternione da asse+angolo)", () => {
  it("ruota un vettore dell'angolo dato attorno all'asse dato", () => {
    const v = new Vector3(0, 0, 1);
    const q = qA(new Vector3(0, 1, 0), Math.PI / 2); // 90° attorno a Y
    v.applyQuaternion(q);
    expect(v.x).toBeCloseTo(1, 9);
    expect(v.y).toBeCloseTo(0, 9);
    expect(v.z).toBeCloseTo(0, 9);
  });

  it("con angolo 0 è l'identità", () => {
    const v = new Vector3(0.3, 0.5, 0.8).normalize();
    const before = v.clone();
    v.applyQuaternion(qA(new Vector3(1, 0, 0), 0));
    expect(v.distanceTo(before)).toBeCloseTo(0, 9);
  });
});

describe("flyTo", () => {
  it("qTarget porta il punto lat/lon indicato a puntare verso la camera (0,0,1)", () => {
    flyTo(41.9, 12.5); // Roma
    expect(qTarget).not.toBeNull();
    const local = ll2v(41.9, 12.5, 1).normalize();
    local.applyQuaternion(qTarget!);
    expect(local.x).toBeCloseTo(0, 6);
    expect(local.y).toBeCloseTo(0, 6);
    expect(local.z).toBeCloseTo(1, 6);
  });

  it("funziona per qualunque lat/lon, non solo per il caso di test sopra", () => {
    flyTo(-33.4, -70.6); // Santiago del Cile
    const local = ll2v(-33.4, -70.6, 1).normalize();
    local.applyQuaternion(qTarget!);
    expect(local.distanceTo(new Vector3(0, 0, 1))).toBeCloseTo(0, 6);
  });

  it("sospende la rotazione automatica molto più a lungo di un rilascio di drag (~10 minuti)", () => {
    const before = performance.now();
    flyTo(0, 0);
    // v12: autoPause = now + 6e5 (10 minuti) contro +2500 (2.5s) del rilascio drag
    expect(autoPause).toBeGreaterThan(before + 6e5 - 1000);
    expect(autoPause).toBeLessThan(before + 6e5 + 1000);
  });
});
