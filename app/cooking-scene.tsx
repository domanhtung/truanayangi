import { useEffect, useId, useState, type AnimationEvent, type CSSProperties } from "react";

import "./cooking-scene.css";

export const cookingScenes = [
  { id: "pan", label: "Chảo đảo và lửa bùng" },
  { id: "pressure", label: "Nồi áp suất rung và nổ" },
  { id: "boil", label: "Nồi sôi và trào nước" },
  { id: "grill", label: "Lò than và xiên cháy" },
  { id: "mix", label: "Trộn và đổ bát" },
] as const;

export type CookingKind = typeof cookingScenes[number]["id"];
const byCategory: Record<string, CookingKind> = {
  "xào": "pan", "chiên": "pan", "áp chảo": "pan",
  "kho": "pressure", "rim": "pressure", "om": "pressure", "hầm": "pressure",
  "súp": "boil", "hấp": "boil", "luộc": "boil", "nấu canh": "boil", "canh & súp": "boil",
  "nướng": "grill", "trộn": "mix", "khác": "mix",
};

export function cookingKindForCategory(category: string): CookingKind | undefined {
  const key = category.trim().toLowerCase();
  return Object.hasOwn(byCategory, key) ? byCategory[key] : undefined;
}

export function pickCookingScene(category: string): CookingKind {
  return cookingKindForCategory(category) ?? cookingScenes[Math.floor(Math.random() * cookingScenes.length)].id;
}

const artPath = "/cooking";

const mixVegetables = [
  { asset: "mix-lettuce", x: 182, y: 121, size: 50, dx: -153, dy: 111 },
  { asset: "mix-carrot", x: 205, y: 180, size: 50, dx: -101, dy: 100 },
  { asset: "mix-oyster", x: 231, y: 134, size: 50, dx: -42, dy: 141 },
  { asset: "mix-greens", x: 260, y: 193, size: 50, dx: 43, dy: 113 },
  { asset: "mix-cabbage", x: 287, y: 147, size: 50, dx: 105, dy: 128 },
  { asset: "mix-shiitake", x: 302, y: 180, size: 50, dx: 143, dy: 102 },
];

const stoveProps = ["table-stove", "burner-flame"];

const sceneProps = {
  pan: [
    ...stoveProps, "stir-wok", "stir-food", "stir-hand-spatula", "stir-oil-bottle", "stir-oil-stream", "flare-flame",
    "mix-carrot", "mix-oyster", "mix-greens", "mix-cabbage", "mix-shiitake",
  ],
  pressure: [...stoveProps, "pressure-blue-pot", "pressure-blue-lid", "pressure-burst"],
  boil: [...stoveProps, "soup-pot", "boil-overflow", "flare-flame"],
  grill: ["grill", "grill-skewers", "grill-smoke"],
  mix: ["mixing-bowl", "mix-hand", ...mixVegetables.map(({ asset }) => asset)],
} satisfies Record<CookingKind, string[]>;

function PaintedProp({ name, x, y, width, height }: {
  name: string; x: number; y: number; width: number; height: number;
}) {
  return <image href={`${artPath}/${name}.webp`} x={x} y={y} width={width} height={height} />;
}

const burnerJets = [
  { from: 0, to: 62, duration: 390, delay: -115 },
  { from: 62, to: 114, duration: 295, delay: -190 },
  { from: 114, to: 169, duration: 350, delay: -65 },
  { from: 169, to: 260, duration: 315, delay: -245 },
  { from: 260, to: 319, duration: 370, delay: -100 },
  { from: 319, to: 374, duration: 295, delay: -160 },
  { from: 374, to: 430, duration: 360, delay: -210 },
];

