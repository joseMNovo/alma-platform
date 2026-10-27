"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Trash2, Zap } from "lucide-react"
import { useState } from "react"

export type TipoEvento = "grupo" | "taller" | "actividad"

export interface EventoMobile {
  id: number
  hora: string
  titulo: string
  tipo: TipoEvento
  cancelado: boolean
  /** Si esta persona está asignada o anotada. */
  mio: boolean
  lugar?: string | null
  /** "Ana, Pedro" — ya armado, para no pasar la lista entera. */
  voluntarios?: string | null
}

const COLOR: Record<TipoEvento, { punto: string; pastilla: string }> = {
  grupo: { punto: "bg-[#4dd0e1]", pastilla: "bg-[#4dd0e1]/15 text-[#00838f]" },
  taller: { punto: "bg-purple-500", pastilla: "bg-purple-100 text-purple-700" },
  actividad: { punto: "bg-orange-400", pastilla: "bg-orange-100 text-orange-700" },
}

const ETIQUETA: Record<TipoEvento, string> = {
  grupo: "Grupo",
  taller: "Taller",
  actividad: "Actividad",
}

const DIAS = ["L", "M", "M", "J", "V", "S", "D"]

/**
 * El calendario en el teléfono.
 *
 * Es el patrón del calendario nativo: un mes compacto con puntitos, y abajo
 * la agenda del día elegido. La diferencia con lo que había es que el día ya
 * no abre una ventana encima — la lista de abajo cambia y el mes sigue a la
 * vista, así que saltar del 27 al 28 no obliga a cerrar nada ni a aprender
 * ningún gesto para salir.
 *
 * ── Por qué la grilla no tiene líneas ─────────────────────────────────
 *
 * Tenía borde en cada celda y 64px de alto mínimo, y se leía como una
 * planilla. Sin el enrejado se lee como un calendario y se recuperan unos
 * quince pixeles por fila — que es justo lo que hace falta para que la agenda
 * del día entre en la misma pantalla.
 *
 * ── Hoy vs. seleccionado ──────────────────────────────────────────────
 *
 * Seleccionado va RELLENO y hoy va con anillo. La marca más fuerte tiene que
 * señalar lo que estás mirando, no lo que ya sabés.
 *
 * Todo lo que se toca mide 44px o más: esto se usa parado y con una mano.
 */
