import { describe, expect, it } from "vitest";
import {
  AVAILABLE,
  allRings,
  filesInSpan,
  geomRings,
  nearestFile,
  ringsToSeg,
  subjectRings,
} from "./borders";
import type { GeoFeatureCollection, GeoPosition, GeoRing } from "./geo";

describe("nearestFile", () => {
  it("trova lo snapshot con l'anno più vicino", () => {
    expect(nearestFile(1305).f).toBe("world_1300.geojson");
    expect(nearestFile(1295).f).toBe("world_1300.geojson");
  });

  it("a parità di distanza vince il primo trovato (anno minore), come nel v12 (< stretto)", () => {
    // 1900 e 1914 sono equidistanti da 1907 (7 anni ciascuno)
    expect(nearestFile(1907).y).toBe(1900);
  });

  it("ritorna sempre un elemento di AVAILABLE", () => {
    expect(AVAILABLE).toContainEqual(nearestFile(-50000));
    expect(AVAILABLE).toContainEqual(nearestFile(5000));
  });
});

describe("filesInSpan", () => {
  it("se gli snapshot nel range sono <= maxN li restituisce tutti, in ordine", () => {
    const out = filesInSpan(-500, -100, 10);
    expect(out.map((o) => o.y)).toEqual([-500, -400, -323, -300, -200, -100]);
  });

  it("se non ci sono snapshot nel range, ripiega sul più vicino al punto medio", () => {
    const out = filesInSpan(50, 90, 5);
    expect(out).toEqual([nearestFile(70)]);
  });

  it("quando gli snapshot superano maxN, ne restituisce al più maxN, deduplicati", () => {
    const out = filesInSpan(-3000, 2010, 5);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.length).toBeGreaterThan(0);
    out.forEach((o) => expect(AVAILABLE).toContainEqual(o));
    expect(new Set(out).size).toBe(out.length); // nessun duplicato
  });
});

describe("geomRings", () => {
  it("scarta anelli con meno di 3 vertici", () => {
    const rings = geomRings(
      {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
        ],
      },
      50,
    );
    expect(rings).toEqual([]);
  });

  it("sotto-campiona un anello più grande di `cap`", () => {
    const ring: GeoRing = Array.from({ length: 20 }, (_, i) => [i, i] as GeoPosition);
    const rings = geomRings({ type: "Polygon", coordinates: [ring] }, 5);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(5); // st=ceil(20/5)=4 -> indici 0,4,8,12,16
  });

  it("legge tutti i poligoni di un MultiPolygon", () => {
    const square: GeoRing = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    const rings = geomRings(
      { type: "MultiPolygon", coordinates: [[square], [square]] },
      50,
    );
    expect(rings).toHaveLength(2);
  });

  it("ritorna [] per geometrie non poligonali", () => {
    expect(geomRings({ type: "Point" }, 50)).toEqual([]);
  });
});

describe("subjectRings / allRings", () => {
  const triangle: GeoRing = [
    [0, 0],
    [1, 0],
    [1, 1],
  ];
  const fc: GeoFeatureCollection = {
    features: [
      { properties: { NAME: "Roman Empire" }, geometry: { type: "Polygon", coordinates: [triangle] } },
      { properties: { NAME: "Egypt" }, geometry: { type: "Polygon", coordinates: [triangle] } },
      { properties: { NAME: "" }, geometry: { type: "Polygon", coordinates: [triangle] } },
    ],
  };

  it("subjectRings trova solo le feature i cui alias combaciano (case-insensitive)", () => {
    expect(subjectRings(fc, ["Roman Empire", "Rome"], 50)).toHaveLength(1);
    expect(subjectRings(fc, ["roman"], 50)).toHaveLength(1); // match per inclusione
    expect(subjectRings(fc, ["Babylon"], 50)).toHaveLength(0);
  });

  it("allRings prende la geometria di ogni feature, NAME incluso o no (a differenza di subjectRings)", () => {
    expect(allRings(fc, 50)).toHaveLength(3);
  });
});

describe("ringsToSeg", () => {
  it("salta i lati che attraversano l'antimeridiano (>180° di differenza in longitudine)", () => {
    const ring: GeoRing = [
      [170, 0],
      [-170, 0],
      [0, 10],
    ];
    const seg = ringsToSeg([ring], 0xffffff, 1);
    const pos = seg.geometry.getAttribute("position");
    // 3 lati nel ciclo, 1 saltato (170 -> -170): restano 2 lati = 4 vertici
    expect(pos.count).toBe(4);
  });

  it("produce 2 vertici (6 componenti) per ogni lato di un anello senza salti", () => {
    const square: GeoRing = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const seg = ringsToSeg([square], 0xffffff, 1);
    expect(seg.geometry.getAttribute("position").count).toBe(square.length * 2);
  });
});