function BurnerFlame() {
  const glow = useId();
  const jetScale = 140 / 430;

  return (
    <g className="cook-flame">
      <defs>
        <radialGradient id={glow}>
          <stop stopColor="#b7e6fd" stopOpacity=".73" />
          <stop offset=".52" stopColor="#69acdf" stopOpacity=".31" />
          <stop offset="1" stopColor="#69acdf" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="cook-burner-glow" cx="240" cy="258" rx="77" ry="10" fill={`url(#${glow})`} />
      <g opacity=".54">
        <PaintedProp name="burner-flame" x={170} y={235} width={140} height={90 * jetScale} />
      </g>
      {burnerJets.map(({ from, to, duration, delay }) => (
        <g key={from} className="cook-burner-jet" style={{ "--jet-duration": `${duration}ms`, animationDelay: `${delay}ms` } as CSSProperties}>
          <svg
            x={170 + from * jetScale}
            y="235"
            width={(to - from) * jetScale}
            height={90 * jetScale}
            viewBox={`${from} 0 ${to - from} 90`}
            overflow="hidden"
          >
            <PaintedProp name="burner-flame" x={0} y={0} width={430} height={90} />
          </svg>
        </g>
      ))}
    </g>
  );
}

function Flames() {
  return (
    <g className="cook-flare">
      <g className="cook-flare-tongue cook-flare-center">
        <PaintedProp name="flare-flame" x={167} y={108} width={155} height={150} />
      </g>
      <g className="cook-flare-tongue cook-flare-left">
        <PaintedProp name="flare-flame" x={123} y={157} width={132} height={107} />
      </g>
      <g className="cook-flare-tongue cook-flare-right">
        <g transform="translate(480 0) scale(-1 1)">
          <PaintedProp name="flare-flame" x={119} y={161} width={126} height={103} />
        </g>
      </g>
    </g>
  );
}

function StoveBase() {
  return (
    <>
      <ellipse cx="240" cy="286" rx="144" ry="16" fill="#493222" opacity=".23" />
      <PaintedProp name="table-stove" x={96} y={197} width={289} height={108} />
    </>
  );
}

function Stove() {
  return (
    <>
      <StoveBase />
      <BurnerFlame />
    </>
  );
}

const stirPieces = [
  { asset: "mix-carrot", x: 184, y: 174, size: 50, dx: -11, rise: 26, turn: -26 },
  { asset: "mix-oyster", x: 214, y: 164, size: 50, dx: 6, rise: 35, turn: 36 },
  { asset: "mix-greens", x: 237, y: 158, size: 50, dx: 12, rise: 42, turn: -39 },
  { asset: "mix-cabbage", x: 256, y: 174, size: 50, dx: 14, rise: 30, turn: 38 },
  { asset: "mix-shiitake", x: 276, y: 181, size: 30, dx: 10, rise: 23, turn: -22 },
];

function Pan() {
  const oilClip = useId();

  return (
    <>
      <RoomFire layer="back" />
      <Stove />
      <g className="cook-pan">
        <PaintedProp name="stir-wok" x={91} y={35} width={294} height={226} />
        <g className="cook-pan-ingredients">
          <PaintedProp name="stir-food" x={151} y={131} width={169} height={106} />
        </g>
        {stirPieces.map(({ asset, x, y, size, dx, rise, turn }) => (
          <g
            key={asset}
            className="cook-toss"
            style={{
              "--stir-toss-x": `${dx}px`,
              "--stir-toss-y": `${-rise}px`,
              "--stir-toss-turn": `${turn}deg`,
            } as CSSProperties}
          >
            <PaintedProp name={asset} x={x} y={y} width={size} height={size} />
          </g>
        ))}
        <g className="cook-oil-bubbles" fill="none" stroke="#ffdfa5" strokeWidth=".85" opacity=".64">
          <ellipse cx="171" cy="208" rx="3.2" ry="1.9" /><ellipse cx="187" cy="221" rx="2" ry="1.15" />
          <ellipse cx="249" cy="223" rx="3.15" ry="1.7" /><ellipse cx="295" cy="210" rx="2.4" ry="1.5" />
        </g>
      </g>
      <g className="cook-spatula">
        <PaintedProp name="stir-hand-spatula" x={158} y={-13} width={205} height={205} />
      </g>
      <g className="cook-bottle">
        <defs>
          <clipPath id={oilClip}>
            <rect className="cook-oil-reveal" x="267" y="107" width="55" height="108" />
          </clipPath>
        </defs>
        <g className="cook-oil" clipPath={`url(#${oilClip})`}>
          <PaintedProp name="stir-oil-stream" x={271} y={109} width={46} height={107} />
        </g>
        <PaintedProp name="stir-oil-bottle" x={302} y={1} width={119} height={118} />
      </g>
      <g className="cook-oil-ripples" fill="none" stroke="#ffe9ad" strokeWidth="1.15" strokeLinecap="round">
        <path d="M273 216q7-4 15-1m-12 4q8 3 15-1m-20 4 4 1m17-10 3 1" />
      </g>
      <Flames />
      <RoomFire layer="front" />
    </>
  );
}


