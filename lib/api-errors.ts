/**
 * api-errors.ts — Traducción de los errores del backend a algo mostrable.
 *
 * Vive acá y no en un route.ts porque Next valida que esos archivos SOLO
 * exporten handlers HTTP: cualquier export extra rompe el build.
 */

/**
 * Saca el motivo legible de un 422 del backend.
 *
 * FastAPI serializa el detalle de Pydantic como un array de objetos, y el
 * texto útil («no puede imprimir estos caracteres…») viene en `msg`,
 * precedido por "Value error, ". Si el detalle es un string suelto, se
 * devuelve tal cual.
 */
export function detalleDeValidacion(message: string): string {
  const crudo = message.split("422:").pop()?.trim() ?? ""
  const motivos = [...crudo.matchAll(/"msg"\s*:\s*"(?:Value error,\s*)?([^"]+)"/g)].map((m) => m[1])
  if (motivos.length) return motivos.join(" ")
  return crudo.replace(/^"|"$/g, "") || "Hay datos que no se pueden guardar"
}
