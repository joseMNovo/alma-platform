import { type NextRequest, NextResponse } from "next/server"
import { getVolunteers, createVolunteer, updateVolunteer, deleteVolunteer, type InventoryItem } from "@/lib/data-manager"
import { api } from "@/lib/api-client"

export async function GET() {
  try {
    const volunteers = await getVolunteers()
    return NextResponse.json(volunteers)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const volunteer = await createVolunteer({
      name: data.name,
      last_name: data.last_name || undefined,
      age: data.age ? Number.parseInt(data.age) : undefined,
      gender: data.gender || undefined,
      photo: data.photo || null,
      phone: data.phone || undefined,
      email: data.email || undefined,
      birth_date: data.birth_date || undefined,
      registration_date: new Date().toISOString().split("T")[0],
      status: "activo",
      specialties: data.specialties || [],
      is_admin: data.is_admin || false,
    })

    return NextResponse.json(volunteer)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    const data = await request.json()

    const volunteer = await updateVolunteer(id, {
      ...data,
      age: data.age ? Number.parseInt(data.age) : data.age,
    })

    return NextResponse.json(volunteer)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")

    // Check if volunteer is assigned to any inventory items
    const assigned = await api.get<InventoryItem[]>(`/inventario/?assigned_volunteer_id=${id}&limit=1`)
    if (assigned.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el voluntario porque tiene items asignados en el inventario" },
        { status: 400 }
      )
    }

    await deleteVolunteer(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