const overflowSheet = "M159 147c9 4 13 5 24 9 12 5 16 6 32 9 10 3 18 4 28 4-1 7-4 10-10 11-2 21-6 43-10 50-3 5-5 2-4-5 0-11 5-32 2-36-5-5-9 1-10 13-2 14-6 19-10 17-5-3 1-11 1-25 0-5-2-10-7-10-5 0-7 13-8 27-1 13 2 32-6 36-5 3-7-4-5-15 0-13 1-19-2-25-4-5-3-19-1-28 1-9-6-14-10-18-5-4-6-9-4-14z";

function BoilOverflow() {
  const id = useId();
  const colors = `${id}-broth`;
  const shape = `${id}-sheet`;
  const reveal = `${id}-reveal`;

  return (
    <>
      <defs>
        <linearGradient id={colors} x1="0" y1="0" x2=".55" y2="1">
          <stop stopColor="#faecc2" stopOpacity=".94" />
          <stop offset=".36" stopColor="#e7c081" stopOpacity=".85" />
          <stop offset="1" stopColor="#c59252" stopOpacity=".64" />
        </linearGradient>
        <clipPath id={shape}><path d={overflowSheet} /></clipPath>
        <clipPath id={reveal}>
          <rect className="cook-overflow-reveal" x="151" y="143" width="105" height="116" />
        </clipPath>
      </defs>

      <g className="cook-overflow-pool">
        <path d="M175 245q13 1 20 6 9 4 6 8-4 5-19 5-3 3-12 3-7 5-26 2-21 1-31-4-5-4 7-8 10-3 27-4 14-3 28-8z" fill="#82522d" opacity=".23" />
        <path d="M175 246q12 0 18 5 8 2 5 6-4 5-17 5-10 5-23 4-12 3-25 0-16 0-19-5 0-4 16-6l19-4q15-1 26-5z" fill={`url(#${colors})`} />
        <path d="M130 257q15-2 25-4m8 10q11 0 21-4m-64 2q3 2 9 2" fill="none" stroke="#f8e4b8" strokeWidth="1.5" opacity=".79" strokeLinecap="round" />
        <ellipse cx="107" cy="265" rx="3.4" ry="1.3" fill="#f4d3a0" opacity=".62" />
      </g>

      <g className="cook-overflow">
        <g clipPath={`url(#${reveal})`}>
          <path d={overflowSheet} fill={`url(#${colors})`} />
          <g clipPath={`url(#${shape})`} opacity=".52">
            <image href={`${artPath}/boil-overflow.webp`} x="154" y="133" width="91" height="123" preserveAspectRatio="none" />
          </g>
          <g fill="none" stroke="#fff1ce" strokeWidth="1.6" strokeLinecap="round" opacity=".81">
            <path d="M171 164c14 11 3 28 9 42s0 25 1 36" />
            <path d="M197 174c14 7 3 21 7 35" />
            <path d="M224 180c6 4 1 18-1 29" />
            <path className="cook-overflow-current" pathLength="100" d="M173 165c12 12 4 27 9 39s-2 28 0 47" />
            <path className="cook-overflow-current cook-overflow-current-late" pathLength="100" d="M196 173c13 10 6 19 7 32s-8 30-7 47" />
          </g>
        </g>
        <path
          d="M154 138q9 8 18 8 7 7 17 6 13 9 25 8 11 3 20 4 12 2 22 0-5 8-17 10-15 2-26-2-16 0-27-6-19-4-28-16-4-5-4-12z"
          fill="#f6deb0"
          fillOpacity=".83"
        />
        <path d="M156 143q7 9 18 11 11 8 24 9m8 4q14 3 23 3m7 0 8-1" fill="none" stroke="#fff3d7" strokeWidth="1.9" strokeLinecap="round" opacity=".89" />
        <g fill="#fff3cf" opacity=".85">
          <circle cx="170" cy="152" r="2" /><circle cx="178" cy="157" r="1.4" />
          <circle cx="188" cy="159" r="1.3" /><circle cx="207" cy="165" r="1.7" />
          <circle cx="228" cy="168" r="1.35" />
        </g>
      </g>
    </>
  );
}

