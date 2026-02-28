import { type NextRequest, NextResponse } from "next/server"
import { getActivities, getUserEnrollments, createEnrollment, updateActivity, getVolunteerById } from "@/lib/data-manager"

export async function POST(request: NextRequest) {
  try {
    const { userId, activityId } = await request.json()

    // Verify activity exists and has capacity
    const activities = await getActivities()
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })
    }

    if (activity.enrolled >= activity.capacity) {
      return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 400 })
    }

    // Verify volunteer exists
    const volunteer = await getVolunteerById(userId)
    if (!volunteer) {
      return NextResponse.json({ error: "Voluntario no encontrado" }, { status: 404 })
    }

    // Check if already enrolled
    const enrollments = await getUserEnrollments(userId)
    if (enrollments.activities.includes(activityId)) {
      return NextResponse.json({ error: "Ya está inscrito en esta actividad" }, { status: 400 })
    }

    // Create enrollment record
    const enrollment = await createEnrollment({
      user_id: userId,
      type: "actividad",
      item_id: activityId,
      enrollment_date: new Date().toISOString().split("T")[0],
      status: "confirmada",
    })

    // Increment enrolled count
    await updateActivity(activityId, { enrolled: activity.enrolled + 1 })

    // Send confirmation email
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: volunteer.email,
        subject: "Confirmación de Inscripción - Actividad",
        message: `Estimado/a ${volunteer.name},\n\nSu inscripción a la actividad "${activity.name}" ha sido confirmada exitosamente.\n\nDetalles:\n- Fecha: ${new Date(activity.date!).toLocaleDateString("es-ES")}\n- Horario: ${activity.schedule}\n- Lugar: ${activity.location}\n${!activity.is_free && activity.cost ? `- Costo: $${activity.cost.toLocaleString()}` : "- Actividad gratuita"}\n\n¡Nos vemos en la actividad!\n\nSaludos cordiales,\nEquipo ALMA - Alzheimer Rosario`,
        type: "confirmacion_inscripcion",
      }),
    })

    return NextResponse.json({ success: true, enrollment })
  } catch (error) {
    console.error("Error en inscripción:", error)
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
