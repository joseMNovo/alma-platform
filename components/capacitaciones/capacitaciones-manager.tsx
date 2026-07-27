"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { can } from "@/lib/permissions"
import TrainingPlayer from "@/components/capacitaciones/training-player"
import CapacitacionesAdmin from "@/components/capacitaciones/capacitaciones-admin"
import type { Training, TrainingItem } from "@/lib/data-manager"
import {
  GraduationCap, Lock, CheckCircle2, PlayCircle, FileText,
  Loader2, Clock, Settings, ExternalLink, Plus,
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
  const [loading, setLoading] = useState(true)
  const [activeTraining, setActiveTraining] = useState<string>("")
  const [activeItemId, setActiveItemId] = useState<number | null>(null)
  // Señal para que el botón "Nueva capacitación" del header abra el formulario
  // de alta dentro de la vista de Gestión.
  const [newTrainingSignal, setNewTrainingSignal] = useState(0)

  const isManager = can(user, "capacitaciones:manage")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/capacitaciones/mis")
      if (!res.ok) throw new Error("No se pudieron cargar las capacitaciones")
      const data: Training[] = await res.json()
      setTrainings(data)
      // El admin cae directo en Gestión (su trabajo real); el participante,
      // en la primera capacitación que puede ver.
      setActiveTraining((prev) => prev || (isManager ? "gestion" : (data[0] ? String(data[0].id) : "")))
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
        {/* Siempre visible para el admin, esté donde esté: salta a Gestión y
            abre el formulario de alta. */}
        {isManager && (
          <Button
            onClick={() => { setActiveTraining("gestion"); setNewTrainingSignal((n) => n + 1) }}
            className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva capacitación
          </Button>
        )}
      </div>

      <Tabs value={activeTraining} onValueChange={(v) => { setActiveTraining(v); setActiveItemId(null) }}>
        {/* Con muchas capacitaciones las sub-pestañas se envuelven en varias
            filas en vez de desbordar la pantalla. */}
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white p-1">
          {trainings.map((t) => (
            <TabsTrigger
              key={t.id}
              value={String(t.id)}
              className="flex items-center gap-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            >
              {t.has_access ? <PlayCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {t.title}
            </TabsTrigger>
          ))}
          {isManager && (
            <TabsTrigger
              value="gestion"
              className="ml-auto flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4" />
              Gestión
            </TabsTrigger>
          )}
        </TabsList>

        {trainings.map((t) => (
          <TabsContent key={t.id} value={String(t.id)} className="mt-6">
            <TrainingView
              training={t}
              item={String(t.id) === activeTraining ? currentItem : null}
              onSelectItem={setActiveItemId}
              user={user}
            />
          </TabsContent>
        ))}

        {isManager && (
          <TabsContent value="gestion" className="mt-6">
            <CapacitacionesAdmin user={user} trainings={trainings} onChanged={load} openNewSignal={newTrainingSignal} />
          </TabsContent>
        )}
      </Tabs>

      {trainings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
            <GraduationCap className="h-10 w-10 text-gray-300" />
            <p className="font-medium">Todavía no hay capacitaciones publicadas</p>
            {isManager && <p className="text-sm">Creá la primera desde la pestaña Gestión.</p>}
          </CardContent>
        </Card>
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