const roomFlames = {
  back: [
    { x: -74, y: -53, width: 238, height: 183, lean: -7, delay: -90 },
    { x: 39, y: -8, width: 194, height: 150, lean: 9, delay: -215 },
    { x: 145, y: -44, width: 207, height: 159, lean: -10, delay: -305 },
    { x: 273, y: -41, width: 224, height: 172, lean: 8, delay: -130 },
    { x: 353, y: 17, width: 190, height: 146, lean: -11, delay: -240 },
  ],
  front: [
    { x: -99, y: 108, width: 239, height: 184, lean: -8, delay: -150 },
    { x: -16, y: 158, width: 221, height: 170, lean: 12, delay: -310 },
    { x: 62, y: 132, width: 241, height: 185, lean: -9, delay: -50 },
    { x: 150, y: 163, width: 254, height: 195, lean: 11, delay: -250 },
    { x: 252, y: 118, width: 244, height: 188, lean: -12, delay: -190 },
    { x: 357, y: 149, width: 206, height: 158, lean: 8, delay: -85 },
  ],
};

function RoomFire({ layer }: { layer: keyof typeof roomFlames }) {
  const lightId = useId();

  return (
    <g className={`cook-room-fire cook-room-fire-${layer}`}>
      {layer === "back" && (
        <>
          <defs>
            <radialGradient id={lightId} cx=".52" cy=".76" r=".83">
              <stop stopColor="#ffcc76" stopOpacity=".65" />
              <stop offset=".61" stopColor="#ef773b" stopOpacity=".48" />
              <stop offset="1" stopColor="#9d3a21" stopOpacity=".32" />
            </radialGradient>
          </defs>
          <rect className="cook-room-fire-light" width="480" height="340" fill={`url(#${lightId})`} />
        </>
      )}
      {roomFlames[layer].map(({ x, y, width, height, lean, delay }) => (
        <g
          key={x}
          className="cook-room-flame"
          style={{ "--room-flame-lean": `${lean}deg`, "--room-flame-cycle": `${430 + Math.abs(delay) / 2}ms`, animationDelay: `${delay}ms` } as CSSProperties}
        >
          <g transform={lean < 0 ? `translate(${2 * x + width} 0) scale(-1 1)` : undefined}>
            <PaintedProp name="flare-flame" x={x} y={y} width={width} height={height} />
          </g>
        </g>
      ))}
    </g>
  );
}

function PressureLid() {
  return <PaintedProp name="pressure-blue-lid" x={162} y={73} width={231} height={94} />;
}

function PressureSteamJets() {
  const steamId = useId();
  const outlets = [
    { x: 201, y: 99, angle: 211, cycle: 570, phase: -170 },
    { x: 255, y: 90, angle: -36, cycle: 505, phase: -315 },
  ];

  return (
    <g className="cook-pressure-steam">
      <defs>
        <linearGradient id={steamId}>
          <stop stopColor="#fff8e0" stopOpacity=".95" />
          <stop offset=".6" stopColor="#fff8e0" stopOpacity=".69" />
          <stop offset="1" stopColor="#fff8e0" stopOpacity=".16" />
        </linearGradient>
      </defs>
      {outlets.map(({ x, y, angle, cycle, phase }) => (
        <g
          key={x}
          transform={`translate(${x} ${y}) rotate(${angle})`}
          style={{ "--pressure-jet-cycle": `${cycle}ms`, "--pressure-jet-phase": `${phase}ms` } as CSSProperties}
        >
          <g className="cook-pressure-jet-stream" fill={`url(#${steamId})`}>
            <path d="M0 0Q15-6 40-9L47-5Q20-4 0 0ZM0 1Q19-1 48 1L45 5Q17 2 0 1ZM0 2Q19 4 42 10L37 13Q17 7 0 2Z" />
          </g>
          <g className="cook-pressure-jet-puff">
            <PaintedProp name="pressure-burst" x={34} y={-22} width={58} height={40} />
          </g>
        </g>
      ))}
    </g>
  );
}

