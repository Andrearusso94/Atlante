// Archetipo `journey` — PORTATO LETTERALMENTE dal v12 (ramo `archetype==="journey"`).

import { BufferGeometry, Group, Line, LineBasicMaterial } from "three";
import type { JourneyItem, SceneSpec } from "../../types/scene";
import { dateLabel, fmtY, lerp, parseISO, pathWp } from "../geo";
import type { ArchetypeContext, ArchetypeResult } from "./context";

type JourneySpec = Extract<SceneSpec, { archetype: "journey" }>;

export function renderJourney(
  s: JourneySpec,
  ys: number,
  ye: number,
  ctx: ArchetypeContext,
): ArchetypeResult {
  let dItem: JourneyItem | null = null;
  for (const it of s.items || []) {
    const pts = pathWp(it.waypoints, 22).map((v) => v.clone().multiplyScalar(1.012)); // R*1.012 (R=1)
    ctx.aiLayer.add(
      new Line(
        new BufferGeometry().setFromPoints(pts),
        new LineBasicMaterial({ color: 0x6fd3e0, transparent: true, opacity: 0.5 }),
      ),
    );
    const fleetGroup = new Group();
    ctx.aiLayer.add(fleetGroup);
    const ships = [ctx.makeShip(), ctx.makeShip(), ctx.makeShip()];
    const offs = [-0.02, 0, 0.02];
    const lag = [0.015, 0, -0.015];
    ships.forEach((sh) => fleetGroup.add(sh));
    ctx.updaters.push((p) => {
      ships.forEach((sh, i) => ctx.placeShip(sh, pts, p + lag[i], offs[i]));
    });
    if (!dItem && it.fromDate) dItem = it;
  }
  if (dItem) {
    const a = parseISO(dItem.fromDate as string);
    const b = parseISO(dItem.toDate || (dItem.fromDate as string));
    return { yearAt: (p) => dateLabel(a, b, p), curYearFn: (p) => Math.round(a.fy + (b.fy - a.fy) * p) };
  }
  return { yearAt: (p) => fmtY(lerp(ys, ye, p)), curYearFn: (p) => lerp(ys, ye, p) };
}
