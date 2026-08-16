import { type NextRequest, NextResponse } from "next/server"
import { logTrainingView } from "@/lib/data-manager"
import { logError } from "@/lib/logger"

/**
 * POST /api/publico/capacitacion/vista — cuenta una reproducción de la
 * introducción abierta.
 *
 * Sin sesión a propósito: la intro se mira desde la landing pública, que es
 * justamente el link que ALMA reparte por redes. El endpoint autenticado
 * (`/api/capacitaciones/progreso`) le contestaría 401 a esa gente y no
 * quedaría registro de lo único que interesa medir acá: si el anzuelo pica.
 *
 * Identidad: `user_type='anonimo'`, `user_id=0` → `person_id` NULL. Es la
 * misma convención `(user_type, user_id)` sin FK de las campanitas y los
 * anuncios. No identifica a nadie y no ensucia las alertas de cuenta
 * compartida, que ya filtran `person_id IS NOT NULL`.
 *
 * Lo que evita el abuso está del lado del backend, no acá: si el ítem no
 * está marcado como introducción abierta, responde 403 y no guarda nada. Sin
 * esa validación, esta ruta sería una forma de escribir filas para cualquier
 * contenido pago.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const itemId = Number.parseInt(String(data.item_id ?? 0), 10)
    if (!itemId) return NextResponse.json({ error: "Falta el contenido" }, { status: 400 })

    // La IP la resuelve el servidor desde los headers del proxy: el cliente
    // nunca la manda, así que no puede falsearla.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null

    await logTrainingView(itemId, {
      user_type: "anonimo",
      user_id: 0,
      ip,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    // Un 403 del backend es esperable: el ítem no es una intro abierta. No es
    // un incidente y no merece ruido en el log.
    if (String(error?.message ?? "").includes("403")) {
      return NextResponse.json({ error: "Ese contenido no es una vista previa abierta" }, { status: 403 })
    }
    logError("No se pudo contar la vista de la intro", {
      module: "capacitaciones",
      action: "public_intro_view",
      error,
    })
    // Contar la vista es telemetría: que falle no puede romperle el video a
    // nadie, así que el player recibe un OK igual.
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
