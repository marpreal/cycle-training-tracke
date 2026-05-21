"use client";

import type { ReactNode } from "react";

// Custom SVG diagrams for this posture/back routine. They are based on common
// coaching references for each movement, instead of reusing mismatched generic
// weight-training diagrams.

const A = "#ec4899";
const G = "#d1d5db";
const D = "#374151";
const B = "#0ea5e9";
const SW = 2.5;

function ExerciseDiagram({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 180 120"
      width="180"
      height="120"
      role="img"
      aria-label={label}
      style={{ maxWidth: "100%" }}
    >
      <rect x="2" y="2" width="176" height="116" rx="14" fill="#fff7fb" />
      {children}
    </svg>
  );
}

function SvgBreathing9090() {
  return (
    <ExerciseDiagram label="Respiración 90/90 con pies en la pared y rodillas a 90 grados">
      <line x1="18" y1="95" x2="164" y2="95" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <line x1="154" y1="20" x2="154" y2="96" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <circle cx="42" cy="82" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <line x1="51" y1="86" x2="93" y2="86" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="92" y1="86" x2="105" y2="58" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="105" y1="58" x2="146" y2="58" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="146" y1="52" x2="146" y2="66" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <path d="M62 78 C72 66, 88 66, 97 79" fill="none" stroke={A} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M69 73 C73 68, 80 68, 84 73" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">costillas abajo · lumbar apoyada</text>
    </ExerciseDiagram>
  );
}

function SvgChinTuck() {
  return (
    <ExerciseDiagram label="Chin tuck llevando suavemente la nuca hacia atrás">
      <line x1="78" y1="22" x2="78" y2="98" stroke={G} strokeWidth="4" strokeLinecap="round" />
      <circle cx="80" cy="42" r="13" fill="none" stroke={A} strokeWidth={SW} />
      <line x1="80" y1="55" x2="80" y2="78" stroke={A} strokeWidth={SW} strokeLinecap="round" />
      <line x1="60" y1="78" x2="100" y2="78" stroke={A} strokeWidth={SW} strokeLinecap="round" />
      <circle cx="116" cy="39" r="13" fill="none" stroke={G} strokeWidth="1.8" strokeDasharray="4 3" />
      <path d="M110 42 H96" fill="none" stroke={A} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M99 37 L94 42 L99 47" fill="none" stroke={A} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="90" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">nuca atrás · mirada al frente</text>
    </ExerciseDiagram>
  );
}

function SvgThoracicTowel() {
  return (
    <ExerciseDiagram label="Extensión torácica tumbada sobre una toalla enrollada">
      <line x1="18" y1="91" x2="164" y2="91" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="88" cy="89" rx="10" ry="7" fill="#f9a8d4" stroke={A} strokeWidth="2" />
      <circle cx="47" cy="78" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <path d="M56 82 C70 82, 84 76, 99 83" fill="none" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="98" y1="83" x2="115" y2="66" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="115" y1="66" x2="137" y2="90" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <path d="M68 79 C55 63, 49 50, 41 35" fill="none" stroke={A} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M73 80 C82 62, 90 49, 103 35" fill="none" stroke={A} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M70 66 C79 57, 87 55, 96 58" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">toalla bajo espalda alta</text>
    </ExerciseDiagram>
  );
}

function SvgWallSlides() {
  return (
    <ExerciseDiagram label="Wall slide con espalda en la pared y brazos en portería">
      <line x1="92" y1="18" x2="92" y2="98" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <circle cx="92" cy="35" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <line x1="92" y1="44" x2="92" y2="82" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="82" y1="83" x2="102" y2="83" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <path d="M62 62 H76 V83" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M122 62 H108 V83" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 58 C74 41, 81 30, 90 24" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M118 58 C110 41, 103 30, 94 24" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M64 54 V43" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" />
      <path d="M59 47 L64 41 L69 47" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">costillas abajo · sin arquear</text>
    </ExerciseDiagram>
  );
}

