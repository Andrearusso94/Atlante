// Archetipo `spread` — PORTATO LETTERALMENTE dal v12 (ramo `archetype==="spread"`).
// Nessun override di yearAt/curYearFn/lastDataNote: il v12 non li tocca in questo ramo,
// restano i default impostati dal dispatcher (engine/scene.ts).

import { BufferGeometry, Line, LineBasicMaterial, MathUtils, Mesh, SphereGeometry } from "three";
import type { SceneSpec } from "../../types/scene";
import { arc, ll2v } from "../geo";
import type { ArchetypeContext, ArchetypeResult } from "./context";

type SpreadSpec = Extract<SceneSpec, { archetype: "spread" }>;

export function renderSpread(s: SpreadSpec, ctx: ArchetypeContext): ArchetypeResult {
  (s.items || []).forEach((it) => {
    const o = new Mesh(new SphereGeometry(0.022, 12, 12), ctx.matGold);
    o.position.copy(ll2v(it.originLat, it.originLon, 1.014)); // R*1.014 (R=1)
    ctx.aiLayer.add(o);
    (it.targets || []).forEach((t, ti) => {
      const pts = arc([it.originLat, it.originLon], t, 0.18, 40);
      const geo = new BufferGeometry().setFromPoints(pts);
      const line = new Line(geo, new LineBasicMaterial({ color: 0xe3ac46, transparent: true, opacity: 0.55 }));
      geo.setDrawRange(0, 0);
      ctx.aiLayer.add(line);
      const tip = new Mesh(new SphereGeometry(0.014, 10, 10), ctx.matGold);
      tip.visible = false;
      ctx.aiLayer.add(tip);
      const start = ti / (it.targets.length + 1);
      ctx.updaters.push((p) => {
        const loc = MathUtils.clamp((p - start) / 0.5, 0, 1);
        const n = Math.floor(loc * pts.length);
        geo.setDrawRange(0, n);
        if (n > 1) {
          tip.visible = true;
          tip.position.copy(pts[Math.min(n, pts.length - 1)]);
        } else {
          tip.visible = false;
        }
      });
    });
  });
  return {};
}
