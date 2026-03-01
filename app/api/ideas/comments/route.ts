import { type NextRequest, NextResponse } from "next/server"
import { getIdeaComments, createIdeaComment, deleteIdeaComment, getIdeas } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"

// GET /api/ideas/comments?idea_id=X
export async function GET(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const url = new URL(request.url)
    const ideaId = Number.parseInt(url.searchParams.get("idea_id") || "0")
    if (!ideaId) return NextResponse.json({ error: "idea_id requerido" }, { status: 400 })
    const comments = await getIdeaComments(ideaId)
    return NextResponse.json(comments)
  } catch (error) {
    logError("Error al obtener comentarios", { module: "ideas", action: "list_comments", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

// POST /api/ideas/comments  body: { idea_id, body }
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "ideas:comment")) {
    logWarn("Permiso denegado para comentar", { module: "ideas", action: "comment_denied", user: session.id })
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const data = await request.json()
    if (!data.idea_id) return NextResponse.json({ error: "idea_id requerido" }, { status: 400 })
    if (!data.body?.trim()) {
      return NextResponse.json({ error: "El comentario no puede estar vacío" }, { status: 422 })
    }
    const comment = await createIdeaComment(data.idea_id, data.body.trim(), session.id)
    logInfo("Comentario creado", { module: "ideas", action: "create_comment", user: session.id, meta: { idea_id: data.idea_id } })
    return NextResponse.json(comment)
  } catch (error) {
    logError("Error al crear comentario", { module: "ideas", action: "create_comment", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}

// DELETE /api/ideas/comments?id=X&idea_id=Y
export async function DELETE(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const url = new URL(request.url)
    const commentId = Number.parseInt(url.searchParams.get("id") || "0")
    const ideaId = Number.parseInt(url.searchParams.get("idea_id") || "0")
    if (!commentId || !ideaId) return NextResponse.json({ error: "id e idea_id requeridos" }, { status: 400 })

    const isAdmin = session.role === "admin"

    if (!isAdmin) {
      // Solo el dueño de la idea puede borrar comentarios (además del admin)
      const ideas = await getIdeas()
      const idea = ideas.find(i => i.id === ideaId)
      if (!idea) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 })
      if (idea.created_by_volunteer_id !== session.id) {
        logWarn("Intento de borrar comentario sin permisos", {
          module: "ideas", action: "delete_comment_denied", user: session.id,
          meta: { idea_id: ideaId, comment_id: commentId }
        })
        return NextResponse.json({ error: "Solo el dueño de la idea o un administrador puede borrar comentarios" }, { status: 403 })
      }
    }

    await deleteIdeaComment(ideaId, commentId)
    logInfo("Comentario eliminado", { module: "ideas", action: "delete_comment", user: session.id, meta: { idea_id: ideaId, comment_id: commentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Error al eliminar comentario", { module: "ideas", action: "delete_comment", user: session.id, error })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
