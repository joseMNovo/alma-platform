"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import FilterChip from "@/components/ui/filter-chip"
import BotonFlotante from "@/components/ui/boton-flotante"
import { HojaFiltros, ChipsActivos } from "@/components/ui/filtros-mobile"
import {
  Plus, Edit, Trash2, Database, Search, X, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, Send, Loader2, AlertTriangle,
  Mail, Phone, MapPin, IdCard, UserCheck, UserX, BadgeCheck, Users, UserCircle, LogIn,
  ShieldCheck, Cake, KeyRound, MailCheck,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { can } from "@/lib/permissions"
import type { Persona } from "@/lib/data-manager"
import { VolunteerFlower, ParticipantMark } from "@/components/personas/role-marks"
import { edadDesde, edadTexto, fechaCorta } from "@/lib/edad"

// ── Tipos internos ─────────────────────────────────────────────────────
interface PersonaFormData {
  name: string
  last_name: string
  email: string
  cuit: string
  dni: string
  is_member: boolean
  birth_date: string
  address: string
  floor: string
  apartment: string
  city: string
  province: string
  postal_code: string
  phone: string
  /** Solo se usa si la persona tiene ficha de voluntaria. Vive en `voluntarios`. */
  specialties: string[]
}

const EMPTY_FORM: PersonaFormData = {
  name: "", last_name: "", email: "", cuit: "", dni: "", is_member: false, birth_date: "", address: "",
  floor: "", apartment: "", city: "", province: "", postal_code: "", phone: "", specialties: [],
}

// Filtros categóricos. "all" = sin filtrar.
const EMPTY_SEG = { member: "all", volunteer: "all", account: "all", pendiente: "all" }

type SortKey = "last_name" | "name" | "cuit" | "city" | "province"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Helpers de presentación ────────────────────────────────────────────
function fullName(p: Persona): string {
  return `${p.name ?? ""} ${p.last_name ?? ""}`.trim() || "—"
}

/** Iniciales para el avatar (nombre + apellido) */
function initials(p: Persona): string {
  const a = (p.name ?? "").trim().charAt(0)
  const b = (p.last_name ?? "").trim().charAt(0)
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

/** Marca socio/a: insignia llena en color ALMA si es socia, contorno gris si no */
function MemberMark({ active, size = "w-4 h-4" }: { active?: boolean; size?: string }) {
  return (
    <BadgeCheck
      className={`${size} ${active ? "fill-[#5ec0cf] text-white" : "fill-none text-gray-300"}`}
      aria-label={active ? "Socia" : "No socia"}
    />
  )
}


/**
 * Los botones de la ficha abierta. Están acá y no repetidos en cada botón
 * para que no se vayan separando de a poco: alcanza con que uno quede con
 * otro borde para que la fila entera se vea desprolija.
 *
 * Todos iguales y sin color propio: el color se guarda para el único que
 * pide una decisión ahora.
 */
const ACCION_FICHA =
  "h-9 gap-1.5 border-alma/30 bg-white/70 text-alma-tinta hover:border-alma hover:bg-white hover:text-alma-fuerte"
const ACCION_URGENTE = "h-9 gap-1.5 bg-amber-500 text-white hover:bg-amber-600"

/**
 * El color de la franja del borde izquierdo de la fila (y de la tarjeta en
 * celular). Es lo que deja distinguir un voluntario de un participante
 * recorriendo la lista con la vista, sin leer.
 *
 * Los dos colores salen del manual: el turquesa de marca y el lavanda. No se
 * usa el turquesa oscuro porque al lado del claro se confunden, y la gracia
 * es justamente que no se confundan.
 */
function franjaDeRol(p: Persona): string {
  if (p.is_volunteer) return "border-l-alma"
  if (p.participant_id != null) return "border-l-alma-lavanda"
  return "border-l-transparent"
}

/**
 * El rol de la persona, en una palabra.
 *
 * Reemplaza a las columnas «Voluntario/a» y «Participante», que eran dos
 * íconos parecidos en dos lugares distintos. Como los roles son excluyentes
 * (voluntario XOR participante, ver espejo_persona.py), una sola etiqueta los
 * dice a los dos sin perder nada.
 *
 * Si se puede editar, el chip ES el control: tocarlo habilita como
 * voluntario/a, o le saca el rol si ya lo es. Antes eso era "hacer clic en la
 * flor gris", que no se le ocurría a nadie.
 */
function ChipRol({ p, editable, onElegirRol, onHabilitar, onQuitar }: {
  p: Persona
  editable: boolean
  /** Sin ningún rol: hay dos caminos posibles, se pregunta cuál. */
  onElegirRol: () => void
  /** Ya es participante: el único camino que queda es voluntario/a. */
  onHabilitar: () => void
  onQuitar: () => void
}) {
  const info = p.is_volunteer
    ? {
        texto: "Voluntario/a",
        cls: "border-alma/60 bg-alma-suave text-alma-fuerte",
        icono: <VolunteerFlower active size="w-3.5 h-3.5" />,
        titulo: editable ? "Voluntario/a — clic para quitarle el rol" : "Voluntario/a",
        accion: onQuitar,
      }
    : p.participant_id != null
    ? {
        texto: "Participante",
        cls: "border-alma-lavanda/60 bg-alma-lavanda/10 text-alma-tinta",
        icono: <ParticipantMark active size="w-3.5 h-3.5" />,
        titulo: editable ? "Participante — clic para habilitar como voluntario/a" : "Participante",
        accion: onHabilitar,
      }
    : {
        texto: "Sin rol",
        cls: "border-gray-200 bg-gray-50 text-gray-400",
        icono: <VolunteerFlower active={false} size="w-3.5 h-3.5" />,
        titulo: editable ? "Sin rol — clic para darle uno" : "Sin rol",
        accion: onElegirRol,
      }

  const base = `inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium leading-none whitespace-nowrap ${info.cls}`
  const contenido = <>{info.icono}{info.texto}</>

  if (!editable) return <span title={info.titulo} className={base}>{contenido}</span>

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); info.accion() }}
      title={info.titulo}
      className={`${base} transition-all hover:ring-2 hover:ring-alma/30`}
    >
      {contenido}
    </button>
  )
}

/** Tiene cuenta en la plataforma si tiene login de participante (participant_id)
 *  O ficha de voluntario (volunteer_id) — los voluntarios se loguean por la tabla
 *  `voluntarios`, no por `participants`. */
function hasUserAccount(p: Persona): boolean {
  return p.participant_id != null || p.volunteer_id != null
}

/** Estado derivado según tenga (o no) cuenta de usuario en la plataforma */
function personaStatus(p: Persona): { label: string; cls: string; Icon: typeof UserCheck } {
  if (hasUserAccount(p)) {
    return { label: "Con usuario", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: UserCheck }
  }
  return { label: "Sin usuario", cls: "bg-gray-100 text-gray-500 border-gray-200", Icon: UserX }
}

