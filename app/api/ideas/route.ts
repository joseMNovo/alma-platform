import { type NextRequest, NextResponse } from "next/server"
import { getIdeas, createIdea, updateIdea, deleteIdea } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

export async function GET() {
  try {
    const ideas = await getIdeas()
    return NextResponse.json(ideas)
  } catch (error) {
    logError("Error al obtener ideas", { module: "ideas", action: "list", error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "ideas:create")) {
    logWarn("Permiso denegado para crear idea", { module: "ideas", action: "create_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.title?.trim() || !data.body?.trim()) {
      return NextResponse.json({ error: "Título y cuerpo son requeridos" }, { status: 422 })
    }
    const idea = await createIdea({
      title: data.title.trim(),
      body: data.body.trim(),
      category: data.category?.trim() || null,
      created_by_volunteer_id: session.id,
    })
    logInfo("Idea creada", { module: "ideas", action: "create_idea", user: session.id, meta: { id: idea.id } })
    return NextResponse.json(idea)
  } catch (error) {
    logError("Error al crear idea", { module: "ideas", action: "create_idea", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "ideas:edit")) {
    logWarn("Permiso denegado para editar idea", { module: "ideas", action: "edit_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const data = await request.json()
    if (!data.title?.trim() || !data.body?.trim()) {
      return NextResponse.json({ error: "Título y cuerpo son requeridos" }, { status: 422 })
    }

    // Verificar autoría: solo el creador puede editar su propia idea
    const ideas = await getIdeas()
    const existing = ideas.find(i => i.id === id)
    if (!existing) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 })
    if (existing.created_by_volunteer_id !== session.id) {
      logWarn("Intento de editar idea ajena", { module: "ideas", action: "edit_denied_not_owner", user: session.id, meta: { idea_id: id } })
      return NextResponse.json({ error: "Solo podés editar tus propias ideas" }, { status: 403 })
    }

    const idea = await updateIdea(id, {
      title: data.title.trim(),
      body: data.body.trim(),
      category: data.category?.trim() || null,
    })
    logInfo("Idea actualizada", { module: "ideas", action: "edit_idea", user: session.id, meta: { id } })
    return NextResponse.json(idea)
  } catch (error) {
    logError("Error al actualizar idea", { module: "ideas", action: "edit_idea", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "ideas:delete")) {
    logWarn("Permiso denegado para eliminar idea", { module: "ideas", action: "delete_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const id = Number.parseInt(url.searchParams.get("id") || "0")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    await deleteIdea(id)
    logInfo("Idea eliminada", { module: "ideas", action: "delete_idea", user: session.id, meta: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar idea", { module: "ideas", action: "delete_idea", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
