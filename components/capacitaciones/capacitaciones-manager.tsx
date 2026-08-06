"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { can } from "@/lib/permissions"
import { config } from "@/lib/config"
import TrainingPlayer from "@/components/capacitaciones/training-player"
import CatalogoCapacitaciones from "@/components/capacitaciones/catalogo-capacitaciones"
import TrainingSurvey from "@/components/capacitaciones/training-survey"
import CapacitacionesAdmin from "@/components/capacitaciones/capacitaciones-admin"
import type { Training, TrainingItem } from "@/lib/data-manager"
import {
  GraduationCap, Lock, CheckCircle2, PlayCircle, FileText,
  Loader2, Clock, Settings, ExternalLink, Plus, ArrowLeft, Eye, CreditCard,
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
  // El admin arranca en "administrar" (su trabajo real); el participante, en
  // "ver" con la primera capacitación que puede ver.
  const router = useRouter()
  const searchParams = useSearchParams()

  const isManager = can(user, "capacitaciones:manage")
  // El modo también vive en la URL (?vista=): así el botón atrás lo respeta y
  // el link que le pasás a alguien abre donde vos estabas.
  const vistaUrl = searchParams.get("vista")
  const view: "ver" | "administrar" =
    vistaUrl === "ver" || vistaUrl === "administrar"
      ? vistaUrl
      : isManager
        ? "administrar"
        : "ver"
  const setView = (modo: "ver" | "administrar") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("vista", modo)
    router.push(`/capacitaciones?${params.toString()}`)
  }
  // Pedido puntual para que el botón "Nueva capacitación" del header abra el
  // formulario de alta dentro de la vista de administración. Se apaga apenas
  // el hijo lo consume, para que no reviva al remontarse (recarga o cambio de
  // vista) y reabra el modal solo.
  const [openNewTraining, setOpenNewTraining] = useState(false)

  /**
   * Qué se está mirando vive en la URL, no en el estado.
   *
   *   /capacitaciones                → la vidriera
   *   /capacitaciones?c=<slug>       → una capacitación
   *   /capacitaciones?c=<slug>&m=12  → una pieza de contenido puntual
   *
   * Así el botón "atrás" del navegador vuelve al catálogo, la pantalla se
   * puede recargar sin perder dónde estabas, y el link se puede pasar.
   *
   * El slug y no el id: es lo que ya se usa en la landing pública, y un link
   * legible se puede mandar por WhatsApp sin que parezca un error.
   */
  const slugActivo = searchParams.get("c") ?? ""
  const itemActivo = Number(searchParams.get("m")) || null

  const irA = (slug?: string, itemId?: number | null) => {
    const params = new URLSearchParams()
    // El modo se arrastra: volver al catálogo no tiene que sacarte de
    // Administrar si es ahí donde estabas trabajando.
    if (vistaUrl) params.set("vista", vistaUrl)
    if (slug) params.set("c", slug)
    if (slug && itemId) params.set("m", String(itemId))
    const qs = params.toString()
    return qs ? `/capacitaciones?${qs}` : "/capacitaciones"
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/capacitaciones/mis")
      if (!res.ok) throw new Error("No se pudieron cargar las capacitaciones")
      const data: Training[] = await res.json()
      setTrainings(data)

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

  // Si el slug de la URL no está en la lista (la despublicaron, o alguien
  // escribió cualquier cosa), `current` queda vacío y se ve el catálogo.
  const current = useMemo(
    () => trainings.find((t) => t.slug === slugActivo),
    [trainings, slugActivo],
  )

  const currentItem = useMemo(() => {
    if (!current) return null
    return current.items.find((i) => i.id === itemActivo) ?? current.items[0] ?? null
  }, [current, itemActivo])

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
              onClick={() => { setView("administrar"); setOpenNewTraining(true) }}
              className="flex-1 bg-[#4dd0e1] hover:bg-[#3bb8c9] sm:flex-none"
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              Nueva capacitación
            </Button>
          </div>
        )}
      </div>

      {view === "administrar" && isManager ? (
        <CapacitacionesAdmin
          user={user}
          trainings={managedTrainings}
          onChanged={load}
          openNew={openNewTraining}
          onOpenNewHandled={() => setOpenNewTraining(false)}
        />
      ) : trainings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
            <GraduationCap className="h-10 w-10 text-gray-300" />
            <p className="font-medium">Todavía no hay capacitaciones publicadas</p>
            {isManager && <p className="text-sm">Creá la primera desde «Administrar».</p>}
          </CardContent>
        </Card>
      ) : !current ? (
        /* Pantalla de inicio: la vidriera con TODAS las publicadas, incluidas
           las que la persona todavía no puede ver. Ver el candado y el precio
           es parte de la propuesta. */
        <CatalogoCapacitaciones
          trainings={trainings}
          showAccess
          onSelect={(t) => router.push(irA(t.slug))}
        />
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => router.push(irA())}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[#00838f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Todas las capacitaciones
          </button>

          <TrainingView
            training={current}
            item={currentItem}
            onSelectItem={(id) => router.replace(irA(current.slug, id))}
            user={user}
          />
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

        {/* La evaluación cierra el curso: se habilita cuando vio todo el
            contenido. Si la capacitación no tiene una, no se muestra nada. */}
        <TrainingSurvey
          trainingId={training.id}
          contenidoCompleto={training.item_count > 0 && training.completed_items >= training.item_count}
        />
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

        {training.payment_url && (
          <a
            href={training.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4dd0e1] px-4 py-3 font-semibold text-white transition hover:bg-[#3bb8c9]"
          >
            <CreditCard className="h-4 w-4" />
            Comprar con MercadoPago
          </a>
        )}

        {/* La plataforma NO se entera del pago: el cobro pasa por MercadoPago,
            afuera. Por eso acá no hay ningún botón de "ya pagué" — lo confirma
            una persona mirando el panel de MP. Este cartel es para que la
            espera no se sienta como que algo se rompió. */}
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800">¿Cómo sigue después de pagar?</p>
          <p className="mt-1">
            Un voluntario de ALMA confirma el pago y te habilita el acceso. Apenas lo
            haga, el contenido aparece acá mismo: no tenés que volver a pagar ni
            registrarte de nuevo.
          </p>
          <p className="mt-2">
            ¿Ya pagaste y seguís viendo el candado? Escribinos a{" "}
            <a
              href={`mailto:${config.contact.email}`}
              className="font-medium text-[#00838f] underline-offset-2 hover:underline"
            >
              {config.contact.email}
            </a>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
