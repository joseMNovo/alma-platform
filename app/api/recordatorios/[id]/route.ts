import { type NextRequest, NextResponse } from "next/server"
import { api } from "@/lib/api-client"
import { toUserType } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { logError } from "@/lib/logger"

/**
 * Los recordatorios que pidió quien está mirando, para un evento.
 *
 * La identidad sale de la SESIÓN, nunca del cuerpo ni de la URL: si viniera
 * del cliente, cualquiera podría configurarle los avisos a otra persona.
 */

interface Recordatorios {
  offsets: number[]
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await params
    return NextResponse.json(
      await api.get<Recordatorios>(
        `/recordatorios/${Number(id)}?user_type=${encodeURIComponent(toUserType(session.role))}&user_id=${session.id}`,
      ),
    )
  } catch (error) {
    logError("Error al leer los recordatorios", {
      module: "recordatorios", action: "get", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await params
    const { offsets } = await request.json()

    return NextResponse.json(
      await api.put<Recordatorios>(`/recordatorios/${Number(id)}`, {
        user_type: toUserType(session.role),
        user_id: session.id,
        offsets: Array.isArray(offsets) ? offsets : [],
      }),
    )
  } catch (error: any) {
    const message = String(error?.message ?? "")
    if (message.includes("404")) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }
    if (message.includes("409")) {
      return NextResponse.json(
        { error: "No encontramos tu ficha de persona. Avisale a un administrador." },
        { status: 409 },
      )
    }
    logError("Error al guardar los recordatorios", {
      module: "recordatorios", action: "set", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
