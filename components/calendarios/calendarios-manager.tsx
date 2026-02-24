"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Zap, AlertTriangle, UserCheck, UserPlus } from "lucide-react"
import { can } from "@/lib/permissions"

// ── Types ──────────────────────────────────────────────────────────────────

interface VolunteerRef {
  id: number
  name: string
  last_name: string
}

interface CalendarInstance {
  id: number
  type: "grupo" | "taller" | "actividad"
  source_id: number | null
  date: string
  start_time: string
  end_time: string
  notes: string | null
  status: "programado" | "realizado" | "cancelado"
  coordinator: VolunteerRef | null
  co_coordinator: VolunteerRef | null
}

interface PreviewEntry {
  date: string        // YYYY-MM-DD
  dayName: string
  module: "grupo" | "taller" | "actividad"
  sourceName: string
  start_time: string
  end_time: string
  conflict: { with_name: string; with_time: string } | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

const WEEK_DAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
  { label: "Dom", value: 0 },
]

const STATUS_LABELS: Record<string, string> = {
  programado: "Programado",
  realizado: "Realizado",
  cancelado: "Cancelado",
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  if (!t) return ""
  return String(t).slice(0, 5)
}

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstWeekday(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const days = getDaysInMonth(year, month)
  const first = getFirstWeekday(year, month)
  const total = Math.ceil((first + days) / 7) * 7
  const cells: (number | null)[] = Array(first).fill(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length < total) cells.push(null)
  return cells
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function getWednesdays(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const d = new Date(start)
  while (d.getDay() !== 3) d.setDate(d.getDate() + 1)
  while (d <= end) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 7)
  }
  return dates
}

function getFirstMondays(year: number, startMonth: number, endMonth: number): Date[] {
  const dates: Date[] = []
  for (let m = startMonth; m <= endMonth; m++) {
    const d = new Date(year, m - 1, 1)
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
    dates.push(new Date(d))
  }
  return dates
}

/** Check if two time ranges overlap: [a_start, a_end) overlaps [b_start, b_end) */
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart
}

// ── computePreviewDates ────────────────────────────────────────────────────

function computeAlmaClassicPreview(
  form: AlmaGenerateForm,
  existing: CalendarInstance[],
  grupos: any[],
  talleres: any[]
): PreviewEntry[] {
  const { year, start_month, end_month } = form
  const y = parseInt(year)
  const sm = parseInt(start_month)
  const em = parseInt(end_month)
  if (!y || !sm || !em || sm > em) return []

  const startDate = new Date(y, sm - 1, 1)
  const endDate = new Date(y, em, 0)

  const wednesdays = getWednesdays(startDate, endDate)
  const firstMondays = getFirstMondays(y, sm, em)

  const entries: PreviewEntry[] = []

  let isPresencial = true
  for (const date of wednesdays) {
    const ds = date.toISOString().split("T")[0]
    const startTime = isPresencial ? form.hora_presencial : form.hora_taller
    const endTime = "12:00"
    const module: "grupo" | "taller" = isPresencial ? "grupo" : "taller"
    let sourceName = isPresencial ? "GA Presencial" : "Taller de la Memoria"
    if (isPresencial && form.grupo_presencial_id) {
      const g = grupos.find(g => String(g.id) === form.grupo_presencial_id)
      if (g) sourceName = g.name
    } else if (!isPresencial && form.taller_id) {
      const t = talleres.find(t => String(t.id) === form.taller_id)
      if (t) sourceName = t.name
    }

    const conflict = findConflict(ds, startTime, endTime, existing)
    entries.push({
      date: ds,
      dayName: DAY_NAMES_FULL[date.getDay()],
      module,
      sourceName,
      start_time: startTime,
      end_time: endTime,
      conflict,
    })
    isPresencial = !isPresencial
  }

  for (const date of firstMondays) {
    const ds = date.toISOString().split("T")[0]
    const startTime = form.hora_virtual
    const endTime = "18:00"
    let sourceName = "GA Virtual"
    if (form.grupo_virtual_id) {
      const g = grupos.find(g => String(g.id) === form.grupo_virtual_id)
      if (g) sourceName = g.name
    }
    const conflict = findConflict(ds, startTime, endTime, existing)
    entries.push({
      date: ds,
      dayName: DAY_NAMES_FULL[date.getDay()],
      module: "grupo",
      sourceName,
      start_time: startTime,
      end_time: endTime,
      conflict,
    })
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date))
}

