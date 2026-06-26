"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import {
  Plus, Edit, Trash2, Database, Search, X, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown,
  Mail, Phone, MapPin, IdCard, UserCheck, UserX, Heart,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { can } from "@/lib/permissions"
import type { Persona } from "@/lib/data-manager"

// ── Tipos internos ─────────────────────────────────────────────────────
interface PersonaFormData {
  name: string
  last_name: string
  email: string
  cuit: string
  is_member: boolean
  birth_date: string
  address: string
  floor: string
  apartment: string
  city: string
  province: string
  postal_code: string
  phone: string
}

const EMPTY_FORM: PersonaFormData = {
  name: "", last_name: "", email: "", cuit: "", is_member: false, birth_date: "", address: "",
  floor: "", apartment: "", city: "", province: "", postal_code: "", phone: "",
}

const EMPTY_FILTERS = { name: "", last_name: "", cuit: "", city: "", province: "" }

type SortKey = "last_name" | "name" | "cuit" | "city" | "province"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Helpers de presentación ────────────────────────────────────────────
function fullName(p: Persona): string {
  return `${p.last_name ?? ""}${p.last_name && p.name ? ", " : ""}${p.name ?? ""}`.trim() || "—"
}

/** Iniciales para el avatar (apellido + nombre) */
function initials(p: Persona): string {
  const a = (p.last_name ?? "").trim().charAt(0)
  const b = (p.name ?? "").trim().charAt(0)
  return (a + b).toUpperCase() || "?"
}

function fullAddress(p: Persona): string {
  const parts = [
    p.address,
    p.floor ? `Piso ${p.floor}` : "",
    p.apartment ? `Dto ${p.apartment}` : "",
  ].filter(Boolean)
  const line2 = [p.city, p.province, p.postal_code].filter(Boolean).join(", ")
  return [parts.join(" · "), line2].filter(Boolean).join(" — ") || "—"
}

/** Corazón socio/a: lleno en color ALMA si es socia, vacío (contorno) si no */
function MemberHeart({ active, size = "w-4 h-4" }: { active?: boolean; size?: string }) {
  return (
    <Heart
      className={`${size} ${active ? "fill-[#4dd0e1] text-[#4dd0e1]" : "fill-none text-gray-300"}`}
      aria-label={active ? "Socia" : "No socia"}
    />
  )
}

/** Estado derivado según tenga (o no) cuenta de usuario en la plataforma */
function personaStatus(p: Persona): { label: string; cls: string; Icon: typeof UserCheck } {
  if (p.participant_id != null) {
    return { label: "Con usuario", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: UserCheck }
  }
  return { label: "Sin usuario", cls: "bg-gray-100 text-gray-500 border-gray-200", Icon: UserX }
}