function PressureCooker() {
  return (
    <>
      <BurnerFlame />
      <g className="cook-pressure-body">
        <PaintedProp name="pressure-blue-pot" x={129} y={97} width={271} height={155} />
        <g className="cook-pressure-lid-rest">
          <PressureLid />
          <PressureSteamJets />
        </g>
      </g>
      <g className="cook-pressure-burst">
        <PaintedProp name="pressure-burst" x={74} y={92} width={332} height={166} />
      </g>
      <g className="cook-pressure-lid-flight"><PressureLid /></g>
    </>
  );
}

const glassFractures = [
  "M246 166C225 150 202 132 178 112L158 92 141 84 106 55 69 29 26-5",
  "M246 166Q238 148 233 130L220 105 215 84 206 58 201 40 194 23 187-5",
  "M246 166Q252 139 256 112L254 87 259 64 262 37 274 16 279-4",
  "M246 166L258 150 276 129 289 116 304 97 320 78 334 59 361 25 380-2",
  "M246 166Q272 153 291 139L309 125 322 119 342 100 361 93 392 72 423 59 482 35",
  "M246 166C278 164 302 156 326 151L347 145 370 140 392 133 426 130 481 116",
  "M246 166C274 188 310 224 336 256S379 316 401 342",
  "M246 166Q234 192 223 224L217 255 215 282 206 301 205 324 201 342",
  "M246 166Q216 195 193 211L169 222 147 243Q88 290 29 295L-2 292",
  "M246 166L218 175 193 190 175 191 157 198 142 191 129 193Q68 204-2 201",
  "M246 166Q215 158 192 153L165 153 132 145 98 144 64 138-2 135",
];

const glassHairlines = [
  "M246 166L239 161 244 158 241 151 235 149m12 18 6 5 9 2m-16-7-6 7-2 9",
  "M221 105l3-11-5-11M201 40l-2 16 7 12M158 92l-8-21-9-6",
  "M259 64l8-12-3-8m12-29-4 21 16 22 15 13m-14 45 2-13",
  "M342 100l-1-17 9-19m-8 36 10 17 4 26m5-50 8-17 17-11",
  "M392 133q3 16-26 35l-29 28-20 38m53-94-2-15 12-9",
  "M215 282l14 6 13 15 8 22 7 15m-40-85-12-12 1-11",
  "M169 222l-17-13-15-21-7 5m63 18-17-14-1-6",
  "M193 190l-12-12-15-2-16-10m15-13-12-9m-36-1-14-13",
];

const glassSplits = [
  "M239 161l-14-12-18-15 17 17 11 8 4 3z",
  "M194 21l8 20 5 20-3-7-4-13-5-14z",
  "M274 16l1 14-8 16-3 15-1-5 3-12 6-15z",
  "M259 151l17-22 13-11-3 4-10 10-11 14z",
  "M309 125l12-8 14-13 12-6-10 8-13 11-11 7z",
  "M342 100l10 11 2 12 4 15-3-3-3-11-1-12z",
  "M389 133l7-4 16-2-10 4-8 2-5 12-1-1z",
  "M236 179l-17 17-6 17-2 1 5-17z",
  "M126 194l12-5 6 3 7 10 11 10 7 6-6-2-12-11-7-9-6-4z",
  "M29 295q-20 1-31-2v-1l31 1 21-4z",
  "M213 285l6-1 7 2 4 4-8-3-8 1z",
  "M248 318l6 5 4 16h-2l-4-14z",
];

