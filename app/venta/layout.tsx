import type { Metadata, Viewport } from "next"

/**
 * `/venta` es una PWA aparte.
 *
 * No es otra aplicación: es el mismo dominio, el mismo código y la MISMA
 * sesión. Lo único distinto es el manifest — y con eso alcanza para que el
 * teléfono la instale como un ícono propio, con otro nombre y otro color.
 *
 * Por qué separarla de Comunidad ALMA:
 *
 *   · En la pantalla de inicio se distinguen de un vistazo. El ícono de la
 *     app es la flor turquesa sobre blanco; este es la flor BLANCA sobre
 *     turquesa oscuro. Invertido, misma familia, imposible de confundir con
 *     el pulgar a medio metro.
 *   · El `scope` la encierra en /venta. Cualquier navegación fuera de acá
 *     sale a una pestaña del navegador, y eso es DESEABLE: nadie termina en
 *     Inventario por accidente en medio de una feria.
 *   · `orientation: portrait` porque se usa parado, con una mano.
 *
 * La sesión se comparte porque la cookie es del dominio, no del manifest:
 * quien ya entró a la app no se tiene que volver a loguear acá.
 */
export const metadata: Metadata = {
  title: "Puesto ALMA",
  manifest: "/manifest-venta.json",
  appleWebApp: {
    capable: true,
    title: "Puesto",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#4dd0e1",
  // Sin zoom: en el medio de un cobro, un pellizco accidental que deje la
  // pantalla al 300% cuesta más de lo que vale poder agrandar.
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function VentaLayout({ children }: { children: React.ReactNode }) {
  return children
}