// ── Componente principal ───────────────────────────────────────────────
export default function PersonasDbManager({ user }: { user: any }) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)   // acordeón de filtros, cerrado por defecto
  const [expandedId, setExpandedId] = useState<number | null>(null)   // card mobile expandida
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "last_name", dir: "asc" })

  // Modal alta / edición
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [form, setForm] = useState<PersonaFormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Confirmar baja
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Persona | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggle socio/a en caliente
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const canCreate = can(user, "personas:create")
  const canEdit = can(user, "personas:edit")
  const canDelete = can(user, "personas:delete")

  // ── Carga ──────────────────────────────────────────────────────────
  const fetchPersonas = async () => {
    try {
      const res = await fetch("/api/personas/registros")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPersonas(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la base de datos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPersonas() }, [])

  // ── Filtrado + orden (en memoria, responsivo al tipeo) ──────────────
  const filtered = useMemo(() => {
    const match = (val: string | null | undefined, q: string) =>
      !q.trim() || (val ?? "").toLowerCase().includes(q.trim().toLowerCase())

    const list = personas.filter(p =>
      match(p.name, filters.name) &&
      match(p.last_name, filters.last_name) &&
      match(p.cuit, filters.cuit) &&
      match(p.city, filters.city) &&
      match(p.province, filters.province)
    )

    const dir = sort.dir === "asc" ? 1 : -1
    return [...list].sort((a, b) => {
      const av = (a[sort.key] ?? "") as string
      const bv = (b[sort.key] ?? "") as string
      if (!av && bv) return 1   // vacíos al final
      if (av && !bv) return -1
      return av.localeCompare(bv, "es", { sensitivity: "base" }) * dir
    })
  }, [personas, filters, sort])

  const hasActiveFilters = Object.values(filters).some(v => v.trim())

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
    return sort.dir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-[#00838f]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#00838f]" />
  }

  // ── Alta / edición ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (p: Persona) => {
    setEditing(p)
    setForm({
      name: p.name ?? "", last_name: p.last_name ?? "", email: p.email ?? "",
      cuit: p.cuit ?? "", is_member: !!p.is_member, birth_date: p.birth_date ?? "", address: p.address ?? "",
      floor: p.floor ?? "", apartment: p.apartment ?? "", city: p.city ?? "",
      province: p.province ?? "", postal_code: p.postal_code ?? "", phone: p.phone ?? "",
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const setField = (k: keyof PersonaFormData, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Campo requerido", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }
    if (!form.last_name.trim()) {
      toast({ title: "Campo requerido", description: "El apellido es obligatorio", variant: "destructive" })
      return
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      toast({ title: "Email inválido", description: "Revisá el formato del correo electrónico", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(
        editing ? `/api/personas/registros/${editing.id}` : "/api/personas/registros",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al guardar")
      }
      toast({ title: editing ? "Persona actualizada" : "Persona agregada" })
      closeForm()
      fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Baja ────────────────────────────────────────────────────────────
  const askDelete = (p: Persona) => {
    setToDelete(p)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/personas/registros/${toDelete.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error")
      toast({ title: "Persona eliminada" })
      setDeleteOpen(false)
      setToDelete(null)
      fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  // ── Toggle socio/a (un click sobre el corazón) ──────────────────────
  const toggleMember = async (p: Persona) => {
    if (!canEdit || togglingId != null) return
    const next = !p.is_member
    setTogglingId(p.id)
    // Update optimista
    setPersonas(prev => prev.map(x => (x.id === p.id ? { ...x, is_member: next } : x)))
    try {
      const res = await fetch(`/api/personas/registros/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, is_member: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error")
    } catch (error: any) {
      // Revertir ante fallo
      setPersonas(prev => prev.map(x => (x.id === p.id ? { ...x, is_member: !next } : x)))
      toast({ title: "Error", description: error.message || "No se pudo actualizar", variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Banner institucional */}
      <div className="rounded-2xl bg-gradient-to-br from-[#e0f7fa] to-[#b2ebf2] border border-[#4dd0e1]/40 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/70 shadow-sm">
          <Database className="w-6 h-6 text-[#4dd0e1]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[#00838f] leading-tight">Base de datos de personas</h2>
          <p className="text-sm text-[#00838f]/80 mt-0.5">
            Personas que forman parte de la comunidad de ALMA —participantes de talleres, grupos y actividades—. Consultá, agregá y mantené sus datos actualizados.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white flex-shrink-0 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nueva persona
          </Button>
        )}
      </div>

      {/* Filtros (acordeón, cerrado por defecto) */}
      <Card className="border border-gray-200">
        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
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
          <CardContent className="p-4 pt-0">
            {hasActiveFilters && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <FilterInput label="Nombre" value={filters.name} onChange={v => setFilters(f => ({ ...f, name: v }))} />
              <FilterInput label="Apellido" value={filters.last_name} onChange={v => setFilters(f => ({ ...f, last_name: v }))} />
              <FilterInput label="CUIT" value={filters.cuit} onChange={v => setFilters(f => ({ ...f, cuit: v }))} />
              <FilterInput label="Localidad" value={filters.city} onChange={v => setFilters(f => ({ ...f, city: v }))} />
              <FilterInput label="Provincia" value={filters.province} onChange={v => setFilters(f => ({ ...f, province: v }))} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Conteo */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-500">
          {loading ? "Cargando..." : `${filtered.length} ${filtered.length === 1 ? "persona" : "personas"}${hasActiveFilters ? ` (de ${personas.length})` : ""}`}
        </span>
      </div>

      {/* ── Listado de personas (grid de cards) ──────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando base de datos...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {hasActiveFilters ? "No hay personas que coincidan con los filtros." : "Todavía no hay personas cargadas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* ── MOBILE/TABLET: acordeón de cards cerradas (< lg) ── */}
        <div className="lg:hidden space-y-2">
          {filtered.map(p => {
            const st = personaStatus(p)
            const isExpanded = expandedId === p.id
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Fila compacta — siempre visible */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : p.id) } }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors active:bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">{initials(p)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 text-sm truncate leading-snug block">{fullName(p)}</span>
                    {(p.email || p.phone || p.city) && (
                      <span className="text-xs text-gray-400 truncate block mt-0.5">{p.email || p.phone || p.city}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleMember(p) }}
                        disabled={togglingId === p.id}
                        title={p.is_member ? "Socio/a — tocar para quitar" : "No socio/a — tocar para marcar"}
                        aria-pressed={!!p.is_member}
                        className="p-1 rounded-full transition-transform active:scale-90 disabled:opacity-50"
                      >
                        <MemberHeart active={!!p.is_member} />
                      </button>
                    ) : (
                      <MemberHeart active={!!p.is_member} />
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {/* Contenido expandido */}
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                        <st.Icon className="w-3 h-3" />
                        {st.label}
                      </span>
                      <div className="space-y-2 text-sm text-gray-600">
                        {p.cuit && <p className="flex items-center gap-2"><IdCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{p.cuit}</p>}
                        {p.email && <p className="flex items-center gap-2 break-all"><Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{p.email}</p>}
                        {p.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{p.phone}</p>}
                        {(p.address || p.city || p.province) && (
                          <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" /><span className="break-words">{fullAddress(p)}</span></p>
                        )}
                        {!p.email && !p.phone && !p.address && !p.city && !p.province && !p.cuit && (
                          <p className="text-gray-400 italic text-xs">Sin datos de contacto</p>
                        )}
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2 pt-1">
                          {canEdit && (
                            <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="flex-1 h-9 gap-1.5 text-gray-600">
                              <Edit className="w-3.5 h-3.5" /> Editar
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="outline" size="sm" onClick={() => askDelete(p)} className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── DESKTOP: tabla (≥ lg) ── */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-gray-600">
                <SortableTh label="Apellido" k="last_name" onClick={toggleSort} SortIcon={SortIcon} />
                <SortableTh label="Nombre" k="name" onClick={toggleSort} SortIcon={SortIcon} />
                <SortableTh label="CUIT" k="cuit" onClick={toggleSort} SortIcon={SortIcon} />
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <SortableTh label="Localidad" k="city" onClick={toggleSort} SortIcon={SortIcon} />
                <SortableTh label="Provincia" k="province" onClick={toggleSort} SortIcon={SortIcon} />
                <th className="px-4 py-3 font-semibold text-center">Socio/a</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = personaStatus(p)
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-[#4dd0e1]/[0.04] transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.last_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{p.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{p.cuit || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div className="flex flex-col gap-0.5">
                        {p.email && <span className="inline-flex items-center gap-1 truncate max-w-[200px]"><Mail className="w-3 h-3 flex-shrink-0" />{p.email}</span>}
                        {p.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 flex-shrink-0" />{p.phone}</span>}
                        {!p.email && !p.phone && "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.city || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{p.province || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => toggleMember(p)}
                            disabled={togglingId === p.id}
                            title={p.is_member ? "Socio/a — clic para quitar" : "No socio/a — clic para marcar"}
                            aria-pressed={!!p.is_member}
                            className="p-1 rounded-full transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                          >
                            <MemberHeart active={!!p.is_member} />
                          </button>
                        ) : (
                          <div title={p.is_member ? "Socio/a" : "No socio/a"}>
                            <MemberHeart active={!!p.is_member} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                        <st.Icon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-[#4dd0e1] hover:bg-[#4dd0e1]/10">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => askDelete(p)} title="Eliminar"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* ── Modal: Alta / Edición ────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) closeForm() }}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar persona" : "Nueva persona"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" required>
                <Input value={form.name} onChange={e => setField("name", e.target.value)} maxLength={100} placeholder="Nombre" />
              </Field>
              <Field label="Apellido" required>
                <Input value={form.last_name} onChange={e => setField("last_name", e.target.value)} maxLength={100} placeholder="Apellido" />
              </Field>
              <Field label="Correo electrónico">
                <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} maxLength={255} placeholder="correo@ejemplo.com" />
              </Field>
              <Field label="CUIT">
                <Input value={form.cuit} onChange={e => setField("cuit", e.target.value)} maxLength={13} placeholder="XX-XXXXXXXX-X" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={form.birth_date} onChange={e => setField("birth_date", e.target.value)} />
              </Field>
              <Field label="Teléfono (celular)">
                <Input value={form.phone} onChange={e => setField("phone", e.target.value)} maxLength={50} placeholder="Celular" />
              </Field>
            </div>

            {/* Socio/a de ALMA */}
            <button
              type="button"
              role="switch"
              aria-checked={form.is_member}
              onClick={() => setForm(prev => ({ ...prev, is_member: !prev.is_member }))}
              className={`w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                form.is_member ? "border-[#4dd0e1] bg-[#e0f7fa]/50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MemberHeart active={form.is_member} size="w-5 h-5" />
                <span>
                  <span className="block text-sm font-medium text-gray-700">Socio/a de ALMA</span>
                  <span className="block text-xs text-gray-400">Marcá si la persona es socia de la organización</span>
                </span>
              </span>
              <span className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${form.is_member ? "bg-[#4dd0e1]" : "bg-gray-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.is_member ? "translate-x-5" : "translate-x-1"}`} />
              </span>
            </button>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Domicilio</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Calle y número">
                    <Input value={form.address} onChange={e => setField("address", e.target.value)} maxLength={200} placeholder="Calle 1234" />
                  </Field>
                </div>
                <Field label="Piso">
                  <Input value={form.floor} onChange={e => setField("floor", e.target.value)} maxLength={10} placeholder="Piso" />
                </Field>
                <Field label="Depto.">
                  <Input value={form.apartment} onChange={e => setField("apartment", e.target.value)} maxLength={20} placeholder="Depto." />
                </Field>
                <Field label="Localidad">
                  <Input value={form.city} onChange={e => setField("city", e.target.value)} maxLength={100} placeholder="Localidad" />
                </Field>
                <Field label="Provincia">
                  <Input value={form.province} onChange={e => setField("province", e.target.value)} maxLength={100} placeholder="Provincia" />
                </Field>
                <Field label="Código postal">
                  <Input value={form.postal_code} onChange={e => setField("postal_code", e.target.value)} maxLength={10} placeholder="CP" />
                </Field>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-1">* Campos obligatorios</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeForm} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white">
                {submitting ? "Guardando..." : editing ? "Guardar cambios" : "Agregar persona"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar baja ───────────────────────────────────────────── */}
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar esta persona?"
        description="Se eliminará el registro de la base de datos. Esta acción no se puede deshacer."
        itemName={toDelete ? fullName(toDelete) : undefined}
        itemType="general"
        action="delete"
        loading={deleting}
      />
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────
function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={label} className="mt-1 h-9" />
    </div>
  )
}

function SortableTh({
  label, k, onClick, SortIcon,
}: {
  label: string; k: SortKey
  onClick: (k: SortKey) => void; SortIcon: (p: { k: SortKey }) => React.ReactNode
}) {
  return (
    <th className="px-4 py-3 font-semibold">
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1.5 hover:text-[#00838f] transition-colors">
        {label}
        <SortIcon k={k} />
      </button>
    </th>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
