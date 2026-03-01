"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import {
  Plus, Edit, Trash2, Lightbulb, Tag, Calendar, MessageSquare,
  User, Send, ChevronRight, X
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { can } from "@/lib/permissions"
import type { Idea, IdeaComment } from "@/lib/data-manager"

// ── Paleta de colores para categorías ─────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {}
const COLOR_PALETTE = [
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-orange-100 text-orange-700 border-orange-200",
]

function getCategoryColor(category: string): string {
  if (!CATEGORY_COLORS[category]) {
    const idx = Object.keys(CATEGORY_COLORS).length % COLOR_PALETTE.length
    CATEGORY_COLORS[category] = COLOR_PALETTE[idx]
  }
  return CATEGORY_COLORS[category]
}

// ── Helpers de fecha ───────────────────────────────────────────────────
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Tipos internos ─────────────────────────────────────────────────────
interface IdeaFormData {
  title: string
  body: string
  category: string
}

const EMPTY_FORM: IdeaFormData = { title: "", body: "", category: "" }
const BODY_PREVIEW_CHARS = 140

// ── Componente principal ───────────────────────────────────────────────
export default function IdeasManager({ user }: { user: any }) {
  // Lista de ideas
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Modal crear/editar
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [formData, setFormData] = useState<IdeaFormData>(EMPTY_FORM)
  const [categoryInput, setCategoryInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Modal eliminar idea
  const [deleteIdeaDialogOpen, setDeleteIdeaDialogOpen] = useState(false)
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null)
  const [deletingIdea, setDeletingIdea] = useState(false)

  // Modal ver idea + comentarios
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null)
  const [comments, setComments] = useState<IdeaComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [sendingComment, setSendingComment] = useState(false)

  // Confirmar eliminar comentario
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<IdeaComment | null>(null)
  const [deletingComment, setDeletingComment] = useState(false)

  const commentsEndRef = useRef<HTMLDivElement>(null)

  const isAdmin = user.role === "admin"

  const existingCategories = Array.from(
    new Set(ideas.map(i => i.category).filter(Boolean) as string[])
  ).sort()

  // ── Carga de datos ─────────────────────────────────────────────────
  const fetchIdeas = async () => {
    try {
      const res = await fetch("/api/ideas")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setIdeas(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las ideas", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (ideaId: number) => {
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/ideas/comments?idea_id=${ideaId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los comentarios", variant: "destructive" })
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => { fetchIdeas() }, [])

  // Cuando se abre el modal de vista, carga los comentarios
  useEffect(() => {
    if (viewModalOpen && viewingIdea) {
      fetchComments(viewingIdea.id)
    } else {
      setComments([])
      setCommentText("")
    }
  }, [viewModalOpen, viewingIdea?.id])

  // Scroll al final de comentarios cuando llegan nuevos
  useEffect(() => {
    if (commentsEndRef.current && comments.length > 0) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [comments.length])

  // ── Crear / Editar idea ────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingIdea(null)
    setFormData(EMPTY_FORM)
    setFormDialogOpen(true)
  }

  const handleOpenEdit = (idea: Idea, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingIdea(idea)
    setFormData({ title: idea.title, body: idea.body, category: idea.category ?? "" })
    setCategoryInput("")
    setFormDialogOpen(true)
  }

  const resetForm = () => {
    setFormData(EMPTY_FORM)
    setCategoryInput("")
    setEditingIdea(null)
    setFormDialogOpen(false)
  }

  const commitCategory = () => {
    const trimmed = categoryInput.trim()
    if (trimmed) setFormData(prev => ({ ...prev, category: trimmed }))
    setCategoryInput("")
  }

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commitCategory() }
  }

  const handleSubmitIdea = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Campo requerido", description: "El título es obligatorio", variant: "destructive" })
      return
    }
    if (!formData.body.trim()) {
      toast({ title: "Campo requerido", description: "La descripción es obligatoria", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        category: formData.category.trim() || null,
      }
      const res = await fetch(
        editingIdea ? `/api/ideas?id=${editingIdea.id}` : "/api/ideas",
        { method: editingIdea ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al guardar")
      }
      toast({ title: editingIdea ? "Idea actualizada" : "Idea creada" })
      resetForm()
      fetchIdeas()
      // Si se edita la idea que está abierta en el modal, refresca su datos
      if (editingIdea && viewingIdea?.id === editingIdea.id) {
        const updated = await res.json().catch(() => null)
        if (updated) setViewingIdea(updated)
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar la idea", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Eliminar idea ──────────────────────────────────────────────────
  const handleDeleteIdeaClick = (idea: Idea, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIdeaToDelete(idea)
    setDeleteIdeaDialogOpen(true)
  }

  const handleDeleteIdeaConfirm = async () => {
    if (!ideaToDelete) return
    setDeletingIdea(true)
    try {
      const res = await fetch(`/api/ideas?id=${ideaToDelete.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error")
      toast({ title: "Idea eliminada" })
      setDeleteIdeaDialogOpen(false)
      setIdeaToDelete(null)
      if (viewingIdea?.id === ideaToDelete.id) setViewModalOpen(false)
      fetchIdeas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setDeletingIdea(false)
    }
  }

  // ── Ver idea (modal) ───────────────────────────────────────────────
  const handleOpenViewModal = (idea: Idea) => {
    setViewingIdea(idea)
    setViewModalOpen(true)
  }

  // ── Comentarios ────────────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!commentText.trim() || !viewingIdea) return
    setSendingComment(true)
    try {
      const res = await fetch("/api/ideas/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: viewingIdea.id, body: commentText.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al comentar")
      }
      setCommentText("")
      fetchComments(viewingIdea.id)
      // Actualiza el contador en la lista
      setIdeas(prev => prev.map(i => i.id === viewingIdea.id ? { ...i, comment_count: i.comment_count + 1 } : i))
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSendingComment(false)
    }
  }

  const handleDeleteCommentClick = (comment: IdeaComment) => {
    setCommentToDelete(comment)
    setDeleteCommentDialogOpen(true)
  }

  const handleDeleteCommentConfirm = async () => {
    if (!commentToDelete || !viewingIdea) return
    setDeletingComment(true)
    try {
      const res = await fetch(`/api/ideas/comments?id=${commentToDelete.id}&idea_id=${viewingIdea.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error")
      toast({ title: "Comentario eliminado" })
      setDeleteCommentDialogOpen(false)
      setCommentToDelete(null)
      fetchComments(viewingIdea.id)
      setIdeas(prev => prev.map(i => i.id === viewingIdea.id ? { ...i, comment_count: Math.max(0, i.comment_count - 1) } : i))
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setDeletingComment(false)
    }
  }

  // ── Permisos ───────────────────────────────────────────────────────
  const canEditIdea = (idea: Idea) => idea.created_by_volunteer_id === user.id
  const canDeleteIdea = () => isAdmin
  // Admin o dueño de la idea pueden borrar comentarios
  const canDeleteComment = (idea: Idea) => isAdmin || idea.created_by_volunteer_id === user.id

  // ── Filtrado ───────────────────────────────────────────────────────
  const filteredIdeas = categoryFilter === "all"
    ? ideas
    : ideas.filter(i => i.category === categoryFilter)

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Bloque institucional */}
      <div className="rounded-2xl bg-gradient-to-br from-[#e0f7fa] to-[#b2ebf2] border border-[#4dd0e1]/40 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/70 shadow-sm">
          <Lightbulb className="w-6 h-6 text-[#4dd0e1]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[#00838f] leading-tight">
            Compartí tus ideas y sugerencias para ALMA
          </h2>
          <p className="text-sm text-[#00838f]/80 mt-0.5">
            Cada idea suma. Contanos qué pensás para mejorar nuestra comunidad, la plataforma y el trabajo del equipo.
          </p>
        </div>
        {can(user, "ideas:create") && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva idea
          </Button>
        )}
      </div>

      {/* Filtro por categoría */}
      {existingCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 font-medium mr-1">Filtrar:</span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              categoryFilter === "all"
                ? "bg-[#4dd0e1] text-white border-[#4dd0e1]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#4dd0e1] hover:text-[#4dd0e1]"
            }`}
          >
            Todas
          </button>
          {existingCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                categoryFilter === cat
                  ? "bg-[#4dd0e1] text-white border-[#4dd0e1]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#4dd0e1] hover:text-[#4dd0e1]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid de cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando ideas...</div>
      ) : filteredIdeas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {categoryFilter !== "all"
                ? `No hay ideas en la categoría "${categoryFilter}"`
                : "Todavía no hay ideas. ¡Sé el primero en compartir una!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIdeas.map(idea => (
            <Card
              key={idea.id}
              onClick={() => handleOpenViewModal(idea)}
              className="flex flex-col h-full border border-gray-200 hover:shadow-md hover:border-[#4dd0e1]/50 transition-all duration-200 cursor-pointer group"
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 leading-tight text-base flex-1 min-w-0 break-words group-hover:text-[#00838f] transition-colors">
                    {idea.title}
                  </h3>
                  {/* Acciones en hover — stopPropagation para no abrir el modal */}
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEditIdea(idea) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => handleOpenEdit(idea, e)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-[#4dd0e1] hover:bg-[#4dd0e1]/10"
                        title="Editar idea"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDeleteIdea() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => handleDeleteIdeaClick(idea, e)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar idea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {idea.category && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(idea.category)}`}>
                      <Tag className="w-2.5 h-2.5" />
                      {idea.category}
                    </span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 pb-4 flex-1 flex flex-col justify-between gap-3">
                {/* Preview del cuerpo: truncado */}
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {idea.body.length > BODY_PREVIEW_CHARS
                    ? idea.body.slice(0, BODY_PREVIEW_CHARS) + "…"
                    : idea.body}
                </p>

                {/* Footer de la card */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                  {/* Creador */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium truncate">{idea.created_by_name || "Voluntario"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(idea.created_at)}</span>
                    </div>
                    {/* Contador de comentarios */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="w-3 h-3" />
                      <span>{idea.comment_count}</span>
                    </div>
                  </div>
                  {/* "Ver idea" hint */}
                  <div className="flex items-center gap-1 text-xs text-[#4dd0e1] font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3 h-3" />
                    <span>Ver idea completa</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal: Ver idea + comentarios ─────────────────────────────── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-2xl w-full p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
          {viewingIdea && (
            <>
              {/* Cabecera fija del modal */}
              <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    {viewingIdea.category && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-0.5 ${getCategoryColor(viewingIdea.category)}`}>
                        <Tag className="w-2.5 h-2.5" />
                        {viewingIdea.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-2 leading-snug break-words">
                    {viewingIdea.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium">{viewingIdea.created_by_name || "Voluntario"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(viewingIdea.created_at)}</span>
                    </div>
                  </div>
                </div>
                {/* Acciones: editar/borrar (solo si tiene permisos) */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canEditIdea(viewingIdea) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { handleOpenEdit(viewingIdea, e); setViewModalOpen(false) }}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-[#4dd0e1] hover:bg-[#4dd0e1]/10"
                      title="Editar idea"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDeleteIdea() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { handleDeleteIdeaClick(viewingIdea, e); setViewModalOpen(false) }}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Eliminar idea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Cuerpo scrolleable del modal */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Texto completo de la idea */}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {viewingIdea.body}
                </p>

                {/* Sección de comentarios */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#4dd0e1]" />
                    Comentarios
                    {comments.length > 0 && (
                      <span className="ml-1 text-xs font-normal text-gray-400">({comments.length})</span>
                    )}
                  </h3>

                  {loadingComments ? (
                    <p className="text-sm text-gray-400 py-2">Cargando comentarios...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">
                      Todavía no hay comentarios. ¡Sé el primero en comentar!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map(comment => (
                        <div
                          key={comment.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                        >
                          {/* Avatar inicial */}
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#4dd0e1]/20 flex items-center justify-center">
                            <span className="text-xs font-semibold text-[#00838f]">
                              {(comment.volunteer_name || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-gray-700">
                                {comment.volunteer_name || "Voluntario"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
                                {canDeleteComment(viewingIdea) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCommentClick(comment)}
                                    className="h-5 w-5 p-0 text-gray-300 hover:text-red-500 hover:bg-transparent"
                                    title="Eliminar comentario"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  )}
                </div>
              </div>

              {/* Input de nuevo comentario — fijo al fondo */}
              {can(user, "ideas:comment") && (
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder="Escribí un comentario..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                          e.preventDefault()
                          handleSendComment()
                        }
                      }}
                      rows={2}
                      className="flex-1 resize-none text-sm min-h-[60px]"
                      disabled={sendingComment}
                    />
                    <Button
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || sendingComment}
                      className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white h-[60px] px-3 flex-shrink-0"
                      title="Enviar comentario"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Enter para enviar · Shift+Enter para nueva línea</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Crear / Editar idea ───────────────────────────────── */}
      <Dialog open={formDialogOpen} onOpenChange={open => { if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIdea ? "Editar idea" : "Nueva idea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div>
              <Label htmlFor="idea-title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="idea-title"
                placeholder="¿Cuál es tu idea?"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="idea-body">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="idea-body"
                placeholder="Describí tu idea con más detalle..."
                value={formData.body}
                onChange={e => setFormData({ ...formData, body: e.target.value })}
                rows={5}
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label>
                Categoría <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>

              {formData.category ? (
                /* Chip activo — solo se puede tener una */
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-[#e0f7fa] text-[#00838f] text-xs font-medium px-2.5 py-1 rounded-full">
                    {formData.category}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: "" }))}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              ) : (
                /* Input para crear la única categoría */
                <>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Ej: Comunicación, Eventos... (Enter para agregar)"
                      value={categoryInput}
                      onChange={e => setCategoryInput(e.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      className="flex-1"
                      maxLength={100}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={commitCategory}
                      disabled={!categoryInput.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {existingCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {existingCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                          className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#4dd0e1] hover:text-[#4dd0e1] transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitIdea}
                disabled={submitting || !formData.title.trim() || !formData.body.trim()}
                className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white"
              >
                {submitting ? "Guardando..." : editingIdea ? "Guardar cambios" : "Crear idea"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar idea ───────────────────────────────────── */}
      <ConfirmationDialog
        open={deleteIdeaDialogOpen}
        onOpenChange={setDeleteIdeaDialogOpen}
        onConfirm={handleDeleteIdeaConfirm}
        title="¿Eliminar esta idea?"
        description="Se eliminará también todos sus comentarios. Esta acción no se puede deshacer."
        itemName={ideaToDelete?.title}
        itemType="general"
        action="delete"
        loading={deletingIdea}
      />

      {/* ── Confirmar eliminar comentario ─────────────────────────────── */}
      <ConfirmationDialog
        open={deleteCommentDialogOpen}
        onOpenChange={setDeleteCommentDialogOpen}
        onConfirm={handleDeleteCommentConfirm}
        title="¿Eliminar este comentario?"
        description="Esta acción no se puede deshacer."
        itemType="general"
        action="delete"
        loading={deletingComment}
      />
    </div>
  )
}
