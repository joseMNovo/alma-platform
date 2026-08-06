"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import type { DeliveryRow, Training } from "@/lib/data-manager"
import {
  Award, Loader2, Send, Check, ExternalLink, Users, GraduationCap,
} from "lucide-react"

/**
 * Entrega de certificados.
 *
 * Una fila por persona con TODO su estado junto —acceso, contenido visto,
 * evaluación, certificado, envío— que es lo que permite filtrar por
 * "aprobaron y todavía no tienen certificado" sin cruzar listas a mano. El
 * cruce lo hace el backend en una sola consulta.
 *
 * El envío manda un LINK, no un adjunto: el PDF se genera en el momento desde
 * el texto congelado, así el mail nunca lleva una versión vieja y no llena
 * casillas.
 */

type Filtro = "todos" | "aprobaron" | "sin_certificado" | "sin_enviar"

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "aprobaron", label: "Aprobaron" },
  { value: "sin_certificado", label: "Aprobaron y no tienen certificado" },
  { value: "sin_enviar", label: "Tienen certificado y no se les mandó" },
]

export default function EntregaCertificados() {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [trainingId, setTrainingId] = useState<number | null>(null)
  const [filas, setFilas] = useState<DeliveryRow[]>([])
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/capacitaciones")
        if (!res.ok) throw new Error()
        const lista: Training[] = await res.json()
        setTrainings(lista)
        setTrainingId((prev) => prev ?? lista[0]?.id ?? null)
      } catch {
        toast({ title: "Error", description: "No se pudieron cargar las capacitaciones", variant: "destructive" })
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  const cargarTablero = async (id: number) => {
    setCargando(true)
    setSeleccion(new Set())
    try {
      const res = await fetch(`/api/certificados/entrega/${id}`)
      if (!res.ok) throw new Error()
      setFilas(await res.json())
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la entrega", variant: "destructive" })
      setFilas([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (trainingId) cargarTablero(trainingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId])

  const visibles = useMemo(() => {
    switch (filtro) {
      case "aprobaron":
        return filas.filter((f) => f.survey_passed)
      case "sin_certificado":
        return filas.filter((f) => f.survey_passed && !f.certificate_code)
      case "sin_enviar":
        return filas.filter((f) => f.certificate_code && !f.sent_at)
      default:
        return filas
    }
  }, [filas, filtro])

  const capacitacion = trainings.find((t) => t.id === trainingId)

  // Con qué se puede operar sobre lo seleccionado: enviar exige certificado
  // emitido, y emitir sobre alguien que ya tiene es REEMITIR.
  const elegidas = visibles.filter((f) => seleccion.has(f.person_id))
  const conCertificado = elegidas.filter((f) => f.certificate_code)
  const puedeEnviar = conCertificado.some((f) => f.email)
  const esReemision = elegidas.length > 0 && conCertificado.length === elegidas.length

  const alternar = (personId: number) =>
    setSeleccion((prev) => {
      const copia = new Set(prev)
      copia.has(personId) ? copia.delete(personId) : copia.add(personId)
      return copia
    })

  const emitir = async () => {
    if (!trainingId || !seleccion.size) return
    setTrabajando(true)
    try {
      const res = await fetch("/api/certificados/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_ids: [...seleccion], training_id: trainingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo emitir")

      const pedidos = seleccion.size
      const emitidos = Array.isArray(data) ? data.length : 0
      toast({
        title: `${emitidos} ${emitidos === 1 ? "certificado emitido" : "certificados emitidos"}`,
        description:
          emitidos < pedidos
            ? `${pedidos - emitidos} quedaron afuera: revisá que tengan nombre cargado.`
            : undefined,
      })
      cargarTablero(trainingId)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setTrabajando(false)
    }
  }

  const enviar = async () => {
    if (!seleccion.size) return

    const destinatarios = visibles.filter(
      (f) => seleccion.has(f.person_id) && f.certificate_code && f.email,
    )
    if (!destinatarios.length) {
      toast({
        title: "No hay a quién mandarle",
        description: "Los seleccionados no tienen certificado emitido o no tienen email.",
        variant: "destructive",
      })
      return
    }

    setTrabajando(true)
    try {
      // Una sola llamada: el envío y el marcado de "ya se le mandó" pasan en
      // el servidor, que es el único que puede usar el envío real de Resend.
      const res = await fetch("/api/certificados/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatarios: destinatarios.map((f) => ({
            code: f.certificate_code,
            email: f.email,
            name: f.name,
            training_title: capacitacion?.title ?? null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudieron enviar")

      toast({
        title: `${data.enviados} ${data.enviados === 1 ? "mail enviado" : "mails enviados"}`,
        description: data.fallaron?.length
          ? `${data.fallaron.length} fallaron. Probá de nuevo con esos.`
          : undefined,
      })
      if (trainingId) cargarTablero(trainingId)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* El título NO repite la capacitación elegida: está acá abajo, en el
          desplegable, que es además donde se cambia. */}
      <div className="text-center">
        <h3 className="font-semibold text-gray-900">Emisión</h3>
        <p className="text-sm text-gray-500">
          Quién completó, quién aprobó y a quién le falta su certificado.
        </p>
      </div>

      {/* De qué capacitación estamos hablando: es la decisión que manda sobre
          toda la pantalla, así que va centrada y grande, no como un campo más
          en un rincón. */}
      <div className="mx-auto w-full max-w-md">
        <Select
          value={trainingId ? String(trainingId) : undefined}
          onValueChange={(v) => setTrainingId(Number(v))}
        >
          <SelectTrigger className="h-12 justify-center gap-2 rounded-full border-2 border-[#4dd0e1]/40 bg-[#4dd0e1]/5 px-6 text-base font-medium text-[#00838f] hover:bg-[#4dd0e1]/10 focus:ring-[#4dd0e1] [&>span]:truncate">
            <GraduationCap className="h-5 w-5 shrink-0" />
            <SelectValue placeholder="Elegí una capacitación" />
          </SelectTrigger>
          <SelectContent>
            {trainings.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chips en vez de un desplegable: los cuatro filtros se ven de una y
          se cambian de un toque, sin abrir nada. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => {
          const activo = filtro === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activo
                  ? "bg-[#4dd0e1] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
        </div>
      ) : !visibles.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="font-medium">No hay nadie con ese filtro</p>
            {capacitacion && filtro === "todos" && (
              <p className="text-sm">Todavía no hay personas habilitadas en esta capacitación.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="overflow-x-auto py-4">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="w-8 px-2 py-2">
                      <input
                        type="checkbox"
                        checked={visibles.length > 0 && seleccion.size === visibles.length}
                        onChange={(e) =>
                          setSeleccion(
                            e.target.checked ? new Set(visibles.map((f) => f.person_id)) : new Set(),
                          )
                        }
                        className="h-4 w-4 accent-[#4dd0e1]"
                        title="Seleccionar todos"
                      />
                    </th>
                    <th className="px-2 py-2 font-medium">Persona</th>
                    <th className="px-2 py-2 font-medium">Contenido</th>
                    <th className="px-2 py-2 font-medium">Evaluación</th>
                    <th className="px-2 py-2 font-medium">Certificado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((fila) => (
                    <tr key={fila.person_id} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={seleccion.has(fila.person_id)}
                          onChange={() => alternar(fila.person_id)}
                          className="h-4 w-4 accent-[#4dd0e1]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-medium text-gray-800">{fila.name ?? "Sin nombre"}</span>
                        {fila.email ? (
                          <span className="block text-xs text-gray-400">{fila.email}</span>
                        ) : (
                          <span className="block text-xs text-amber-600">Sin email</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {fila.items_completed} de {fila.items_total}
                        {fila.content_done && (
                          <Check className="ml-1 inline h-3.5 w-3.5 text-green-500" />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {fila.survey_passed == null ? (
                          <span className="text-xs text-gray-400">Sin evaluación</span>
                        ) : fila.survey_passed ? (
                          <span className="font-medium text-green-600">
                            Aprobó
                            {fila.best_score != null && ` (${fila.best_score.toFixed(0)}%)`}
                          </span>
                        ) : fila.best_score != null ? (
                          <span className="text-gray-500">
                            No aprobó ({fila.best_score.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-gray-400">No rindió</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {fila.certificate_code ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <a
                              href={`/certificado/${fila.certificate_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs text-[#00838f] underline-offset-2 hover:underline"
                            >
                              {fila.certificate_code}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {fila.sent_at ? (
                              <span className="text-xs text-green-600">Enviado</span>
                            ) : (
                              <span className="text-xs text-amber-600">Sin enviar</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-t-lg border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur">
            <span className="text-sm text-gray-600">
              {seleccion.size} {seleccion.size === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            <Button
              onClick={emitir}
              disabled={trabajando || !seleccion.size}
              className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
            >
              {trabajando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Award className="mr-2 h-4 w-4" />
              )}
              {esReemision ? "Reemitir certificado" : "Emitir certificado"}
            </Button>
            {puedeEnviar && (
              <Button variant="outline" onClick={enviar} disabled={trabajando}>
                <Send className="mr-2 h-4 w-4" />
                Enviar por mail
              </Button>
            )}
          </div>

        </>
      )}
    </div>
  )
}
