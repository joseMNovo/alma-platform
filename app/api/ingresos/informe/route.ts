import { type NextRequest, NextResponse } from "next/server"
import { getIngresosInforme } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError, logWarn } from "@/lib/logger"

/** Informe de ingresos (Academia + puesto), en PDF o Excel.
 *
 *  Admin only aunque la PANTALLA de Plata la vea un voluntario: el resumen
 *  son totales y no nombra a nadie, pero este archivo lista quién pagó qué.
 *  Por eso pide `ingresos:detalle` y no `ingresos:view`. */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "ingresos:detalle")) {
    logWarn("Informe de ingresos denegado", { module: "ingresos", action: "informe_denied", user: session?.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const p = request.nextUrl.searchParams
    const formato = p.get("formato") === "xlsx" ? "xlsx" : "pdf"
    const rango = { desde: p.get("desde") || undefined, hasta: p.get("hasta") || undefined }

    const archivo = await getIngresosInforme(formato, rango)
    logInfo("Informe de ingresos generado", {
      module: "ingresos", action: "informe", user: session.id, meta: { formato, ...rango },
    })
    return NextResponse.json(archivo)
  } catch (error) {
    logError("Error al generar el informe de ingresos", {
      module: "ingresos", action: "informe", user: session.id, error,
    })
    return NextResponse.json({ error: "No se pudo generar el informe" }, { status: 500 })
  }
}
