import { type NextRequest, NextResponse } from "next/server"
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"

export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const inventory = await getInventory()
    return NextResponse.json(inventory)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
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
    })

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
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
    })

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")

    await deleteInventoryItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
