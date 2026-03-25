import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Directorio de este repo (evita que Turbopack use un package-lock.json en un padre, p. ej. WorkSpace/). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