// ── Componente principal ───────────────────────────────────────────────
export default function PersonasDbManager({ user }: { user: any }) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)

  // Una sola caja de búsqueda: antes eran cinco campos (nombre, apellido,
  // CUIT, localidad, provincia) escondidos en un acordeón. Buscar por todos a
  // la vez es lo que la gente intenta hacer igual.
  const [busqueda, setBusqueda] = useState("")
  const [seg, setSeg] = useState(EMPTY_SEG)   // socio / voluntario / estado
  const [expandedId, setExpandedId] = useState<number | null>(null)   // card mobile expandida
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" })

  // Modal alta / edición. En alta (editing=null) el modal tiene DOS pestañas
  // (participante / voluntario); en edición muestra la ficha simple.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [form, setForm] = useState<PersonaFormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [createTab, setCreateTab] = useState<"participante" | "voluntario">("participante")
  // Pivote de la pestaña participante: con invitación (usuario real) vs. solo
  // registro de datos (persona suelta, sin cuenta).
  const [sendInvite, setSendInvite] = useState(false)

  // Invitar a la plataforma desde el tablero (persona con email y sin cuenta)
  const [invitingId, setInvitingId] = useState<number | null>(null)

  // ── Lo que vivía en Voluntarios y Participantes ─────────────────────
  // Tres acciones que obligaban a cambiar de módulo para operar sobre la misma
  // persona que ya tenías en pantalla.
  const [pinTarget, setPinTarget] = useState<Persona | null>(null)
  // Persona sin ningún rol a la que le estamos por dar uno. Son dos caminos
  // distintos (ficha de voluntario/a vs. invitación por mail), así que hay
  // que preguntar en vez de asumir.
  const [rolTarget, setRolTarget] = useState<Persona | null>(null)       // fijar PIN
  const [aprobarTarget, setAprobarTarget] = useState<Persona | null>(null)
  const [aprobando, setAprobando] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<number | null>(null)  // verificación

  // Revertir voluntario/a → participante (sacar la flor)
  const [revertOpen, setRevertOpen] = useState(false)
  const [revertPersona, setRevertPersona] = useState<Persona | null>(null)
  const [reverting, setReverting] = useState(false)

  // Confirmar baja
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Persona | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggle socio/a en caliente
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const canCreate = can(user, "personas:create")
  const canEdit = can(user, "personas:edit")
  const canDelete = can(user, "personas:delete")
  const isAdmin = user.role === "admin"

  // Impersonar: el admin entra a la app como esa persona (voluntario/a o
  // participante), para ver exactamente lo que ve. Si tiene las dos fichas,
  // primero pregunta cuál. Requiere email (es la identidad mínima).
  const [impersonateChoice, setImpersonateChoice] = useState<Persona | null>(null)
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null)

  const startImpersonate = async (p: Persona, targetType: "voluntario" | "participante") => {
    setImpersonatingId(p.id)
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: p.id, target_type: targetType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo ingresar como esa persona")
      localStorage.setItem("alma_user", JSON.stringify(data.user))
      document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
      window.location.href = "/calendarios"
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
      setImpersonatingId(null)
    }
  }

  const handleImpersonateClick = (p: Persona) => {
    if (p.volunteer_id && p.participant_id) {
      setImpersonateChoice(p)
    } else if (p.volunteer_id) {
      startImpersonate(p, "voluntario")
    } else if (p.participant_id) {
      startImpersonate(p, "participante")
    }
  }

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
    const q = busqueda.trim().toLowerCase()
    // Busca en todo lo que alguien puede tener a mano para encontrar a una
    // persona: nombre, contacto, documento o dónde vive.
    const matchTexto = (p: Persona) =>
      !q ||
      [p.name, p.last_name, p.email, p.cuit, p.dni, p.phone, p.city, p.province].some(v =>
        (v ?? "").toLowerCase().includes(q),
      )

    const matchSeg = (p: Persona) =>
      (seg.member === "all" || (seg.member === "yes" ? !!p.is_member : !p.is_member)) &&
      (seg.volunteer === "all" || (seg.volunteer === "yes" ? !!p.is_volunteer : !p.is_volunteer)) &&
      (seg.account === "all" || (seg.account === "with" ? hasUserAccount(p) : !hasUserAccount(p))) &&
      // La cola de aprobaciones, dentro de la misma lista: es el único filtro
      // que señala trabajo pendiente, no una característica de la persona.
      (seg.pendiente === "all" || p.volunteer_status === "pendiente")

    const list = personas.filter(p => matchTexto(p) && matchSeg(p))

    const dir = sort.dir === "asc" ? 1 : -1
    return [...list].sort((a, b) => {
      const av = (a[sort.key] ?? "") as string
      const bv = (b[sort.key] ?? "") as string
      if (!av && bv) return 1   // vacíos al final
      if (av && !bv) return -1
      return av.localeCompare(bv, "es", { sensitivity: "base" }) * dir
    })
  }, [personas, busqueda, seg, sort])

  // KPIs sobre el total cargado (no sobre el filtrado).
  // Participante = persona NO voluntaria → participantes + voluntarios = total.
  // De cada grupo se cuenta además cuántos son socios.
  const kpi = useMemo(() => {
    let volunteers = 0, participants = 0, volunteerMembers = 0, participantMembers = 0, membersNoAccount = 0
    for (const p of personas) {
      if (p.is_volunteer) {
        volunteers++
        if (p.is_member) volunteerMembers++
      } else {
        participants++
        if (p.is_member) participantMembers++
      }
      // Socio "puro": es socio pero no tiene ninguna cuenta (ni participante ni voluntario).
      if (p.is_member && !hasUserAccount(p)) membersNoAccount++
    }
    return { volunteers, participants, volunteerMembers, participantMembers, membersNoAccount }
  }, [personas])

  const hasActiveFilters = !!busqueda.trim() || Object.values(seg).some(v => v !== "all")

  /** Cuántos voluntarios esperan aprobación. Alimenta el filtro "Pendientes". */
  const pendientes = useMemo(
    () => personas.filter(p => p.volunteer_status === "pendiente").length,
    [personas],
  )

  const limpiarFiltros = () => { setBusqueda(""); setSeg(EMPTY_SEG) }

  /**
   * Los filtros puestos, escritos.
   *
   * En el teléfono las pastillas viven adentro de la hoja de filtros, así que
   * desde la lista no se ve ninguna. Sin esto, "¿por qué no aparece Juana?"
   * no tiene respuesta visible: la respuesta es un filtro que quedó prendido
   * la semana pasada. Acá queda escrito y se saca de un toque.
   */
  const ETIQUETA_SEG: Record<string, string> = {
    "volunteer:yes": "Voluntarios",
    "volunteer:no": "Participantes",
    "member:yes": "Socios",
    "account:without": "Sin usuario",
  }
  const filtrosPuestos = Object.entries(seg)
    .filter(([, v]) => v !== "all")
    .map(([campo, valor]) => ({
      id: `${campo}:${valor}`,
      texto: ETIQUETA_SEG[`${campo}:${valor}`] ?? String(valor),
      quitar: () => setSeg(st => ({ ...st, [campo]: "all" })),
    }))

  /** Prende el valor o, si ya estaba prendido, vuelve a "all". */
  const alternarSeg = (campo: keyof typeof EMPTY_SEG, valor: string) =>
    setSeg(s => ({ ...s, [campo]: s[campo] === valor ? "all" : valor }))

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
    return sort.dir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-alma-fuerte" />
      : <ArrowDown className="w-3.5 h-3.5 text-alma-fuerte" />
  }

  // ── Alta / edición ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setCreateTab("participante")
    setSendInvite(false)
    setVolForm({ name: "", last_name: "", email: "", phone: "", birth_date: "" })
    setVolPersona(null)
    setFormOpen(true)
  }

  const openEdit = (p: Persona) => {
    setEditing(p)
    setForm({
      name: p.name ?? "", last_name: p.last_name ?? "", email: p.email ?? "",
      cuit: p.cuit ?? "", dni: p.dni ?? "", is_member: !!p.is_member, birth_date: p.birth_date ?? "", address: p.address ?? "",
      floor: p.floor ?? "", apartment: p.apartment ?? "", city: p.city ?? "",
      province: p.province ?? "", postal_code: p.postal_code ?? "", phone: p.phone ?? "",
      specialties: Array.isArray(p.specialties) ? p.specialties : [],
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
    // En alta de participante el email es OBLIGATORIO: es la clave de la persona
    // y lo necesitamos para poder invitarla (ahora o más adelante).
    if (!editing && !form.email.trim()) {
      toast({ title: "Email requerido", description: "El participante necesita un email", variant: "destructive" })
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
      const saved = await res.json().catch(() => null)

      // Alta con invitación: creada la persona, se le manda el mail para que
      // cree su cuenta. Si la invitación falla, la persona igual quedó cargada.
      if (!editing && sendInvite && saved?.id) {
        try {
          const registered_by_name = `${user?.name ?? ""} ${user?.last_name ?? ""}`.trim()
          const invRes = await fetch("/api/personas/invitar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile_id: saved.id, registered_by_name }),
          })
          if (!invRes.ok) {
            const err = await invRes.json().catch(() => ({}))
            throw new Error(err.error || "No se pudo enviar la invitación")
          }
          toast({ title: "Participante invitado/a", description: `Le enviamos un email a ${form.email.trim()} para que cree su cuenta.` })
        } catch (invErr: any) {
          toast({ title: "Persona agregada, pero…", description: invErr.message || "No se pudo enviar la invitación. Podés reenviarla desde el tablero.", variant: "destructive" })
        }
      } else {
        toast({ title: editing ? "Persona actualizada" : "Persona agregada" })
      }

      closeForm()
      fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Invitar a la plataforma (desde el tablero) ──────────────────────
  const handleInvite = async (p: Persona) => {
    if (invitingId != null) return
    setInvitingId(p.id)
    try {
      const registered_by_name = `${user?.name ?? ""} ${user?.last_name ?? ""}`.trim()
      const res = await fetch("/api/personas/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: p.id, registered_by_name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "No se pudo invitar")
      }
      toast({ title: "Invitación enviada", description: `Le enviamos un email a ${p.email} para que cree su cuenta.` })
      fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo invitar", variant: "destructive" })
    } finally {
      setInvitingId(null)
    }
  }

  // ── Revertir voluntario/a → participante (sacar la flor) ────────────
  const openRevert = (p: Persona) => {
    setRevertPersona(p)
    setRevertOpen(true)
  }

  const handleRevert = async () => {
    if (!revertPersona) return
    setReverting(true)
    try {
      const registered_by_name = `${user?.name ?? ""} ${user?.last_name ?? ""}`.trim()
      const res = await fetch("/api/personas/quitar-voluntario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: revertPersona.id, registered_by_name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "No se pudo revertir")
      }
      const result = await res.json().catch(() => ({ outcome: "reactivated" }))
      const msg: Record<string, string> = {
        reactivated: "Ahora es participante. Ingresa con su PIN de participante de siempre.",
        reinvited: "Ahora es participante. Le enviamos un email para que cree su PIN.",
        invited: "Ahora es participante. Le enviamos un email para que cree su cuenta.",
        no_login: "Se quitó el rol de voluntario/a. No tiene email, así que quedó sin cuenta: cargale un email e invitala.",
      }
      toast({ title: "Listo", description: msg[result.outcome] ?? "Rol de voluntario/a quitado." })
      setRevertOpen(false)
      setRevertPersona(null)
      fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo revertir", variant: "destructive" })
    } finally {
      setReverting(false)
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

  // ── Toggle administrador ────────────────────────────────────────────
  /** Marca o desmarca a la persona como admin. El flag vive en `voluntarios`,
   *  así que solo tiene sentido si ya tiene ficha de voluntario/a. */
  const toggleAdmin = async (p: Persona) => {
    if (!isAdmin || !p.volunteer_id || togglingId != null) return
    const next = !p.is_admin
    setTogglingId(p.id)
    setPersonas(prev => prev.map(x => (x.id === p.id ? { ...x, is_admin: next } : x)))
    try {
      const res = await fetch(`/api/voluntarios?id=${p.volunteer_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error")
      toast({ title: next ? "Ahora es administrador/a" : "Ya no es administrador/a" })
    } catch (error: any) {
      setPersonas(prev => prev.map(x => (x.id === p.id ? { ...x, is_admin: !next } : x)))
      toast({ title: "Error", description: error.message || "No se pudo actualizar", variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  /**
   * Aprueba a un voluntario/a pendiente.
   *
   * Al aprobar, el backend lo pasa a 'activo', lo mete en el directorio de
   * personas y le manda el link para que elija su PIN. Antes había que irse a
   * Aprobaciones; ahora se hace sobre la misma fila que estás mirando.
   */
  const aprobar = async () => {
    const p = aprobarTarget
    if (!p?.volunteer_id) return
    setAprobando(true)
    try {
      const res = await fetch(`/api/voluntarios/${p.volunteer_id}/approve`, { method: "POST" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo aprobar")
      toast({
        title: "Voluntario/a aprobado/a",
        description: `Le mandamos a ${p.email} el link para que elija su PIN.`,
      })
      setAprobarTarget(null)
      await fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setAprobando(false)
    }
  }

  /** Le vuelve a mandar el mail de verificación a quien se registró y nunca entró. */
  const reenviarVerificacion = async (p: Persona) => {
    if (!p.email) return
    setReenviandoId(p.id)
    try {
      const res = await fetch("/api/registro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: p.email }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Verificación reenviada", description: `Se le mandó el link a ${p.email}.` })
    } catch {
      toast({ title: "Error", description: "No se pudo reenviar el email", variant: "destructive" })
    } finally {
      setReenviandoId(null)
    }
  }

  // ── Habilitar como voluntario/a ─────────────────────────────────────
  const [volFormOpen, setVolFormOpen] = useState(false)
  const [volPersona, setVolPersona] = useState<Persona | null>(null) // persona a habilitar; null = voluntario nuevo
  const [volForm, setVolForm] = useState({ name: "", last_name: "", email: "", phone: "", birth_date: "" })
  const [volSubmitting, setVolSubmitting] = useState(false)

  const openEnableVolunteer = (p: Persona) => {
    setVolPersona(p)
    setVolForm({
      name: p.name ?? "", last_name: p.last_name ?? "", email: p.email ?? "",
      phone: p.phone ?? "", birth_date: p.birth_date ?? "",
    })
    setVolFormOpen(true)
  }

  const closeVolForm = () => {
    setVolFormOpen(false)
    setVolPersona(null)
  }

  const setVolField = (k: keyof typeof volForm, v: string) => setVolForm(prev => ({ ...prev, [k]: v }))

  const handleVolSubmit = async () => {
    if (!volForm.name.trim()) {
      toast({ title: "Campo requerido", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }
    if (!volForm.email.trim() || !EMAIL_RE.test(volForm.email.trim())) {
      toast({ title: "Email requerido", description: "El voluntario necesita un email válido para recibir el aviso", variant: "destructive" })
      return
    }
    setVolSubmitting(true)
    try {
      const registered_by_name = `${user?.name ?? ""} ${user?.last_name ?? ""}`.trim()
      const res = await fetch("/api/personas/habilitar-voluntario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: volForm.name.trim(),
          last_name: volForm.last_name.trim(),
          email: volForm.email.trim(),
          phone: volForm.phone.trim(),
          birth_date: volForm.birth_date,
          persona_id: volPersona?.id ?? null,
          registered_by_name,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "No se pudo habilitar")
      }
      const nuevo = await res.json().catch(() => null)
      // Si ya tenía PIN de participante lo heredó y queda 'activo' directo
      // (ver enroll-from-db en el backend); si no, sigue el flujo de siempre.
      if (nuevo?.status === "activo") {
        toast({
          title: "Voluntario/a activo/a",
          description: "Conservó su PIN y ya puede ingresar. Le avisamos por email.",
        })
      } else {
        toast({
          title: "Voluntario/a registrado/a",
          description: "Quedó pendiente de aprobación del administrador. Le enviamos un email avisándole.",
        })
      }
      closeVolForm()
      closeForm()   // cierra también el modal de alta (cuando se usa desde su pestaña)
      fetchPersonas()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo habilitar", variant: "destructive" })
    } finally {
      setVolSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/*
        Banner institucional — solo escritorio.

        En el teléfono decía "Base de datos de personas" justo debajo de una
        pestaña que ya dice "Base de datos", y le sumaba dos renglones de
        texto explicativo. Entre eso y el botón, la primera persona de la
        lista aparecía recién al segundo scroll. El botón de crear no se
        pierde: pasa a ser el botón flotante de abajo.
      */}
      <div className="hidden sm:flex rounded-2xl bg-gradient-to-br from-[#dff2f5] to-[#bbe5eb] border border-[#5ec0cf]/40 px-6 py-5 flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/70 shadow-sm">
          <Database className="w-6 h-6 text-[#5ec0cf]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-alma-fuerte leading-tight">Base de datos de personas</h2>
          <p className="text-sm text-alma-fuerte/80 mt-0.5">
            Todas las personas vinculadas a ALMA: voluntarias, participantes y socias. Consultá, agregá y mantené sus datos actualizados.
          </p>
        </div>
        {canCreate && (
          <div className="flex-shrink-0 w-full sm:w-auto">
            <Button onClick={openCreate} className="bg-alma-fuerte hover:bg-alma-oscuro text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nueva persona
            </Button>
          </div>
        )}
      </div>

      {/* Buscador + filtros rápidos. Mismo patrón que Accesos: una caja de
          texto y pastillas que se prenden y apagan. Sin acordeón: los filtros
          escondidos no se usan. */}
      <div className="space-y-2">
        {/* Un solo renglón: buscar y filtrar son la misma tarea. */}
        <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, email, documento o localidad…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {!!busqueda && (
            <button
              onClick={() => setBusqueda("")}
              aria-label="Borrar la búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <HojaFiltros
          className="sm:hidden"
          cantidad={filtrosPuestos.length}
          resultados={filtered.length}
          onLimpiar={() => setSeg(EMPTY_SEG)}
          sustantivo="personas"
        >
          <div className="flex flex-wrap gap-2">
            <FilterChip active={seg.volunteer === "yes"} onClick={() => alternarSeg("volunteer", "yes")}>Voluntarios</FilterChip>
            <FilterChip active={seg.volunteer === "no"} onClick={() => alternarSeg("volunteer", "no")}>Participantes</FilterChip>
            <FilterChip active={seg.member === "yes"} onClick={() => alternarSeg("member", "yes")}>Socios</FilterChip>
            <FilterChip active={seg.account === "without"} onClick={() => alternarSeg("account", "without")}>Sin usuario</FilterChip>
            {pendientes > 0 && (
              <FilterChip active={seg.pendiente === "yes"} onClick={() => alternarSeg("pendiente", "yes")}>Pendientes ({pendientes})</FilterChip>
            )}
          </div>
        </HojaFiltros>
        </div>

        {/* Cuántas quedan y por qué. Solo teléfono: arriba, en escritorio, ya
            está la pastilla con el conteo y las pastillas a la vista. */}
        <ChipsActivos
          className="sm:hidden"
          total={filtered.length}
          sustantivo="personas"
          filtros={filtrosPuestos}
        />

        {/*
          Escritorio: las pastillas a la vista, que hay lugar de sobra.
          Teléfono: el botón "Filtros" de arriba las abre en una hoja.
        */}
        <div className="hidden sm:flex flex-wrap items-center gap-1.5">
          <FilterChip active={seg.volunteer === "yes"} onClick={() => alternarSeg("volunteer", "yes")}>
            Voluntarios
          </FilterChip>
          <FilterChip active={seg.volunteer === "no"} onClick={() => alternarSeg("volunteer", "no")}>
            Participantes
          </FilterChip>
          <FilterChip active={seg.member === "yes"} onClick={() => alternarSeg("member", "yes")}>
            Socios
          </FilterChip>
          <FilterChip active={seg.account === "without"} onClick={() => alternarSeg("account", "without")}>
            Sin usuario
          </FilterChip>
          {/* La cola de aprobaciones. Solo aparece si hay alguien esperando:
              un filtro que siempre devuelve vacío es ruido. */}
          {pendientes > 0 && (
            <FilterChip active={seg.pendiente === "yes"} onClick={() => alternarSeg("pendiente", "yes")}>
              Pendientes ({pendientes})
            </FilterChip>
          )}
          {hasActiveFilters && (
            <button onClick={limpiarFiltros} className="text-xs text-gray-400 underline hover:text-gray-600">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Conteo + KPIs — solo escritorio. En el teléfono el conteo lo da la
          línea de chips de arriba, y los tres KPIs ocupaban cuatro renglones
          de datos que no se miran mientras se busca a alguien. */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {loading ? "Cargando…" : `${filtered.length} ${filtered.length === 1 ? "persona" : "personas"}`}
          {!loading && hasActiveFilters && (
            <span className="text-xs font-normal text-gray-400">de {personas.length}</span>
          )}
        </span>
        {!loading && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5" title="Participantes (personas no voluntarias) — y cuántas son socias">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-700">{kpi.participants}</span> participantes
              <span className="text-xs text-gray-400">· {kpi.participantMembers} socios</span>
            </span>
            <span className="inline-flex items-center gap-1.5" title="Voluntarios/as — y cuántos son socios">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/flor.png" alt="" className="w-4 h-4 object-contain" />
              <span className="font-semibold text-gray-700">{kpi.volunteers}</span> voluntarios
              <span className="text-xs text-gray-400">· {kpi.volunteerMembers} socios</span>
            </span>
            <span className="inline-flex items-center gap-1.5" title="Socios/as sin ninguna cuenta (ni participante ni voluntario) — solo socio">
              <BadgeCheck className="w-4 h-4 fill-[#5ec0cf] text-white" />
              <span className="font-semibold text-gray-700">{kpi.membersNoAccount}</span> socios sin usuario
            </span>
          </div>
        )}
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
              // La misma franja de color que la tabla: el rol se reconoce
              // igual en las dos vistas.
              <div key={p.id} className={`bg-white rounded-xl border border-gray-100 border-l-[3px] ${franjaDeRol(p)} shadow-sm overflow-hidden`}>
                {/* Fila compacta — siempre visible */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : p.id) } }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer transition-colors active:bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5ec0cf] to-[#55adba] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">{initials(p)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 text-sm truncate leading-snug block">{fullName(p)}</span>
                    {(p.email || p.phone || p.city) && (
                      <span className="text-xs text-gray-400 truncate block mt-0.5">{p.email || p.phone || p.city}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Socio/a — toggle de un toque */}
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleMember(p) }}
                        disabled={togglingId === p.id}
                        title={p.is_member ? "Socio/a — tocar para quitar" : "No socio/a — tocar para marcar"}
                        aria-pressed={!!p.is_member}
                        className="p-1 rounded-full transition-transform active:scale-90 disabled:opacity-50"
                      >
                        <MemberMark active={!!p.is_member} />
                      </button>
                    ) : (
                      <MemberMark active={!!p.is_member} />
                    )}
                    {/* Administrador/a — solo lo ve y lo toca un admin, y solo
                        aparece si la persona ya es voluntaria: el flag vive en
                        su ficha de voluntario/a. */}
                    {isAdmin && p.volunteer_id && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleAdmin(p) }}
                        disabled={togglingId === p.id}
                        title={p.is_admin ? "Administrador/a — tocar para quitar" : "Tocar para hacer administrador/a"}
                        aria-pressed={!!p.is_admin}
                        className="p-1 rounded-full transition-transform active:scale-90 disabled:opacity-50"
                      >
                        <ShieldCheck className={`w-[18px] h-[18px] ${p.is_admin ? "text-alma-fuerte" : "text-gray-300"}`} />
                      </button>
                    )}
                    {/* Voluntario/a — flor: toca para habilitar (si no lo es) o
                        para quitar el rol y volverlo participante (si lo es). */}
                    {p.is_volunteer ? (
                      canCreate ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); openRevert(p) }}
                          title="Voluntario/a — tocar para quitar el rol"
                          className="p-1 rounded-full transition-transform active:scale-90"
                        >
                          <VolunteerFlower active />
                        </button>
                      ) : (
                        <span className="p-1" title="Voluntario/a"><VolunteerFlower active /></span>
                      )
                    ) : canCreate ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          // Sin ningún rol hay dos caminos; ya participante,
                          // uno solo. Mismo criterio que el chip de la tabla.
                          if (p.participant_id != null) openEnableVolunteer(p)
                          else setRolTarget(p)
                        }}
                        title={p.participant_id != null ? "Habilitar como voluntario/a" : "Darle un rol"}
                        className="p-1 rounded-full transition-transform active:scale-90"
                      >
                        <VolunteerFlower active={false} />
                      </button>
                    ) : null}
                    {/* Participante — solo indicador (se marca si tiene login propio) */}
                    {p.participant_id != null && (
                      <span className="p-1" title="Participante"><ParticipantMark active /></span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {/* Contenido expandido */}
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] leading-none font-medium border whitespace-nowrap ${st.cls}`}>
                        <st.Icon className="w-2.5 h-2.5" />
                        {st.label}
                      </span>
                      <div className="space-y-2 text-sm text-gray-600">
                        {p.cuit && <p className="flex items-center gap-2"><IdCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{p.cuit}</p>}
                        {p.email && <p className="flex items-center gap-2 break-all"><Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{p.email}</p>}
                        {p.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{p.phone}</p>}
                        {p.birth_date && (
                          <p className="flex items-center gap-2">
                            <Cake className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {fechaCorta(p.birth_date)}
                            {edadTexto(p.birth_date) && <span className="text-gray-400">· {edadTexto(p.birth_date)}</span>}
                          </p>
                        )}
                        {(p.address || p.city || p.province) && (
                          <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" /><span className="break-words">{fullAddress(p)}</span></p>
                        )}
                        {!p.email && !p.phone && !p.birth_date && !p.address && !p.city && !p.province && !p.cuit && (
                          <p className="text-gray-400 italic text-xs">Sin datos de contacto</p>
                        )}
                      </div>

                      <SeccionesDeRol p={p} />

                      {/* Aprobar: lo único de esta ficha que alguien está
                          esperando, así que va arriba de todo lo demás. */}
                      {isAdmin && p.volunteer_status === "pendiente" && (
                        <Button
                          size="sm"
                          onClick={() => setAprobarTarget(p)}
                          className="w-full h-11 gap-1.5 bg-amber-500 text-white hover:bg-amber-600"
                        >
                          <BadgeCheck className="w-4 h-4" /> Aprobar voluntario/a
                        </Button>
                      )}

                      {canCreate && p.account_verified === false && !!p.email && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => reenviarVerificacion(p)}
                          disabled={reenviandoId === p.id}
                          className="w-full h-11 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          {reenviandoId === p.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <MailCheck className="w-3.5 h-3.5" />}
                          Reenviar verificación
                        </Button>
                      )}

                      {isAdmin && hasUserAccount(p) && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => setPinTarget(p)}
                          className="w-full h-11 gap-1.5 border-[#5ec0cf]/50 text-alma-fuerte hover:bg-[#5ec0cf]/10"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Asignar PIN
                        </Button>
                      )}

                      {/* Invitar a la plataforma: solo si tiene email y todavía
                          no tiene cuenta. Aparece "en escalera", sin recargar. */}
                      {canCreate && !hasUserAccount(p) && !!p.email && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleInvite(p)}
                          disabled={invitingId === p.id}
                          className="w-full h-9 gap-1.5 border-[#5ec0cf]/50 text-alma-fuerte hover:bg-[#5ec0cf]/10"
                        >
                          {invitingId === p.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                          Invitar a Comunidad ALMA
                        </Button>
                      )}
                      {isAdmin && !!p.email && (p.volunteer_id || p.participant_id) && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleImpersonateClick(p)}
                          disabled={impersonatingId === p.id}
                          className="w-full h-9 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          {impersonatingId === p.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <LogIn className="w-3.5 h-3.5" />}
                          Ingresar como esta persona
                        </Button>
                      )}
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

        {/* ── DESKTOP: tabla (≥ lg) ──
            8 columnas, no 14. Las cuatro de rol (Socio/a, Voluntario/a,
            Participante, Admin) eran cuatro íconos parecidos repartidos en
            cuatro lugares: para saber qué era alguien había que comparar
            columnas. Ahora el rol es UNA columna con la palabra escrita, y
            como los roles son excluyentes (voluntario XOR participante) eso
            no pierde información. CUIT y Especialidades se fueron al
            desplegable: el primero está vacío en casi todas las filas y el
            segundo solo aplica a voluntarias. Localidad y Provincia son una
            sola columna. Resultado: entra sin scroll horizontal.
            El `overflow-x-auto` queda de red: si algún día no entra, scrollea
            adentro de la tarjeta en vez de desbordarla como hacía antes. */}
        <div className="hidden lg:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          {/* `table-fixed` + colgroup: sin esto el navegador reparte el ancho
              según el contenido, así que las columnas se corren solas cada vez
              que filtrás o que una fila trae un mail más largo. Con anchos
              declarados la grilla queda quieta y los separadores alineados.
              No son ocho anchos iguales a propósito: Edad son dos dígitos y
              Contacto lleva mail + teléfono; repartir 12,5% a cada una
              desperdicia una columna y achica la otra. */}
          <table className="w-full min-w-[920px] table-fixed text-sm">
            <colgroup>
              <col className="w-[12%]" />{/* Nombre */}
              <col className="w-[12%]" />{/* Apellido */}
              <col className="w-[18%]" />{/* Contacto */}
              <col className="w-[6%]" /> {/* Edad */}
              <col className="w-[13%]" />{/* Ubicación */}
              <col className="w-[15%]" />{/* Rol */}
              <col className="w-[11%]" />{/* Estado */}
              <col className="w-[13%]" />{/* Acciones */}
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-[#f7f8f9] text-left text-gray-600">
                {/* El borde transparente iguala la franja de color de las
                    filas, para que los encabezados no queden corridos 3px. */}
                <SortableTh label="Nombre" k="name" onClick={toggleSort} SortIcon={SortIcon} className="border-l-[3px] border-l-transparent" />
                <SortableTh label="Apellido" k="last_name" onClick={toggleSort} SortIcon={SortIcon} />
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Contacto</th>
                {/* La edad se calcula desde la fecha de nacimiento (lib/edad):
                    no hay una columna `edad` que pueda contradecirla. */}
                <th className="px-3 py-2 font-semibold text-center whitespace-nowrap">Edad</th>
                <SortableTh label="Ubicación" k="city" onClick={toggleSort} SortIcon={SortIcon} />
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Rol</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Estado</th>
                <th className="px-3 py-2 font-semibold text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const st = personaStatus(p)
                const abierta = expandedId === p.id
                // El rayado se calcula acá y no con `even:` de CSS: al abrir
                // una fila se inserta otra <tr> debajo, y nth-child la cuenta,
                // así que de ahí para abajo el rayado se daba vuelta solo.
                const rayada = i % 2 === 1
                const ubicacion = [p.city, p.province].filter(Boolean).join(", ")
                return (
                  <React.Fragment key={p.id}>
                  {/* La fila entera abre la ficha, como la tarjeta del
                      celular. Los botones y las marcas que viven adentro
                      cortan la propagación para no abrirla sin querer. */}
                  <tr
                    onClick={() => setExpandedId(abierta ? null : p.id)}
                    className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-[#f5fbfc] transition-colors ${abierta ? "bg-[#f5fbfc]" : rayada ? "bg-[#fafafa]" : "bg-white"}`}
                  >
                    {/* La franja del borde izquierdo: el rol se reconoce por
                        color antes de leer nada, recorriendo la lista de
                        arriba abajo. Los dos son colores del manual. */}
                    <td className={`border-l-[3px] ${franjaDeRol(p)} truncate px-3 py-2 font-medium text-gray-900`} title={p.name || ""}>{p.name || "—"}</td>
                    <td className="truncate px-3 py-2 text-gray-700" title={p.last_name || ""}>{p.last_name || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">
                      <div className="flex flex-col gap-0.5">
                        {p.email && <span title={p.email} className="inline-flex items-center gap-1 truncate max-w-full"><Mail className="w-3 h-3 flex-shrink-0" />{p.email}</span>}
                        {p.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 flex-shrink-0" />{p.phone}</span>}
                        {!p.email && !p.phone && "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 tabular-nums">
                      {edadDesde(p.birth_date) ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="truncate px-3 py-2 text-gray-700" title={ubicacion}>{ubicacion || "—"}</td>

                    {/* ── Rol: la etiqueta ES el control ── */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <ChipRol
                          p={p}
                          editable={canCreate}
                          onElegirRol={() => setRolTarget(p)}
                          onHabilitar={() => openEnableVolunteer(p)}
                          onQuitar={() => openRevert(p)}
                        />
                        {/* Socio/a va aparte porque es ortogonal al rol: se
                            puede ser socia y voluntaria a la vez. */}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => toggleMember(p)}
                            disabled={togglingId === p.id}
                            title={p.is_member ? "Socio/a — clic para quitar" : "No socio/a — clic para marcar"}
                            aria-pressed={!!p.is_member}
                            className="rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                          >
                            <MemberMark active={!!p.is_member} />
                          </button>
                        ) : p.is_member ? (
                          <span title="Socio/a"><MemberMark active /></span>
                        ) : null}
                        {/* El flag de admin vive en la ficha de voluntario/a,
                            así que solo tiene sentido si la persona ya lo es. */}
                        {isAdmin && p.volunteer_id != null && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleAdmin(p) }}
                            disabled={togglingId === p.id}
                            title={p.is_admin ? "Administrador/a — clic para quitar" : "Clic para hacer administrador/a"}
                            aria-pressed={!!p.is_admin}
                            className="rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                          >
                            <ShieldCheck className={`w-4 h-4 ${p.is_admin ? "text-alma-fuerte" : "text-gray-300"}`} />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] leading-none font-medium border whitespace-nowrap ${st.cls}`}>
                        <st.Icon className="w-2.5 h-2.5" />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Queda igual aunque la fila entera ya abra: es el
                            control accesible por teclado y la pista visual de
                            que hay algo más abajo. */}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setExpandedId(abierta ? null : p.id)}
                          title={abierta ? "Ocultar ficha" : "Ver ficha completa"}
                          aria-expanded={abierta}
                          className="h-7 w-7 p-0 text-gray-400 hover:bg-[#5ec0cf]/10 hover:text-alma-fuerte"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${abierta ? "rotate-180" : ""}`} />
                        </Button>
                        {/* Aprobar: solo cuando hay algo que aprobar. Va
                            primero y en ámbar porque es lo único de esta fila
                            que alguien está esperando. */}
                        {isAdmin && p.volunteer_status === "pendiente" && (
                          <Button variant="ghost" size="sm" onClick={() => setAprobarTarget(p)}
                            title="Aprobar voluntario/a"
                            className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700">
                            <BadgeCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {/* Reenviar verificación: se registró y nunca entró al mail. */}
                        {canCreate && p.account_verified === false && !!p.email && (
                          <Button variant="ghost" size="sm" onClick={() => reenviarVerificacion(p)}
                            disabled={reenviandoId === p.id} title="Reenviar verificación"
                            className="h-7 w-7 p-0 text-gray-400 hover:bg-amber-50 hover:text-amber-700">
                            {reenviandoId === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <MailCheck className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {/* Fijar PIN: el ícono llave que vivía en Voluntarios. */}
                        {isAdmin && hasUserAccount(p) && (
                          <Button variant="ghost" size="sm" onClick={() => setPinTarget(p)}
                            title="Asignar PIN"
                            className="h-7 w-7 p-0 text-gray-400 hover:bg-[#5ec0cf]/10 hover:text-alma-fuerte">
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canCreate && !hasUserAccount(p) && !!p.email && (
                          <Button variant="ghost" size="sm" onClick={() => handleInvite(p)} disabled={invitingId === p.id}
                            title="Invitar a Comunidad ALMA"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-alma-fuerte hover:bg-[#5ec0cf]/10">
                            {invitingId === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Send className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {isAdmin && !!p.email && (p.volunteer_id || p.participant_id) && (
                          <Button variant="ghost" size="sm" onClick={() => handleImpersonateClick(p)}
                            disabled={impersonatingId === p.id} title="Ingresar como esta persona"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-amber-600 hover:bg-amber-50">
                            {impersonatingId === p.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <LogIn className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-[#5ec0cf] hover:bg-[#5ec0cf]/10">
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

                  {/* La fila desplegada: lo que salió de las columnas (CUIT,
                      documento, dirección, especialidades) más las secciones
                      por rol. Son las mismas secciones que la tarjeta de
                      celular, para no mantener dos versiones de lo mismo. */}
                  {abierta && (
                    <tr className="border-b border-gray-100 bg-white">
                      <td colSpan={8} className="px-3 pb-3 pt-0">
                        {/* Un solo panel, en el turquesa suave del manual. El
                            fondo de antes (#f8fcfd) era casi blanco sobre
                            blanco: se adivinaba dónde empezaba la ficha en vez
                            de verse. */}
                        <div className="space-y-3 rounded-xl border border-alma/25 bg-alma-suave px-4 py-3.5">
                          <SeccionesDeRol p={p} conDatos />

                          {/* Los mismos botones del renglón, pero con el
                              nombre escrito. Los de arriba quedan para el que
                              ya sabe qué es cada ícono; estos son para el que
                              no. Mismo handler, así que no hay dos caminos que
                              puedan quedar distintos. */}
                          {/* Centrados, y todos del mismo color salvo el que
                              hay que hacer ahora: si todo grita, nada grita.
                              Aprobar es lo único que alguien está esperando,
                              así que es el único con relleno. */}
                          <div className="flex flex-wrap justify-center gap-2 border-t border-alma/25 pt-3">
                            {isAdmin && p.volunteer_status === "pendiente" && (
                              <Button size="sm" onClick={() => setAprobarTarget(p)} className={ACCION_URGENTE}>
                                <BadgeCheck className="h-4 w-4" /> Aprobar voluntario/a
                              </Button>
                            )}
                            {isAdmin && hasUserAccount(p) && (
                              <Button variant="outline" size="sm" onClick={() => setPinTarget(p)} className={ACCION_FICHA}>
                                <KeyRound className="h-4 w-4" /> Asignar PIN
                              </Button>
                            )}
                            {canCreate && p.account_verified === false && !!p.email && (
                              <Button variant="outline" size="sm" onClick={() => reenviarVerificacion(p)}
                                disabled={reenviandoId === p.id} className={ACCION_FICHA}>
                                {reenviandoId === p.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <MailCheck className="h-4 w-4" />}
                                Reenviar verificación
                              </Button>
                            )}
                            {canCreate && !hasUserAccount(p) && !!p.email && (
                              <Button variant="outline" size="sm" onClick={() => handleInvite(p)}
                                disabled={invitingId === p.id} className={ACCION_FICHA}>
                                {invitingId === p.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Send className="h-4 w-4" />}
                                Invitar
                              </Button>
                            )}
                            {isAdmin && !!p.email && (p.volunteer_id || p.participant_id) && (
                              <Button variant="outline" size="sm" onClick={() => handleImpersonateClick(p)}
                                disabled={impersonatingId === p.id} className={ACCION_FICHA}>
                                {impersonatingId === p.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <LogIn className="h-4 w-4" />}
                                Ingresar como
                              </Button>
                            )}
                            {canEdit && (
                              <Button variant="outline" size="sm" onClick={() => openEdit(p)} className={ACCION_FICHA}>
                                <Edit className="h-4 w-4" /> Editar
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="outline" size="sm" onClick={() => askDelete(p)}
                                className={`${ACCION_FICHA} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}>
                                <Trash2 className="h-4 w-4" /> Eliminar
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
        </>
      )}

      {/* ── Modal: fijar PIN ─────────────────────────────────────────── */}
      {pinTarget && (
        <DialogoPin persona={pinTarget} onClose={() => setPinTarget(null)} />
      )}

      {/* ── Modal: aprobar voluntario/a ───────────────────────────────── */}
      <Dialog open={!!aprobarTarget} onOpenChange={o => { if (!o && !aprobando) setAprobarTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Aprobar a {fullName(aprobarTarget ?? {} as Persona)}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Queda como voluntario/a activo/a y entra a la base de personas.</p>
            <p>
              Le llega un mail a <span className="font-medium text-gray-800">{aprobarTarget?.email}</span> con
              el link para que elija su PIN. Hasta que lo haga no puede ingresar.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setAprobarTarget(null)} disabled={aprobando}>
              Cancelar
            </Button>
            <Button onClick={aprobar} disabled={aprobando} className="bg-amber-500 text-white hover:bg-amber-600">
              {aprobando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              <span className="ml-1.5">Aprobar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Alta (con pestañas) / Edición ─────────────────────── */}
      <Dialog open={formOpen} onOpenChange={o => { if (!o) closeForm() }}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar persona" : "Nueva persona"}</DialogTitle>
          </DialogHeader>

          {/* Selector de tipo (solo en alta). Participante crea la persona (con
              o sin invitación); Voluntario/a crea la ficha pendiente de aprobar. */}
          {!editing && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100">
              <button
                type="button"
                onClick={() => setCreateTab("participante")}
                className={`flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-colors ${createTab === "participante" ? "bg-white text-alma-fuerte shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <UserCircle className="w-4 h-4" /> Participante
              </button>
              <button
                type="button"
                onClick={() => setCreateTab("voluntario")}
                className={`flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-colors ${createTab === "voluntario" ? "bg-white text-alma-fuerte shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/flor.png" alt="" className="w-4 h-4 object-contain" /> Voluntario/a
              </button>
            </div>
          )}

          {/* ── Ficha Participante (alta) / Edición de persona ── */}
          {(editing || createTab === "participante") && (
          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" required>
                <Input value={form.name} onChange={e => setField("name", e.target.value)} maxLength={100} placeholder="Nombre" />
              </Field>
              <Field label="Apellido" required>
                <Input value={form.last_name} onChange={e => setField("last_name", e.target.value)} maxLength={100} placeholder="Apellido" />
              </Field>
              <Field label="Correo electrónico" required={!editing}>
                <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} maxLength={255} placeholder="correo@ejemplo.com" />
              </Field>
              <Field label="CUIT">
                <Input value={form.cuit} onChange={e => setField("cuit", e.target.value)} maxLength={13} placeholder="XX-XXXXXXXX-X" />
              </Field>
              <Field label="DNI">
                {/* Es el dato que se imprime en el certificado de finalización. */}
                <Input value={form.dni} onChange={e => setField("dni", e.target.value)} maxLength={15} placeholder="12345678" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={form.birth_date} onChange={e => setField("birth_date", e.target.value)} />
              </Field>
              <Field label="Teléfono (celular)">
                <Input value={form.phone} onChange={e => setField("phone", e.target.value)} maxLength={50} placeholder="Celular" />
              </Field>
            </div>

            {/* Especialidades: SOLO si la persona es voluntaria. No es un campo
                vacío en la ficha de un participante, es un campo que no está —
                es lo que hace que una sola pantalla para todos no confunda. */}
            {editing?.volunteer_id && (
              <Field label="Especialidades">
                <EditorEspecialidades
                  valor={form.specialties}
                  onChange={lista => setForm(prev => ({ ...prev, specialties: lista }))}
                />
              </Field>
            )}

            {/* Socio/a de ALMA */}
            <button
              type="button"
              role="switch"
              aria-checked={form.is_member}
              onClick={() => setForm(prev => ({ ...prev, is_member: !prev.is_member }))}
              className={`w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-left transition-colors ${
                form.is_member ? "border-[#5ec0cf] bg-[#dff2f5]/50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MemberMark active={form.is_member} size="w-5 h-5" />
                <span>
                  <span className="block text-sm font-medium text-gray-700">Socio/a de ALMA</span>
                </span>
              </span>
              <span className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${form.is_member ? "bg-[#5ec0cf]" : "bg-gray-200"}`}>
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

            {/* Pivote invitación: usuario real (con mail) vs. registro suelto */}
            {!editing && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button" role="switch" aria-checked={sendInvite}
                  onClick={() => setSendInvite(v => !v)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${sendInvite ? "bg-[#dff2f5]/50" : "hover:bg-gray-50"}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Send className={`w-5 h-5 flex-shrink-0 ${sendInvite ? "text-alma-fuerte" : "text-gray-400"}`} />
                    <span>
                      <span className="block text-sm font-medium text-gray-700">Enviar invitación a Comunidad ALMA</span>
                      <span className="block text-xs text-gray-500">Le llega un email para crear su cuenta y su PIN.</span>
                    </span>
                  </span>
                  <span className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${sendInvite ? "bg-[#5ec0cf]" : "bg-gray-200"}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${sendInvite ? "translate-x-5" : "translate-x-1"}`} />
                  </span>
                </button>
                <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                  {sendInvite
                    ? "Se crea un participante con cuenta: recibirá el mail para ingresar."
                    : "Se guarda solo el registro de datos (sin cuenta). Podés invitarla más adelante desde el tablero."}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 pt-1">* Campos obligatorios</p>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={closeForm} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-alma-fuerte hover:bg-alma-oscuro text-white">
                {submitting ? "Guardando..." : editing ? "Guardar cambios" : sendInvite ? "Crear e invitar" : "Agregar persona"}
              </Button>
            </DialogFooter>
          </div>
          )}

          {/* ── Ficha Voluntario/a (solo alta) ── */}
          {!editing && createTab === "voluntario" && (
          <div className="space-y-4 mt-1">
            <div className="rounded-lg bg-[#dff2f5]/50 border border-[#5ec0cf]/30 px-4 py-2 text-sm text-alma-fuerte flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/flor.png" alt="" className="w-4 h-4 flex-shrink-0 mt-0.5 object-contain" />
              <span>
                Se registrará una nueva persona como voluntario/a. Quedará <strong className="font-semibold">pendiente de aprobación</strong> del administrador y recibirá un email de aviso.
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" required>
                <Input value={volForm.name} onChange={e => setVolField("name", e.target.value)} maxLength={100} placeholder="Nombre" />
              </Field>
              <Field label="Apellido">
                <Input value={volForm.last_name} onChange={e => setVolField("last_name", e.target.value)} maxLength={100} placeholder="Apellido" />
              </Field>
              <Field label="Correo electrónico" required>
                <Input type="email" value={volForm.email} onChange={e => setVolField("email", e.target.value)} maxLength={150} placeholder="correo@ejemplo.com" />
              </Field>
              <Field label="Teléfono (celular)">
                <Input value={volForm.phone} onChange={e => setVolField("phone", e.target.value)} maxLength={50} placeholder="Celular" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={volForm.birth_date} onChange={e => setVolField("birth_date", e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-gray-400 pt-1">* Campos obligatorios</p>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={closeForm} disabled={volSubmitting}>Cancelar</Button>
              <Button onClick={handleVolSubmit} disabled={volSubmitting} className="bg-alma-fuerte hover:bg-alma-oscuro text-white">
                {volSubmitting ? "Registrando..." : "Registrar voluntario/a"}
              </Button>
            </DialogFooter>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Habilitar / Nuevo voluntario/a ────────────────────── */}
      <Dialog open={volFormOpen} onOpenChange={o => { if (!o) closeVolForm() }}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{volPersona ? "Habilitar como voluntario/a" : "Nuevo voluntario/a"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="rounded-lg bg-[#dff2f5]/50 border border-[#5ec0cf]/30 px-4 py-2 text-sm text-alma-fuerte flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/flor.png" alt="" className="w-4 h-4 flex-shrink-0 mt-0.5 object-contain" />
              <span>
                {volPersona
                  ? "Se creará la ficha de voluntario/a vinculada a esta persona. "
                  : "Se registrará una nueva persona como voluntario/a. "}
                Quedará <strong className="font-semibold">pendiente de aprobación</strong> del administrador y recibirá un email de aviso.
              </span>
            </div>

            {/* Aviso de conversión: una persona no puede ser participante Y
                voluntaria a la vez. Si ya era participante, deja de serlo, pero
                CONSERVA su PIN (el backend lo hereda) — entra directo, activa,
                sin pasar por aprobación. */}
            {volPersona?.participant_id != null && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 flex gap-2">
                <UserCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Esta persona es <strong>participante</strong>. Al habilitarla como voluntaria
                  <strong> deja de ser participante</strong> (su cuenta de participante se desactiva),
                  pero <strong>conserva su PIN</strong>: ingresa directo, sin esperar aprobación.
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" required>
                <Input value={volForm.name} onChange={e => setVolField("name", e.target.value)} maxLength={100} placeholder="Nombre" />
              </Field>
              <Field label="Apellido">
                <Input value={volForm.last_name} onChange={e => setVolField("last_name", e.target.value)} maxLength={100} placeholder="Apellido" />
              </Field>
              <Field label="Correo electrónico" required>
                <Input type="email" value={volForm.email} onChange={e => setVolField("email", e.target.value)} maxLength={150} placeholder="correo@ejemplo.com" />
              </Field>
              <Field label="Teléfono (celular)">
                <Input value={volForm.phone} onChange={e => setVolField("phone", e.target.value)} maxLength={50} placeholder="Celular" />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={volForm.birth_date} onChange={e => setVolField("birth_date", e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-gray-400 pt-1">* Campos obligatorios</p>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={closeVolForm} disabled={volSubmitting}>Cancelar</Button>
              <Button onClick={handleVolSubmit} disabled={volSubmitting} className="bg-alma-fuerte hover:bg-alma-oscuro text-white">
                {volSubmitting ? "Registrando..." : volPersona ? "Habilitar" : "Registrar voluntario/a"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar reversión voluntario/a → participante ──────────── */}
      <Dialog open={revertOpen} onOpenChange={o => { if (!o && !reverting) { setRevertOpen(false); setRevertPersona(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Quitar el rol de voluntario/a?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <p className="text-sm text-gray-600">
              <strong className="text-gray-900">{revertPersona ? fullName(revertPersona) : ""}</strong> dejará de ser
              voluntario/a y pasará a ser <strong>participante</strong>. Su ficha de voluntario/a
              se desactiva (no se borra).
            </p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {revertPersona?.participant_id != null
                  ? "Cuando vuelva a ingresar, entra como participante con su PIN de participante de siempre."
                  : revertPersona?.email
                    ? "Le enviaremos un email para que cree su cuenta de participante y su PIN."
                    : "Ojo: no tiene email cargado, así que quedará sin cuenta. Cargale un email antes para poder invitarla."}
              </span>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => { setRevertOpen(false); setRevertPersona(null) }} disabled={reverting}>Cancelar</Button>
            <Button onClick={handleRevert} disabled={reverting} className="bg-amber-500 hover:bg-amber-600 text-white">
              {reverting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Quitar rol y volver participante"}
            </Button>
          </DialogFooter>
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

      {/* ── Darle un rol a alguien que no tiene ninguno ────────────────
          Por qué se pregunta en vez de hacer: no son dos variantes de lo
          mismo. Voluntario/a se lo das vos ahí mismo (le creás la ficha y
          entra con un PIN). Participante no se "da": se le manda una
          invitación por mail y la persona crea su cuenta, así que hace falta
          que tenga un mail cargado. */}
      <Dialog open={!!rolTarget} onOpenChange={(o) => !o && setRolTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Qué rol le damos?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {rolTarget ? fullName(rolTarget) : ""} está en la base de datos pero todavía no tiene ningún rol.
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <div>
              <Button
                variant="outline"
                className="h-11 w-full justify-start"
                onClick={() => { if (rolTarget) openEnableVolunteer(rolTarget); setRolTarget(null) }}
              >
                <VolunteerFlower active size="w-4 h-4" /> <span className="ml-2">Voluntario/a</span>
              </Button>
              <p className="mt-1 text-xs text-gray-400">Le creás la ficha ahora y entra con un PIN.</p>
            </div>
            <div>
              <Button
                variant="outline"
                className="h-11 w-full justify-start"
                disabled={!rolTarget?.email || invitingId != null}
                onClick={() => { if (rolTarget) handleInvite(rolTarget); setRolTarget(null) }}
              >
                <ParticipantMark active size="w-4 h-4" /> <span className="ml-2">Participante</span>
              </Button>
              <p className="mt-1 text-xs text-gray-400">
                {rolTarget?.email
                  ? `Le mandamos un mail a ${rolTarget.email} para que cree su cuenta.`
                  : "Necesita un email cargado para poder recibir la invitación."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Impersonar: elegir ficha cuando tiene las dos ──────────────── */}
      <Dialog open={!!impersonateChoice} onOpenChange={(o) => !o && setImpersonateChoice(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>¿Ingresar como voluntario/a o participante?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {impersonateChoice ? fullName(impersonateChoice) : ""} tiene las dos fichas — elegí con cuál entrar.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => { if (impersonateChoice) startImpersonate(impersonateChoice, "voluntario"); setImpersonateChoice(null) }}
            >
              <VolunteerFlower active size="w-4 h-4" /> <span className="ml-2">Como voluntario/a</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => { if (impersonateChoice) startImpersonate(impersonateChoice, "participante"); setImpersonateChoice(null) }}
            >
              <ParticipantMark active size="w-4 h-4" /> <span className="ml-2">Como participante</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* La acción principal, al alcance del pulgar y siempre a la vista: el
          botón de arriba desaparecía apenas bajabas tres filas de la lista. */}
      {canCreate && (
        <BotonFlotante onClick={openCreate} className="sm:hidden">
          Nueva persona
        </BotonFlotante>
      )}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────
/**
 * Las especialidades de un voluntario/a: chips que se agregan y se sacan.
 *
 * Es texto libre y no una lista cerrada, igual que en el módulo de Voluntarios:
 * lo que hace cada persona en ALMA no entra en un catálogo fijo, y obligar a
 * elegir de una lista termina en que todos eligen "Otro".
 */
function EditorEspecialidades({
  valor,
  onChange,
}: {
  valor: string[]
  onChange: (lista: string[]) => void
}) {
  const [texto, setTexto] = useState("")

  const agregar = () => {
    const limpio = texto.trim()
    // Sin repetidos: dos chips iguales no agregan nada y encima rompen el
    // `key` de React.
    if (!limpio || valor.includes(limpio)) { setTexto(""); return }
    onChange([...valor, limpio])
    setTexto("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregar() } }}
          placeholder="Acompañamiento, Talleres…"
          maxLength={60}
        />
        <Button type="button" variant="outline" onClick={agregar} disabled={!texto.trim()} className="h-11 px-3">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valor.map(e => (
            <span key={e} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs text-gray-700">
              {e}
              <button
                type="button"
                onClick={() => onChange(valor.filter(x => x !== e))}
                aria-label={`Quitar ${e}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Fijar el PIN de una persona.
 *
 * Reemplaza a los dos diálogos que había: el ícono llave de Voluntarios y el de
 * Participantes. Eran el mismo formulario contra endpoints distintos, y para
 * saber cuál usar había que saber de antemano qué era la persona.
 *
 * Acá el rol lo decide el componente: si tiene ficha de voluntario/a va por ahí
 * —es el login que manda, porque los roles son excluyentes y el de voluntario/a
 * gana— y si no, por el de participante. El PIN viaja en claro hasta la ruta de
 * Next, que lo hashea con bcrypt antes de mandarlo al backend; nunca sale del
 * servidor sin hashear.
 */
function DialogoPin({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const [pin, setPin] = useState("")
  const [guardando, setGuardando] = useState(false)

  const esVoluntaria = !!persona.volunteer_id
  const ruta = esVoluntaria ? "/api/voluntarios/pin" : "/api/participantes/pin"
  const id = esVoluntaria ? persona.volunteer_id : persona.participant_id
  const valido = /^\d{4}$/.test(pin)

  const guardar = async () => {
    if (!valido || !id) return
    setGuardando(true)
    try {
      const res = await fetch(ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pin }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo guardar")
      toast({
        title: "PIN asignado",
        description: `${fullName(persona)} ya puede ingresar con ese PIN.`,
      })
      onClose()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o && !guardando) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>PIN de {fullName(persona)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Ingresa como{" "}
            <span className="font-medium text-gray-800">
              {esVoluntaria ? "voluntario/a" : "participante"}
            </span>{" "}
            con {persona.email}.
          </p>
          <div>
            <Label htmlFor="pin-persona">PIN nuevo</Label>
            <Input
              id="pin-persona"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="4 dígitos"
              className="mt-1 h-11 text-center text-lg tracking-[0.5em] tabular-nums"
              onKeyDown={e => { if (e.key === "Enter" && valido) guardar() }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Pisa el PIN anterior. Avisale por otro medio: no le llega ningún mail.
          </p>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button
            onClick={guardar}
            disabled={!valido || guardando}
            className="bg-alma-fuerte text-white hover:bg-alma-oscuro"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span className="ml-1.5">Guardar</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Las secciones por rol de una persona.
 *
 * Una persona es una fila; sus ROLES viven en otras dos tablas. Hasta ahora,
 * para ver el voluntariado de alguien había que irse al módulo de Voluntarios,
 * y para ver sus inscripciones al de Participantes. Esto trae las tres cosas al
 * mismo lugar.
 *
 * Cada sección aparece SOLO si la persona tiene ese rol. Esa es la regla que
 * hace que juntar los módulos no termine en una ficha confusa: las
 * especialidades no son un campo vacío en la ficha de un participante, son un
 * campo que no está. Y al revés con las inscripciones.
 */
/**
 * Los datos que salieron de la tabla cuando se pasó de 14 columnas a 8: CUIT,
 * documento, nacimiento y dirección. Eran columnas vacías en casi todas las
 * filas, así que ocupaban ancho todo el tiempo para servir de vez en cuando.
 * Solo salen los que la persona tiene cargados.
 */
function itemsDeFicha(p: Persona): { Icono: typeof IdCard; valor: string }[] {
  const direccion = fullAddress(p)
  const items: { Icono: typeof IdCard; valor: string }[] = []
  if (p.cuit) items.push({ Icono: IdCard, valor: `CUIT ${p.cuit}` })
  if (p.dni) items.push({ Icono: IdCard, valor: `Doc. ${p.dni}` })
  if (p.birth_date) {
    const edad = edadTexto(p.birth_date)
    items.push({ Icono: Cake, valor: fechaCorta(p.birth_date) + (edad ? ` · ${edad}` : "") })
  }
  if (direccion && direccion !== "—") items.push({ Icono: MapPin, valor: direccion })
  return items
}

/**
 * La ficha abierta de una persona.
 *
 * Las secciones se reparten el ancho en vez de apilarse contra el margen
 * izquierdo: el panel ocupa toda la fila, y con todo amontonado a la
 * izquierda quedaban dos tercios de celeste vacío. Cada sección crece hasta
 * llenar lo que le toca (`flex-1`) y baja de renglón recién cuando no entra
 * en 190px, así que en celular se apilan solas.
 *
 * `conDatos` lo usa la tabla de escritorio, donde documento, nacimiento y
 * dirección no tienen columna propia. La tarjeta del celular ya los lista
 * arriba, así que ahí no se repiten.
 */
function SeccionesDeRol({ p, conDatos = false }: { p: Persona; conDatos?: boolean }) {
  const esVoluntaria = !!p.volunteer_id
  const tieneCuenta = !!p.participant_id
  const datos = conDatos ? itemsDeFicha(p) : []
  if (!esVoluntaria && !tieneCuenta && datos.length === 0) return null

  const especialidades = Array.isArray(p.specialties) ? p.specialties : []

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4 pt-1">
      {datos.length > 0 && (
        <Seccion titulo="Datos" icono={<IdCard className="h-3 w-3 text-alma-fuerte/60" />}>
          {datos.map(({ Icono, valor }) => (
            <p key={valor} className="flex items-start gap-1.5 text-xs text-alma-tinta">
              <Icono className="mt-px h-3.5 w-3.5 flex-shrink-0 text-alma-fuerte/50" />
              <span className="break-words">{valor}</span>
            </p>
          ))}
        </Seccion>
      )}

      {esVoluntaria && (
        <Seccion titulo="Voluntariado" icono={<VolunteerFlower active size="w-3 h-3" />}>
          <div className="flex flex-wrap items-center gap-1.5">
            <EstadoVoluntariado estado={p.volunteer_status} />
            {p.is_admin && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium leading-none text-amber-700">
                <ShieldCheck className="h-2.5 w-2.5" /> Administra
              </span>
            )}
          </div>

          {p.volunteer_since && (
            <p className="text-xs text-gray-500">Desde {fechaCorta(p.volunteer_since)}</p>
          )}

          {especialidades.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {especialidades.map(e => (
                <span key={e} className="rounded-full border border-alma/30 bg-white/70 px-2 py-0.5 text-[11px] leading-none text-alma-tinta">
                  {e}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-gray-400">Sin especialidades cargadas</p>
          )}
        </Seccion>
      )}

      {tieneCuenta && (
        <Seccion titulo="Participación" icono={<ParticipantMark active size="w-3 h-3" />}>
          <EstadoCuenta p={p} />
          <p className="text-xs text-gray-500">
            {p.enrollments_count
              ? `${p.enrollments_count} ${p.enrollments_count === 1 ? "inscripción" : "inscripciones"}`
              : "Sin inscripciones"}
          </p>
        </Seccion>
      )}
    </div>
  )
}

function Seccion({
  titulo,
  icono,
  children,
}: {
  titulo: string
  icono: React.ReactNode
  children: React.ReactNode
}) {
  return (
    // Sin caja: adentro del panel turquesa, una caja gris con borde es un
    // marco dentro de otro marco. Un filete al costado alcanza para agrupar.
    <div className="min-w-[190px] flex-1 border-l-2 border-alma/40 pl-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-alma-tinta">
        {icono}
        {titulo}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

/** El estado del voluntariado. 'pendiente' se destaca: alguien lo tiene que aprobar. */
function EstadoVoluntariado({ estado }: { estado?: string | null }) {
  const mapa: Record<string, { texto: string; cls: string }> = {
    activo: { texto: "Activa", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    pendiente: { texto: "Pendiente de aprobación", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    inactivo: { texto: "Inactiva", cls: "border-gray-200 bg-gray-100 text-gray-500" },
  }
  const v = mapa[estado ?? ""] ?? { texto: estado || "Sin estado", cls: "border-gray-200 bg-gray-100 text-gray-500" }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${v.cls}`}>
      {v.texto}
    </span>
  )
}

/**
 * Si la cuenta sirve o no.
 *
 * `participant_id` solo dice que la cuenta existe. Las dos formas de existir sin
 * servir son distintas y conviene distinguirlas: una cuenta APAGADA es la de
 * alguien que pasó a ser voluntario/a (los roles son excluyentes), y una SIN
 * VERIFICAR es la de alguien que se registró y nunca entró al mail.
 */
function EstadoCuenta({ p }: { p: Persona }) {
  if (p.account_active === false) {
    return (
      <p className="text-xs text-gray-500">
        Cuenta apagada{p.volunteer_id ? " — es voluntario/a" : ""}
      </p>
    )
  }
  if (p.account_verified === false) {
    return <p className="text-xs text-amber-700">Se registró pero no verificó el email</p>
  }
  return <p className="text-xs text-gray-500">Cuenta activa</p>
}

function SortableTh({
  label, k, onClick, SortIcon, className = "",
}: {
  label: string; k: SortKey
  onClick: (k: SortKey) => void; SortIcon: (p: { k: SortKey }) => React.ReactNode
  className?: string
}) {
  return (
    <th className={`px-3 py-2 font-semibold whitespace-nowrap ${className}`}>
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1.5 hover:text-alma-fuerte transition-colors">
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