function SvgWallPushupPlus() {
  return (
    <ExerciseDiagram label="Push-up plus en pared con brazos estirados y escápulas separándose">
      <line x1="136" y1="20" x2="136" y2="98" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="43" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <line x1="67" y1="50" x2="88" y2="78" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="86" y1="78" x2="72" y2="98" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="88" y1="78" x2="101" y2="98" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="75" y1="55" x2="132" y2="55" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="79" y1="64" x2="132" y2="64" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M82 48 C95 39, 110 39, 123 47" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M91 48 H105" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" />
      <path d="M101 43 L107 48 L101 53" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">empuja pared · escápulas separan</text>
    </ExerciseDiagram>
  );
}

function SvgYtw() {
  return (
    <ExerciseDiagram label="Y-T-W en el suelo boca abajo con tres posiciones de brazos">
      {[
        { x: 45, letter: "Y", arms: "M37 50 L27 32 M53 50 L63 32" },
        { x: 90, letter: "T", arms: "M82 51 H62 M98 51 H118" },
        { x: 135, letter: "W", arms: "M127 52 L117 42 L112 55 M143 52 L153 42 L158 55" },
      ].map((pose) => (
        <g key={pose.letter}>
          <circle cx={pose.x} cy="39" r="6" fill="none" stroke={D} strokeWidth="2" />
          <line x1={pose.x} y1="46" x2={pose.x} y2="82" stroke={D} strokeWidth="2.2" strokeLinecap="round" />
          <line x1={pose.x - 8} y1="84" x2={pose.x + 8} y2="84" stroke={D} strokeWidth="2.2" strokeLinecap="round" />
          <path d={pose.arms} fill="none" stroke={A} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x={pose.x} y="102" textAnchor="middle" fontSize="13" fontWeight="700" fill={A}>{pose.letter}</text>
        </g>
      ))}
      <text x="91" y="113" textAnchor="middle" fontSize="9" fill="#9ca3af">poca altura · hombros lejos de orejas</text>
    </ExerciseDiagram>
  );
}

function SvgBandPullApart() {
  return (
    <ExerciseDiagram label="Band pull-apart con brazos rectos abriendo la banda a la altura del pecho">
      <circle cx="90" cy="34" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <line x1="90" y1="43" x2="90" y2="82" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="78" y1="84" x2="102" y2="84" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="48" y1="57" x2="132" y2="57" stroke={B} strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="57" x2="48" y2="57" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="90" y1="57" x2="132" y2="57" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="69" y1="57" x2="111" y2="57" stroke={G} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M70 50 H58 M110 50 H122" stroke={A} strokeWidth="2" strokeLinecap="round" />
      <path d="M62 45 L55 50 L62 55 M118 45 L125 50 L118 55" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">banda al pecho · brazos largos</text>
    </ExerciseDiagram>
  );
}

function SvgFacePull() {
  return (
    <ExerciseDiagram label="Face pull con banda anclada a la altura de la cara y codos altos">
      <circle cx="31" cy="46" r="5" fill="#f9a8d4" stroke={A} strokeWidth="2" />
      <line x1="31" y1="23" x2="31" y2="96" stroke={G} strokeWidth="4" strokeLinecap="round" />
      <circle cx="133" cy="47" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <line x1="133" y1="56" x2="133" y2="88" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="121" y1="89" x2="145" y2="89" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="31" y1="46" x2="113" y2="40" stroke={B} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="31" y1="46" x2="113" y2="55" stroke={B} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M113 40 L101 50 L116 59" fill="none" stroke={A} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M153 40 L165 50 L150 59" fill="none" stroke={A} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M101 50 H85" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">tira a la cara · codos altos</text>
    </ExerciseDiagram>
  );
}

function SvgBandRow() {
  return (
    <ExerciseDiagram label="Remo con banda sentado, espalda neutra y codos hacia atrás">
      <line x1="20" y1="94" x2="160" y2="94" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <circle cx="78" cy="43" r="9" fill="none" stroke={D} strokeWidth={SW} />
      <line x1="80" y1="52" x2="89" y2="79" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="89" y1="79" x2="59" y2="94" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="91" y1="80" x2="136" y2="92" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="135" y1="87" x2="147" y2="97" stroke={D} strokeWidth={SW} strokeLinecap="round" />
      <line x1="135" y1="92" x2="95" y2="64" stroke={B} strokeWidth="2.3" strokeLinecap="round" />
      <line x1="135" y1="92" x2="104" y2="70" stroke={B} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M95 64 C84 62, 77 58, 72 52" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M104 70 C91 74, 78 72, 70 66" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M110 58 H97" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" />
      <path d="M101 53 L95 58 L101 63" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="91" y="109" textAnchor="middle" fontSize="10" fill="#9ca3af">pecho alto · codos atrás</text>
    </ExerciseDiagram>
  );
}

