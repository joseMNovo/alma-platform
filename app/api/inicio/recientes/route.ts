import { type NextRequest, NextResponse } from "next/server"
import { getActivityTimeline, toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/** Cuántos entran en la fila de Inicio. Cuatro llenan un renglón en
 *  escritorio; con más, la fila se parte y empieza a competir con las
 *  columnas de abajo, que son lo que de verdad hay que mirar. */
const CUANTOS = 4

/** Cuántos eventos hay que mirar hacia atrás para juntar esos seis. Alguien
 *  que pasó la mañana entre Pagos y Accesos genera decenas de vistas de dos
 *  módulos: con una ventana corta, la fila se quedaba en dos ítems. */
const VENTANA = 200

/** Vistas que no son un destino al que volver. "inicio" es esta misma
 *  pantalla y "desconocido" es el ping de una ruta que el registro no supo
 *  resolver — ninguno de los dos se puede ofrecer como atajo. */
const NO_SON_DESTINO = new Set(["inicio", "desconocido"])

/**
 * GET /api/inicio/recientes → `{ modules: { key, at }[] }`
 *
 * Los últimos módulos que ESTA persona abrió, del más reciente al más viejo y
 * sin repetir. Es la fila de atajos de Inicio.
 *
 * Sale de `activity_events`, que ya se escribe en cada navegación (ver
 * /api/tracking). Por eso no hay tabla nueva ni nada que configurar: el dato
 * de "a dónde vas seguido" ya estaba, solo que únicamente lo miraba el admin
 * en el tablero de Actividad.
 *
 * Devuelve KEYS de módulo, no rutas ni etiquetas: el nombre y el ícono los
 * pone el cliente desde el registro. Así un módulo renombrado o uno al que la
 * persona dejó de tener acceso no deja un atajo roto — simplemente no se
 * dibuja.
 */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const eventos = await getActivityTimeline(
      toUserType(session.role),
      session.id,
      VENTANA,
      "view",
    )

    // `at` es la ÚLTIMA vez que lo abrió, no la primera: el evento más
    // reciente de cada módulo es el que sobrevive al dedupe porque la lista
    // viene de más nuevo a más viejo.
    const modules: { key: string; at: string | null }[] = []
    for (const e of eventos) {
      if (!e.module || NO_SON_DESTINO.has(e.module)) continue
      if (modules.some((m) => m.key === e.module)) continue
      modules.push({ key: e.module, at: e.created_at ?? null })
      if (modules.length >= CUANTOS) break
    }

    return NextResponse.json({ modules })
  } catch (error) {
    // Inicio tiene que abrir igual: sin atajos es una pantalla más pobre,
    // pero una pantalla rota no.
    logError("Error al leer los módulos recientes", {
      module: "inicio", action: "recientes", user: session.id, error,
    })
    return NextResponse.json({ modules: [] })
  }
}
