import { type NextRequest, NextResponse } from "next/server"
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const inventory = await getInventory()
    return NextResponse.json(inventory)
  } catch (error) {
    logError("Error al listar inventario", { module: "inventario", action: "list", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role === "participante") {
    logWarn("Permiso denegado para crear item de inventario", { module: "inventario", action: "create_item", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const data = await request.json()

    const item = await createInventoryItem({
      name: data.name,
      category: data.category || undefined,
      quantity: Number.parseInt(data.quantity),
      minimum_stock: Number.parseInt(data.minimum_stock),
      price: data.price ? Number.parseFloat(data.price) : 0,
      supplier: data.supplier || undefined,
      assigned_volunteer_id: data.assigned_volunteer_id || null,
      entry_date: new Date().toISOString().split("T")[0],
      // "Para vender": el backend crea con esto la fila en la góndola del
      // puesto. Acá no hay tabla que tocar, solo pasar la intención.
      for_sale: !!data.for_sale,
      sale_price: data.sale_price != null ? Number.parseFloat(data.sale_price) : null,
    })

    logInfo("Item de inventario creado", { module: "inventario", action: "create_item", user: session.id, meta: { id: (item as any)?.id } })
    return NextResponse.json(item)
  } catch (error) {
    logError("Error al crear item de inventario", { module: "inventario", action: "create_item", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role === "participante") {
    logWarn("Permiso denegado para editar item de inventario", { module: "inventario", action: "edit_item", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()

    const item = await updateInventoryItem(id, {
      name: data.name,
      category: data.category,
      quantity: data.quantity !== undefined ? Number.parseInt(data.quantity) : undefined,
      minimum_stock: data.minimum_stock !== undefined ? Number.parseInt(data.minimum_stock) : undefined,
      price: data.price !== undefined ? Number.parseFloat(data.price) : undefined,
      supplier: data.supplier,
      assigned_volunteer_id: 'assigned_volunteer_id' in data ? data.assigned_volunteer_id : undefined,
      // undefined = no lo toques; false = sacalo de la góndola. Los botones
      // +/- del stock mandan un PUT sin estos campos, y no tienen que dar de
      // baja la venta sin querer.
      for_sale: 'for_sale' in data ? !!data.for_sale : undefined,
      sale_price:
        data.sale_price != null ? Number.parseFloat(data.sale_price) : undefined,
    })

    logInfo("Item de inventario actualizado", { module: "inventario", action: "edit_item", user: session.id, meta: { id } })
    return NextResponse.json(item)
  } catch (error) {
    logError("Error al actualizar item de inventario", { module: "inventario", action: "edit_item", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.role === "participante") {
    logWarn("Permiso denegado para eliminar item de inventario", { module: "inventario", action: "delete_item", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  // Fuera del try: el catch lo necesita para poder decir qué ítem falló.
  const id = Number.parseInt(new URL(request.url).searchParams.get("id") || "0")
  try {
    await deleteInventoryItem(id)
    logInfo("Item de inventario eliminado", { module: "inventario", action: "delete_item", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // 409: el ítem está en el puesto de venta. No es una falla, es la regla
    // que protege el historial de ventas — y trae la salida explicada.
    const partes = /→ (\d{3}): ([\s\S]*)$/.exec(String(error?.message ?? error))
    if (partes?.[1] === "409") {
      logWarn("Borrado de inventario bloqueado por la góndola", {
        module: "inventario", action: "delete_item", user: session.id, meta: { id },
      })
      return NextResponse.json({ error: partes[2] }, { status: 409 })
    }
    logError("Error al eliminar item de inventario", { module: "inventario", action: "delete_item", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