const glassFacets = [
  { path: "M246 166C225 150 202 132 178 112L158 92 141 84 106 55 69 29 26-5H185l9 28 7 17 5 18 9 26 5 21 13 25Q238 148 246 166z", dx: -3, dy: 2, tint: "#abbcc3" },
  { path: "M246 166Q272 153 291 139L309 125 322 119 342 100 361 93 392 72 423 59 482 35v81l-56 14-34 3-22 7-23 5-21 6Q285 164 246 166z", dx: 3, dy: -2, tint: "#dbeef0" },
  { path: "M246 166C274 188 310 224 336 256S379 316 401 342H201l4-18 1-23 9-19 2-27 6-31Q234 192 246 166z", dx: -2, dy: 3, tint: "#7d8992" },
  { path: "M246 166L218 175 193 190 175 191 157 198 142 191 129 193Q68 204-2 201v91l31 3Q88 290 147 243l22-21 24-11Q216 195 246 166z", dx: 3, dy: 3, tint: "#c3ced0" },
];

const glassChips = [
  { path: "M244 162l3-3 2 5-4 4z", dx: -30, dy: -20 },
  { path: "M248 158l5 2-2 5-3-2z", dx: 33, dy: -31 },
  { path: "M242 167l5-1-2 5-4-1z", dx: -51, dy: 21 },
  { path: "M249 167l4 2-2 4-3-2z", dx: 47, dy: 16 },
  { path: "M238 163l3-2 2 4-2 2z", dx: -12, dy: 43 },
  { path: "M245 172l4-2 2 3-5 2z", dx: 21, dy: 34 },
];

function PressureImpact({ sceneId }: { sceneId: string }) {
  const glassId = useId();
  const chipId = `${glassId}-chip`;

  return (
    <g className="cook-pressure-impact" fill="none">
      <defs>
        <radialGradient id={chipId}>
          <stop stopColor="#fffdf5" stopOpacity=".89" />
          <stop offset=".63" stopColor="#e7eff0" stopOpacity=".48" />
          <stop offset="1" stopColor="#d8e7e9" stopOpacity="0" />
        </radialGradient>
        {glassFacets.map(({ path }, index) => (
          <clipPath key={path} id={`${glassId}-facet-${index}`}><path d={path} /></clipPath>
        ))}
      </defs>
      <g className="cook-glass-facets">
        {glassFacets.map(({ path, dx, dy, tint }, index) => (
          <g key={path} clipPath={`url(#${glassId}-facet-${index})`}>
            <g className="cook-camera">
              <use href={`#${sceneId}`} transform={`translate(${dx} ${dy})`} opacity=".66" />
            </g>
            <path d={path} fill={tint} opacity=".14" />
          </g>
        ))}
      </g>
      <g transform="translate(.35 .48)" stroke="#282826" strokeOpacity=".78" strokeWidth=".92" strokeLinejoin="round">
        {glassFractures.map((d) => <path className="cook-glass-line" key={d} d={d} pathLength="100" />)}
      </g>
      <g stroke="#edf2ef" strokeWidth=".5" strokeLinejoin="round">
        {glassFractures.map((d, index) => <path className="cook-glass-line" key={d} d={d} pathLength="100" opacity={index % 3 === 0 ? ".68" : ".48"} />)}
      </g>
      <g className="cook-glass-splits" fill="#211e1b" fillOpacity=".67">
        {glassSplits.map((d) => <path key={d} d={d} />)}
      </g>
      <g stroke="#f1f3e9" strokeWidth=".45" strokeOpacity=".5" strokeLinejoin="round">
        {glassHairlines.map((d) => <path className="cook-glass-hairline" key={d} d={d} pathLength="100" />)}
      </g>
      <g className="cook-glass-chip">
        <path d="M247 151l4 5 8-1 1 8 5 4-6 5-2 9-7-2-6 5-5-5-8-1-1-7-5-5 8-5 1-6 9 2z" fill={`url(#${chipId})`} />
        <path d="M245 157l5 2 4 5-3 3 2 4-7 1-3 4-5-5 2-6-3-2 5-2z" fill="#3c3b37" fillOpacity=".76" stroke="#f5efe0" strokeWidth=".8" transform="translate(246 166) scale(.68) translate(-246 -166)" />
        <path d="M238 159l4 2-3 4m7-5 1 3-2 2m9 1 2 2-2 4m-13 0 3 1 2-2m-13-2 3 2-1 3m10-19 2 3m13 8 2 1m-6 10 1 2m-23-16 2 1" stroke="#fcf8e8" strokeWidth=".75" strokeLinecap="round" />
      </g>
      <g className="cook-glass-chips" fill="#f5f1db" fillOpacity=".56" stroke="#f8f8e9" strokeWidth=".43" strokeOpacity=".8">
        {glassChips.map(({ path, dx, dy }) => (
          <path
            className="cook-glass-fleck"
            key={path}
            d={path}
            style={{ "--glass-chip-x": `${dx}px`, "--glass-chip-y": `${dy}px` } as CSSProperties}
          />
        ))}
      </g>
    </g>
  );
}