function computeCustomPreview(
  form: CustomGenerateForm,
  existing: CalendarInstance[],
  grupos: any[],
  talleres: any[],
  actividades: any[]
): PreviewEntry[] {
  if (!form.module_a || !form.date_start || !form.date_end || form.days.length === 0) return []

  const startDate = new Date(form.date_start + "T12:00:00")
  const endDate = new Date(form.date_end + "T12:00:00")
  if (startDate > endDate) return []

  const getSourceName = (module: string, sourceId: string, list: any[]): string => {
    if (!sourceId) return module.charAt(0).toUpperCase() + module.slice(1)
    const item = list.find(i => String(i.id) === sourceId)
    return item?.name || module.charAt(0).toUpperCase() + module.slice(1)
  }

  const sourceListA = form.module_a === "grupo" ? grupos : form.module_a === "taller" ? talleres : actividades
  const sourceNameA = getSourceName(form.module_a, form.source_a, sourceListA)

  let sourceNameB = ""
  let sourceListB: any[] = []
  if (form.intercalar && form.module_b) {
    sourceListB = form.module_b === "grupo" ? grupos : form.module_b === "taller" ? talleres : actividades
    sourceNameB = getSourceName(form.module_b, form.source_b, sourceListB)
  }

  const entries: PreviewEntry[] = []
  const d = new Date(startDate)
  let occurrenceCount = 0

  while (d <= endDate) {
    const dayOfWeek = d.getDay() // 0=Sun
    if (form.days.includes(dayOfWeek)) {
      // Check frequency
      let include = false
      if (form.frequency === "semanal") {
        include = true
      } else if (form.frequency === "quincenal") {
        // Every 14 days from the first occurrence on this day
        const dayKey = dayOfWeek
        // Count occurrences for this day of week
        const sameDayOccurrences = entries.filter(e => {
          const ed = new Date(e.date + "T12:00:00")
          return ed.getDay() === dayOfWeek
        })
        include = sameDayOccurrences.length % 2 === 0
      } else if (form.frequency === "mensual") {
        // First occurrence of this weekday each month
        const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
        const firstOccurrence = new Date(firstOfMonth)
        while (firstOccurrence.getDay() !== dayOfWeek) firstOccurrence.setDate(firstOccurrence.getDate() + 1)
        include = d.getDate() === firstOccurrence.getDate()
      }

      if (include) {
        const useB = form.intercalar && form.module_b && occurrenceCount % 2 === 1
        const module = (useB ? form.module_b : form.module_a) as "grupo" | "taller" | "actividad"
        const sourceName = useB ? sourceNameB : sourceNameA
        const startTime = useB ? form.start_time_b : form.start_time_a
        const endTime = useB ? form.end_time_b : form.end_time_a

        const ds = d.toISOString().split("T")[0]
        const conflict = findConflict(ds, startTime, endTime, existing)
        entries.push({
          date: ds,
          dayName: DAY_NAMES_FULL[d.getDay()],
          module,
          sourceName,
          start_time: startTime,
          end_time: endTime,
          conflict,
        })
        occurrenceCount++
      }
    }
    d.setDate(d.getDate() + 1)
  }

  return entries
}

function findConflict(
  date: string,
  startTime: string,
  endTime: string,
  existing: CalendarInstance[]
): { with_name: string; with_time: string } | null {
  const sameDayInstances = existing.filter(i => i.date === date)
  for (const inst of sameDayInstances) {
    const instStart = formatTime(inst.start_time)
    const instEnd = formatTime(inst.end_time)
    if (timesOverlap(startTime, endTime, instStart, instEnd)) {
      return {
        with_name: inst.type === "grupo" ? "Grupo" : inst.type === "taller" ? "Taller" : "Actividad",
        with_time: `${instStart}–${instEnd}`,
      }
    }
  }
  return null
}

// ── Form types ─────────────────────────────────────────────────────────────

interface AlmaGenerateForm {
  year: string
  start_month: string
  end_month: string
  grupo_presencial_id: string
  grupo_virtual_id: string
  taller_id: string
  hora_presencial: string
  hora_taller: string
  hora_virtual: string
}

