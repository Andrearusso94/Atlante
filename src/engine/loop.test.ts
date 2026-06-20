import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { approachQuaternion, easeTowards, stepProgress } from "./loop";

describe("approachQuaternion", () => {
  it("converge verso il bersaglio e scatta esattamente su di esso entro snapEps", () => {
    const current = new Quaternion(); // identità
    const target = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    let reached = false;
    for (let i = 0; i < 200 && !reached; i++) {
      reached = approachQuaternion(current, target, 0.07, 0.01);
    }
    expect(reached).toBe(true);
    expect(current.angleTo(target)).toBe(0);
  });

  it("con un solo passo si avvicina ma di norma non raggiunge ancora il bersaglio", () => {
    const current = new Quaternion();
    const target = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const startAngle = current.angleTo(target);
    const reached = approachQuaternion(current, target, 0.07, 0.01);
    expect(reached).toBe(false);
    expect(current.angleTo(target)).toBeLessThan(startAngle);
    expect(current.angleTo(target)).toBeGreaterThan(0);
  });

  it("se current è già (quasi) il bersaglio, scatta subito", () => {
    const target = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.3);
    const current = target.clone();
    expect(approachQuaternion(current, target, 0.07, 0.01)).toBe(true);
  });
});

describe("stepProgress", () => {
  it("avanza della quantità data e fa il giro a 1 (loop continuo della timeline)", () => {
    expect(stepProgress(0)).toBeCloseTo(0.0014, 9);
    expect(stepProgress(0.9995, 0.001)).toBeCloseTo(0.0005, 9); // 0.9995+0.001=1.0005 -> %1
  });

  it("con dt=0 non avanza", () => {
    expect(stepProgress(0.42, 0)).toBe(0.42);
  });
});

describe("easeTowards", () => {
  it("si muove verso il target proporzionalmente al factor, senza mai superarlo in un passo", () => {
    expect(easeTowards(0, 1, 0.08)).toBeCloseTo(0.08, 9);
    expect(easeTowards(1, 0, 0.08)).toBeCloseTo(0.92, 9);
  });

  it("con factor=1 raggiunge il target in un solo passo", () => {
    expect(easeTowards(5, 12, 1)).toBe(12);
  });

  it("con factor=0 resta fermo", () => {
    expect(easeTowards(5, 12, 0)).toBe(5);
  });

  it("iterato converge al target (stesso schema di uniforms.mode/sun nel loop)", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = easeTowards(v, 1, 0.08);
    expect(v).toBeCloseTo(1, 6);
  });
});