function SoupPot() {
  const glowId = useId();

  return (
    <>
      <RoomFire layer="back" />
      <Stove />
      <PaintedProp name="soup-pot" x={119} y={65} width={242} height={190} />
      <g className="cook-boil-bubbles" fill="#fff1c9" fillOpacity=".25" stroke="#fff1cf" strokeWidth="1.4">
        <circle cx="185" cy="142" r="4.4" /><circle cx="217" cy="130" r="6" />
        <circle cx="254" cy="150" r="5.7" /><circle cx="285" cy="133" r="4" />
      </g>
      <g className="cook-steam" fill="none" stroke="#fcf4db" strokeWidth="6" strokeLinecap="round" opacity=".79">
        <path d="M200 131q-15-17 0-31t-1-24m41 41q17-18 3-30t-1-22m40 62q-15-16-2-29t1-21" />
      </g>
      <BoilOverflow />
      <defs>
        <radialGradient id={glowId}>
          <stop stopColor="#ffdf9b" stopOpacity=".67" />
          <stop offset=".56" stopColor="#fac47f" stopOpacity=".26" />
          <stop offset="1" stopColor="#fac47f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="cook-glow" cx="240" cy="206" rx="172" ry="144" fill={`url(#${glowId})`} />
      <Flames />
      <RoomFire layer="front" />
    </>
  );
}

const grillSmokeRows = [-12, 72, 155, 239, 332];
const grillSmokeColumns = [-5, 91, 186, 282, 378, 474];

