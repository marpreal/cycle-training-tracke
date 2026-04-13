"use client";

import { trainingTemplates } from "@/data/trainingPlan";

export function TemplatesCard() {
  return (
    <article className="card">
      <h2 className="section-title">Plantillas semanales</h2>
      <div className="stack">
        {trainingTemplates.map((template) => (
          <details key={template.id} className="template-card">
            <summary>
              <strong>{template.name}</strong> - {template.focus}
            </summary>
            {template.blocks.map((block) => (
              <div key={block.title} className="table-wrapper">
                <p className="block-title">{block.title}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Ejercicio</th>
                      <th>Series</th>
                      <th>Reps</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.exercises.map((exercise) => (
                      <tr key={exercise.name}>
                        <td>{exercise.name}</td>
                        <td>{exercise.sets}</td>
                        <td>{exercise.reps}</td>
                        <td>{exercise.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </details>
        ))}
      </div>
    </article>
  );
}