export default function CalendarioMobile({
  titulo, celdas, eventosDe, esHoy, diaSel, onDia, onMes, onHoy,
  conteos, filtroTipo, onFiltroTipo,
  esParticipante, soloMios, onSoloMios, soloAnotados, onSoloAnotados,
  voluntarios, filtroVoluntario, onFiltroVoluntario,
  puedeCrear, onNuevo, puedeGenerar, onGenerar, puedeBorrar, onBorrar,
  onAbrirEvento, nombreDia,
}: {
  titulo: string
  celdas: (number | null)[]
  eventosDe: (dia: number) => EventoMobile[]
  esHoy: (dia: number) => boolean
  diaSel: number | null
  onDia: (dia: number) => void
  onMes: (delta: number) => void
  onHoy: () => void
  conteos: Record<TipoEvento, number>
  filtroTipo: string
  onFiltroTipo: (t: string) => void
  esParticipante: boolean
  soloMios: boolean
  onSoloMios: () => void
  soloAnotados: boolean
  onSoloAnotados: () => void
  voluntarios: { id: number; name: string; last_name?: string }[]
  filtroVoluntario: string
  onFiltroVoluntario: (v: string) => void
  puedeCrear: boolean
  onNuevo: (dia?: number) => void
  puedeGenerar: boolean
  onGenerar: () => void
  puedeBorrar: boolean
  onBorrar: () => void
  onAbrirEvento: (id: number) => void
  nombreDia: (dia: number) => string
}) {
  const [accionesAbiertas, setAccionesAbiertas] = useState(false)
  const delDia = diaSel !== null ? eventosDe(diaSel) : []
  const hayAccionesDeMes = puedeGenerar || puedeBorrar

  const chip = (clave: string, texto: string, n: number, punto?: string) => {
    const activo = filtroTipo === clave
    return (
      <button
        key={clave}
        onClick={() => onFiltroTipo(clave)}
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${
          activo
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        {punto && <span className={`h-2 w-2 rounded-full ${punto}`} />}
        {texto}
        {n > 0 && <span className={activo ? "text-white/70" : "text-gray-400"}>{n}</span>}
      </button>
    )
  }

  return (
    <div className="sm:hidden">
      {/* Mes */}
      <div className="flex items-center justify-center gap-1 py-1">
        <button onClick={() => onMes(-1)} aria-label="Mes anterior"
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={onHoy} className="min-w-[150px] text-center text-[17px] font-bold text-gray-900">
          {titulo}
        </button>
        <button onClick={() => onMes(1)} aria-label="Mes siguiente"
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/*
        Los chips cuentan Y filtran.
        Antes eran dos renglones: unos badges que decían cuántos hay y un
        desplegable aparte para filtrar. Dos controles para una sola idea, y
        en el teléfono el desplegable abría el selector del sistema para
        elegir entre cuatro opciones.
      */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chip("all", "Todos", 0)}
        {chip("grupo", "Grupos", conteos.grupo, COLOR.grupo.punto)}
        {chip("taller", "Talleres", conteos.taller, COLOR.taller.punto)}
        {chip("actividad", "Actividades", conteos.actividad, COLOR.actividad.punto)}
      </div>

      {/* Gestión: a quién mirar, y las acciones del mes */}
      <div className="flex items-center gap-2 pb-2">
        {esParticipante ? (
          <label className="flex flex-1 items-center gap-2 text-[13px] text-gray-600">
            <Switch checked={soloAnotados} onCheckedChange={onSoloAnotados} />
            A los que me anoté
          </label>
        ) : (
          <>
            {/* Interruptor y no botón: un botón que cambia de texto entre
                "Solo los míos" y "✓ Solo los míos" hay que leerlo para saber
                si está activo. */}
            <label className="flex shrink-0 items-center gap-2 text-[13px] text-gray-600">
              <Switch checked={soloMios} onCheckedChange={onSoloMios} />
              Solo los míos
            </label>

            <Select value={filtroVoluntario} onValueChange={onFiltroVoluntario}>
              <SelectTrigger className="h-9 min-w-0 flex-1 text-[13px]">
                <SelectValue placeholder="Voluntarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Voluntarios</SelectItem>
                {voluntarios.map(v => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name} {v.last_name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {hayAccionesDeMes && (
          <button
            onClick={() => setAccionesAbiertas(true)}
            aria-label="Acciones del mes"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Grilla */}
      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <div className="grid grid-cols-7">
          {DIAS.map((d, i) => (
            <div key={i} className="py-1 text-center text-[11px] font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {celdas.map((dia, i) => {
            if (!dia) return <div key={i} />
            const eventos = eventosDe(dia)
            const hoy = esHoy(dia)
            const elegido = diaSel === dia

            return (
              <button
                key={i}
                onClick={() => onDia(dia)}
                className="flex h-11 flex-col items-center justify-center gap-[3px]"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
                    elegido
                      ? "bg-[#00838f] font-bold text-white"
                      : hoy
                      ? "font-bold text-[#00838f] ring-2 ring-[#4dd0e1]"
                      : "text-gray-700"
                  }`}
                >
                  {dia}
                </span>
                {/* Tres como mucho: un cuarto punto no cambia la decisión de
                    tocar el día y sí empuja el número fuera de lugar. */}
                <span className="flex h-1.5 items-center gap-[3px]">
                  {eventos.slice(0, 3).map(e => (
                    <span
                      key={e.id}
                      className={`h-1.5 w-1.5 rounded-full ${COLOR[e.tipo].punto} ${e.cancelado ? "opacity-40" : ""}`}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Agenda del día. `pb-24` para que el botón flotante no tape la última
          tarjeta, que es el error clásico de poner un botón encima. */}
      {diaSel !== null && (
        <div className="space-y-2 pb-24 pt-4">
          <p className="px-1 text-[13px] font-semibold text-gray-900">{nombreDia(diaSel)}</p>

          {delDia.length === 0 ? (
            // Un día vacío sin texto se lee como que la pantalla se rompió.
            <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
              <p className="text-sm text-gray-400">No hay nada este día</p>
              {puedeCrear && (
                <button onClick={() => onNuevo(diaSel)} className="mt-1 text-sm font-semibold text-[#00838f]">
                  Crear un evento
                </button>
              )}
            </div>
          ) : (
            delDia.map(e => (
              <button
                key={e.id}
                onClick={() => onAbrirEvento(e.id)}
                className={`w-full rounded-xl border border-gray-200 bg-white p-3 text-left active:bg-gray-50 ${
                  e.cancelado ? "opacity-60" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR[e.tipo].pastilla}`}>
                    {ETIQUETA[e.tipo]}
                  </span>
                  {e.mio && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Voy
                    </span>
                  )}
                  {e.cancelado && (
                    <span className="text-[11px] font-semibold uppercase text-red-500">Cancelado</span>
                  )}
                </span>
                <span className={`mt-1.5 block font-semibold text-gray-900 ${e.cancelado ? "line-through" : ""}`}>
                  {e.titulo}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-gray-400">
                  {[e.hora, e.lugar, e.voluntarios].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* El botón principal, al alcance del pulgar. En un teléfono el
          encabezado es el peor lugar para la acción que más se usa. */}
      {puedeCrear && (
        <button
          onClick={() => onNuevo(diaSel ?? undefined)}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#00838f] pl-5 pr-6 font-semibold text-white shadow-lg active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nuevo evento
        </button>
      )}

      {/*
        Las acciones del mes, agrupadas y fuera del encabezado.
        Generar y Borrar operan sobre el MES ENTERO y se usan una vez cada
        tanto; estaban arriba compitiendo con "Nuevo evento", que se usa todos
        los días. Acá además se puede explicar qué hace cada una, que es lo
        que le saca el miedo a tocar la roja.
      */}
      <Sheet open={accionesAbiertas} onOpenChange={setAccionesAbiertas}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{titulo}</SheetTitle>
            <p className="text-sm text-gray-500">Acciones para administrar todos los eventos del mes.</p>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {puedeGenerar && (
              <button
                onClick={() => { setAccionesAbiertas(false); onGenerar() }}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left active:bg-gray-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4dd0e1]/15">
                  <Zap className="h-5 w-5 text-[#00838f]" />
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">Generar eventos</span>
                  <span className="block text-[13px] text-gray-500">Crea los eventos del mes automáticamente</span>
                </span>
              </button>
            )}

            {puedeBorrar && (
              <button
                onClick={() => { setAccionesAbiertas(false); onBorrar() }}
                className="flex w-full items-center gap-3 rounded-xl border border-red-200 p-3 text-left active:bg-red-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </span>
                <span>
                  <span className="block font-semibold text-red-600">Borrar eventos…</span>
                  <span className="block text-[13px] text-gray-500">Te pediremos confirmar antes de borrar</span>
                </span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
