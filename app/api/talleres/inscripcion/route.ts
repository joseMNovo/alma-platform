import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function POST(request: NextRequest) {
  try {
    const { usuarioId, tallerId } = await request.json()
    const data = readData()

    // Verificar que el taller existe y tiene cupos
    const taller = data.talleres.find((t) => t.id === tallerId)
    if (!taller) {
      return NextResponse.json({ error: "Taller no encontrado" }, { status: 404 })
    }

    if (taller.inscritos >= taller.cupos) {
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

    if (usuario.inscripciones.talleres.includes(tallerId)) {
      return NextResponse.json({ error: "Ya está inscrito en este taller" }, { status: 400 })
    }

    // Realizar la inscripción
    usuario.inscripciones.talleres.push(tallerId)
    taller.inscritos += 1

    // Crear registro de inscripción
    const nuevaInscripcion = {
      id: getNextId(data.inscripciones),
      usuarioId,
      tipo: "taller",
      itemId: tallerId,
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
        subject: "Confirmación de Inscripción - Taller de Memoria",
        message: `Estimado/a ${usuario.nombre},

Su inscripción al taller "${taller.nombre}" ha sido confirmada exitosamente.

Detalles:
- Instructor: ${taller.instructor}
- Fecha: ${new Date(taller.fecha).toLocaleDateString("es-ES")}
- Horario: ${taller.horario}
- Costo: $${taller.costo.toLocaleString()}

Nos vemos pronto!

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
