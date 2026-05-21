"use client";

// Exercises 2 (chin tucks) and 4 (wall slides) have no close match in the
// Wikimedia Commons weight-training library, so they use inline SVGs.
// All other exercises use Wikimedia Commons CC BY-SA 3.0 diagrams (Everkinetic).
// Attribution: https://commons.wikimedia.org/wiki/Category:Weight_training_diagrams

const A = "#ec4899";
const G = "#d1d5db"; // used by SvgChinTuck
const SW = 2.5;      // used by SvgChinTuck

function SvgChinTuck() {
  return (
    <svg viewBox="0 0 160 110" width="160" height="110" style={{ maxWidth: "100%" }} aria-hidden="true">
      {/* Spine / wall */}
      <line x1="80" y1="100" x2="80" y2="50" stroke={G} strokeWidth="2" strokeLinecap="round" />
      {/* Correct head */}
      <circle cx="80" cy="38" r="13" fill="none" stroke={A} strokeWidth={SW} />
      <line x1="80" y1="51" x2="80" y2="72" stroke={A} strokeWidth={SW} strokeLinecap="round" />
      <line x1="60" y1="72" x2="100" y2="72" stroke={A} strokeWidth={SW} strokeLinecap="round" />
      {/* Arrow showing head move back */}
      <defs>
        <marker id="arrCT" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={A} />
        </marker>
      </defs>
      <line x1="108" y1="38" x2="96" y2="38" stroke={A} strokeWidth="2" strokeLinecap="round" markerEnd="url(#arrCT)" />
      {/* Ghost head (before) */}
      <circle cx="118" cy="35" r="13" fill="none" stroke={G} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="80" y="106" textAnchor="middle" fontSize="10" fill="#9ca3af">llevar nuca atrás</text>
    </svg>
  );
}


// ── Exercise image data ──────────────────────────────────────────────────────
// SVGs: Wikimedia Commons CC BY-SA 3.0 (Everkinetic), served locally.
// wall-slides.png: user-provided illustration.

interface ExerciseImages {
  start: string;
  end?: string; // omit for single-image exercises
  alt: string;
}

const exerciseImages: Record<number, ExerciseImages> = {
  1: {
    start: "/exercises/leg-raises-1.svg",
    end:   "/exercises/leg-raises-2.svg",
    alt: "Posición tumbada boca arriba con piernas elevadas",
  },
  3: {
    start: "/exercises/back-ext-1.svg",
    end:   "/exercises/back-ext-2.svg",
    alt: "Extensión de espalda torácica",
  },
  4: {
    start: "/exercises/wall-slides.png",
    alt: "Wall slides contra la pared",
  },
  5: {
    start: "/exercises/pushup-1.svg",
    end:   "/exercises/pushup-2.svg",
    alt: "Push-up plus en pared",
  },
  6: {
    start: "/exercises/lying-raise-1.svg",
    end:   "/exercises/lying-raise-2.svg",
    alt: "Y-T-W tumbada, elevación lateral trasera",
  },
  7: {
    start: "/exercises/band-fly-1.svg",
    end:   "/exercises/band-fly-2.svg",
    alt: "Band pull-aparts con banda",
  },
  8: {
    start: "/exercises/cable-raise-1.svg",
    end:   "/exercises/cable-raise-2.svg",
    alt: "Face pulls, elevación lateral con cable",
  },
  9: {
    start: "/exercises/row-1.svg",
    end:   "/exercises/row-2.svg",
    alt: "Remo con banda",
  },
};

function ExerciseImage({ id }: { id: number }) {
  if (id === 2) return <SvgChinTuck />;

  const imgs = exerciseImages[id];
  if (!imgs) return null;

  if (!imgs.end) {
    return (
      <img
        src={imgs.start}
        alt={imgs.alt}
        style={{ height: 130, width: "auto", maxWidth: "100%", objectFit: "contain" }}
        loading="lazy"
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
      <img
        src={imgs.start}
        alt={`${imgs.alt} — inicio`}
        style={{ height: 100, width: "auto", maxWidth: "46%", objectFit: "contain" }}
        loading="lazy"
      />
      <span style={{ color: A, fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 }}>→</span>
      <img
        src={imgs.end}
        alt={`${imgs.alt} — fin`}
        style={{ height: 100, width: "auto", maxWidth: "46%", objectFit: "contain" }}
        loading="lazy"
      />
    </div>
  );
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
          Imágenes: CC BY-SA 3.0{" "}
          <a
            href="https://commons.wikimedia.org/wiki/Category:Weight_training_diagrams"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            Everkinetic · Wikimedia Commons
          </a>
        </p>
      </article>
    </div>
  );
}