function ExerciseImage({ id }: { id: number }) {
  if (id === 1) return <SvgBreathing9090 />;
  if (id === 2) return <SvgChinTuck />;
  if (id === 3) return <SvgThoracicTowel />;
  if (id === 4) return <SvgWallSlides />;
  if (id === 5) return <SvgWallPushupPlus />;
  if (id === 6) return <SvgYtw />;
  if (id === 7) return <SvgBandPullApart />;
  if (id === 8) return <SvgFacePull />;
  if (id === 9) return <SvgBandRow />;

  return null;
}

interface Exercise {
  id: number;
  name: string;
  dosage: string;
  instructions: string[];
  cues: string;
}

const bloque1: Exercise[] = [
  {
    id: 1,
    name: "Respiración 90/90",
    dosage: "2 minutos",
    instructions: [
      "Túmbate boca arriba, pies en silla o pared, rodillas a 90°.",
      "Exhala largo, nota cómo bajan las costillas.",
      "La espalda alta debe sentirse apoyada.",
    ],
    cues: "No saques pecho. No arquees lumbar.",
  },
  {
    id: 2,
    name: "Chin tucks",
    dosage: "2 series · 10 repeticiones",
    instructions: [
      "Contra la pared o tumbada.",
      'Haz una "papada" suave llevando la nuca hacia atrás.',
    ],
    cues: "Movimiento pequeño. No mires hacia arriba.",
  },
  {
    id: 3,
    name: "Extensión torácica con toalla",
    dosage: "2 minutos",
    instructions: [
      "Enrolla una toalla y colócala bajo la parte alta/media de la espalda.",
      "Abre brazos y respira.",
    ],
    cues: "Debe abrir espalda alta/pecho. No fuerces cuello ni lumbar.",
  },
];

const bloque2: Exercise[] = [
  {
    id: 4,
    name: "Wall slides",
    dosage: "2 series · 8-12 repeticiones",
    instructions: [
      "Espalda contra pared, costillas abajo, barbilla suave hacia atrás.",
      'Sube y baja brazos en forma de "portería".',
    ],
    cues: "Si arqueas la espalda, baja el rango.",
  },
  {
    id: 5,
    name: "Push-up plus en pared",
    dosage: "2 series · 12-15 repeticiones",
    instructions: [
      "Manos en la pared, brazos estirados.",
      "Empuja la pared separando escápulas y vuelve controlado.",
    ],
    cues: "No dobles codos. El movimiento sale de las escápulas.",
  },
  {
    id: 6,
    name: "Y-T-W en el suelo",
    dosage: "2 rondas · 8 reps cada posición",
    instructions: [
      "Túmbate boca abajo.",
      "Y: brazos en diagonal arriba.",
      "T: brazos en cruz.",
      "W: codos doblados.",
    ],
    cues: "Levanta poco. Hombros lejos de orejas. No busques altura; busca control.",
  },
];

const bloque3: Exercise[] = [
  {
    id: 7,
    name: "Band pull-aparts",
    dosage: "3 series · 15-25 repeticiones",
    instructions: [
      "Banda al ancho de hombros.",
      "Abre los brazos hasta que la banda llegue al pecho.",
    ],
    cues: "No subas hombros. Piensa en abrir clavículas.",
  },
  {
    id: 8,
    name: "Face pulls con banda",
    dosage: "3 series · 15-20 repeticiones",
    instructions: [
      "Ancla la banda a una puerta a la altura de la cara.",
      "Tira hacia la cara con codos altos.",
    ],
    cues: "Al final, aprieta suave entre escápulas, sin encoger trapecios.",
  },
  {
    id: 9,
    name: "Remo con banda",
    dosage: "3 series · 12-20 repeticiones",
    instructions: [
      "Pisa la banda o ancla delante.",
      "Tira llevando codos hacia atrás y un poco hacia abajo.",
    ],
    cues: "Pausa 1 segundo atrás. Siente espalda media, no cuello.",
  },
];

