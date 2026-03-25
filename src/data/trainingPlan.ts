export type TrainingExercise = {
  name: string;
  sets: string;
  reps: string;
  notes?: string;
};

export type TrainingBlock = {
  title: string;
  exercises: TrainingExercise[];
};

export type TrainingDayTemplate = {
  id: string;
  name: string;
  focus: string;
  blocks: TrainingBlock[];
};

export const trainingTemplates: TrainingDayTemplate[] = [
  {
    id: "full-body-a",
    name: "FULL BODY A",
    focus: "Glute + torso",
    blocks: [
      {
        title: "Movilidad (5 min)",
        exercises: [
          { name: "90-90 cadera", sets: "1", reps: "12/12" },
          { name: "Rotaciones toracicas", sets: "1", reps: "12/12" },
          { name: "Glute bridge", sets: "1", reps: "15" },
        ],
      },
      {
        title: "Superserie A (x3)",
        exercises: [
          {
            name: "Hip thrust",
            sets: "3",
            reps: "12-15",
            notes: "Peso 20-30 kg, pausa 2 s arriba",
          },
          { name: "Flexiones", sets: "3", reps: "8-12", notes: "RIR 1-2" },
        ],
      },
      {
        title: "Superserie B (x3)",
        exercises: [
          {
            name: "Sentadilla goblet",
            sets: "3",
            reps: "10-12",
            notes: "Peso 12-18 kg, RIR 2",
          },
          {
            name: "Remo con mancuernas",
            sets: "3",
            reps: "10-12",
            notes: "Peso 8-10 kg por lado",
          },
        ],
      },
      {
        title: "Finisher gluteo + hombro",
        exercises: [
          {
            name: "Peso muerto rumano (barra)",
            sets: "2-3",
            reps: "8-10",
            notes: "23 kg, baja lento (3 s)",
          },
          {
            name: "Elevaciones laterales",
            sets: "2-3",
            reps: "12-15",
            notes: "4-6 kg",
          },
        ],
      },
    ],
  },
  {
    id: "lower",
    name: "LOWER",
    focus: "Pierna estetica",
    blocks: [
      {
        title: "Superserie A (x3)",
        exercises: [
          {
            name: "Sentadilla bulgara",
            sets: "3",
            reps: "8-10 por pierna",
            notes: "8-10 kg por lado",
          },
          {
            name: "Abducciones con banda",
            sets: "3",
            reps: "15-20",
            notes: "Cerca del fallo",
          },
        ],
      },
      {
        title: "Superserie B (x3)",
        exercises: [
          {
            name: "Step-up",
            sets: "3",
            reps: "20 total",
            notes: "8-10 kg por lado",
          },
          {
            name: "Puente de gluteo con pausa",
            sets: "3",
            reps: "12-15",
            notes: "20-30 kg",
          },
        ],
      },
      {
        title: "Gemelos",
        exercises: [{ name: "Elevaciones de talon", sets: "3", reps: "12-15", notes: "15-25 kg" }],
      },
    ],
  },
  {
    id: "upper",
    name: "UPPER",
    focus: "Espalda + hombro + brazos",
    blocks: [
      {
        title: "Superserie A (x3)",
        exercises: [
          {
            name: "Remo con barra",
            sets: "3",
            reps: "8-10",
            notes: "20-23 kg (meta 28.7/32.7)",
          },
          {
            name: "Press hombro mancuernas",
            sets: "3",
            reps: "8-10",
            notes: "6-8 kg",
          },
        ],
      },
      {
        title: "Superserie B (x3)",
        exercises: [
          {
            name: "Press pecho mancuernas",
            sets: "3",
            reps: "8-10",
            notes: "8-10 kg (meta 25/28.7)",
          },
          { name: "Curl biceps", sets: "3", reps: "10-12", notes: "5-7 kg" },
        ],
      },
      {
        title: "Triceps - Myo reps",
        exercises: [
          {
            name: "Extension triceps mancuerna",
            sets: "1 + 3-5 minis",
            reps: "10-12 + minis 3-5",
            notes: "RIR 1-2, descanso 15-20 s",
          },
        ],
      },
    ],
  },
  {
    id: "full-body-b",
    name: "FULL BODY B",
    focus: "Ligera y fluida",
    blocks: [
      {
        title: "Circuito principal",
        exercises: [
          { name: "Sentadilla goblet", sets: "3", reps: "10-12", notes: "Menos peso, mas control" },
          { name: "Remo unilateral", sets: "3", reps: "10-12" },
          { name: "Hip thrust unilateral", sets: "3", reps: "10-12" },
          { name: "Elevaciones laterales + frontales", sets: "2-3", reps: "12-15", notes: "Drop set" },
          { name: "Core (dead bug o elevaciones de piernas)", sets: "2-3", reps: "10-15" },
        ],
      },
    ],
  },
];
