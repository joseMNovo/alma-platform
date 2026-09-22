import { type NextRequest, NextResponse } from "next/server"
import { getIngresosResumen } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logError, logWarn } from "@/lib/logger"

/** Resumen de ingresos: Academia + puesto de venta, sumados al leer.
 *
 *  Solo GET. No hay POST a propósito: acá no se carga nada, se mira. Cargar
 *  desde dos lugares distintos es cómo se terminan teniendo dos versiones del
 *  mismo pago. */
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "ingresos:view")) {
    logWarn("Acceso denegado al resumen de ingresos", {
      module: "ingresos", action: "resumen_denied", user: session?.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const year = Number(request.nextUrl.searchParams.get("year")) || undefined
    return NextResponse.json(await getIngresosResumen(year))
  } catch (error) {
    logError("Error al obtener el resumen de ingresos", {
      module: "ingresos", action: "resumen", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
