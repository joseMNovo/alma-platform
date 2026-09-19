import { type NextRequest, NextResponse } from "next/server"
import {
  getStandProducts, createStandProduct, updateStandProduct, deactivateStandProduct,
} from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

/** Productos del puesto de venta. Inventario propio del stand. */

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:sell")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const incluirInactivos = request.nextUrl.searchParams.get("todos") === "1"
    return NextResponse.json(await getStandProducts(incluirInactivos))
  } catch (error) {
    logError("Error al listar productos del stand", { module: "stand", action: "list_products", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:manage")) {
    logWarn("Alta de producto de stand denegada", { module: "stand", action: "create_denied", user: session?.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  try {
    const producto = await createStandProduct(await request.json())
    logInfo("Producto de stand creado", { module: "stand", action: "create_product", user: session.id, meta: { id: producto.id } })
    return NextResponse.json(producto, { status: 201 })
  } catch (error: any) {
    logError("Error al crear producto del stand", { module: "stand", action: "create_product", user: session.id, error })
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  const id = Number(request.nextUrl.searchParams.get("id"))
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 })
  try {
    const producto = await updateStandProduct(id, await request.json())
    logInfo("Producto de stand actualizado", { module: "stand", action: "edit_product", user: session.id, meta: { id } })
    return NextResponse.json(producto)
  } catch (error: any) {
    logError("Error al actualizar producto del stand", { module: "stand", action: "edit_product", user: session.id, error })
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session || !can(session, "stand:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  const id = Number(request.nextUrl.searchParams.get("id"))
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 })
  try {
    // Baja lógica en el backend: el producto sigue existiendo para las ventas
    // que ya lo referencian.
    await deactivateStandProduct(id)
    logInfo("Producto de stand desactivado", { module: "stand", action: "deactivate_product", user: session.id, meta: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    logError("Error al desactivar producto del stand", { module: "stand", action: "deactivate_product", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
