/**
 * La marca escrita: "Comunidad alma".
 *
 * Hecha con TEXTO y no con una imagen: se ve nítida en cualquier pantalla y a
 * cualquier tamaño, no suma un archivo que descargar, y se adapta al fondo sin
 * arrastrar el suyo propio.
 *
 * Reglas de la marca, en un solo lugar:
 *   · "Comunidad" con C mayúscula, en negro y más chica.
 *   · "alma" en minúscula y en el turquesa institucional.
 *
 * Los dos tamaños salen de UNA sola medida: "Comunidad" se calcula en `em`
 * sobre el tamaño de "alma". Así se escala entero cambiando una clase, sin que
 * la proporción entre las dos palabras se desarme.
 *
 * ── SOBRE LA TIPOGRAFÍA ───────────────────────────────────────────────
 * Va en Gotham Rounded, la institucional: es la que usa toda la aplicación y
 * la que está cargada en globals.css desde public/fonts.
 *
 * NO es exactamente la del logo. La del logo tiene la `a` de un solo piso (un
 * círculo con el palito al costado) y Gotham la tiene de dos, con el ganchito
 * arriba. Se probó Quicksand, que sí tiene esa `a`, y quedaba peor: pegada al
 * resto de la interfaz se veía de otra familia.
 *
 * Entre parecerse al logo y ser coherente con la aplicación, gana la
 * coherencia hasta tener la fuente del manual de marca. Cuando aparezca el
 * archivo, se cambia la constante de acá abajo y listo.
 */
const TIPOGRAFIA_MARCA = '"Gotham Rounded", system-ui, sans-serif'

export default function MarcaAlma({
  className = "text-2xl",
  /** Para fondos oscuros: "Comunidad" pasa a blanco. */
  invertida = false,
}: {
  className?: string
  invertida?: boolean
}) {
  return (
    <span
      style={{ fontFamily: TIPOGRAFIA_MARCA }}
      className={`inline-flex items-baseline gap-[0.3em] font-normal leading-none ${className}`}
    >
      <span className={`text-[0.68em] ${invertida ? "text-white" : "text-gray-900"}`}>
        Comunidad
      </span>
      <span className="text-[#4dd0e1]">alma</span>
    </span>
  )
}