interface CustomGenerateForm {
  module_a: string
  source_a: string
  start_time_a: string
  end_time_a: string
  intercalar: boolean
  module_b: string
  source_b: string
  start_time_b: string
  end_time_b: string
  days: number[]
  frequency: "semanal" | "quincenal" | "mensual"
  date_start: string
  date_end: string
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CalendariosManager({ user }: { user: any }) {
  const today = new Date()

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [instances, setInstances] = useState<CalendarInstance[]>([])
  const [yearInstances, setYearInstances] = useState<CalendarInstance[]>([])
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [talleres, setTalleres] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any[]>([])
  const [actividades, setActividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterType, setFilterType] = useState<"all" | "grupo" | "taller" | "actividad">("all")
  const [filterVolunteer, setFilterVolunteer] = useState("all")
  const [filterMine, setFilterMine] = useState(true)

  // Detail panel
  const [selectedInstance, setSelectedInstance] = useState<CalendarInstance | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Instance form (create / edit)
  const [instanceDialogOpen, setInstanceDialogOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<CalendarInstance | null>(null)
  const [instanceForm, setInstanceForm] = useState({
    module: "grupo" as "grupo" | "taller" | "actividad",
    source_id: "",
    is_single_day: true,
    date_from: "",
    date_to: "",
    repeat_days: [] as number[],
    start_time: "10:00",
    end_time: "12:00",
    coordinator_id: "",
    co_coordinator_id: "",
    status: "programado",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  // Bulk delete dialog
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkScope, setBulkScope] = useState<"month" | "type" | "series" | "all">("month")
  const [bulkYear, setBulkYear] = useState(String(today.getFullYear()))
  const [bulkMonth, setBulkMonth] = useState(String(today.getMonth() + 1))
  const [bulkType, setBulkType] = useState<"grupo" | "taller" | "actividad">("grupo")
  const [bulkSourceId, setBulkSourceId] = useState<string>("null")
  const [bulkCount, setBulkCount] = useState<number | null>(null)
  const [bulkConfirmed, setBulkConfirmed] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateTab, setGenerateTab] = useState<"alma" | "custom">("alma")
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number } | null>(null)

  // ALMA classic form
  const [almaForm, setAlmaForm] = useState<AlmaGenerateForm>({
    year: String(today.getFullYear()),
    start_month: "3",
    end_month: "12",
    grupo_presencial_id: "",
    grupo_virtual_id: "",
    taller_id: "",
    hora_presencial: "10:00",
    hora_taller: "10:00",
    hora_virtual: "16:00",
  })

  // Custom form
  const [customForm, setCustomForm] = useState<CustomGenerateForm>({
    module_a: "grupo",
    source_a: "",
    start_time_a: "10:00",
    end_time_a: "12:00",
    intercalar: false,
    module_b: "taller",
    source_b: "",
    start_time_b: "10:00",
    end_time_b: "12:00",
    days: [],
    frequency: "semanal",
    date_start: "",
    date_end: "",
  })

  // ── Bulk delete count fetch ────────────────────────────────────

  useEffect(() => {
    if (!bulkDeleteOpen) return
    setBulkCount(null)

    const params = new URLSearchParams({ scope: bulkScope })
    if (bulkScope === "month") {
      if (!bulkYear || !bulkMonth) return
      params.set("year", bulkYear)
      params.set("month", bulkMonth)
    } else if (bulkScope === "type") {
      params.set("type", bulkType)
    } else if (bulkScope === "series") {
      params.set("type", bulkType)
      params.set("source_id", bulkSourceId)
    }

    const controller = new AbortController()
    fetch(`/api/calendarios/bulk?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (typeof d.count === "number") setBulkCount(d.count) })
      .catch(() => {})
    return () => controller.abort()
  }, [bulkDeleteOpen, bulkScope, bulkYear, bulkMonth, bulkType, bulkSourceId])

  // ── Data fetching ──────────────────────────────────────────────

  useEffect(() => {
    fetchInstances()
  }, [currentYear, currentMonth])

  useEffect(() => {
    fetchVolunteers()
    fetchSources()
  }, [])

  async function fetchInstances() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year: String(currentYear),
        month: String(currentMonth),
      })
      const res = await fetch(`/api/calendarios?${params}`)
      const data = await res.json()
      setInstances(Array.isArray(data) ? data : [])
    } catch {
      setInstances([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchYearInstances(year: number) {
    try {
      const res = await fetch(`/api/calendarios?year=${year}`)
      const data = await res.json()
      setYearInstances(Array.isArray(data) ? data : [])
    } catch {
      setYearInstances([])
    }
  }

  async function fetchVolunteers() {
    try {
      const res = await fetch("/api/voluntarios")
      const data = await res.json()
      setVolunteers(Array.isArray(data) ? data : [])
    } catch {}
  }

  async function fetchSources() {
    try {
      const [talleresRes, gruposRes, actividadesRes] = await Promise.all([
        fetch("/api/talleres"),
        fetch("/api/grupos"),
        fetch("/api/actividades"),
      ])
      const [talleresData, gruposData, actividadesData] = await Promise.all([
        talleresRes.json(),
        gruposRes.json(),
        actividadesRes.json(),
      ])
      setTalleres(Array.isArray(talleresData) ? talleresData : [])
      setGrupos(Array.isArray(gruposData) ? gruposData : [])
      setActividades(Array.isArray(actividadesData) ? actividadesData : [])
    } catch {}
  }

  // ── Source name lookup ─────────────────────────────────────────

  function getSourceName(inst: CalendarInstance): string {
    if (inst.source_id) {
      if (inst.type === "grupo") {
        const g = grupos.find(g => g.id === inst.source_id)
        if (g) return g.name
      } else if (inst.type === "taller") {
        const t = talleres.find(t => t.id === inst.source_id)
        if (t) return t.name
      } else if (inst.type === "actividad") {
        const a = actividades.find(a => a.id === inst.source_id)
        if (a) return a.name
      }
    }
    if (inst.type === "grupo") return "Grupo"
    if (inst.type === "taller") return "Taller"
    return "Actividad"
  }

  function isUserAssigned(inst: CalendarInstance): boolean {
    if (inst.type === "actividad") return true
    return inst.coordinator?.id === user.id || inst.co_coordinator?.id === user.id
  }

  function getSourceItems(module: string): any[] {
    if (module === "grupo") return grupos
    if (module === "taller") return talleres
    if (module === "actividad") return actividades
    return []
  }

  // ── Navigation ─────────────────────────────────────────────────

  function navigateMonth(delta: number) {
    let m = currentMonth + delta
    let y = currentYear
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  function goToToday() {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth() + 1)
  }

  // ── Filtered instances ─────────────────────────────────────────

  const filteredInstances = instances.filter(inst => {
    if (filterType !== "all" && inst.type !== filterType) return false
    if (filterVolunteer !== "all") {
      const volId = parseInt(filterVolunteer)
      if (inst.coordinator?.id !== volId && inst.co_coordinator?.id !== volId) return false
    }
    if (filterMine && !isUserAssigned(inst)) return false
    return true
  })

  function instancesForDay(day: number): CalendarInstance[] {
    const ds = dateStr(currentYear, currentMonth, day)
    return filteredInstances.filter(i => i.date === ds)
  }

  function isToday(day: number): boolean {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() + 1 &&
      currentYear === today.getFullYear()
    )
  }

  // ── Handlers ───────────────────────────────────────────────────

  function openDetail(inst: CalendarInstance) {
    setSelectedInstance(inst)
    setDetailOpen(true)
  }

  function openNewInstance(prefillDate?: string) {
    setEditingInstance(null)
    setInstanceForm({
      module: "grupo",
      source_id: "",
      is_single_day: true,
      date_from: prefillDate ?? "",
      date_to: prefillDate ?? "",
      repeat_days: [],
      start_time: "10:00",
      end_time: "12:00",
      coordinator_id: "",
      co_coordinator_id: "",
      status: "programado",
      notes: "",
    })
    setInstanceDialogOpen(true)
  }

  function openEditInstance(inst: CalendarInstance) {
    setEditingInstance(inst)
    setInstanceForm({
      module: inst.type,
      source_id: inst.source_id ? String(inst.source_id) : "",
      is_single_day: true,
      date_from: inst.date,
      date_to: "",
      repeat_days: [],
      start_time: formatTime(inst.start_time),
      end_time: formatTime(inst.end_time),
      coordinator_id: inst.coordinator ? String(inst.coordinator.id) : "",
      co_coordinator_id: inst.co_coordinator ? String(inst.co_coordinator.id) : "",
      status: inst.status,
      notes: inst.notes || "",
    })
    setDetailOpen(false)
    setInstanceDialogOpen(true)
  }

  function toggleRepeatDay(dayValue: number) {
    setInstanceForm(f => ({
      ...f,
      repeat_days: f.repeat_days.includes(dayValue)
        ? f.repeat_days.filter(d => d !== dayValue)
        : [...f.repeat_days, dayValue],
    }))
  }

  function toggleCustomDay(dayValue: number) {
    setCustomForm(f => ({
      ...f,
      days: f.days.includes(dayValue)
        ? f.days.filter(d => d !== dayValue)
        : [...f.days, dayValue],
    }))
  }

  async function handleSaveInstance() {
    setSaving(true)
    try {
      const makeBody = (date: string) => ({
        type: instanceForm.module,
        date,
        start_time: instanceForm.start_time,
        end_time: instanceForm.end_time,
        source_id: instanceForm.source_id ? parseInt(instanceForm.source_id) : null,
        coordinator_id: instanceForm.module !== "actividad" && instanceForm.coordinator_id
          ? parseInt(instanceForm.coordinator_id) : null,
        co_coordinator_id: instanceForm.module !== "actividad" && instanceForm.co_coordinator_id
          ? parseInt(instanceForm.co_coordinator_id) : null,
        status: instanceForm.status,
        notes: instanceForm.notes || null,
      })

      if (editingInstance) {
        await fetch(`/api/calendarios?id=${editingInstance.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(makeBody(instanceForm.date_from)),
        })
      } else {
        const datesToCreate: string[] = []
        if (instanceForm.is_single_day) {
          if (instanceForm.date_from) datesToCreate.push(instanceForm.date_from)
        } else {
          const start = new Date(instanceForm.date_from + "T12:00:00")
          const end = new Date(instanceForm.date_to + "T12:00:00")
          const d = new Date(start)
          while (d <= end) {
            if (instanceForm.repeat_days.length === 0 || instanceForm.repeat_days.includes(d.getDay())) {
              datesToCreate.push(d.toISOString().split("T")[0])
            }
            d.setDate(d.getDate() + 1)
          }
        }
        for (const date of datesToCreate) {
          await fetch("/api/calendarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(makeBody(date)),
          })
        }
      }

      setInstanceDialogOpen(false)
      fetchInstances()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteInstance() {
    if (!selectedInstance) return
    try {
      await fetch(`/api/calendarios?id=${selectedInstance.id}`, { method: "DELETE" })
      setDeleteOpen(false)
      setDetailOpen(false)
      setSelectedInstance(null)
      fetchInstances()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSelfAssign(role: "coordinator" | "co_coordinator") {
    if (!selectedInstance) return
    const body = role === "coordinator"
      ? { coordinator_id: user.id }
      : { co_coordinator_id: user.id }
    try {
      const res = await fetch(`/api/calendarios?id=${selectedInstance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedInstance(updated)
        fetchInstances()
      }
    } catch (e) {
      console.error(e)
    }
  }

  function openBulkDelete() {
    setBulkScope("month")
    setBulkYear(String(currentYear))
    setBulkMonth(String(currentMonth))
    setBulkType("grupo")
    setBulkSourceId("null")
    setBulkCount(null)
    setBulkConfirmed(false)
    setBulkDeleteOpen(true)
  }

  async function handleBulkDelete() {
    if (!bulkConfirmed || bulkDeleting) return
    setBulkDeleting(true)
    try {
      const body: any = { scope: bulkScope }
      if (bulkScope === "month") {
        body.year = parseInt(bulkYear)
        body.month = parseInt(bulkMonth)
      } else if (bulkScope === "type") {
        body.type = bulkType
      } else if (bulkScope === "series") {
        body.type = bulkType
        body.source_id = bulkSourceId === "null" ? null : parseInt(bulkSourceId)
      }

      const res = await fetch("/api/calendarios/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setBulkDeleteOpen(false)
        fetchInstances()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setBulkDeleting(false)
    }
  }

  function openGenerateDialog() {
    setGenerateResult(null)
    const year = parseInt(almaForm.year) || today.getFullYear()
    fetchYearInstances(year)
    setGenerateOpen(true)
  }

  async function handleGenerateAlma() {
    setGenerating(true)
    setGenerateResult(null)
    try {
      let created = 0
      for (const entry of almaPreview) {
        const body = {
          type: entry.module,
          date: entry.date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          source_id: entry.module === "grupo"
            ? (almaPreview.indexOf(entry) % 2 === 0
              ? (almaForm.grupo_presencial_id ? parseInt(almaForm.grupo_presencial_id) : null)
              : (almaForm.grupo_virtual_id ? parseInt(almaForm.grupo_virtual_id) : null))
            : (almaForm.taller_id ? parseInt(almaForm.taller_id) : null),
          status: "programado",
        }
        // More precise source_id using the entry's sourceName lookup
        const sourceIdBody = buildAlmaEntryBody(entry)
        const res = await fetch("/api/calendarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sourceIdBody),
        })
        if (res.ok) created++
      }
      setGenerateResult({ created })
      fetchInstances()
      if (almaForm.year) fetchYearInstances(parseInt(almaForm.year))
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  function buildAlmaEntryBody(entry: PreviewEntry) {
    // Determine source_id for each entry based on which pattern it came from
    let source_id: number | null = null
    if (entry.module === "grupo") {
      // Check if it's virtual (Monday) or presencial (Wednesday)
      const d = new Date(entry.date + "T12:00:00")
      if (d.getDay() === 1) {
        // Monday = virtual
        source_id = almaForm.grupo_virtual_id ? parseInt(almaForm.grupo_virtual_id) : null
      } else {
        // Wednesday = presencial
        source_id = almaForm.grupo_presencial_id ? parseInt(almaForm.grupo_presencial_id) : null
      }
    } else if (entry.module === "taller") {
      source_id = almaForm.taller_id ? parseInt(almaForm.taller_id) : null
    }
    return {
      type: entry.module,
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      source_id,
      status: "programado",
    }
  }

  async function handleGenerateCustom() {
    setGenerating(true)
    setGenerateResult(null)
    try {
      let created = 0
      for (const entry of customPreview) {
        const sourceList = entry.module === "grupo" ? grupos : entry.module === "taller" ? talleres : actividades
        const isB = customForm.intercalar && entry.sourceName === (
          customForm.module_b
            ? (sourceList.find(i => String(i.id) === customForm.source_b)?.name ||
               customForm.module_b.charAt(0).toUpperCase() + customForm.module_b.slice(1))
            : ""
        )
        const sourceId = isB
          ? (customForm.source_b ? parseInt(customForm.source_b) : null)
          : (customForm.source_a ? parseInt(customForm.source_a) : null)

        const res = await fetch("/api/calendarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: entry.module,
            date: entry.date,
            start_time: entry.start_time,
            end_time: entry.end_time,
            source_id: sourceId,
            status: "programado",
          }),
        })
        if (res.ok) created++
      }
      setGenerateResult({ created })
      fetchInstances()
      if (customForm.date_start) fetchYearInstances(parseInt(customForm.date_start.slice(0, 4)))
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  // ── Preview computation (memoized) ────────────────────────────

  const almaPreview = useMemo(() =>
    computeAlmaClassicPreview(almaForm, yearInstances, grupos, talleres),
    [almaForm, yearInstances, grupos, talleres]
  )

  const customPreview = useMemo(() =>
    computeCustomPreview(customForm, yearInstances, grupos, talleres, actividades),
    [customForm, yearInstances, grupos, talleres, actividades]
  )

  const activePreview = generateTab === "alma" ? almaPreview : customPreview
  const conflictCount = activePreview.filter(e => e.conflict).length

  // ── Summary counts ─────────────────────────────────────────────

  const grupoCount = instances.filter(i => i.type === "grupo").length
  const tallerCount = instances.filter(i => i.type === "taller").length
  const actividadCount = instances.filter(i => i.type === "actividad").length
  const calendarCells = buildCalendarCells(currentYear, currentMonth)

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold w-48 text-center">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h2>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-[#4dd0e1] hidden sm:inline-flex">
              Hoy
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[#4dd0e1] text-white">
              {grupoCount} grupo{grupoCount !== 1 ? "s" : ""}
            </Badge>
            <Badge className="bg-purple-500 text-white">
              {tallerCount} taller{tallerCount !== 1 ? "es" : ""}
            </Badge>
            {actividadCount > 0 && (
              <Badge className="bg-orange-400 text-white">
                {actividadCount} actividad{actividadCount !== 1 ? "es" : ""}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {can(user, "calendar:delete") && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={openBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Borrar...
              </Button>
            )}
            {can(user, "calendar:generate") && (
              <Button size="sm" variant="outline" onClick={openGenerateDialog}>
                <Zap className="h-4 w-4 mr-1" />
                Generar
              </Button>
            )}
            {can(user, "calendar:create") && (
              <Button size="sm" className="bg-[#4dd0e1] hover:bg-[#26c6da] text-white" onClick={openNewInstance}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo evento
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pt-3 border-t items-center">
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="grupo">Solo grupos</SelectItem>
              <SelectItem value="taller">Solo talleres</SelectItem>
              <SelectItem value="actividad">Solo actividades</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterVolunteer} onValueChange={setFilterVolunteer}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos los voluntarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los voluntarios</SelectItem>
              {volunteers.map(v => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name} {v.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={filterMine ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterMine(!filterMine)}
            className={filterMine ? "bg-[#4dd0e1] hover:bg-[#26c6da] text-white" : ""}
          >
            {filterMine ? "✓ Solo los míos" : "Solo los míos"}
          </Button>

          {(filterType !== "all" || filterVolunteer !== "all" || filterMine) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterType("all"); setFilterVolunteer("all"); setFilterMine(false) }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* ── Calendar grid ───────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2 border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarCells.map((day, idx) => {
              const dayInsts = day ? instancesForDay(day) : []
              const today_ = day ? isToday(day) : false
              const canCreate = can(user, "calendar:create")

              return (
                <div
                  key={idx}
                  onClick={() => day && canCreate && openNewInstance(dateStr(currentYear, currentMonth, day))}
                  className={`min-h-[90px] border-r border-b p-1 ${
                    !day ? "bg-gray-50" : today_ ? "bg-blue-50" : "bg-white"
                  } ${canCreate && day ? "cursor-pointer hover:bg-sky-50 transition-colors" : ""} ${idx % 7 === 6 ? "border-r-0" : ""}`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full mx-auto ${
                          today_ ? "bg-[#4dd0e1] text-white" : "text-gray-700"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayInsts.map(inst => {
                          const mine = isUserAssigned(inst)
                          return (
                            <button
                              key={inst.id}
                              onClick={(e) => { e.stopPropagation(); openDetail(inst) }}
                              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate block transition-opacity ${
                                inst.type === "grupo"
                                  ? mine
                                    ? "bg-[#4dd0e1] text-white hover:bg-[#26c6da]"
                                    : "bg-[#b2ebf2] text-[#0097a7] hover:bg-[#80deea]"
                                  : inst.type === "taller"
                                  ? mine
                                    ? "bg-purple-500 text-white hover:bg-purple-600"
                                    : "bg-purple-100 text-purple-500 hover:bg-purple-200"
                                  : "bg-orange-400 text-white hover:bg-orange-500"
                              } ${inst.status === "cancelado" ? "opacity-40 line-through" : ""}
                              ${inst.status === "realizado" ? "opacity-70" : ""}`}
                            >
                              {formatTime(inst.start_time)}{" "}{getSourceName(inst)}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500 px-1 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#4dd0e1]" /> Grupo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-purple-500" /> Taller
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-400" /> Actividad
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Hoy
        </span>
      </div>

      {/* ── Detail Dialog ────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge
                className={
                  selectedInstance?.type === "grupo"
                    ? "bg-[#4dd0e1] text-white"
                    : selectedInstance?.type === "taller"
                    ? "bg-purple-500 text-white"
                    : "bg-orange-400 text-white"
                }
              >
                {selectedInstance && getSourceName(selectedInstance)}
              </Badge>
              {selectedInstance && (() => {
                const d = new Date(selectedInstance.date + "T12:00:00")
                return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
              })()}
            </DialogTitle>
          </DialogHeader>

          {selectedInstance && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Horario</span>
                <span className="font-medium">
                  {formatTime(selectedInstance.start_time)} – {formatTime(selectedInstance.end_time)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado</span>
                <Badge
                  variant="outline"
                  className={
                    selectedInstance.status === "programado"
                      ? "border-blue-400 text-blue-600"
                      : selectedInstance.status === "realizado"
                      ? "border-green-500 text-green-700"
                      : "border-red-400 text-red-600"
                  }
                >
                  {STATUS_LABELS[selectedInstance.status]}
                </Badge>
              </div>

              {selectedInstance.type !== "actividad" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Coordinador</span>
                    <span className="font-medium text-right">
                      {selectedInstance.coordinator
                        ? `${selectedInstance.coordinator.name} ${selectedInstance.coordinator.last_name}`
                        : <span className="text-gray-400 italic">Sin asignar</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Co-coordinador</span>
                    <span className="font-medium text-right">
                      {selectedInstance.co_coordinator
                        ? `${selectedInstance.co_coordinator.name} ${selectedInstance.co_coordinator.last_name}`
                        : <span className="text-gray-400 italic">Sin asignar</span>}
                    </span>
                  </div>
                </>
              )}

              {selectedInstance.notes && (
                <div>
                  <span className="text-gray-500">Notas: </span>
                  <span>{selectedInstance.notes}</span>
                </div>
              )}

              <div className="pt-2 border-t flex flex-wrap gap-2">
                {can(user, "calendar:edit") && (
                  <Button size="sm" variant="outline" onClick={() => openEditInstance(selectedInstance)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                )}
                {can(user, "calendar:delete") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-300 hover:bg-red-50"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                )}
                {can(user, "calendar:edit") && selectedInstance?.type !== "actividad" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#0097a7] border-[#4dd0e1] hover:bg-[#e0f7fa]"
                      onClick={() => handleSelfAssign("coordinator")}
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Coordinar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-700 border-purple-400 hover:bg-purple-50"
                      onClick={() => handleSelfAssign("co_coordinator")}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Co-coordinar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar instancia</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar esta instancia del calendario? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteInstance}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Dialog ───────────────────────────────────── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Borrar instancias en masa
            </DialogTitle>
            <DialogDescription>
              Solo administradores. Esta acción elimina múltiples instancias y <strong>no se puede deshacer</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scope selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">¿Qué querés borrar?</Label>
              <div className="space-y-2">
                {[
                  { value: "month",  label: "Un mes completo",  desc: "Todas las instancias de un mes y año determinado" },
                  { value: "type",   label: "Un tipo completo", desc: "Todos los grupos, talleres o actividades del calendario" },
                  { value: "series", label: "Una serie",        desc: "Todas las instancias de un grupo o taller específico" },
                  { value: "all",    label: "TODO el calendario", desc: "Eliminar absolutamente todas las instancias registradas" },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      bulkScope === opt.value
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkScope"
                      value={opt.value}
                      checked={bulkScope === opt.value}
                      onChange={() => { setBulkScope(opt.value as any); setBulkConfirmed(false) }}
                      className="mt-0.5 accent-red-500"
                    />
                    <div>
                      <div className={`text-sm font-medium ${opt.value === "all" ? "text-red-700" : "text-gray-800"}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Dynamic fields */}
            {bulkScope === "month" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Año</Label>
                  <Input
                    type="number"
                    value={bulkYear}
                    onChange={e => { setBulkYear(e.target.value); setBulkConfirmed(false) }}
                    min="2020" max="2035"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Mes</Label>
                  <Select value={bulkMonth} onValueChange={v => { setBulkMonth(v); setBulkConfirmed(false) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(bulkScope === "type" || bulkScope === "series") && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">Tipo</Label>
                  <Select
                    value={bulkType}
                    onValueChange={(v: any) => { setBulkType(v); setBulkSourceId("null"); setBulkConfirmed(false) }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grupo">Grupos</SelectItem>
                      <SelectItem value="taller">Talleres</SelectItem>
                      <SelectItem value="actividad">Actividades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkScope === "series" && (
                  <div className="space-y-1">
                    <Label className="text-sm">Serie (fuente vinculada)</Label>
                    <Select
                      value={bulkSourceId}
                      onValueChange={v => { setBulkSourceId(v); setBulkConfirmed(false) }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Sin vincular (source_id nulo)</SelectItem>
                        {getSourceItems(bulkType).map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Count preview */}
            <div className={`rounded-lg p-3 text-sm font-medium ${
              bulkCount === null
                ? "bg-gray-50 text-gray-400"
                : bulkCount === 0
                ? "bg-gray-50 text-gray-500"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {bulkCount === null
                ? "Calculando..."
                : bulkCount === 0
                ? "No hay instancias para eliminar con esos criterios."
                : `⚠️ Se eliminarán ${bulkCount} instancia${bulkCount !== 1 ? "s" : ""}.`}
            </div>

            {/* Confirmation checkbox */}
            {bulkCount !== null && bulkCount > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bulkConfirm"
                  checked={bulkConfirmed}
                  onCheckedChange={checked => setBulkConfirmed(checked as boolean)}
                />
                <Label htmlFor="bulkConfirm" className="cursor-pointer text-sm text-gray-700">
                  Entiendo que esta acción <strong>no se puede deshacer</strong>
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || !bulkConfirmed || !bulkCount}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {bulkDeleting
                ? "Eliminando..."
                : `Eliminar${bulkCount ? ` (${bulkCount})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Generate dialog (Wizard) ──────────────────────────────── */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#4dd0e1]" />
                Generar calendario
              </DialogTitle>
              <DialogDescription>
                Configurá el patrón y revisá el preview antes de guardar.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left column — wizard */}
              <div className="w-[55%] overflow-y-auto border-r p-5" style={{ maxHeight: "calc(90vh - 145px)" }}>
                <Tabs value={generateTab} onValueChange={(v: any) => setGenerateTab(v)}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="alma" className="flex-1">ALMA Clásico</TabsTrigger>
                    <TabsTrigger value="custom" className="flex-1">Personalizado</TabsTrigger>
                  </TabsList>

                  {/* ── Tab: ALMA Clásico ── */}
                  <TabsContent value="alma" className="space-y-4 mt-0">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>Año</Label>
                        <Input
                          type="number"
                          value={almaForm.year}
                          onChange={e => {
                            setAlmaForm(f => ({ ...f, year: e.target.value }))
                            if (e.target.value.length === 4) fetchYearInstances(parseInt(e.target.value))
                          }}
                          min="2024" max="2030"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Mes inicio</Label>
                        <Select value={almaForm.start_month} onValueChange={v => setAlmaForm(f => ({ ...f, start_month: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MONTH_NAMES.map((name, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Mes fin</Label>
                        <Select value={almaForm.end_month} onValueChange={v => setAlmaForm(f => ({ ...f, end_month: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MONTH_NAMES.map((name, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Miércoles alternados</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Grupo Presencial</Label>
                          <Select
                            value={almaForm.grupo_presencial_id || "none"}
                            onValueChange={v => setAlmaForm(f => ({ ...f, grupo_presencial_id: v === "none" ? "" : v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin vincular</SelectItem>
                              {grupos.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hora inicio</Label>
                          <Input type="time" value={almaForm.hora_presencial} onChange={e => setAlmaForm(f => ({ ...f, hora_presencial: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Taller</Label>
                          <Select
                            value={almaForm.taller_id || "none"}
                            onValueChange={v => setAlmaForm(f => ({ ...f, taller_id: v === "none" ? "" : v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin vincular</SelectItem>
                              {talleres.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hora inicio</Label>
                          <Input type="time" value={almaForm.hora_taller} onChange={e => setAlmaForm(f => ({ ...f, hora_taller: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Primer lunes del mes (GA Virtual)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Grupo Virtual</Label>
                          <Select
                            value={almaForm.grupo_virtual_id || "none"}
                            onValueChange={v => setAlmaForm(f => ({ ...f, grupo_virtual_id: v === "none" ? "" : v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin vincular</SelectItem>
                              {grupos.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hora inicio</Label>
                          <Input type="time" value={almaForm.hora_virtual} onChange={e => setAlmaForm(f => ({ ...f, hora_virtual: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Tab: Personalizado ── */}
                  <TabsContent value="custom" className="space-y-4 mt-0">
                    {/* Módulo A */}
                    <div className="border rounded-lg p-3 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Módulo A</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select value={customForm.module_a} onValueChange={v => setCustomForm(f => ({ ...f, module_a: v, source_a: "" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grupo">Grupo</SelectItem>
                              <SelectItem value="taller">Taller</SelectItem>
                              <SelectItem value="actividad">Actividad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Item</Label>
                          <Select value={customForm.source_a || "none"} onValueChange={v => setCustomForm(f => ({ ...f, source_a: v === "none" ? "" : v }))}>
                            <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin vincular</SelectItem>
                              {getSourceItems(customForm.module_a).map((item: any) => (
                                <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Hora inicio</Label>
                          <Input type="time" value={customForm.start_time_a} onChange={e => setCustomForm(f => ({ ...f, start_time_a: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Hora fin</Label>
                          <Input type="time" value={customForm.end_time_a} onChange={e => setCustomForm(f => ({ ...f, end_time_a: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    {/* Intercalar toggle */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="intercalar"
                        checked={customForm.intercalar}
                        onCheckedChange={checked => setCustomForm(f => ({ ...f, intercalar: checked as boolean }))}
                      />
                      <Label htmlFor="intercalar" className="cursor-pointer text-sm">
                        Intercalar con otro módulo
                      </Label>
                    </div>

                    {/* Módulo B */}
                    {customForm.intercalar && (
                      <div className="border rounded-lg p-3 space-y-3 border-dashed">
                        <p className="text-sm font-semibold text-gray-700">Módulo B (alternado)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={customForm.module_b} onValueChange={v => setCustomForm(f => ({ ...f, module_b: v, source_b: "" }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="grupo">Grupo</SelectItem>
                                <SelectItem value="taller">Taller</SelectItem>
                                <SelectItem value="actividad">Actividad</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Item</Label>
                            <Select value={customForm.source_b || "none"} onValueChange={v => setCustomForm(f => ({ ...f, source_b: v === "none" ? "" : v }))}>
                              <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin vincular</SelectItem>
                                {getSourceItems(customForm.module_b).map((item: any) => (
                                  <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Hora inicio</Label>
                            <Input type="time" value={customForm.start_time_b} onChange={e => setCustomForm(f => ({ ...f, start_time_b: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Hora fin</Label>
                            <Input type="time" value={customForm.end_time_b} onChange={e => setCustomForm(f => ({ ...f, end_time_b: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Días */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Días de la semana</Label>
                      <div className="flex gap-2">
                        {WEEK_DAYS.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleCustomDay(day.value)}
                            className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                              customForm.days.includes(day.value)
                                ? "bg-[#4dd0e1] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Frecuencia */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Frecuencia</Label>
                      <div className="flex gap-2">
                        {[
                          { value: "semanal", label: "Semanal" },
                          { value: "quincenal", label: "Quincenal" },
                          { value: "mensual", label: "Mensual (1er día)" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCustomForm(f => ({ ...f, frequency: opt.value as any }))}
                            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                              customForm.frequency === opt.value
                                ? "bg-[#4dd0e1] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rango de fechas */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm">Fecha inicio</Label>
                        <Input
                          type="date"
                          value={customForm.date_start}
                          onChange={e => {
                            setCustomForm(f => ({ ...f, date_start: e.target.value }))
                            if (e.target.value) fetchYearInstances(parseInt(e.target.value.slice(0, 4)))
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Fecha fin</Label>
                        <Input
                          type="date"
                          value={customForm.date_end}
                          onChange={e => setCustomForm(f => ({ ...f, date_end: e.target.value }))}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right column — live preview */}
              <div className="w-[45%] flex flex-col overflow-hidden" style={{ maxHeight: "calc(90vh - 145px)" }}>
                <div className="px-4 py-3 border-b bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700">Preview en vivo</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activePreview.length} instancia{activePreview.length !== 1 ? "s" : ""}
                    {conflictCount > 0 && (
                      <span className="text-amber-600 ml-2">
                        · ⚠️ {conflictCount} conflicto{conflictCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {activePreview.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      Configurá el formulario para ver el preview
                    </div>
                  ) : (
                    activePreview.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg px-3 py-2 text-xs ${
                          entry.conflict
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                entry.module === "grupo"
                                  ? "bg-[#4dd0e1]"
                                  : entry.module === "taller"
                                  ? "bg-purple-500"
                                  : "bg-orange-400"
                              }`}
                            />
                            <span className="font-medium text-gray-700">{entry.sourceName}</span>
                          </div>
                          <span className="text-gray-400 flex-shrink-0">{entry.start_time}–{entry.end_time}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {entry.dayName}, {formatDateDMY(entry.date)}
                        </div>
                        {entry.conflict && (
                          <div className="flex items-center gap-1 mt-1 text-amber-700">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                            <span>Superposición con {entry.conflict.with_name} ({entry.conflict.with_time})</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-between items-center">
              {generateResult ? (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Se crearon {generateResult.created} instancias correctamente.
                </p>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                  {generateResult ? "Cerrar" : "Cancelar"}
                </Button>
                {!generateResult && (
                  <Button
                    className="bg-[#4dd0e1] hover:bg-[#26c6da] text-white"
                    onClick={generateTab === "alma" ? handleGenerateAlma : handleGenerateCustom}
                    disabled={generating || activePreview.length === 0}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {generating ? "Generando..." : `Confirmar y guardar (${activePreview.length})`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New / Edit instance dialog ───────────────────────────── */}
      <Dialog open={instanceDialogOpen} onOpenChange={setInstanceDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? "Editar evento" : "Nuevo evento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Módulo + Item */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Módulo</Label>
                <Select
                  value={instanceForm.module}
                  onValueChange={(v: any) => setInstanceForm(f => ({ ...f, module: v, source_id: "", coordinator_id: "", co_coordinator_id: "" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grupo">Grupo</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="actividad">Actividad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  {instanceForm.module === "grupo" ? "Grupo" : instanceForm.module === "taller" ? "Taller" : "Actividad"}
                </Label>
                <Select
                  value={instanceForm.source_id || "none"}
                  onValueChange={v => setInstanceForm(f => ({ ...f, source_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vincular</SelectItem>
                    {getSourceItems(instanceForm.module).map((item: any) => (
                      <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Horario */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={instanceForm.start_time}
                  onChange={e => setInstanceForm(f => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={instanceForm.end_time}
                  onChange={e => setInstanceForm(f => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>

            {editingInstance ? (
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={instanceForm.date_from}
                  onChange={e => setInstanceForm(f => ({ ...f, date_from: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_single_day"
                    checked={instanceForm.is_single_day}
                    onCheckedChange={checked =>
                      setInstanceForm(f => ({ ...f, is_single_day: checked as boolean, date_to: "", repeat_days: [] }))
                    }
                  />
                  <Label htmlFor="is_single_day" className="cursor-pointer">Un solo día</Label>
                </div>

                {instanceForm.is_single_day ? (
                  <div className="space-y-1">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={instanceForm.date_from}
                      onChange={e => setInstanceForm(f => ({ ...f, date_from: e.target.value }))}
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Fecha inicio</Label>
                        <Input
                          type="date"
                          value={instanceForm.date_from}
                          onChange={e => setInstanceForm(f => ({ ...f, date_from: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Fecha fin</Label>
                        <Input
                          type="date"
                          value={instanceForm.date_to}
                          onChange={e => setInstanceForm(f => ({ ...f, date_to: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Días de la semana</Label>
                      <div className="flex gap-2 flex-wrap">
                        {WEEK_DAYS.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleRepeatDay(day.value)}
                            className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                              instanceForm.repeat_days.includes(day.value)
                                ? "bg-[#4dd0e1] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      {instanceForm.repeat_days.length === 0 && instanceForm.date_from && instanceForm.date_to && (
                        <p className="text-xs text-amber-600">
                          Sin días seleccionados se crearán instancias para cada día del rango.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Coordinador / Co-coordinador solo para grupo y taller */}
            {instanceForm.module !== "actividad" && (
              <>
                <div className="space-y-1">
                  <Label>Coordinador</Label>
                  <Select
                    value={instanceForm.coordinator_id || "none"}
                    onValueChange={v => setInstanceForm(f => ({ ...f, coordinator_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {volunteers.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.name} {v.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Co-coordinador</Label>
                  <Select
                    value={instanceForm.co_coordinator_id || "none"}
                    onValueChange={v => setInstanceForm(f => ({ ...f, co_coordinator_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {volunteers.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.name} {v.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={instanceForm.status} onValueChange={v => setInstanceForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="programado">Programado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                value={instanceForm.notes}
                onChange={e => setInstanceForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Notas opcionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInstanceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#4dd0e1] hover:bg-[#26c6da] text-white"
              onClick={handleSaveInstance}
              disabled={
                saving ||
                !instanceForm.date_from ||
                (!editingInstance && !instanceForm.is_single_day && !instanceForm.date_to)
              }
            >
              {saving ? "Guardando..." : editingInstance ? "Guardar cambios" : "Crear instancia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
