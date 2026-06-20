// Archetipo `network` — PORTATO LETTERALMENTE dal v12 (ramo `archetype==="network"`).

import { BufferGeometry, Line, LineBasicMaterial, Mesh, SphereGeometry } from "three";
import type { SceneSpec } from "../../types/scene";
import { arc, fmtY, ll2v } from "../geo";
import type { ArchetypeContext, ArchetypeResult } from "./context";

type NetworkSpec = Extract<SceneSpec, { archetype: "network" }>;

export function renderNetwork(s: NetworkSpec, ys: number, ctx: ArchetypeContext): ArchetypeResult {
  (s.items || []).forEach((it) => {
    const pts = arc(it.from, it.to, 0.22, 40);
    ctx.aiLayer.add(
      new Line(
        new BufferGeometry().setFromPoints(pts),
        new LineBasicMaterial({ color: 0x6fd3e0, transparent: true, opacity: 0.5 }),
      ),
    );
    [it.from, it.to].forEach((e) => {
      const m = new Mesh(new SphereGeometry(0.014, 10, 10), ctx.matGold);
      m.position.copy(ll2v(e[0], e[1], 1.014)); // R*1.014 (R=1)
      ctx.aiLayer.add(m);
    });
  });
  return { yearAt: () => s.period || fmtY(ys), curYearFn: () => ys };
}
