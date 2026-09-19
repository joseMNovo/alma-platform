/**
 * ¿Es un destino interno al que podemos mandar a alguien después de verificar
 * el mail?
 *
 * Existe porque esta misma regla estaba copiada en cuatro lugares —el alta, el
 * BFF de verificación, la pantalla de verificación y el backend— y al cambiar
 * la ruta de `/capacitacion/` a `/academia` una copia quedó vieja: el `next`
 * se descartaba en silencio y la persona terminaba en la vidriera en vez de
 * adentro de lo que había comprado. Una sola definición, un solo lugar donde
 * equivocarse.
 *
 * El candado importa: sin él, cualquiera arma un link con el dominio de ALMA
 * que deposita a la persona en otro sitio.
 *
 *   /academia            la vidriera o el módulo, según haya sesión
 *   /academia/<slug>     la landing pública de una capacitación
 *   /academia?c=<slug>   esa capacitación, ya con sesión
 */
export function esDestinoInterno(valor: unknown): valor is string {
  if (typeof valor !== "string" || !valor) return false
  // `//otro-sitio.com` es una URL protocol-relative: parece interna y no lo es.
  if (valor.startsWith("//")) return false
  return (
    valor === "/academia" ||
    valor.startsWith("/academia/") ||
    valor.startsWith("/academia?")
  )
}
