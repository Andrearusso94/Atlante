// Tavole illustrate SVG (rullino Peste) — PORTATO LETTERALMENTE dal v12
// (sezione "FEATURE PESTE NERA": svgWrap, plate(), palette P_*, icone IC_*).
// Funzioni pure: generano stringhe SVG, nessuna dipendenza da DOM/three.

import type { PlagueSceneType } from "../types/peste";

export const P_SPACE = "#05080f";
export const P_DEEP = "#0c1730";
export const P_GOLD = "#e3ac46";
export const P_GOLD2 = "#f3d28f";
export const P_CYAN = "#6fd3e0";
export const P_PAPER = "#eef1f6";
export const P_DIM = "#9aa6bd";
export const P_RUST = "#b5552f";

/** Cornice "a incisione" condivisa da tutte le tavole. `u` rende univoci gli id SVG
 * (gradient/filter) quando più tavole sono nello stesso DOM (il rullino le mostra tutte). */
export function svgWrap(inner: string, top: string, bot: string, u: string): string {
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="sky${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>
<radialGradient id="vig${u}" cx="50%" cy="40%" r="78%"><stop offset="52%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.6"/></radialGradient>
<filter id="grain${u}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer></filter>
</defs>
<rect width="400" height="500" fill="url(#sky${u})"/>
${inner}
<rect width="400" height="500" fill="url(#vig${u})"/>
<rect width="400" height="500" filter="url(#grain${u})"/>
<rect x="11" y="11" width="378" height="478" fill="none" stroke="${P_GOLD}" stroke-opacity="0.32" stroke-width="1"/>
<g stroke="${P_GOLD}" stroke-opacity="0.55" stroke-width="1.4" fill="none">
<path d="M11 28 L11 11 L28 11"/><path d="M372 11 L389 11 L389 28"/>
<path d="M11 472 L11 489 L28 489"/><path d="M389 472 L389 489 L372 489"/></g>
</svg>`;
}

/** Genera la tavola illustrata per una "scena" del rullino (PlagueSlide.scene). */
export function plate(scene: PlagueSceneType, u: string): string {
  // `inner` non ha un default iniziale (a differenza di top/bot): ogni ramo qui sotto,
  // incluso l'else finale, lo assegna sempre prima di leggerlo.
  let inner: string;
  let top = P_DEEP;
  let bot = P_SPACE;
  if (scene === "ship" || scene === "harbor") {
    top = "#24344f";
    bot = P_DEEP;
    inner = `<circle cx="305" cy="86" r="30" fill="${P_GOLD2}" opacity="0.12"/><circle cx="305" cy="86" r="17" fill="${P_GOLD2}" opacity="0.3"/>
<g stroke="${P_GOLD}" stroke-width="2" fill="none" opacity="0.7" stroke-linecap="round"><path d="M58 96 q9 -8 18 0"/><path d="M76 96 q9 -8 18 0"/><path d="M122 70 q7 -6 14 0"/><path d="M136 70 q7 -6 14 0"/></g>
<rect x="0" y="340" width="400" height="160" fill="#06101c"/>
<g stroke="${P_CYAN}" stroke-width="1.5" fill="none" opacity="0.32"><path d="M0 362 q25 -9 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0"/><path d="M0 398 q25 9 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" opacity="0.7"/><path d="M0 438 q25 -9 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" opacity="0.5"/></g>
<g stroke="${P_GOLD}" stroke-width="2" stroke-linejoin="round" fill="#0a1422"><path d="M118 358 q82 46 164 0 l-26 -26 -112 0 z"/><path d="M150 332 l100 0"/><line x1="200" y1="332" x2="200" y2="232"/><path d="M200 244 q46 26 0 76 q-46 -26 0 -76 z" fill="${P_RUST}" fill-opacity="0.5"/><path d="M200 232 l26 9 -26 9 z" fill="${P_GOLD}" stroke="none"/><g stroke-width="1.5" opacity="0.8"><line x1="140" y1="354" x2="120" y2="376"/><line x1="170" y1="358" x2="152" y2="380"/><line x1="230" y1="358" x2="248" y2="380"/><line x1="260" y1="354" x2="280" y2="376"/></g></g>`;
  } else if (scene === "city") {
    top = "#3a1c14";
    bot = P_DEEP;
    inner = `<circle cx="300" cy="108" r="34" fill="${P_RUST}" opacity="0.22"/><circle cx="300" cy="108" r="19" fill="${P_GOLD}" opacity="0.32"/>
<g stroke="#0a0d14" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"><path d="M88 122 q10 -9 20 0"/><path d="M108 122 q10 -9 20 0"/><path d="M150 150 q8 -7 16 0"/><path d="M166 150 q8 -7 16 0"/><path d="M250 92 q8 -7 16 0"/><path d="M266 92 q8 -7 16 0"/></g>
<rect x="0" y="392" width="400" height="108" fill="#070c16"/>
<path fill="#0a1322" stroke="${P_GOLD}" stroke-width="1.6" stroke-linejoin="round" d="M60 392 L60 322 L72 322 L72 314 L84 314 L84 322 L96 322 L96 314 L108 314 L108 322 L150 322 L150 270 L160 270 L160 260 L172 260 L172 270 L182 270 L182 322 L210 322 L218 272 L228 248 L238 272 L246 322 L300 322 L300 314 L312 314 L312 322 L324 322 L324 314 L336 314 L336 322 L340 322 L340 392 Z"/>
<path d="M228 248 L228 392" stroke="${P_GOLD}" stroke-width="1.4" opacity="0.5"/>
<path d="M188 392 q0 -30 16 -30 q16 0 16 30" fill="#05080f" stroke="${P_GOLD}" stroke-width="1.4"/>
<g fill="${P_GOLD}" opacity="0.45"><rect x="120" y="350" width="9" height="14"/><rect x="158" y="300" width="8" height="12"/><rect x="300" y="350" width="9" height="14"/><rect x="222" y="300" width="8" height="14"/></g>`;
  } else if (scene === "macabre") {
    top = P_DEEP;
    bot = P_SPACE;
    const sk = (cx: number) =>
      `<g stroke="${P_PAPER}" stroke-opacity="0.85" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="${cx}" cy="300" r="14" fill="#0a0f1a"/><circle cx="${cx - 5}" cy="298" r="2.4" fill="${P_PAPER}" stroke="none"/><circle cx="${cx + 5}" cy="298" r="2.4" fill="${P_PAPER}" stroke="none"/><path d="M${cx - 5} 310 l10 0"/><line x1="${cx}" y1="314" x2="${cx}" y2="360"/><path d="M${cx - 11} 324 q11 6 22 0"/><path d="M${cx - 11} 334 q11 6 22 0"/><path d="M${cx - 9} 344 q9 5 18 0"/><path d="M${cx - 10} 362 l20 0"/><line x1="${cx}" y1="362" x2="${cx - 12}" y2="410"/><line x1="${cx}" y1="362" x2="${cx + 12}" y2="410"/></g>`;
    const robe = (cx: number) =>
      `<g stroke="${P_GOLD2}" stroke-width="2" fill="#0a0f1a" stroke-linejoin="round"><circle cx="${cx}" cy="300" r="13"/><path d="M${cx - 24} 412 L${cx} 320 L${cx + 24} 412 Z"/></g>`;
    inner = `<circle cx="312" cy="80" r="26" fill="${P_PAPER}" opacity="0.08"/><circle cx="312" cy="80" r="15" fill="${P_PAPER}" opacity="0.16"/>
<line x1="0" y1="430" x2="400" y2="430" stroke="${P_GOLD}" stroke-opacity="0.3" stroke-width="1.4"/>
${sk(112)}${robe(200)}${sk(290)}
<g stroke="${P_PAPER}" stroke-opacity="0.7" stroke-width="2" fill="none" stroke-linecap="round"><path d="M124 320 q30 -10 56 6"/><path d="M220 322 q30 -8 58 -4"/></g>`;
  } else if (scene === "route") {
    top = P_DEEP;
    bot = P_SPACE;
    inner = `<g stroke="${P_GOLD}" stroke-opacity="0.22" stroke-width="1.3" fill="none"><path d="M40 150 q60 -30 120 -10 q70 24 130 4 q40 -14 70 6"/><path d="M30 250 q80 30 150 10 q90 -26 180 8"/><path d="M60 350 q90 -24 160 6 q70 28 140 0"/></g>
<g stroke="${P_DIM}" stroke-opacity="0.25" stroke-width="1" fill="none"><line x1="0" y1="200" x2="400" y2="200"/><line x1="0" y1="300" x2="400" y2="300"/><line x1="120" y1="0" x2="120" y2="500"/><line x1="260" y1="0" x2="260" y2="500"/></g>
<g transform="translate(330,70)" stroke="${P_GOLD2}" stroke-width="1.4" fill="none" opacity="0.7"><circle r="16"/><path d="M0 -20 L0 20 M-20 0 L20 0"/><path d="M0 -20 l5 8 -10 0 z" fill="${P_GOLD2}" stroke="none"/></g>
<path d="M300 410 Q200 250 110 150" stroke="${P_GOLD}" stroke-width="2.4" fill="none" stroke-dasharray="2 7" stroke-linecap="round"/>
<circle cx="300" cy="410" r="7" fill="${P_GOLD}"/><circle cx="300" cy="410" r="14" fill="none" stroke="${P_GOLD}" stroke-opacity="0.4"/>
<g><circle cx="110" cy="150" r="9" fill="none" stroke="${P_CYAN}" stroke-opacity="0.8" stroke-width="2"/><circle cx="110" cy="150" r="18" fill="none" stroke="${P_CYAN}" stroke-opacity="0.45" stroke-width="1.6"/><circle cx="110" cy="150" r="28" fill="none" stroke="${P_CYAN}" stroke-opacity="0.22" stroke-width="1.4"/><circle cx="110" cy="150" r="4" fill="${P_CYAN}"/></g>`;
  } else if (scene === "flagellants") {
    top = P_DEEP;
    bot = P_SPACE;
    const fig = (cx: number, bow: number) =>
      `<g stroke="${P_PAPER}" stroke-opacity="0.82" stroke-width="2" fill="#0a0f1a" stroke-linejoin="round"><circle cx="${cx}" cy="${330 - bow}" r="11"/><path d="M${cx - 18} 430 L${cx - 6} ${344 - bow} Q${cx} ${336 - bow} ${cx + 6} ${344 - bow} L${cx + 18} 430 Z"/></g>`;
    inner = `<line x1="0" y1="430" x2="400" y2="430" stroke="${P_GOLD}" stroke-opacity="0.3" stroke-width="1.4"/>
<g stroke="${P_GOLD}" stroke-width="3" stroke-linecap="round"><line x1="96" y1="430" x2="96" y2="250"/><line x1="74" y1="286" x2="118" y2="286"/></g>
${fig(130, 6)}${fig(186, 12)}${fig(244, 6)}${fig(300, 12)}
<g stroke="${P_GOLD2}" stroke-opacity="0.6" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M150 300 l24 -14"/><path d="M206 306 l24 -14"/><path d="M264 300 l24 -14"/></g>`;
  } else if (scene === "memorial") {
    top = "#0b1424";
    bot = "#02040a";
    inner = `<g><ellipse cx="200" cy="300" rx="70" ry="70" fill="${P_GOLD}" opacity="0.06"/><ellipse cx="200" cy="300" rx="42" ry="42" fill="${P_GOLD}" opacity="0.1"/></g>
<rect x="186" y="300" width="28" height="120" rx="3" fill="${P_PAPER}" opacity="0.5"/>
<rect x="178" y="416" width="44" height="12" rx="3" fill="#0a1322" stroke="${P_GOLD}" stroke-width="1.4"/>
<path d="M200 300 C188 282 188 268 200 252 C212 268 212 282 200 300 Z" fill="${P_GOLD}"/>
<path d="M200 290 C194 280 194 272 200 262 C206 272 206 280 200 290 Z" fill="${P_GOLD2}"/>
<path d="M200 252 q-10 -22 4 -40 q-12 18 -2 34" stroke="${P_DIM}" stroke-opacity="0.5" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<g stroke="${P_GOLD}" stroke-opacity="0.3" stroke-width="1.2"><line x1="120" y1="452" x2="280" y2="452"/><line x1="140" y1="462" x2="260" y2="462"/></g>`;
  } else if (scene === "spared") {
    top = "#14304a";
    bot = P_DEEP;
    inner = `<circle cx="300" cy="120" r="38" fill="${P_CYAN}" opacity="0.12"/><circle cx="300" cy="120" r="21" fill="${P_GOLD2}" opacity="0.28"/>
<path d="M70 300 Q200 250 330 300" fill="none" stroke="${P_GOLD}" stroke-opacity="0.35" stroke-width="1.6" stroke-dasharray="1 6"/>
<g fill="#0a1322" stroke="${P_GOLD}" stroke-width="1.5" stroke-linejoin="round"><path d="M150 360 L150 320 L162 306 L174 320 L174 360 Z"/><path d="M186 360 L186 332 L210 332 L210 360 Z"/><path d="M222 360 L222 326 L234 314 L246 326 L246 360 Z"/></g>
<rect x="0" y="360" width="400" height="140" fill="#081120"/>
<g stroke="${P_CYAN}" stroke-opacity="0.3" stroke-width="1.4" fill="none"><path d="M0 392 q100 -16 200 0 t200 0"/><path d="M0 422 q100 16 200 0 t200 0"/><path d="M0 454 q100 -16 200 0 t200 0"/></g>
<g stroke="${P_GOLD}" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"><path d="M300 110 q8 -7 16 0"/><path d="M316 110 q8 -7 16 0"/></g>`;
  } else if (scene === "crown") {
    top = P_DEEP;
    bot = P_SPACE;
    inner = `<ellipse cx="200" cy="300" rx="120" ry="110" fill="${P_GOLD}" opacity="0.05"/>
<g stroke="${P_GOLD2}" stroke-width="2" fill="#0a1322" stroke-linejoin="round"><path d="M120 330 L132 252 L162 300 L200 240 L238 300 L268 252 L280 330 Z"/><rect x="120" y="330" width="160" height="34" rx="4"/></g>
<g fill="${P_GOLD}"><circle cx="132" cy="250" r="6"/><circle cx="200" cy="238" r="7"/><circle cx="268" cy="250" r="6"/></g>
<g fill="${P_RUST}" fill-opacity="0.7" stroke="${P_GOLD}" stroke-width="1"><circle cx="150" cy="347" r="6"/><circle cx="200" cy="347" r="7"/><circle cx="250" cy="347" r="6"/></g>
<path d="M200 238 l0 -22 M190 222 l20 0" stroke="${P_GOLD2}" stroke-width="2.4" stroke-linecap="round"/>
<g stroke="${P_GOLD}" stroke-opacity="0.5" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M104 360 q-18 -30 -10 -64 q14 22 16 50"/><path d="M296 360 q18 -30 10 -64 q-14 22 -16 50"/></g>`;
  } else if (scene === "north") {
    top = "#10243a";
    bot = P_DEEP;
    inner = `<path d="M0 150 q100 -40 200 -10 q100 30 200 -6" fill="none" stroke="${P_CYAN}" stroke-opacity="0.25" stroke-width="6"/>
<path d="M0 170 q100 -34 200 -6 q100 28 200 -10" fill="none" stroke="${P_GOLD2}" stroke-opacity="0.14" stroke-width="4"/>
<g fill="#0a1626" stroke="${P_GOLD}" stroke-width="1.4" stroke-linejoin="round"><path d="M0 340 L70 230 L140 340 Z"/><path d="M120 350 L220 200 L320 350 Z"/><path d="M260 350 L340 250 L400 350 L400 350 Z"/></g>
<g stroke="${P_PAPER}" stroke-opacity="0.6" stroke-width="1.4" fill="none"><path d="M180 230 l18 0 -10 14 14 0" /></g>
<rect x="0" y="350" width="400" height="150" fill="#06101c"/>
<g stroke="${P_GOLD}" stroke-width="1.8" fill="#0a1422" stroke-linejoin="round"><path d="M150 410 q40 24 80 0 l-12 -16 -56 0 z"/><line x1="190" y1="394" x2="190" y2="358"/><path d="M190 366 q22 12 0 26 z" fill="${P_RUST}" fill-opacity="0.5"/></g>
<g fill="${P_PAPER}" opacity="0.8"><circle cx="60" cy="120" r="2"/><circle cx="130" cy="90" r="1.6"/><circle cx="250" cy="130" r="2"/><circle cx="330" cy="100" r="1.6"/><circle cx="90" cy="300" r="1.8"/><circle cx="300" cy="290" r="2"/><circle cx="200" cy="420" r="1.6"/><circle cx="120" cy="440" r="1.8"/><circle cx="350" cy="430" r="1.6"/></g>`;
  } else if (scene === "scroll") {
    top = P_DEEP;
    bot = P_SPACE;
    inner = `<g transform="translate(0,40)"><rect x="92" y="120" width="216" height="260" rx="6" fill="${P_PAPER}" opacity="0.9"/>
<rect x="80" y="110" width="14" height="280" rx="7" fill="#0a1322" stroke="${P_GOLD}" stroke-width="1.4"/>
<rect x="306" y="110" width="14" height="280" rx="7" fill="#0a1322" stroke="${P_GOLD}" stroke-width="1.4"/>
<g stroke="${P_DEEP}" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"><line x1="116" y1="156" x2="284" y2="156"/><line x1="116" y1="178" x2="284" y2="178"/><line x1="116" y1="200" x2="262" y2="200"/><line x1="116" y1="222" x2="284" y2="222"/><line x1="116" y1="244" x2="248" y2="244"/><line x1="116" y1="266" x2="284" y2="266"/><line x1="116" y1="288" x2="270" y2="288"/></g>
<circle cx="244" cy="338" r="20" fill="${P_RUST}" fill-opacity="0.85" stroke="${P_GOLD}" stroke-width="1.6"/><path d="M244 328 l0 20 M236 338 l16 0" stroke="${P_GOLD2}" stroke-width="2"/>
<path d="M244 358 l-8 20 8 -6 8 6 -8 -20" fill="${P_RUST}" fill-opacity="0.8"/></g>`;
  } else {
    // Irraggiungibile con un PlagueSceneType valido (i rami sopra coprono i suoi 11
    // membri) — tenuto per fedeltà al v12, che aveva lo stesso ramo defensivo.
    inner = `<rect width="400" height="500" fill="${P_DEEP}"/>`;
  }
  return svgWrap(inner, top, bot, u);
}

/* ---- icone (avatar, pin, azioni) ---- */
export const IC_SKULL = `<svg viewBox="0 0 24 24" fill="none" stroke="${P_GOLD2}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4.4 0-7 2.9-7 7 0 2.2 1 3.6 2 4.4v2.1c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5v-2.1c1-.8 2-2.2 2-4.4 0-4.1-2.6-7-7-7Z"/><circle cx="9" cy="10.5" r="1.6" fill="${P_GOLD2}"/><circle cx="15" cy="10.5" r="1.6" fill="${P_GOLD2}"/><path d="M11 14.5h2"/></svg>`;
export const IC_PIN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>`;
export const IC_ACTS = `<svg class="heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 7.6a5 5 0 0 0-8.8-2.2A5 5 0 0 0 3.2 7.6c0 4 5.2 7.8 8.8 10 3.6-2.2 8.8-6 8.8-10Z"/></svg>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-4-.9L3 20l1-3.9a8.4 8.4 0 1 1 17-4.6Z"/></svg>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
export const IC_BOOK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>`;
