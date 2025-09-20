import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function POST(request: NextRequest) {
  try {
    const { usuarioId, actividadId } = await request.json()
    const data = readData()

    // Verificar que la actividad existe y tiene cupos
    const actividad = data.actividades.find((a) => a.id === actividadId)
    if (!actividad) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })
    }

    if (actividad.inscritos >= actividad.cupos) {
      return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 400 })
    }

    // Verificar que el usuario no esté ya inscrito
    const usuario = data.usuarios.find((u) => u.id === usuarioId)
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (!usuario.inscripciones) {
      usuario.inscripciones = { talleres: [], grupos: [], actividades: [] }
    }

    if (usuario.inscripciones.actividades.includes(actividadId)) {
      return NextResponse.json({ error: "Ya está inscrito en esta actividad" }, { status: 400 })
    }

    // Realizar la inscripción
    usuario.inscripciones.actividades.push(actividadId)
    actividad.inscritos += 1

    // Crear registro de inscripción
    const nuevaInscripcion = {
      id: getNextId(data.inscripciones),
      usuarioId,
      tipo: "actividad",
      itemId: actividadId,
      fechaInscripcion: new Date().toISOString().split("T")[0],
      estado: "confirmada",
    }
    data.inscripciones.push(nuevaInscripcion)
    writeData(data)

    // Enviar email de confirmación
    await fetch("/api/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: usuario.email,
        subject: "Confirmación de Inscripción - Actividad",
        message: `Estimado/a ${usuario.nombre},

Su inscripción a la actividad "${actividad.nombre}" ha sido confirmada exitosamente.

Detalles:
- Fecha: ${new Date(actividad.fecha).toLocaleDateString("es-ES")}
- Horario: ${actividad.horario}
- Lugar: ${actividad.lugar}
${!actividad.gratuita ? `- Costo: $${actividad.costo.toLocaleString()}` : "- Actividad gratuita"}

¡Nos vemos en la actividad!

Saludos cordiales,
Equipo ALMA - Alzheimer Rosario`,
        type: "confirmacion_inscripcion",
      }),
    })

    return NextResponse.json({ success: true, inscripcion: nuevaInscripcion })
  } catch (error) {
    console.error("Error en inscripción:", error)
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
