import { describe, expect, it } from "vitest";
import type { PlagueSceneType } from "../types/peste";
import { IC_ACTS, IC_BOOK, IC_PIN, IC_SKULL, P_GOLD, plate, svgWrap } from "./plates";

const ALL_SCENES: PlagueSceneType[] = [
  "route",
  "city",
  "macabre",
  "scroll",
  "north",
  "memorial",
  "harbor",
  "flagellants",
  "ship",
  "spared",
  "crown",
];

describe("svgWrap", () => {
  it("incapsula il contenuto in un <svg> con gli id resi univoci da `u`", () => {
    const out = svgWrap("<rect/>", "#111", "#222", "x7");
    expect(out.startsWith("<svg")).toBe(true);
    expect(out.trim().endsWith("</svg>")).toBe(true);
    expect(out).toContain("<rect/>");
    expect(out).toContain('id="skyx7"');
    expect(out).toContain('id="vigx7"');
    expect(out).toContain('id="grainx7"');
    expect(out).toContain("#111");
    expect(out).toContain("#222");
  });

  it("con `u` diversi produce id diversi (niente collisioni se più tavole sono nello stesso DOM)", () => {
    const a = svgWrap("<rect/>", "#111", "#222", "a");
    const b = svgWrap("<rect/>", "#111", "#222", "b");
    expect(a).not.toBe(b);
    expect(a).toContain("id=\"skya\"");
    expect(b).toContain("id=\"skyb\"");
  });
});

describe("plate", () => {
  it.each(ALL_SCENES)("genera una tavola valida per la scena '%s'", (scene) => {
    const out = plate(scene, "t1");
    expect(out.startsWith("<svg")).toBe(true);
    expect(out.trim().endsWith("</svg>")).toBe(true);
    expect(out).toContain("t1"); // gli id della cornice usano sempre `u`
    expect(out).toContain(P_GOLD); // la cornice dorata è condivisa da tutte le tavole
  });

  it("scene diverse producono contenuti (il corpo `inner`) diversi", () => {
    const outputs = new Set(ALL_SCENES.map((scene) => plate(scene, "same")));
    // 10, non 11: "ship" e "harbor" condividono lo stesso ramo nel v12 (vedi test sotto).
    expect(outputs.size).toBe(ALL_SCENES.length - 1);
  });

  it("'ship' e 'harbor' condividono lo stesso ramo (stesso contenuto a parità di `u`)", () => {
    expect(plate("ship", "z")).toBe(plate("harbor", "z"));
  });

  it("è deterministica (stesso input -> stesso output)", () => {
    expect(plate("macabre", "k")).toBe(plate("macabre", "k"));
  });
});

describe("icone", () => {
  it("sono tutte stringhe SVG non vuote", () => {
    for (const icon of [IC_SKULL, IC_PIN, IC_BOOK]) {
      expect(icon).toContain("<svg");
      expect(icon).toContain("</svg>");
    }
  });

  it("IC_ACTS concatena tre icone (like/commento/condividi)", () => {
    expect(IC_ACTS.match(/<svg/g)).toHaveLength(3);
  });
});
