import { type NextRequest, NextResponse } from "next/server"
import { getWorkshops, getUserEnrollments, createEnrollment, updateWorkshop } from "@/lib/data-manager"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId, workshopId } = await request.json()

    // Verify workshop exists and has capacity
    const workshops = await getWorkshops()
    const workshop = workshops.find((w) => w.id === workshopId)
    if (!workshop) {
      return NextResponse.json({ error: "Taller no encontrado" }, { status: 404 })
    }

    if (workshop.enrolled >= workshop.capacity) {
      return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 400 })
    }

    // Verify volunteer exists
    const volunteers = await query("SELECT id, name, email FROM voluntarios WHERE id = ?", [userId])
    if (volunteers.length === 0) {
      return NextResponse.json({ error: "Voluntario no encontrado" }, { status: 404 })
    }
    const volunteer = volunteers[0] as any

    // Check if already enrolled
    const enrollments = await getUserEnrollments(userId)
    if (enrollments.workshops.includes(workshopId)) {
      return NextResponse.json({ error: "Ya está inscrito en este taller" }, { status: 400 })
    }

    // Create enrollment record
    const enrollment = await createEnrollment({
      user_id: userId,
      type: "taller",
      item_id: workshopId,
      enrollment_date: new Date().toISOString().split("T")[0],
      status: "confirmada",
    })

    // Increment enrolled count
    await updateWorkshop(workshopId, { enrolled: workshop.enrolled + 1 })

    // Send confirmation email
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: volunteer.email,
        subject: "Confirmación de Inscripción - Taller de Memoria",
        message: `Estimado/a ${volunteer.name},\n\nSu inscripción al taller "${workshop.name}" ha sido confirmada exitosamente.\n\nDetalles:\n- Instructor: ${workshop.instructor}\n- Fecha: ${new Date(workshop.date!).toLocaleDateString("es-ES")}\n- Horario: ${workshop.schedule}\n- Costo: $${workshop.cost.toLocaleString()}\n\nNos vemos pronto!\n\nSaludos cordiales,\nEquipo ALMA - Alzheimer Rosario`,
        type: "confirmacion_inscripcion",
      }),
    })

    return NextResponse.json({ success: true, enrollment })
  } catch (error) {
    console.error("Error en inscripción:", error)
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
