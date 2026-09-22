import { type NextRequest, NextResponse } from "next/server"
import { getActivitySummary, getPersonas } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logWarn, logError } from "@/lib/logger"

// GET /api/tracking/summary → resumen de actividad por usuario (solo admin)
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "tracking:view")) {
    logWarn("Permiso denegado para ver resumen de actividad", { module: "tracking", action: "summary_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const [summary, personas] = await Promise.all([getActivitySummary(), getPersonas()])

    const enriched = summary.map((row) => {
      // El admin de las variables de entorno no tiene fila en ninguna tabla:
      // va primero, porque el filtro de abajo lo borraría.
      if (row.user_type === "voluntario" && row.user_id === 0) {
        return { ...row, name: "Administrador", last_name: "(env)" }
      }
      const persona = personas.find((p) =>
        row.user_type === "voluntario" ? p.volunteer_id === row.user_id : p.participant_id === row.user_id,
      )
      return { ...row, name: persona?.name ?? null, last_name: persona?.last_name ?? null }
    })

    // Si la persona ya no existe, su actividad tampoco se muestra.
    //
    // `activity_events` no tiene foreign key a propósito (la identidad es
    // user_type + user_id, y los ids se pisan entre voluntarios y
    // participantes), así que borrar a alguien no se lleva sus eventos: la
    // lista seguía mostrándolos como "Usuario #5", un fantasma en el que no
    // se podía hacer nada.
    //
    // Se filtra al leer y NO se borran las filas: el historial de uso sigue
    // en la base por si alguna vez hay que auditar qué pasó.
    const vivos = enriched.filter((row) => row.name !== null)

    // Queda anotado cuántos se descartaron. `getPersonas()` pide hasta 1000:
    // el día que ALMA pase ese número, una persona real quedaría sin nombre y
    // este filtro la escondería en vez de mostrarla como "Usuario #N". Con el
    // log, eso se ve; sin el log, sería una desaparición muda.
    if (vivos.length < enriched.length) {
      logWarn("Actividad de personas borradas, no se muestra", {
        module: "tracking", action: "summary_huerfanos", user: session.id,
        meta: { descartados: enriched.length - vivos.length, personas: personas.length },
      })
    }

    return NextResponse.json(vivos)
  } catch (error) {
    logError("Error al obtener resumen de actividad", { module: "tracking", action: "summary", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
