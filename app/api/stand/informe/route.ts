import { type NextRequest, NextResponse } from "next/server"
import { getStandInforme } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logError, logWarn } from "@/lib/logger"

/** Informe de ventas del puesto, en PDF o Excel.
 *
 *  Mismo permiso que vender (`stand:sell`): quien atiende el puesto tiene que
 *  poder bajarse su propia planilla sin depender de un admin. */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    logWarn("Informe del puesto denegado", { module: "stand", action: "informe_denied", user: session?.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const p = request.nextUrl.searchParams
    const formato = p.get("formato") === "xlsx" ? "xlsx" : "pdf"
    const rango = { desde: p.get("desde") || undefined, hasta: p.get("hasta") || undefined }

    const archivo = await getStandInforme(formato, rango)
    logInfo("Informe del puesto generado", {
      module: "stand", action: "informe", user: session.id, meta: { formato, ...rango },
    })
    return NextResponse.json(archivo)
  } catch (error) {
    logError("Error al generar el informe del puesto", {
      module: "stand", action: "informe", user: session.id, error,
    })
    return NextResponse.json({ error: "No se pudo generar el informe" }, { status: 500 })
  }
}
