import { type NextRequest, NextResponse } from "next/server"
import { readData, writeData, getNextId } from "@/lib/data-manager"

export async function POST(request: NextRequest) {
  try {
    const { usuarioId, grupoId } = await request.json()
    const data = readData()

    // Verificar que el grupo existe
    const grupo = data.grupos.find((g) => g.id === grupoId)
    if (!grupo) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario no esté ya inscrito
    const usuario = data.usuarios.find((u) => u.id === usuarioId)
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (!usuario.inscripciones) {
      usuario.inscripciones = { talleres: [], grupos: [], actividades: [] }
    }

    if (usuario.inscripciones.grupos.includes(grupoId)) {
      return NextResponse.json({ error: "Ya está inscrito en este grupo" }, { status: 400 })
    }

    // Realizar la inscripción
    usuario.inscripciones.grupos.push(grupoId)
    grupo.participantes += 1

    // Crear registro de inscripción
    const nuevaInscripcion = {
      id: getNextId(data.inscripciones),
      usuarioId,
      tipo: "grupo",
      itemId: grupoId,
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
        subject: "Confirmación de Inscripción - Grupo de Apoyo",
        message: `Estimado/a ${usuario.nombre},

Su inscripción al grupo "${grupo.nombre}" ha sido confirmada exitosamente.

Detalles:
- Coordinador: ${grupo.coordinador}
- Día: ${grupo.dia}
- Horario: ${grupo.horario}

¡Esperamos verle pronto en nuestro grupo de apoyo!

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
