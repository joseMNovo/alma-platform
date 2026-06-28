"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Search, Edit, Trash2, Users, Calendar, UserCog, Loader2, UserCheck, Check, ChevronDown, LayoutGrid, List, X } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { can } from "@/lib/permissions"
import { toast } from "@/hooks/use-toast"
import type { Group, GroupHistorySuggestion } from "@/lib/data-manager"

interface AttendeeRow {
  person_name: string
  person_age: string
  patient_name: string
  patient_age: string
  relationship: string
  problematica: string
  notes: string
  person_profile_id: number | null
}

const emptyAttendee = (): AttendeeRow => ({
  person_name: "",
  person_age: "",
  patient_name: "",
  patient_age: "",
  relationship: "",
  problematica: "",
  notes: "",
  person_profile_id: null,
})

const toIntOrNull = (v: string) => {
  const n = Number.parseInt(v)
  return Number.isFinite(n) ? n : null
}

export default function HistorialesManager({
  user,
  groups,
  onBack,
}: {
  user: any
  groups: Group[]
  onBack: () => void
}) {
  const [histories, setHistories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterGroupId, setFilterGroupId] = useState<string>("all")
  const [filtersOpen, setFiltersOpen] = useState(false)        // acordeón de filtros, cerrado por defecto
  const [viewMode, setViewMode] = useState<"cards" | "list">("list")
  const hasActiveFilters = search.trim() !== "" || filterGroupId !== "all"

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const defaultGroupId = () => (groups[0] ? String(groups[0].id) : "")
  const [form, setForm] = useState({
    group_id: defaultGroupId(),
    title: "",
    session_date: "",
    summary: "",
  })
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [draft, setDraft] = useState<AttendeeRow>(emptyAttendee())
  const [editingAttendeeIdx, setEditingAttendeeIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  // Autocompletado de nombre de asistente (sutil)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestItems, setSuggestItems] = useState<GroupHistorySuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestSeq = useRef(0)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<any>(null)

  const fetchHistories = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      if (filterGroupId !== "all") params.set("group_id", filterGroupId)
      const res = await fetch(`/api/grupos/historiales?${params.toString()}`)
      const data = await res.json()
      setHistories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching historiales:", error)
      setHistories([])
    } finally {
      setLoading(false)
    }
  }, [search, filterGroupId])

  // Debounce de la búsqueda + filtro
  useEffect(() => {
    const t = setTimeout(fetchHistories, 300)
    return () => clearTimeout(t)
  }, [fetchHistories])

  const resetForm = () => {
    setForm({ group_id: defaultGroupId(), title: "", session_date: "", summary: "" })
    setAttendees([])
    setDraft(emptyAttendee())
    setEditingAttendeeIdx(null)
    setSuggestOpen(false)
    setSuggestItems([])
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (h: any) => {
    setEditing(h)
    setForm({
      group_id: h.group_id ? String(h.group_id) : defaultGroupId(),
      title: h.title || "",
      session_date: h.session_date || "",
      summary: h.summary || "",
    })
    setAttendees(
      (h.attendees || []).map((a: any) => ({
        person_name: a.person_name || "",
        person_age: a.person_age != null ? String(a.person_age) : "",
        patient_name: a.patient_name || "",
        patient_age: a.patient_age != null ? String(a.patient_age) : "",
        relationship: a.relationship || "",
        problematica: a.problematica || "",
        notes: a.notes || "",
        person_profile_id: a.person_profile_id ?? null,
      })),
    )
    setDraft(emptyAttendee())
    setEditingAttendeeIdx(null)
    setSuggestOpen(false)
    setSuggestItems([])
    setDialogOpen(true)
  }

  const updateDraft = (field: keyof AttendeeRow, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  // Confirma el asistente en edición → lo agrega/actualiza en la lista y limpia el draft.
  const commitDraft = (): boolean => {
    if (!draft.person_name.trim()) {
      toast({ title: "Falta el nombre", description: "Escribí el nombre de la persona.", variant: "destructive" })
      nameInputRef.current?.focus()
      return false
    }
    const row: AttendeeRow = { ...draft, person_name: draft.person_name.trim() }
    setAttendees((prev) =>
      editingAttendeeIdx != null ? prev.map((a, i) => (i === editingAttendeeIdx ? row : a)) : [...prev, row],
    )
    setDraft(emptyAttendee())
    setEditingAttendeeIdx(null)
    setSuggestOpen(false)
    setSuggestItems([])
    setTimeout(() => nameInputRef.current?.focus(), 0)
    return true
  }

  const editAttendeeRow = (idx: number) => {
    setDraft({ ...attendees[idx] })
    setEditingAttendeeIdx(idx)
    setSuggestOpen(false)
    setSuggestItems([])
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const cancelDraftEdit = () => {
    setDraft(emptyAttendee())
    setEditingAttendeeIdx(null)
    setSuggestOpen(false)
    setSuggestItems([])
  }

  const removeAttendeeRow = (idx: number) => {
    setAttendees((prev) => prev.filter((_, i) => i !== idx))
    if (editingAttendeeIdx === idx) cancelDraftEdit()
    else if (editingAttendeeIdx != null && idx < editingAttendeeIdx) setEditingAttendeeIdx(editingAttendeeIdx - 1)
  }

  // ── Autocompletado de nombre de asistente (sobre el draft) ───────────────
  const onDraftNameChange = (value: string) => {
    // Editar el nombre a mano rompe cualquier vínculo previo a una persona.
    setDraft((d) => ({ ...d, person_name: value, person_profile_id: null }))
    setSuggestOpen(true)

    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    const term = value.trim()
    if (term.length < 2) {
      setSuggestItems([])
      setSuggestLoading(false)
      return
    }
    setSuggestLoading(true)
    const seq = ++suggestSeq.current
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/grupos/historiales/suggest?q=${encodeURIComponent(term)}`)
        const data = await res.json()
        if (seq !== suggestSeq.current) return // respuesta vieja, descartar
        setSuggestItems(Array.isArray(data) ? data : [])
      } catch {
        if (seq === suggestSeq.current) setSuggestItems([])
      } finally {
        if (seq === suggestSeq.current) setSuggestLoading(false)
      }
    }, 250)
  }

  const pickSuggestion = (s: GroupHistorySuggestion) => {
    setDraft((d) => ({ ...d, person_name: s.label, person_profile_id: s.person_profile_id ?? null }))
    setSuggestOpen(false)
    setSuggestItems([])
  }

  const closeSuggestions = () => {
    // pequeño delay para que el onMouseDown de la sugerencia alcance a dispararse
    setTimeout(() => setSuggestOpen(false), 150)
  }

  // Enter en el nombre: si hay sugerencias abiertas elige la primera; si no, confirma.
  const onNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (suggestOpen && suggestItems.length > 0) pickSuggestion(suggestItems[0])
      else commitDraft()
    }
  }

  // Enter en inputs simples confirma; en el textarea solo con Ctrl/Cmd+Enter.
  const onFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitDraft()
    }
  }
  const onTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      commitDraft()
    }
  }

  const handleSave = async () => {
    // Si quedó un asistente a medio cargar en el draft (con nombre), lo incluimos.
    const allRows = [...attendees]
    if (draft.person_name.trim()) {
      const row: AttendeeRow = { ...draft, person_name: draft.person_name.trim() }
      if (editingAttendeeIdx != null) allRows[editingAttendeeIdx] = row
      else allRows.push(row)
    }

    const cleanAttendees = allRows
      .filter((a) => a.person_name.trim())
      .map((a) => ({
        person_name: a.person_name.trim(),
        person_age: toIntOrNull(a.person_age),
        patient_name: a.patient_name.trim() || null,
        patient_age: toIntOrNull(a.patient_age),
        relationship: a.relationship.trim() || null,
        problematica: a.problematica.trim() || null,
        notes: a.notes.trim() || null,
        person_profile_id: a.person_profile_id,
      }))

    if (!form.group_id) {
      toast({ title: "Falta el grupo", description: "Elegí a qué grupo pertenece la ficha.", variant: "destructive" })
      return
    }
    if (!form.session_date) {
      toast({ title: "Falta la fecha", description: "Indicá la fecha del encuentro.", variant: "destructive" })
      document.getElementById("session_date")?.focus()
      return
    }
    if (!form.summary.trim()) {
      toast({ title: "Faltan los comentarios", description: "Escribí los comentarios del encuentro.", variant: "destructive" })
      document.getElementById("summary")?.focus()
      return
    }

    const selectedGroup = groups.find((g) => String(g.id) === form.group_id)
    const payload = {
      group_id: form.group_id ? Number.parseInt(form.group_id) : null,
      group_name: selectedGroup ? selectedGroup.name : null,
      title: form.title.trim() || null,
      session_date: form.session_date || null,
      summary: form.summary.trim() || null,
      attendees: cleanAttendees,
    }

    setSaving(true)
    try {
      const url = editing ? `/api/grupos/historiales/${editing.id}` : "/api/grupos/historiales"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        fetchHistories()
        toast({ title: editing ? "Historial actualizado" : "Historial guardado" })
      } else {
        const d = await res.json().catch(() => ({}))
        toast({ title: "Error al guardar", description: d.error || "No se pudo guardar", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error de conexión", description: "No se pudo conectar con el servidor", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!toDelete) return
    try {
      const res = await fetch(`/api/grupos/historiales/${toDelete.id}`, { method: "DELETE" })
      if (res.ok) fetchHistories()
    } catch (error) {
      console.error("Error deleting historial:", error)
    } finally {
      setDeleteOpen(false)
      setToDelete(null)
    }
  }

  const fmtDate = (d?: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : null

  // Columnas de la lista dentro de cada recuadro de grupo: Fecha · Cargó · Título · Asist.
  const listGridClass = "grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1.8fr)_auto] gap-3 items-center"

  // Agrupa los historiales (ya filtrados) por grupo, en el orden de `groups`.
  const buckets = groups
    .map((g) => ({ group: g, items: histories.filter((h) => h.group_id === g.id) }))
    .filter((b) => b.items.length > 0)
  const leftover = histories.filter((h) => !groups.some((g) => g.id === h.group_id))
  if (leftover.length) buckets.push({ group: { id: -1, name: "Sin grupo" } as Group, items: leftover })

  // Tinte sutil por grupo: virtual → violeta, presencial (default) → celeste.
  const groupTheme = (name: string) =>
    /virtual/i.test(name || "")
      ? { border: "border-violet-200", header: "bg-violet-50/60", title: "text-violet-800", badge: "bg-violet-400" }
      : { border: "border-cyan-200", header: "bg-cyan-50/60", title: "text-cyan-800", badge: "bg-[#4dd0e1]" }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#4dd0e1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Volver a Grupos
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Fichero de historiales</h2>
          <p className="text-sm text-gray-500">Minutas de encuentros de grupos de apoyo</p>
        </div>
        {can(user, "historiales:create") && (
          <Button onClick={openCreate} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nueva ficha
          </Button>
        )}
      </div>

      {/* Filtros (acordeón, cerrado por defecto) */}
      <Card className="border border-gray-200">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="w-full flex items-center gap-2 p-4 text-left"
        >
          <Search className="w-4 h-4 text-[#4dd0e1] flex-shrink-0" />
          <span className="text-sm font-medium text-gray-600">Filtros de búsqueda</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[#4dd0e1] flex-shrink-0" title="Hay filtros activos" />
          )}
          <ChevronDown className={`ml-auto w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {filtersOpen && (
          <CardContent className="p-4 pt-0 space-y-3">
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setSearch(""); setFilterGroupId("all") }}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nombre, pariente, vínculo, problemática o comentarios…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterGroupId} onValueChange={setFilterGroupId}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Todos los grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Conteo + toggle de vista */}
      {!loading && histories.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-gray-500">
            {histories.length} {histories.length === 1 ? "historial" : "historiales"}
          </span>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Vista tarjetas"
              className={`p-1.5 transition-colors ${viewMode === "cards" ? "bg-[#4dd0e1] text-white" : "bg-white text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Vista lista"
              className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-[#4dd0e1] text-white" : "bg-white text-gray-400 hover:text-gray-600"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando historiales…</div>
      ) : histories.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay historiales</h3>
          <p className="text-gray-600">
            {hasActiveFilters ? "Probá con otra búsqueda." : "Cargá la primera ficha de un encuentro."}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {histories.map((h) => (
            <Card key={h.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setViewing(h); setDetailOpen(true) }}>
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base hover:text-[#4dd0e1] transition-colors">
                    {h.title || h.group_name || "Encuentro"}
                  </CardTitle>
                  <Badge className="bg-[#4dd0e1] flex-shrink-0">
                    <Users className="w-3 h-3 mr-1" />
                    {h.attendee_count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                {h.group_name && <p className="font-medium text-gray-700">{h.group_name}</p>}
                {fmtDate(h.session_date) && (
                  <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmtDate(h.session_date)}</p>
                )}
                {h.coordinator_name && (
                  <p className="flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5" />{h.coordinator_name}</p>
                )}
                {h.summary && <p className="line-clamp-2 text-gray-500">{h.summary}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // ── Vista lista: un recuadro por grupo (presencial / virtual / …) con scroll interno ──
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {buckets.map((b) => {
            const t = groupTheme(b.group.name)
            return (
            <div key={b.group.id} className={`border ${t.border} rounded-xl bg-white overflow-hidden`}>
              {/* Categoría madre */}
              <div className={`flex items-center justify-between px-4 py-2.5 ${t.header} border-b border-gray-100`}>
                <h3 className={`font-semibold text-sm ${t.title} truncate`}>{b.group.name}</h3>
                <Badge className={`${t.badge} flex-shrink-0`}>
                  {b.items.length} {b.items.length === 1 ? "ficha" : "fichas"}
                </Badge>
              </div>

              {/* Lista con scroll propio */}
              <div className="max-h-80 overflow-auto">
                <div className="min-w-[440px]">
                  {/* Encabezados de columna (sticky) */}
                  <div className={`${listGridClass} px-4 py-2 bg-white sticky top-0 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-400 z-10`}>
                    <span>Fecha</span>
                    <span>Cargó</span>
                    <span>Título</span>
                    <span className="text-right">Asist.</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {b.items.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => { setViewing(h); setDetailOpen(true) }}
                        className={`${listGridClass} w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors`}
                      >
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                          {fmtDate(h.session_date) ? (<><Calendar className="w-3 h-3" />{fmtDate(h.session_date)}</>) : "—"}
                        </span>
                        <span className="truncate text-xs text-gray-500 inline-flex items-center gap-1">
                          {h.created_by_name ? (<><UserCog className="w-3 h-3 shrink-0" /><span className="truncate">{h.created_by_name}</span></>) : "—"}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900">{h.title || "—"}</span>
                        <span className="justify-self-end">
                          <Badge className={t.badge}>
                            <Users className="w-3 h-3 mr-1" />
                            {h.attendee_count}
                          </Badge>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title || viewing?.group_name || "Encuentro"}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {viewing.group_name && <span className="font-medium text-gray-700">{viewing.group_name}</span>}
                {fmtDate(viewing.session_date) && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(viewing.session_date)}</span>}
                {viewing.coordinator_name && <span className="flex items-center gap-1"><UserCog className="w-3.5 h-3.5" />{viewing.coordinator_name}</span>}
              </div>

              {viewing.summary && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Comentarios</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewing.summary}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Asistentes ({viewing.attendees?.length || 0})
                </p>
                <div className="space-y-3">
                  {(viewing.attendees || []).map((a: any) => (
                    <div key={a.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                      <p className="font-semibold text-gray-900">
                        {a.person_name}{a.person_age != null ? ` (${a.person_age})` : ""}
                      </p>
                      {(a.patient_name || a.relationship) && (
                        <p className="text-gray-600">
                          {a.relationship ? `${a.relationship} de ` : "Pariente: "}
                          {a.patient_name || "—"}{a.patient_age != null ? ` (${a.patient_age})` : ""}
                        </p>
                      )}
                      {a.problematica && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{a.problematica}</p>}
                      {a.notes && <p className="text-gray-400 italic mt-1 whitespace-pre-wrap">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2">
                {can(user, "historiales:delete") && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { setToDelete(viewing); setDetailOpen(false); setDeleteOpen(true) }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                  </Button>
                )}
                {can(user, "historiales:edit") && (
                  <Button onClick={() => { setDetailOpen(false); openEdit(viewing) }} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                    <Edit className="w-4 h-4 mr-1" /> Editar
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-[96vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{editing ? "Editar historial" : "Nueva ficha de encuentro"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr] overflow-y-auto lg:overflow-hidden">
            {/* ── Columna izquierda: datos del encuentro ── */}
            <div className="p-6 space-y-4 border-b lg:border-b-0 lg:border-r bg-gray-50/60 lg:overflow-y-auto">
              <div className="space-y-2">
                <Label>Grupo *</Label>
                {groups.length <= 2 ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => {
                      const active = form.group_id === String(g.id)
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setForm({ ...form, group_id: String(g.id) })}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            active
                              ? "bg-[#4dd0e1] border-[#4dd0e1] text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:border-[#4dd0e1] hover:text-[#4dd0e1]"
                          }`}
                        >
                          {g.name}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Select value={form.group_id} onValueChange={(v) => setForm({ ...form, group_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_date">Fecha del encuentro *</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título (opcional)</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Cierre de ciclo otoño"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Comentarios *</Label>
                <Textarea
                  id="summary"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={7}
                  placeholder="Cómo fue el encuentro, temas que surgieron…"
                />
              </div>
            </div>

            {/* ── Columna derecha: asistentes (carga rápida) ── */}
            <div className="flex flex-col min-h-0">
              {/* Carga rápida */}
              <div className="p-5 border-b bg-white shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#4dd0e1]" />
                    {editingAttendeeIdx != null ? "Editando asistente" : "Agregar asistente"}
                  </h3>
                  <span className="text-[11px] text-gray-400">Enter para agregar</span>
                </div>

                <div className="grid grid-cols-[1fr_84px] gap-2">
                  <div className="relative">
                    <Input
                      ref={nameInputRef}
                      placeholder="Nombre *"
                      value={draft.person_name}
                      onChange={(e) => onDraftNameChange(e.target.value)}
                      onKeyDown={onNameKeyDown}
                      onFocus={() => setSuggestOpen(true)}
                      onBlur={closeSuggestions}
                      autoComplete="off"
                      className={draft.person_profile_id ? "pr-8 border-[#4dd0e1]" : "pr-8"}
                    />
                    {suggestLoading ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : draft.person_profile_id ? (
                      <UserCheck className="w-4 h-4 text-[#4dd0e1] absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : null}

                    {suggestOpen && !suggestLoading && suggestItems.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {suggestItems.map((s, si) => (
                          <button
                            key={`${s.label}-${si}`}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <span className="text-gray-800 truncate">{s.label}</span>
                            <span className={`text-[11px] flex-shrink-0 ${s.source === "participante" ? "text-[#4dd0e1]" : "text-gray-400"}`}>
                              · {s.source === "participante" ? "participante" : "en otro fichero"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder="Edad"
                    value={draft.person_age}
                    onChange={(e) => updateDraft("person_age", e.target.value)}
                    onKeyDown={onFieldKeyDown}
                  />
                </div>

                <div className="grid grid-cols-[1fr_84px] gap-2">
                  <Input
                    placeholder="Pariente enfermo"
                    value={draft.patient_name}
                    onChange={(e) => updateDraft("patient_name", e.target.value)}
                    onKeyDown={onFieldKeyDown}
                  />
                  <Input
                    type="number"
                    placeholder="Edad"
                    value={draft.patient_age}
                    onChange={(e) => updateDraft("patient_age", e.target.value)}
                    onKeyDown={onFieldKeyDown}
                  />
                </div>

                <Input
                  placeholder="Vínculo (hijo/a, hermano/a, cónyuge…)"
                  value={draft.relationship}
                  onChange={(e) => updateDraft("relationship", e.target.value)}
                  onKeyDown={onFieldKeyDown}
                />

                <Textarea
                  placeholder="Qué la llevó al grupo (Ctrl+Enter para agregar)"
                  value={draft.problematica}
                  onChange={(e) => updateDraft("problematica", e.target.value)}
                  onKeyDown={onTextareaKeyDown}
                  rows={2}
                />

                <div className="flex gap-2 pt-0.5">
                  {editingAttendeeIdx != null && (
                    <Button type="button" variant="outline" size="sm" onClick={cancelDraftEdit}>
                      Cancelar
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={commitDraft}
                    className="flex-1 bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                  >
                    {editingAttendeeIdx != null ? (
                      <><Check className="w-4 h-4 mr-1.5" /> Guardar cambios</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-1.5" /> Agregar a la lista</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Lista de asistentes cargados */}
              <div className="flex-1 min-h-0 lg:overflow-y-auto p-5 bg-gray-50/60">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asistentes cargados</p>
                  <Badge className="bg-[#4dd0e1]">{attendees.length}</Badge>
                </div>

                {attendees.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-10 leading-relaxed">
                    Todavía no agregaste asistentes.<br />Cargá el primero arriba.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendees.map((a, idx) => {
                      const isEditing = editingAttendeeIdx === idx
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 text-sm flex items-start gap-3 transition-colors ${
                            isEditing ? "border-[#4dd0e1] bg-cyan-50/60" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                              {a.person_profile_id && <UserCheck className="w-3.5 h-3.5 text-[#4dd0e1] shrink-0" />}
                              <span className="truncate">
                                {a.person_name}{a.person_age ? ` (${a.person_age})` : ""}
                              </span>
                            </p>
                            {(a.patient_name || a.relationship) && (
                              <p className="text-gray-500 text-xs truncate">
                                {a.relationship ? `${a.relationship} de ` : "Pariente: "}
                                {a.patient_name || "—"}{a.patient_age ? ` (${a.patient_age})` : ""}
                              </p>
                            )}
                            {a.problematica && <p className="text-gray-400 text-xs line-clamp-1">{a.problematica}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => editAttendeeRow(idx)}
                              className="p-1.5 rounded text-gray-400 hover:text-[#4dd0e1] hover:bg-gray-100 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAttendeeRow(idx)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Quitar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
              {saving ? "Guardando…" : editing ? "Actualizar" : "Guardar ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        itemName={toDelete?.title || toDelete?.group_name || "este historial"}
        itemType="historial"
      />
    </div>
  )
}