function DenseGrillSmoke() {
  return (
    <g className="cook-grill-smoke-dense">
      {grillSmokeRows.map((y, row) => (
        <g key={y} className="cook-grill-smoke-roll" style={{ "--smoke-drift": row % 2 ? "20px" : "-20px" } as CSSProperties}>
          {grillSmokeColumns.map((x, column) => (
            <image
              key={x}
              href={`${artPath}/grill-smoke.webp`}
              x={x - 230 + (row % 2 ? 13 : 0)}
              y={y - 174 + (column % 2 ? 14 : 0)}
              width="470"
              height="370"
              preserveAspectRatio="none"
              transform={`rotate(${(row + column) % 2 ? 19 : -17} ${x} ${y})`}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function Grill() {
  return (
    <>
      <ellipse cx="240" cy="276" rx="116" ry="15" fill="#684b32" opacity=".29" />
      <PaintedProp name="grill" x={139} y={87} width={202} height={191} />
      <g className="cook-coals" fill="#eda252" opacity=".32">
        <ellipse cx="208" cy="164" rx="6" ry="2" /><ellipse cx="232" cy="174" rx="5" ry="2" />
        <ellipse cx="268" cy="168" rx="5" ry="1.8" />
      </g>
      <g className="cook-skewers">
        <PaintedProp name="grill-skewers" x={158} y={112} width={164} height={72} />
      </g>
      <g className="cook-grill-smoke">
        <PaintedProp name="grill-smoke" x={164} y={-6} width={149} height={177} />
      </g>
      <g className="cook-grill-smoke-drift">
        <PaintedProp name="grill-smoke" x={159} y={3} width={163} height={181} />
      </g>
      <g className="cook-grill-smoke-bank">
        <image href={`${artPath}/grill-smoke.webp`} x="39" y="20" width="402" height="243" preserveAspectRatio="none" />
      </g>
      <DenseGrillSmoke />
    </>
  );
}

function MixVegetables({ scattered = false }: { scattered?: boolean }) {
  return mixVegetables.map(({ asset, x, y, size, dx, dy }, index) => (
    <g
      key={asset}
      className={scattered ? "cook-scatter-piece" : undefined}
      style={{ "--piece-x": `${dx}px`, "--piece-y": `${dy}px`, "--piece-turn": `${dx * 2}deg` } as CSSProperties}
    >
      <g transform={`rotate(${index % 2 ? -16 : 19} ${x} ${y})`}>
        <PaintedProp name={asset} x={x - size / 2} y={y - size / 2} width={size} height={size} />
      </g>
    </g>
  ));
}

function Mix() {
  return (
    <>
      <ellipse cx="240" cy="268" rx="112" ry="15" fill="#775030" opacity=".28" />
      <g className="cook-mix-bowl">
        <PaintedProp name="mixing-bowl" x={112} y={80} width={256} height={193} />
        <g className="cook-mix-food"><MixVegetables /></g>
      </g>
      <g className="cook-mix-hand cook-mix-hand-left">
        <PaintedProp name="mix-hand" x={28} y={38} width={190} height={151} />
      </g>
      <g className="cook-mix-hand cook-mix-hand-right">
        <g transform="translate(480 12) scale(-1 1)">
          <PaintedProp name="mix-hand" x={28} y={38} width={190} height={151} />
        </g>
      </g>
      <MixVegetables scattered />
    </>
  );
}


export function CookingScene({ kind, onComplete }: { kind: CookingKind; onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  const sceneId = useId();

  useEffect(() => {
    let active = true;
    const assets = ["kitchen", ...sceneProps[kind]];
    void Promise.allSettled(assets.map((asset) => {
      const image = new window.Image();
      image.src = `${artPath}/${asset}.webp`;
      return image.decode();
    })).then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, [kind]);

  function finish(event: AnimationEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onComplete();
  }

  return (
    <figure
      data-cooking-scene={ready ? kind : undefined}
      aria-busy={!ready}
      className="cooking-scene relative mx-auto w-full max-w-[31rem] overflow-hidden rounded-3xl border border-[#30483a] bg-[#46362b] text-[#fff1d8] shadow-xl"
    >
      {ready ? (
        <svg viewBox="0 0 480 340" className="block w-full overflow-hidden" aria-hidden="true">
          <g className="cook-camera">
            <g id={sceneId}>
              <rect width="480" height="340" fill="#d5ac7e" />
              <image href={`${artPath}/kitchen.webp`} width="480" height="340" preserveAspectRatio="xMidYMid slice" />
              {kind === "pressure" && <StoveBase />}
            </g>
            {kind === "pan" && <Pan />}
            {kind === "pressure" && <PressureCooker />}
            {kind === "boil" && <SoupPot />}
            {kind === "grill" && <Grill />}
            {kind === "mix" && <Mix />}
          </g>
          {kind === "pressure" && <PressureImpact sceneId={sceneId} />}
        </svg>
      ) : (
        <div className="grid aspect-[24/17] place-items-center bg-[#ede0c7] text-sm text-[#694d38]" role="status">
          Đang tải hoạt cảnh…
        </div>
      )}
      <figcaption className="border-t border-white/10 px-4 py-3 text-sm font-medium">
        Đang nấu món vừa quay…
      </figcaption>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
        {ready && <div className="cook-timeline h-full origin-left bg-[#b77d45]" onAnimationEnd={finish} />}
      </div>
    </figure>
  );
}
