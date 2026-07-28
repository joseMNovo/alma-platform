"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { can } from "@/lib/permissions"
import TrainingPlayer from "@/components/capacitaciones/training-player"
import CapacitacionesAdmin from "@/components/capacitaciones/capacitaciones-admin"
import type { Training, TrainingItem } from "@/lib/data-manager"
import {
  GraduationCap, Lock, CheckCircle2, PlayCircle, FileText,
  Loader2, Clock, Settings, ExternalLink, Plus, ChevronDown, Eye,
} from "lucide-react"

/**
 * Módulo Capacitaciones.
 *
 * Cada capacitación es una sub-pestaña. El contenido llega ya gateado por el
 * servidor: los ítems sin habilitación vienen con locked=true y sin video_ref.
 * Este componente NUNCA decide qué se puede ver — solo lo muestra.
 */
export default function CapacitacionesManager({ user }: { user: any }) {
  const [trainings, setTrainings] = useState<Training[]>([])
  // Catálogo completo (todos los estados: borrador/publicada/archivada) para
  // la pestaña Gestión. `trainings` (de /mis) solo trae publicadas — un admin
  // recién creando un borrador no se vería a sí mismo ahí.
  const [managedTrainings, setManagedTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTraining, setActiveTraining] = useState<string>("")
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  // El admin arranca en "administrar" (su trabajo real); el participante, en
  // "ver" con la primera capacitación que puede ver.
  const isManager = can(user, "capacitaciones:manage")
  const [view, setView] = useState<"ver" | "administrar">(isManager ? "administrar" : "ver")
  // Señal para que el botón "Nueva capacitación" del header abra el formulario
  // de alta dentro de la vista de administración.
  const [newTrainingSignal, setNewTrainingSignal] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/capacitaciones/mis")
      if (!res.ok) throw new Error("No se pudieron cargar las capacitaciones")
      const data: Training[] = await res.json()
      setTrainings(data)
      setActiveTraining((prev) => prev || (data[0] ? String(data[0].id) : ""))

      if (isManager) {
        const resAll = await fetch("/api/capacitaciones?include_items=true")
        if (!resAll.ok) throw new Error("No se pudo cargar el catálogo de gestión")
        setManagedTrainings(await resAll.json())
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar las capacitaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = useMemo(
    () => trainings.find((t) => String(t.id) === activeTraining),
    [trainings, activeTraining],
  )

  const currentItem = useMemo(() => {
    if (!current) return null
    return current.items.find((i) => i.id === activeItemId) ?? current.items[0] ?? null
  }, [current, activeItemId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-[#4dd0e1]" />
          <h2 className="text-xl font-bold text-gray-900">Capacitaciones</h2>
        </div>

        {isManager && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {/* Ver / Administrar: dos modos separados, no una pestaña más
                mezclada con la lista de cursos (confundía). */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setView("ver")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
                  view === "ver" ? "bg-[#4dd0e1] text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Eye className="h-4 w-4 shrink-0" />
                Ver
              </button>
              <button
                onClick={() => setView("administrar")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
                  view === "administrar" ? "bg-[#9A8BC2] text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                Administrar
              </button>
            </div>
            <Button
              onClick={() => { setView("administrar"); setNewTrainingSignal((n) => n + 1) }}
              className="flex-1 bg-[#4dd0e1] hover:bg-[#3bb8c9] sm:flex-none"
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              Nueva capacitación
            </Button>
          </div>
        )}
      </div>

      {view === "administrar" && isManager ? (
        <CapacitacionesAdmin user={user} trainings={managedTrainings} onChanged={load} openNewSignal={newTrainingSignal} />
      ) : trainings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
            <GraduationCap className="h-10 w-10 text-gray-300" />
            <p className="font-medium">Todavía no hay capacitaciones publicadas</p>
            {isManager && <p className="text-sm">Creá la primera desde «Administrar».</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Selector tipo acordeón: colapsado por defecto, no crece a lo
              ancho por más capacitaciones que haya. Con una sola, ni se
              muestra — no tiene sentido elegir entre una opción. */}
          {trainings.length > 1 && (
            <TrainingPicker
              trainings={trainings}
              activeId={activeTraining}
              onSelect={(id) => { setActiveTraining(id); setActiveItemId(null) }}
            />
          )}

          {current && (
            <TrainingView
              training={current}
              item={currentItem}
              onSelectItem={setActiveItemId}
              user={user}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Selector de capacitación (acordeón) ─────────────────────────────────

function TrainingPicker({
  trainings,
  activeId,
  onSelect,
}: {
  trainings: Training[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = trainings.find((t) => String(t.id) === activeId)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 font-medium text-gray-800">
          {current ? (
            current.has_access ? (
              <PlayCircle className="h-4 w-4 shrink-0 text-[#4dd0e1]" />
            ) : (
              <Lock className="h-4 w-4 shrink-0 text-gray-400" />
            )
          ) : (
            <GraduationCap className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          <span className="truncate">{current ? current.title : "Elegí una capacitación"}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="max-h-72 space-y-0.5 overflow-y-auto border-t border-gray-100 p-1">
          {trainings.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(String(t.id)); setOpen(false) }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                String(t.id) === activeId
                  ? "bg-[#4dd0e1]/10 font-medium text-[#00838f]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.has_access ? (
                <PlayCircle className="h-4 w-4 shrink-0" />
              ) : (
                <Lock className="h-4 w-4 shrink-0 text-gray-400" />
              )}
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vista de una capacitación ──────────────────────────────────────────

function TrainingView({
  training,
  item,
  onSelectItem,
  user,
}: {
  training: Training
  item: TrainingItem | null
  onSelectItem: (id: number) => void
  user: any
}) {
  const progress = training.item_count
    ? Math.round((training.completed_items / training.item_count) * 100)
    : 0

  if (!training.has_access) {
    return <LockedTraining training={training} />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        {item ? (
          <>
            {item.kind === "video" ? (
              <TrainingPlayer item={item} userEmail={user.email} userName={user.name} />
            ) : (
              <Card>
                <CardContent className="prose max-w-none whitespace-pre-wrap py-6 text-sm text-gray-700">
                  {item.body || item.description || "Sin contenido."}
                  {item.kind === "link" && item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-[#4dd0e1]"
                    >
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
              {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-14 text-center text-gray-500">
              Esta capacitación todavía no tiene contenido cargado.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Tu avance</span>
              <span className="text-gray-500">
                {training.completed_items} de {training.item_count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-[#4dd0e1] transition-all" style={{ width: `${progress}%` }} />
            </div>
            {training.access_expires_at && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                Tu acceso vence el{" "}
                {new Date(training.access_expires_at).toLocaleDateString("es-AR")}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-1">
          {training.items.map((it, index) => {
            const active = item?.id === it.id
            return (
              <button
                key={it.id}
                onClick={() => onSelectItem(it.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                  active ? "border-[#4dd0e1] bg-[#4dd0e1]/5" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {it.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : it.kind === "video" ? (
                    <PlayCircle className="h-4 w-4 text-gray-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {index + 1}. {it.title}
                  </span>
                  {it.duration_minutes ? (
                    <span className="text-xs text-gray-400">{it.duration_minutes} min</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Capacitación sin habilitar: se muestra el temario, nunca el contenido. */
function LockedTraining({ training }: { training: Training }) {
  return (
    <Card>
      <CardContent className="space-y-5 py-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-50 p-3">
            <Lock className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{training.title}</h3>
            {training.description && (
              <p className="mt-1 text-sm text-gray-600">{training.description}</p>
            )}
            {Number(training.price) > 0 && (
              <p className="mt-3 text-2xl font-bold text-[#4dd0e1]">
                ${Number(training.price).toLocaleString("es-AR")}
                <span className="ml-1 text-sm font-normal text-gray-500">{training.currency}</span>
              </p>
            )}
          </div>
        </div>

        {training.items.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Contenido</p>
            <ul className="space-y-1">
              {training.items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-2 text-sm text-gray-500">
                  <Lock className="h-3 w-3 shrink-0 text-gray-300" />
                  {i + 1}. {it.title}
                  {it.duration_minutes ? (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {it.duration_minutes} min
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800">¿Cómo accedo?</p>
          <p className="mt-1">
            Escribinos para coordinar el pago. Apenas lo registremos, un administrador
            te habilita el acceso y podés ver el contenido desde acá mismo.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
