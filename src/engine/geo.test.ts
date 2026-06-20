import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { dateLabel, featCentroid, fmtY, gcDeg, ll2v, lerp, parseISO, pip, slerp, v2ll } from "./geo";
import type { GeoRing } from "./geo";

describe("pip (point-in-polygon, ray casting su [lon,lat])", () => {
  const square: GeoRing = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it("considera dentro un punto al centro del quadrato", () => {
    expect(pip(5, 5, square)).toBe(true);
  });

  it("considera fuori un punto chiaramente esterno", () => {
    expect(pip(15, 15, square)).toBe(false);
    expect(pip(-5, 5, square)).toBe(false);
  });

  it("funziona anche su anelli non convessi (a L)", () => {
    const lShape: GeoRing = [
      [0, 0],
      [10, 0],
      [10, 4],
      [4, 4],
      [4, 10],
      [0, 10],
    ];
    expect(pip(2, 2, lShape)).toBe(true); // nel braccio basso/sinistro
    expect(pip(8, 8, lShape)).toBe(false); // nell'incavo della L
  });
});

describe("parseISO", () => {
  it("parsa una data d.C. nel formato YYYY-MM-DD", () => {
    const d = parseISO("1492-08-03");
    expect(d.y).toBe(1492);
    expect(d.doy).toBe(215); // 31+29... cumulativo fino ad agosto (212) + 3
    expect(d.fy).toBeCloseTo(1492 + 215 / 365, 9);
  });

  it("parsa una data a.C. (anno negativo)", () => {
    const d = parseISO("-509-04-21");
    expect(d.y).toBe(-509);
    expect(d.doy).toBe(111); // CUM[3]=90 + 21
    expect(d.fy).toBeCloseTo(-509 + 111 / 365, 9);
  });

  it("ritorna il default {y:0,doy:1,fy:0} su input non valido", () => {
    expect(parseISO("")).toEqual({ y: 0, doy: 1, fy: 0 });
    expect(parseISO("non una data")).toEqual({ y: 0, doy: 1, fy: 0 });
  });
});

describe("dateLabel", () => {
  it("interpola fra due date reali (viaggio di Colombo, da FALLBACK.colombo)", () => {
    const a = parseISO("1492-08-03");
    const b = parseISO("1492-10-12");
    expect(dateLabel(a, b, 0)).toBe("3 ago 1492");
    expect(dateLabel(a, b, 1)).toBe("12 ott 1492");
  });

  it("mostra 'a.C.' solo per anni negativi, senza 'd.C.' per quelli positivi", () => {
    const a = parseISO("-44-03-15");
    expect(dateLabel(a, a, 0)).toBe("15 mar 44 a.C.");
  });
});

describe("fmtY / lerp", () => {
  it("fmtY etichetta a.C./d.C.", () => {
    expect(fmtY(117)).toBe("117 d.C.");
    expect(fmtY(-509)).toBe("509 a.C.");
  });

  it("lerp interpola e arrotonda all'intero", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(-500, 200, 0.25)).toBe(-325);
  });
});

describe("ll2v / v2ll (round-trip)", () => {
  it.each<[number, number]>([
    [0, 0],
    [45, 90],
    [-30, -120],
    [89, 179],
  ])("torna a lat=%d lon=%d dopo ll2v -> v2ll", (lat, lon) => {
    const [lat2, lon2] = v2ll(ll2v(lat, lon, 1));
    expect(lat2).toBeCloseTo(lat, 6);
    expect(lon2).toBeCloseTo(lon, 6);
  });
});

describe("gcDeg (distanza angolare)", () => {
  it("è 0 per lo stesso punto", () => {
    expect(gcDeg(41.9, 12.5, 41.9, 12.5)).toBeCloseTo(0, 9);
  });

  it("è 90 da equatore a polo", () => {
    expect(gcDeg(0, 0, 90, 0)).toBeCloseTo(90, 6);
  });

  it("è 180 fra punti antipodali", () => {
    expect(gcDeg(0, 0, 0, 180)).toBeCloseTo(180, 6);
  });
});

describe("slerp", () => {
  it("ritorna il punto di partenza quando i due vettori coincidono", () => {
    const a = new Vector3(1, 0, 0);
    const r = slerp(a, a.clone(), 0.5);
    expect(r.x).toBeCloseTo(1, 9);
    expect(r.y).toBeCloseTo(0, 9);
    expect(r.z).toBeCloseTo(0, 9);
  });

  it("a metà strada fra due assi ortogonali è equidistante da entrambi", () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    const mid = slerp(a, b, 0.5);
    expect(mid.distanceTo(a)).toBeCloseTo(mid.distanceTo(b), 9);
    expect(mid.length()).toBeCloseTo(1, 9);
  });
});

describe("featCentroid", () => {
  it("calcola il centroide di un Polygon semplice", () => {
    const c = featCentroid({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
      ],
    });
    expect(c).not.toBeNull();
    expect(c!.lon).toBeCloseTo(5, 9);
    expect(c!.lat).toBeCloseTo(5, 9);
    expect(c!.size).toBe(4);
  });

  it("su MultiPolygon prende l'anello esterno più grande", () => {
    const c = featCentroid({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
          ],
        ],
        [
          [
            [100, 100],
            [104, 100],
            [104, 104],
            [100, 104],
          ],
        ],
      ],
    });
    expect(c!.size).toBe(4); // il secondo poligono ha 4 vertici contro 3 del primo
  });

  it("ritorna null per una geometria senza poligoni", () => {
    expect(featCentroid({ type: "Point", coordinates: [0, 0] })).toBeNull();
  });
});
