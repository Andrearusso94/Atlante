// Scena/camera/renderer/shader/texture/starfield — PORTATO LETTERALMENTE dal v12
// (sezione "scena"). Differenza obbligata: nel v12 questo blocco gira al caricamento
// della pagina e legge il container da `document.getElementById("scene")`; qui diventa
// `createGlobe(container)` perché il container arriva da React solo al mount
// (GlobeEngine.mount(container), per il comando descritto in RICOGNIZIONE-v12.md).

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";

/** Raggio del globo: sempre 1 nel v12 (era una costante globale `R`). Gli altri moduli
 * (geo/borders/scene/archetipi) hanno già R=1 inlineato nei raggi relativi (R*1.012 ecc.) —
 * questa è la sua unica vera origine, lasciata qui dov'era nel v12. */
export const R = 1;

export interface GlobeUniforms {
  // Indice richiesto da ShaderMaterialParameters.uniforms (three) — IUniform<any> = {value};
  // le proprietà nominate sotto restano comunque tipizzate in modo specifico per chi le usa.
  [uniform: string]: { value: unknown };
  dayTex: { value: Texture | null };
  nightTex: { value: Texture | null };
  sunDir: { value: Vector3 };
  hasTex: { value: number };
  mode: { value: number };
}

export interface Globe {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  /** Il Group ruotabile: ci stanno dentro la mesh della Terra, i confini, aiLayer. */
  globe: Group;
  uniforms: GlobeUniforms;
  sun: Vector3;
  sunTarget: Vector3;
  /** Bersaglio di easing per `uniforms.mode` (0=texture reale, 1=confini/atlante storico).
   * Scritto da setBordersBlend (qui sotto), letto/avvicinato ogni frame da engine/loop.ts. */
  modeTarget: number;
  /** Rimuove il listener di resize e libera il renderer (assente nel v12: lì la pagina non
   * veniva mai smontata. Necessario qui per GlobeEngine.dispose() — vedi MIGRATION-BRIEF.md). */
  dispose: () => void;
}

/** Crea scena/camera/renderer/globo e li monta in `container`. Una sola volta per vita
 * del componente React che possiede il canvas (GlobeEngine.mount). */
export function createGlobe(container: HTMLElement): Globe {
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 2.7);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);

  const globe = new Group();
  scene.add(globe);
  // v12 faceva qui anche `globe.add(aiLayer)`: aiLayer ora vive nel SceneRuntimeState
  // privato di GlobeEngine (blocco 5), quindi è GlobeEngine.mount() che lo aggiunge,
  // dopo aver chiamato questa funzione.

  const sun = new Vector3(1, 0.18, 0.3).normalize();
  const sunTarget = sun.clone();
  const uniforms: GlobeUniforms = {
    dayTex: { value: null },
    nightTex: { value: null },
    sunDir: { value: sun },
    hasTex: { value: 0 },
    mode: { value: 0 },
  };
  const earthMat = new ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D dayTex;uniform sampler2D nightTex;uniform vec3 sunDir;uniform float hasTex;uniform float mode;varying vec2 vUv;varying vec3 vN;
    void main(){float c=dot(normalize(vN),normalize(sunDir));float a=smoothstep(-.12,.22,c);
      vec3 real,atlas;
      if(hasTex>.5){
        vec3 dt=texture2D(dayTex,vUv).rgb;vec3 nt=texture2D(nightTex,vUv).rgb*1.5;
        real=mix(nt,dt,a);
        float luma=dot(dt,vec3(.299,.587,.114));
        float land=max(smoothstep(.02,.12,max(dt.r,dt.g)-dt.b),smoothstep(.75,.9,luma));
        vec3 sea=vec3(.13,.20,.31);vec3 ld=vec3(.40,.44,.50);
        atlas=mix(sea,ld,land)*mix(.85,1.12,a);
      }else{
        real=mix(vec3(.03,.05,.10),vec3(.16,.33,.52),a);
        atlas=vec3(.22,.30,.42)*mix(.85,1.1,a);
      }
      gl_FragColor=vec4(mix(real,atlas,mode),1.);}`,
  });
  const earthMesh = new Mesh(new SphereGeometry(R, 64, 64), earthMat);
  globe.add(earthMesh);

  scene.add(
    new Mesh(
      new SphereGeometry(R * 1.18, 48, 48),
      new ShaderMaterial({
        side: BackSide,
        transparent: true,
        vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vN;void main(){float i=pow(.62-dot(vN,vec3(0.,0.,1.)),2.4);gl_FragColor=vec4(.40,.68,.95,1.)*i;}`,
      }),
    ),
  );

  // starfield
  (() => {
    const g = new BufferGeometry();
    const n = 1200;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 40 + Math.random() * 40;
      const t = Math.random() * 6.283;
      const ph = Math.acos(2 * Math.random() - 1);
      p[i * 3] = r * Math.sin(ph) * Math.cos(t);
      p[i * 3 + 1] = r * Math.cos(ph);
      p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(t);
    }
    g.setAttribute("position", new BufferAttribute(p, 3));
    scene.add(new Points(g, new PointsMaterial({ color: 0xafc6ff, size: 0.12, transparent: true, opacity: 0.8 })));
  })();

  const texL = new TextureLoader();
  texL.setCrossOrigin("anonymous");
  let ld = 0;
  const rdy = () => {
    if (++ld >= 2) uniforms.hasTex.value = 1;
  };
  texL.load(
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    (t) => {
      uniforms.dayTex.value = t;
      rdy();
    },
    undefined,
    () => {},
  );
  texL.load(
    "https://threejs.org/examples/textures/planets/earth_lights_2048.png",
    (t) => {
      uniforms.nightTex.value = t;
      rdy();
    },
    undefined,
    () => {},
  );

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", onResize);

  return {
    scene,
    camera,
    renderer,
    globe,
    uniforms,
    sun,
    sunTarget,
    modeTarget: 0,
    dispose: () => {
      removeEventListener("resize", onResize);
      renderer.dispose();
      renderer.domElement.parentElement?.removeChild(renderer.domElement);
    },
  };
}

export type ThemeName = "day" | "term" | "night";

/** I tre temi-luce del v12 (pulsante #themeBox): direzione del sole normalizzata nel loop. */
export const THEMES: Record<ThemeName, Vector3> = {
  day: new Vector3(0.15, 0.12, 1),
  term: new Vector3(1, 0.18, 0.3),
  night: new Vector3(0, 0.05, -1),
};

/** Comando tema (v12: click su #themeBox -> sunTarget.copy(THEMES[...]).normalize()). */
export function setTheme(g: Globe, theme: ThemeName): void {
  g.sunTarget.copy(THEMES[theme]).normalize();
}

/** Comando confini on/off, la parte che riguarda lo shader (v12: modeTarget=bordersOn?1:0).
 * L'altra metà (bordersObj.visible) vive in engine/borders.ts (setBordersOn, blocco 2):
 * GlobeEngine.setBorders(on) chiamerà entrambe in fase di assemblaggio. */
export function setBordersBlend(g: Globe, on: boolean): void {
  g.modeTarget = on ? 1 : 0;
}
