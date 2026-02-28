import { type NextRequest, NextResponse } from "next/server"
import { getGroups, getUserEnrollments, createEnrollment, updateGroup, getVolunteerById } from "@/lib/data-manager"

export async function POST(request: NextRequest) {
  try {
    const { userId, groupId } = await request.json()

    // Verify group exists
    const groups = await getGroups()
    const group = groups.find((g) => g.id === groupId)
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    // Verify volunteer exists
    const volunteer = await getVolunteerById(userId)
    if (!volunteer) {
      return NextResponse.json({ error: "Voluntario no encontrado" }, { status: 404 })
    }

    // Check if already enrolled
    const enrollments = await getUserEnrollments(userId)
    if (enrollments.groups.includes(groupId)) {
      return NextResponse.json({ error: "Ya está inscrito en este grupo" }, { status: 400 })
    }

    // Create enrollment record
    const enrollment = await createEnrollment({
      user_id: userId,
      type: "grupo",
      item_id: groupId,
      enrollment_date: new Date().toISOString().split("T")[0],
      status: "confirmada",
    })

    // Increment participants count
    await updateGroup(groupId, { participants: group.participants + 1 })

    // Send confirmation email
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: volunteer.email,
        subject: "Confirmación de Inscripción - Grupo de Apoyo",
        message: `Estimado/a ${volunteer.name},\n\nSu inscripción al grupo "${group.name}" ha sido confirmada exitosamente.\n\nDetalles:\n- Coordinador: ${group.coordinator}\n- Día: ${group.day}\n- Horario: ${group.schedule}\n\n¡Esperamos verle pronto en nuestro grupo de apoyo!\n\nSaludos cordiales,\nEquipo ALMA - Alzheimer Rosario`,
        type: "confirmacion_inscripcion",
      }),
    })

    return NextResponse.json({ success: true, enrollment })
  } catch (error) {
    console.error("Error en inscripción:", error)
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