function ExerciseCard({ ex }: { ex: Exercise }) {
  return (
    <article className="card flex flex-col gap-3">
      <div
        style={{
          background: "#fdf2f8",
          borderRadius: "0.75rem",
          padding: "0.75rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "110px",
        }}
      >
        <ExerciseImage id={ex.id} />
      </div>
      <div>
        <h4 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>{ex.name}</h4>
        <p
          style={{
            display: "inline-block",
            background: "linear-gradient(145deg,#ec4899,#db2777)",
            color: "#fff",
            borderRadius: "999px",
            padding: "0.15rem 0.6rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          {ex.dosage}
        </p>
        <ul style={{ paddingLeft: "1.1rem", fontSize: "0.875rem", lineHeight: "1.5" }}>
          {ex.instructions.map((ins, i) => (
            <li key={i}>{ins}</li>
          ))}
        </ul>
        <p
          style={{
            marginTop: "0.5rem",
            borderLeft: "3px solid #ec4899",
            paddingLeft: "0.6rem",
            fontSize: "0.82rem",
            color: "var(--muted)",
            fontStyle: "italic",
          }}
        >
          {ex.cues}
        </p>
      </div>
    </article>
  );
}

export function EspaldaView() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto" }} className="flex flex-col gap-8">
      <article className="card">
        <p className="eyebrow">Rutina de espalda</p>
        <h2 className="title" style={{ fontSize: "1.5rem" }}>
          Puesta a punto de espalda
        </h2>
        <p className="muted text-sm" style={{ marginTop: "0.25rem" }}>
          Rutina principal: 20-25 min · Mini rutina diaria: 5 min
        </p>
        <div className="phase-description" style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
          Cue durante el día:{" "}
          <strong>nuca larga, costillas abajo, hombros pesados, clavículas anchas</strong>.{" "}
          No aprietes los omóplatos todo el día.
        </div>
      </article>

      <section>
        <h3 className="section-title">Bloque 1 · Recolocar caja torácica y cuello</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bloque1.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="section-title">Bloque 2 · Escápulas y hombros</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bloque2.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="section-title">Bloque 3 · Fuerza con banda</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bloque3.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} />
          ))}
        </div>
      </section>

      <article className="card">
        <h3 className="section-title">Mini rutina diaria · 5 minutos</h3>
        <p className="muted text-sm" style={{ marginBottom: "0.75rem" }}>
          Hazla todos los días, incluso los que no entrenes.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { name: "Respiración 90/90", dosage: "1 min" },
            { name: "Chin tucks", dosage: "10 reps" },
            { name: "Wall slides", dosage: "10 reps" },
            { name: "Push-up plus pared", dosage: "12 reps" },
            { name: "Estiramiento de pectoral en puerta", dosage: "40 s por lado" },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                background: "#fafafa",
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.name}</span>
              <span
                style={{
                  color: "#ec4899",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  whiteSpace: "nowrap",
                  marginLeft: "0.5rem",
                }}
              >
                {item.dosage}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">Si ya haces deporte · Al final del entreno</h3>
        <p className="muted text-sm" style={{ marginBottom: "0.75rem" }}>
          Añade esto 2-3 días por semana. Ataca trapecio medio/bajo, deltoide posterior, serrato y dorsales.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { name: "Face pulls", dosage: "3 × 15-20" },
            { name: "Pájaros / reverse fly", dosage: "3 × 15-20" },
            { name: "Remo con pausa", dosage: "3 × 10-12" },
            { name: "Y-raises", dosage: "2 × 12-15" },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                background: "#fafafa",
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.name}</span>
              <span
                style={{
                  color: "#ec4899",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  whiteSpace: "nowrap",
                  marginLeft: "0.5rem",
                }}
              >
                {item.dosage}
              </span>
            </div>
          ))}
        </div>
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--muted)",
          }}
        >
          Ilustraciones propias basadas en referencias de forma para cada ejercicio.
        </p>
      </article>
    </div>
  );
}
