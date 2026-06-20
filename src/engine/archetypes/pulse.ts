// Archetipo `pulse` — PORTATO LETTERALMENTE dal v12 (ramo `archetype==="pulse"` di renderScene).
// Golden principle: l'IA dà solo un nome cercabile; qui si verifica su Wikidata
// (resolveItem) prima di piazzare qualunque punto/etichetta sul globo.

import { Mesh, SphereGeometry } from "three";
import type { SceneSpec, PulseItem } from "../../types/scene";
import { fmtY, ll2v } from "../geo";
import { resolveItem, type ResolvedItem } from "../wikidata";
import type { ArchetypeContext, ArchetypeResult } from "./context";

type PulseSpec = Extract<SceneSpec, { archetype: "pulse" }>;

// `lat`/`lon`/`name` non fanno parte dello schema Zod di PulseItem (golden principle:
// niente coordinate dall'IA per pulse; il campo si chiama `query`, non `name`) ma il v12
// li legge comunque come ripiego defensivo — ramo di fatto morto con l'attuale schema,
// portato letteralmente per fedeltà.
type PulseItemLike = PulseItem & { lat?: number; lon?: number; name?: string };

export async function renderPulse(
  s: PulseSpec,
  ys: number,
  ctx: ArchetypeContext,
): Promise<ArchetypeResult> {
  let okN = 0;
  let failN = 0;
  for (const it of (s.items || []) as PulseItemLike[]) {
    let ev: ResolvedItem | null = await resolveItem(it, ys);
    if (!ev && it.lat != null) {
      ev = {
        name: it.query || it.name || "",
        lat: it.lat,
        // come in wikidata.ts: se c'è lat il v12 assume che ci sia anche lon (qui è un
        // ripiego defensivo mai esercitato dall'attuale schema, vedi PulseItemLike sopra).
        lon: it.lon as number,
        year: it.year || ys,
      };
    }
    if (!ev) {
      failN++;
      continue;
    }
    okN++;
    const m = new Mesh(new SphereGeometry(0.016, 12, 12), ctx.matGold);
    m.position.copy(ll2v(ev.lat, ev.lon, 1.014)); // R*1.014 nel v12 (R=1)
    const h = new Mesh(new SphereGeometry(0.03, 12, 12), ctx.matHalo);
    m.add(h);
    ctx.aiLayer.add(m);
    ctx.updaters.push((p) => {
      h.scale.setScalar(1 + Math.sin(p * 16 + ev!.lat) * 0.3);
    });
    const lab = ctx.makeLabel(ev.name.length > 22 ? `${ev.name.slice(0, 20)}…` : ev.name);
    lab.position.copy(ll2v(ev.lat, ev.lon, 1.05));
    ctx.aiLayer.add(lab);
    ctx.sceneLabels.push(lab);
  }
  return {
    yearAt: () => fmtY(ys),
    curYearFn: () => ys,
    lastDataNote: okN
      ? `Eventi verificati su Wikidata: ${okN} trovati${failN ? `, ${failN} non risolti` : ""} — coordinate e date reali, non inventate.`
      : "Nessun evento risolto su Wikidata (rete assente o nomi non trovati).",
  };
}
