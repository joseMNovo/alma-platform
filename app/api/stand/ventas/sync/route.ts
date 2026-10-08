import { type NextRequest, NextResponse } from "next/server"
import { syncStandSales } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** Cuántas ventas entran en un lote. Una jornada larga del puesto no pasa de
 *  unas decenas; el tope está para que un cliente roto no mande un archivo de
 *  diez mil filas y tenga al backend media hora ocupado. */
const TOPE_LOTE = 500

/**
 * POST /api/stand/ventas/sync — ventas que YA se cobraron.
 *
 * Dos caminos llegan acá:
 *   · la cola del teléfono, cuando recupera señal (`origen=cola`)
 *   · un archivo exportado que importa el admin (`origen=importada`)
 *
 * No valida stock, a propósito: la plata ya se cobró en la mano y rechazar la
 * venta no devuelve la mercadería. Si el stock queda negativo, eso no
 * significa que se vendió de más — significa que el inventario cargado no
 * coincidía con lo que había en la caja, que es información útil.
 *
 * Idempotente por `client_uuid`, así que se puede exportar un archivo Y
 * dejar que el teléfono sincronice solo: lo que llegue segundo se ignora.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    logWarn("Sincronización de ventas denegada", {
      module: "stand", action: "sync_denied", user: session?.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  // Importar ventas de OTRA persona es cargar plata a nombre ajeno: eso es
  // del admin. Un voluntario solo puede subir lo que cobró él, que es lo que
  // manda su propia cola.
  const origen = request.nextUrl.searchParams.get("origen") === "importada" ? "importada" : "cola"
  if (origen === "importada" && !can(session, "stand:importar")) {
    logWarn("Importación de ventas denegada", {
      module: "stand", action: "import_denied", user: session.id,
    })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const lote = await request.json()
    if (!Array.isArray(lote)) {
      return NextResponse.json({ error: "Se esperaba una lista de ventas" }, { status: 400 })
    }
    if (lote.length > TOPE_LOTE) {
      return NextResponse.json(
        { error: `Son demasiadas ventas de una vez (máximo ${TOPE_LOTE}).` },
        { status: 400 },
      )
    }

    // Quién cobró sale de la SESIÓN y no del archivo. Si viniera de afuera,
    // cualquiera podría anotar ventas a nombre de otro editando el JSON.
    const resultado = await syncStandSales(
      lote.map((v: any) => ({ ...v, sold_by_volunteer_id: session.id })),
      origen,
    )

    logInfo("Ventas sincronizadas", {
      module: "stand", action: "sync_sales", user: session.id,
      meta: { origen, enviadas: lote.length, ...resultado, rechazadas: resultado.rechazadas?.length ?? 0 },
    })
    return NextResponse.json(resultado)
  } catch (error) {
    logError("Error al sincronizar ventas del stand", {
      module: "stand", action: "sync_sales", user: session.id, error,
    })
    return NextResponse.json({ error: "No se pudieron sincronizar" }, { status: 500 })
  }
}
