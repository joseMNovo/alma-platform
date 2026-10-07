/**
 * Enlaces que vienen de afuera del código (variables de entorno).
 *
 * Existe por un caso real: `NEXT_PUBLIC_GAMES_URL` tenía cargada una ruta de
 * Windows, `D:\...\index.html`. El navegador no lee eso como un archivo: lee
 * `D:` como un ESQUEMA, igual que `mailto:` o `tel:`. Como no lo conoce, se lo
 * entrega al sistema operativo — y en un teléfono Android eso abre el cartel
 * de "Seleccione una aplicación para usar", ofreciendo cualquier app que
 * acepte intents. Desde adentro de la PWA se ve como si la app estuviera rota.
 *
 * Un valor mal cargado en un `.env` no puede sacar a nadie de la aplicación.
 */

/**
 * Devuelve la URL solo si es navegable desde la web; si no, cadena vacía.
 *
 * Las dos puntas del código tratan `""` como "no mostrar el enlace", así que
 * un valor inválido hace desaparecer el link en vez de romper al que lo toca.
 */
export function urlWebSegura(valor?: string | null): string {
  const limpio = (valor ?? "").trim()
  if (!limpio) return ""

  try {
    // Base para aceptar también rutas internas ("/juegos"), que son válidas.
    const url = new URL(limpio, "https://comunidadalma.org.ar")
    return url.protocol === "http:" || url.protocol === "https:" ? limpio : ""
  } catch {
    return ""
  }
}
