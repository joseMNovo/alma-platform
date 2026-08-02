import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * Configuración de los tests del frontend.
 *
 * El front NUNCA toca MySQL (todo pasa por el backend), así que acá no hay base
 * de datos que aislar. Lo que sí se aísla es la RED: los tests mockean
 * lib/api-client, así que ninguna llamada sale realmente al backend.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Sin esto, un console.log perdido en un componente ensucia la salida.
    silent: false,
    globals: false,
  },
  resolve: {
    // Mismo alias que tsconfig.json ("@/*" → "./*"), para que los tests importen
    // igual que el código de producción.
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
