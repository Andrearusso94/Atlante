// Archetipo `territory` — PORTATO LETTERALMENTE dal v12 (ramo `archetype==="territory"`).
// Golden principle: nessun poligono dall'IA — solo subject+aliases; i confini vengono
// SOLO da historical-basemaps (engine/borders.ts), per gli snapshot reali nell'intervallo.

import type { SceneSpec } from "../../types/scene";
import { cacheGeo, filesInSpan, ringsToSeg, subjectRings } from "../borders";
import { fmtY } from "../geo";
import type { ArchetypeContext, ArchetypeResult } from "./context";

type TerritorySpec = Extract<SceneSpec, { archetype: "territory" }>;
// Tipo preciso (con .material: LineBasicMaterial, non l'union generica Material|Material[])
// derivato direttamente dalla firma di ringsToSeg, invece di ripetere i parametri generici.
type BorderSegment = ReturnType<typeof ringsToSeg>;

export async function renderTerritory(
  s: TerritorySpec,
  ys: number,
  ye: number,
  ctx: ArchetypeContext,
): Promise<ArchetypeResult> {
  const aliases = s.aliases && s.aliases.length ? s.aliases : [s.subject || s.title || ""];
  const span = filesInSpan(ys, ye, 8);
  const built: { year: number; seg: BorderSegment }[] = [];
  for (const a of span) {
    try {
      const fc = await cacheGeo(a.f);
      const rings = subjectRings(fc, aliases, 160);
      if (rings.length) {
        const seg = ringsToSeg(rings, 0xe3ac46, 0.95);
        seg.visible = false;
        ctx.aiLayer.add(seg);
        built.push({ year: a.y, seg });
      }
    } catch {
      // snapshot non disponibile per questa data: si prosegue con gli altri, come nel v12
    }
  }
  built.sort((x, y) => x.year - y.year);

  if (!built.length) {
    return {
      lastDataNote:
        "Confini reali non trovati nel dataset per questo soggetto: l'IA ha riconosciuto il tema ma il dataset non ha quei confini. Resta la scheda didattica.",
    };
  }

  ctx.updaters.push((p) => {
    const fp = p * built.length;
    const idx = Math.min(built.length - 1, Math.floor(fp));
    const frac = fp - idx;
    built.forEach((b, i) => {
      b.seg.visible = i <= idx;
      if (i < idx) {
        b.seg.material.opacity = 0.28;
        b.seg.material.color.setHex(0x8a6a30);
      } else if (i === idx) {
        b.seg.material.opacity = 0.45 + 0.5 * Math.min(1, frac * 2);
        b.seg.material.color.setHex(0xe3ac46);
      }
    });
  });

  return {
    yearAt: (p) => fmtY(built[Math.min(built.length - 1, Math.floor(p * built.length))].year),
    curYearFn: (p) => built[Math.min(built.length - 1, Math.floor(p * built.length))].year,
    lastDataNote:
      "Confini reali da historical-basemaps (DARE/Göteborg) — approssimati e a scala continentale, non inventati dall'IA.",
  };
}
