"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Ancho real del contenedor, para dibujar el SVG a tamaño de píxel.
 * Escalar con `viewBox` sería más corto pero deformaría el texto de los ejes.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback = 640): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.getBoundingClientRect().width || fallback);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, fallback]);

  return width;
}
