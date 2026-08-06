"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import FilterChip from "@/components/ui/filter-chip"
import Ayuda from "@/components/ui/ayuda"
import VistaPreviaEncuesta from "@/components/encuestas/vista-previa-encuesta"
import { toast } from "@/hooks/use-toast"
import type { Survey, SurveyAttemptRow, SurveyQuestion, Training } from "@/lib/data-manager"
import {
  ClipboardList, Plus, Trash2, Loader2, Check, ArrowLeft, ArrowUp, ArrowDown,
  Eye, EyeOff, Users, AlertTriangle, Settings, ChevronDown,
} from "lucide-react"

/**
 * Encuestas y evaluaciones (admin).
 *
 * Una evaluación por capacitación: es la que habilita el certificado. El
 * motor es genérico —puede colgar de un taller o de nada— pero la pantalla
 * hoy trabaja sobre capacitaciones, que es lo que existe.
 *
 * El cuestionario se guarda ENTERO de una vez: se manda el arreglo completo
 * y el backend resuelve qué crear, actualizar y borrar. Con endpoints por
 * pregunta, reordenar y editar en la misma pantalla exigiría coordinar varias
 * llamadas y un corte a mitad de camino dejaría el cuestionario partido.
 */

/** Todas las evaluaciones valen esto. Fijo a propósito: comparar notas entre
 *  capacitaciones sirve solo si todas se miden con la misma vara. */
const PUNTAJE_TOTAL = 100

// "Una sola respuesta" / "Varias respuestas" se leían como cuántas opciones
// tiene la pregunta, que no es lo que definen: definen cuántas son CORRECTAS.
const TIPOS_PREGUNTA = [
  { value: "unica", label: "Una sola correcta" },
  { value: "multiple", label: "Varias correctas" },
  { value: "vf", label: "Verdadero o falso" },
  { value: "texto", label: "Respuesta escrita" },
] as const

/**
 * Qué le falta a una pregunta para estar bien.
 *
 * Vive suelto porque lo usan dos cosas: la lista de problemas que bloquea el
 * guardado y el marcador de la cabecera del acordeón. Con las preguntas
 * plegadas, si el aviso solo estuviera abajo no se sabría cuál abrir.
 */
function problemasDePregunta(p: PreguntaBorrador): string[] {
  const lista: string[] = []
  if (!p.text.trim()) lista.push("le falta el texto")
  if (p.kind === "texto") return lista

  if (p.options.filter((o) => o.text.trim()).length < 2) lista.push("necesita al menos dos opciones")
  if (!p.options.some((o) => o.is_correct)) lista.push("no tiene ninguna opción marcada como correcta")
  // En verdadero/falso, un "falso" sin explicación no enseña nada.
  if (p.kind === "vf" && !(p.explanation ?? "").trim()) lista.push("necesita el porqué de la respuesta")
  return lista
}

/** Pregunta en edición. `id` negativo = todavía no existe en la base. */
type PreguntaBorrador = SurveyQuestion & { id: number }

let contadorTemporal = -1
const nuevoIdTemporal = () => contadorTemporal--

function preguntaVacia(): PreguntaBorrador {
  return {
    id: nuevoIdTemporal(),
    text: "",
    kind: "unica",
    help: null,
    explanation: null,
    points: 1,
    is_required: true,
    sort_order: 0,
    options: [
      { id: nuevoIdTemporal(), text: "", is_correct: true, sort_order: 1 },
      { id: nuevoIdTemporal(), text: "", is_correct: false, sort_order: 2 },
    ],
  }
}

export default function EncuestasManager({ user }: { user: any }) {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState<Survey | null>(null)
  // Alta en dos tiempos: primero el título y la consigna, después las
  // preguntas. Antes se creaba de una con un título inventado y lo primero que
  // aparecía era un bloque de ajustes: el orden al revés de como se piensa.
  const [creandoPara, setCreandoPara] = useState<Training | null>(null)
  // Vista previa desde la lista, sin entrar a editar.
  const [espiando, setEspiando] = useState<Survey | null>(null)
  const [recienCreada, setRecienCreada] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [resTrainings, resSurveys] = await Promise.all([
        fetch("/api/capacitaciones"),
        fetch("/api/encuestas?owner_type=capacitacion"),
      ])
      if (!resTrainings.ok || !resSurveys.ok) throw new Error("No se pudo cargar")

      const listaTrainings: Training[] = await resTrainings.json()
      const listaSurveys: Survey[] = await resSurveys.json()

      setTrainings(listaTrainings)
      setSurveys(listaSurveys)
      // Si había una abierta, se refresca con lo que vino del servidor.
      setAbierta((prev) => (prev ? listaSurveys.find((s) => s.id === prev.id) ?? null : null))
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las evaluaciones", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const crear = async (training: Training, title: string, description: string) => {
    try {
      const res = await fetch("/api/encuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          owner_type: "capacitacion",
          owner_id: training.id,
          kind: "evaluacion",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo crear")

      setCreandoPara(null)
      setRecienCreada(true)
      setAbierta(data)
      load()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  if (abierta) {
    return (
      <EditorDeEncuesta
        survey={abierta}
        recienCreada={recienCreada}
        onVolver={() => { setAbierta(null); setRecienCreada(false); load() }}
        onGuardada={(s) => setAbierta(s)}
      />
    )
  }

  const porCapacitacion = new Map(surveys.map((s) => [s.owner_id, s]))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Evaluaciones</h3>
        <p className="text-sm text-gray-500">Una por capacitación.</p>
      </div>

      {trainings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
            <ClipboardList className="h-10 w-10 text-gray-300" />
            <p className="font-medium">Todavía no hay capacitaciones</p>
            <p className="text-sm">Creá una primero y después vení a armarle la evaluación.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trainings.map((t) => {
            const survey = porCapacitacion.get(t.id)
            return (
              <Card key={t.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{t.title}</p>
                    {survey ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                          {survey.questions.length}{" "}
                          {survey.questions.length === 1 ? "pregunta" : "preguntas"}
                        </span>
                        <span>Aprueba con {survey.passing_score}%</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {survey.attempts_count} rindieron · {survey.passed_count} aprobaron
                        </span>
                        {survey.is_published ? (
                          <span className="flex items-center gap-1 font-medium text-green-600">
                            <Eye className="h-3 w-3" />
                            Publicada
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-medium text-amber-600">
                            <EyeOff className="h-3 w-3" />
                            En borrador
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-400">Sin evaluación</p>
                    )}
                  </div>

                  {survey ? (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Ver cómo la ve la persona"
                        aria-label="Ver cómo la ve la persona"
                        onClick={() => setEspiando(survey)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => setAbierta(survey)}>
                        Editar evaluación
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setCreandoPara(t)}
                      className="border-[#4dd0e1]/40 bg-[#4dd0e1]/10 text-[#00838f] hover:bg-[#4dd0e1]/20"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear evaluación
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {espiando && (
        <VistaPreviaEncuesta
          title={espiando.title}
          description={espiando.description}
          passingScore={espiando.passing_score}
          preguntas={espiando.questions}
          onClose={() => setEspiando(null)}
        />
      )}

      {creandoPara && (
        <NuevaEvaluacion
          training={creandoPara}
          onCancelar={() => setCreandoPara(null)}
          onCrear={(title, description) => crear(creandoPara, title, description)}
        />
      )}
    </div>
  )
}

// ── Alta: título y consigna ─────────────────────────────────────────────

/**
 * Lo único que se pregunta antes de empezar. El resto de los ajustes (nota
 * para aprobar, intentos, publicar) se decide al final, cuando las preguntas
 * ya existen y se sabe qué se está evaluando.
 */
function NuevaEvaluacion({
  training,
  onCancelar,
  onCrear,
}: {
  training: Training
  onCancelar: () => void
  onCrear: (title: string, description: string) => Promise<void>
}) {
  const [title, setTitle] = useState(`Evaluación de ${training.title}`)
  const [description, setDescription] = useState("")
  const [creando, setCreando] = useState(false)

  return (
    <Dialog open onOpenChange={onCancelar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva evaluación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Consigna</Label>
            <Textarea
              rows={3}
              placeholder="Lo que se lee antes de empezar"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button
            disabled={!title.trim() || creando}
            onClick={async () => {
              setCreando(true)
              // Si falla se avisa por toast y el diálogo queda abierto: hay que
              // poder reintentar sin volver a escribir todo.
              try { await onCrear(title.trim(), description) } finally { setCreando(false) }
            }}
            className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
          >
            {creando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cargar las preguntas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Editor de una evaluación ────────────────────────────────────────────

function EditorDeEncuesta({
  survey,
  recienCreada = false,
  onVolver,
  onGuardada,
}: {
  survey: Survey
  /** Recién salida del alta: arranca con una pregunta en blanco esperando. */
  recienCreada?: boolean
  onVolver: () => void
  onGuardada: (s: Survey) => void
}) {
  const [ajustes, setAjustes] = useState(survey)
  const [preguntas, setPreguntas] = useState<PreguntaBorrador[]>(() =>
    // Recién creada: una pregunta vacía esperando. Una pantalla en blanco con
    // un botón no dice por dónde se empieza.
    recienCreada && survey.questions.length === 0
      ? [preguntaVacia()]
      : (survey.questions as PreguntaBorrador[]),
  )
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false)
  // Ver el comentario del puntaje en PreguntaEditable: mismo motivo.
  const [nota, setNota] = useState(String(survey.passing_score))
  // Acordeón: una pregunta abierta por vez. Con diez preguntas desplegadas no
  // se ve el cuestionario, se ve una sola pantalla larga.
  // Recién creada arranca con su única pregunta abierta: es lo que se viene a
  // hacer. Una evaluación ya existente abre todas plegadas, para ver el mapa.
  const [preguntaAbierta, setPreguntaAbierta] = useState<number | null>(
    () => (recienCreada ? preguntas[0]?.id ?? null : null),
  )
  // Vista previa del BORRADOR: muestra lo que hay en pantalla, guardado o no.
  // Es justamente para mirar antes de guardar.
  const [espiando, setEspiando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [resultados, setResultados] = useState<SurveyAttemptRow[] | null>(null)
  const [vista, setVista] = useState<"preguntas" | "resultados">("preguntas")

  // Lo guardado, para saber si hay cambios pendientes.
  const [guardado, setGuardado] = useState(() =>
    JSON.stringify({ ajustes: survey, preguntas: survey.questions }),
  )
  const hayCambios = useMemo(
    () => JSON.stringify({ ajustes, preguntas }) !== guardado,
    [ajustes, preguntas, guardado],
  )

  const actualizarPregunta = (id: number, patch: Partial<PreguntaBorrador>) =>
    setPreguntas((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const mover = (index: number, direccion: -1 | 1) => {
    const destino = index + direccion
    if (destino < 0 || destino >= preguntas.length) return
    const copia = [...preguntas]
    ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
    setPreguntas(copia)
  }

  /** Marca una opción como correcta respetando el tipo de pregunta. */
  const marcarCorrecta = (pregunta: PreguntaBorrador, opcionId: number, valor: boolean) => {
    const varias = pregunta.kind === "multiple"
    actualizarPregunta(pregunta.id, {
      options: pregunta.options.map((o) => ({
        ...o,
        // En las de una sola respuesta, marcar una desmarca las demás: si
        // quedaran dos correctas, nadie podría acertar nunca.
        is_correct: o.id === opcionId ? valor : varias ? o.is_correct : false,
      })),
    })
  }

  const problemas = useMemo(() => {
    const lista: string[] = []
    preguntas.forEach((p, i) => {
      for (const falta of problemasDePregunta(p)) lista.push(`La pregunta ${i + 1} ${falta}.`)
    })
    if (ajustes.is_published && preguntas.length === 0) {
      lista.push("No se puede publicar una evaluación sin preguntas.")
    }
    return lista
  }, [preguntas, ajustes.is_published])

  /**
   * Aviso, NO error: la nota es un porcentaje, así que repartir 80 o 120
   * funciona igual. Pero si querés que "cuánto vale" signifique algo, tiene
   * que cerrar en 100 — por eso se avisa sin bloquear el guardado.
   */
  const totalPuntos = useMemo(
    () =>
      preguntas
        .filter((p) => p.kind !== "texto")
        .reduce((suma, p) => suma + (p.points || 0), 0),
    [preguntas],
  )
  const hayPuntuables = preguntas.some((p) => p.kind !== "texto")
  const puntajeDescuadrado = hayPuntuables && totalPuntos !== PUNTAJE_TOTAL

  const guardar = async () => {
    if (problemas.length) {
      toast({ title: "Revisá el cuestionario", description: problemas[0], variant: "destructive" })
      return
    }

    setGuardando(true)
    try {
      const resAjustes = await fetch(`/api/encuestas/${survey.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ajustes.title,
          description: ajustes.description,
          passing_score: ajustes.passing_score,
          max_attempts: ajustes.max_attempts,
          shuffle_questions: ajustes.shuffle_questions,
          show_answers: ajustes.show_answers,
          is_published: ajustes.is_published,
        }),
      })
      if (!resAjustes.ok) throw new Error((await resAjustes.json())?.error || "No se pudo guardar")

      // Los ids negativos son los que todavía no existen: se mandan sin id
      // para que el backend los cree.
      const cuerpo = preguntas.map((p, i) => ({
        id: p.id > 0 ? p.id : undefined,
        text: p.text,
        kind: p.kind,
        help: p.help,
        explanation: p.explanation,
        points: p.points,
        is_required: p.is_required,
        sort_order: i + 1,
        options:
          p.kind === "texto"
            ? []
            : p.options
                .filter((o) => o.text.trim())
                .map((o, j) => ({
                  id: o.id > 0 ? o.id : undefined,
                  text: o.text,
                  is_correct: !!o.is_correct,
                  sort_order: j + 1,
                })),
      }))

      const res = await fetch(`/api/encuestas/${survey.id}/preguntas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudieron guardar las preguntas")

      toast({ title: "Evaluación guardada" })
      setAjustes(data)
      setNota(String(data.passing_score))
      setPreguntas(data.questions)
      setGuardado(JSON.stringify({ ajustes: data, preguntas: data.questions }))
      onGuardada(data)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async () => {
    try {
      const res = await fetch(`/api/encuestas/${survey.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "No se pudo borrar")
      toast({ title: "Evaluación eliminada" })
      onVolver()
    } catch (error: any) {
      toast({ title: "No se puede borrar", description: error?.message, variant: "destructive" })
    } finally {
      setConfirmarBorrado(false)
    }
  }

  const verResultados = async () => {
    setVista("resultados")
    if (resultados) return
    try {
      const res = await fetch(`/api/encuestas/${survey.id}/resultados`)
      if (!res.ok) throw new Error("No se pudieron cargar los resultados")
      setResultados(await res.json())
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[#00838f]"
      >
        <ArrowLeft className="h-4 w-4" />
        Todas las evaluaciones
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{ajustes.title}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            title="Ver cómo la ve la persona"
            onClick={() => setEspiando(true)}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Vista previa
          </Button>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setVista("preguntas")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              vista === "preguntas" ? "bg-[#4dd0e1] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Preguntas
          </button>
          <button
            onClick={verResultados}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              vista === "resultados" ? "bg-[#4dd0e1] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Quiénes rindieron
            </button>
          </div>
        </div>
      </div>

      {vista === "resultados" ? (
        <ResultadosDeEncuesta filas={resultados} />
      ) : (
        <>
          {/* Arriba y plegados: se abren cuando hacen falta y el resto del
              tiempo no empujan las preguntas hacia abajo. */}
          <Card>
            <button
              type="button"
              onClick={() => setAjustesAbiertos((a) => !a)}
              aria-expanded={ajustesAbiertos}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <Settings className="h-4 w-4 shrink-0 text-[#4dd0e1]" />
              <span className="text-sm font-medium text-gray-700">Ajustes</span>
              <span className="text-xs text-gray-400">
                Aprueba con {ajustes.passing_score}% ·{" "}
                {ajustes.is_published ? "publicada" : "en borrador"}
              </span>
              <ChevronDown
                className={`ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                  ajustesAbiertos ? "rotate-180" : ""
                }`}
              />
            </button>
            {ajustesAbiertos && (
            <CardContent className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Título</Label>
                <Input
                  value={ajustes.title}
                  onChange={(e) => setAjustes({ ...ajustes, title: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Consigna</Label>
                <Textarea
                  rows={2}
                  placeholder="Lo que se lee antes de empezar"
                  value={ajustes.description ?? ""}
                  onChange={(e) => setAjustes({ ...ajustes, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Porcentaje para aprobar</Label>
                <Input
                  inputMode="numeric"
                  value={nota}
                  onChange={(e) => {
                    const soloDigitos = e.target.value.replace(/\D/g, "")
                    setNota(soloDigitos)
                    if (soloDigitos) {
                      setAjustes({ ...ajustes, passing_score: Math.min(100, Number(soloDigitos)) })
                    }
                  }}
                  onBlur={() => {
                    // Vacío o fuera de rango vuelve a lo que quedó guardado en
                    // el ajuste: dejarlo en 0 haría aprobar a cualquiera.
                    const limpio = Math.min(100, Math.max(1, Number(nota) || ajustes.passing_score))
                    setNota(String(limpio))
                    setAjustes({ ...ajustes, passing_score: limpio })
                  }}
                />
              </div>
              <div>
                <Label>Intentos permitidos</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Sin límite"
                  value={ajustes.max_attempts ?? ""}
                  onChange={(e) =>
                    setAjustes({
                      ...ajustes,
                      max_attempts: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ajustes.shuffle_questions}
                  onChange={(e) => setAjustes({ ...ajustes, shuffle_questions: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 accent-[#4dd0e1]"
                />
                Mezclar el orden de las preguntas
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ajustes.show_answers}
                  onChange={(e) => setAjustes({ ...ajustes, show_answers: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 accent-[#4dd0e1]"
                />
                Mostrar las correctas al terminar
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={ajustes.is_published}
                  onChange={(e) => setAjustes({ ...ajustes, is_published: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 accent-[#4dd0e1]"
                />
                Publicada
              </label>
            </CardContent>
            )}
          </Card>


          {/* El total, siempre a la vista. Adentro de cada pregunta está el
              acumulado hasta ahí; acá está cuánto suma el cuestionario entero,
              que es lo que hay que hacer cerrar. */}
          {preguntas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
              <span className="text-gray-500">
                {preguntas.length} {preguntas.length === 1 ? "pregunta" : "preguntas"}
              </span>
              {hayPuntuables && (
                <span
                  className={`flex items-center gap-1.5 font-medium ${
                    puntajeDescuadrado ? "text-amber-600" : "text-green-600"
                  }`}
                >
                  {!puntajeDescuadrado && <Check className="h-4 w-4" />}
                  {totalPuntos} / {PUNTAJE_TOTAL} puntos
                  <Ayuda>
                    La nota es un porcentaje, así que repartir 80 o 120 funciona igual.
                    Pero si querés que «cuánto vale» signifique algo, tiene que cerrar en
                    {" "}{PUNTAJE_TOTAL}.
                  </Ayuda>
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {preguntas.map((pregunta, index) => (
              <PreguntaEditable
                key={pregunta.id}
                pregunta={pregunta}
                index={index}
                total={preguntas.length}
                acumuladoPrevio={preguntas
                  .slice(0, index)
                  .filter((p) => p.kind !== "texto")
                  .reduce((suma, p) => suma + (p.points || 0), 0)}
                abierta={preguntaAbierta === pregunta.id}
                onAlternar={() =>
                  setPreguntaAbierta((actual) => (actual === pregunta.id ? null : pregunta.id))
                }
                onChange={(patch) => actualizarPregunta(pregunta.id, patch)}
                onMarcarCorrecta={(opcionId, valor) => marcarCorrecta(pregunta, opcionId, valor)}
                onMover={(dir) => mover(index, dir)}
                onBorrar={() => {
                  setPreguntas((prev) => prev.filter((p) => p.id !== pregunta.id))
                  setPreguntaAbierta((actual) => (actual === pregunta.id ? null : actual))
                }}
              />
            ))}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const nueva = preguntaVacia()
                  setPreguntas((prev) => [...prev, nueva])
                  setPreguntaAbierta(nueva.id)
                }}
                className="border-[#4dd0e1]/40 bg-[#4dd0e1]/10 text-[#00838f] hover:bg-[#4dd0e1]/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar pregunta
              </Button>
            </div>
          </div>

          {problemas.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <ul className="space-y-0.5">
                {problemas.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/*
            Guardar flota SIEMPRE, en cualquier punto del scroll.

            Va `fixed` y no `sticky`: el contenedor del dashboard tiene
            `overflow-hidden`, y eso rompe el pegado — la barra quedaba abajo de
            todo y había que scrollear hasta el final para guardar.

            pb del contenedor: ver el espaciador al final del editor.
          */}
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
            {/* La franja ocupa el ancho para poder centrar, pero no tapa nada:
                solo la pastilla recibe clicks. */}
            <div
              className={`pointer-events-auto flex items-center gap-4 rounded-full border-2 bg-white py-2 pl-5 pr-2 shadow-xl ${
                hayCambios ? "border-amber-300" : "border-gray-200"
              }`}
            >
              {hayCambios ? (
                <span className="text-sm font-medium text-amber-600">Sin guardar</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <Check className="h-4 w-4" />
                  Guardado
                </span>
              )}
              <Button
                onClick={guardar}
                disabled={guardando || !hayCambios || problemas.length > 0}
                className="h-11 rounded-full bg-[#4dd0e1] px-8 text-base font-semibold hover:bg-[#3bb8c9]"
              >
                {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>

          {/* Borrar la evaluación entera no es una acción de todos los días:
              vive al pie, lejos de Guardar. */}
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmarBorrado(true)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar la evaluación
            </Button>
          </div>

          {/* Aire para que la barra flotante no tape el último renglón. */}
          <div className="h-16" aria-hidden />
        </>
      )}

      {espiando && (
        <VistaPreviaEncuesta
          title={ajustes.title}
          description={ajustes.description}
          passingScore={ajustes.passing_score}
          preguntas={preguntas}
          onClose={() => setEspiando(false)}
        />
      )}

      {confirmarBorrado && (
        <ConfirmationDialog
          open
          onOpenChange={(abierto) => !abierto && setConfirmarBorrado(false)}
          title="¿Borrar la evaluación?"
          description="Se eliminan las preguntas. Si alguien ya la rindió, el sistema no va a dejar borrarla: en ese caso despublicala."
          action="delete"
          itemType="general"
          onConfirm={borrar}
        />
      )}
    </div>
  )
}

// ── Una pregunta ────────────────────────────────────────────────────────

function PreguntaEditable({
  pregunta,
  index,
  total,
  acumuladoPrevio,
  abierta,
  onAlternar,
  onChange,
  onMarcarCorrecta,
  onMover,
  onBorrar,
}: {
  pregunta: PreguntaBorrador
  index: number
  total: number
  /** Cuánto suman las preguntas anteriores. Sirve para mostrar el acumulado. */
  acumuladoPrevio: number
  /** Desplegada. Solo hay una por vez. */
  abierta: boolean
  onAlternar: () => void
  onChange: (patch: Partial<PreguntaBorrador>) => void
  onMarcarCorrecta: (opcionId: number, valor: boolean) => void
  onMover: (dir: -1 | 1) => void
  onBorrar: () => void
}) {
  const esTexto = pregunta.kind === "texto"
  const varias = pregunta.kind === "multiple"

  const cambiarTipo = (tipo: string) => {
    if (tipo === pregunta.kind) return
    // Al pasar a verdadero/falso se reemplazan las opciones: dejar las viejas
    // daría un "Verdadero o falso" con cuatro opciones.
    if (tipo === "vf") {
      onChange({
        kind: tipo,
        options: [
          { id: nuevoIdTemporal(), text: "Verdadero", is_correct: true, sort_order: 1 },
          { id: nuevoIdTemporal(), text: "Falso", is_correct: false, sort_order: 2 },
        ],
      })
      return
    }
    // Volver de verdadero/falso a una de opciones deja "Verdadero" y "Falso"
    // como respuestas escritas a mano: se limpian para empezar de cero.
    if (pregunta.kind === "vf") {
      onChange({
        kind: tipo,
        options: [
          { id: nuevoIdTemporal(), text: "", is_correct: true, sort_order: 1 },
          { id: nuevoIdTemporal(), text: "", is_correct: false, sort_order: 2 },
        ],
      })
      return
    }
    onChange({ kind: tipo })
  }

  const falta = problemasDePregunta(pregunta)
  const tipo = TIPOS_PREGUNTA.find((t) => t.value === pregunta.kind)?.label ?? pregunta.kind

  /**
   * El puntaje se edita como TEXTO y no como número controlado.
   *
   * Antes era `points: Number(valor) || 1`: al borrar el 1 para escribir 20, el
   * campo volvía a 1 en el mismo momento y era imposible cambiarlo. Ahora se
   * puede dejar vacío mientras se escribe, y recién al salir del campo se
   * repone el 1 — una pregunta que no vale nada no tiene sentido.
   */
  const [puntos, setPuntos] = useState(String(pregunta.points ?? 1))
  const escribirPuntos = (valor: string) => {
    const soloDigitos = valor.replace(/\D/g, "")
    setPuntos(soloDigitos)
    if (soloDigitos) onChange({ points: Number(soloDigitos) })
  }
  const salirDePuntos = () => {
    if (!puntos || Number(puntos) < 1) {
      setPuntos("1")
      onChange({ points: 1 })
    }
  }

  return (
    <Card className={abierta ? "border-[#4dd0e1]/50" : undefined}>
      {/* Cabecera: siempre visible. Los botones de orden y borrado van AFUERA
          del botón que despliega — un botón adentro de otro no es válido. */}
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierta}
          title={abierta ? "Plegar la pregunta" : "Abrir la pregunta"}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg py-3 pl-4 text-left transition-colors hover:bg-gray-50"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4dd0e1]/10 text-xs font-bold text-[#00838f]">
            {index + 1}
          </span>
          <span className={`min-w-0 flex-1 truncate text-sm ${pregunta.text.trim() ? "text-gray-800" : "text-gray-300"}`}>
            {pregunta.text.trim() || "Sin texto"}
          </span>
          {/* Plegada, esto es lo único que se sabe de la pregunta: qué tipo es,
              cuánto vale y si le falta algo. */}
          <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">{tipo}</span>
          {!esTexto && (
            <span className="shrink-0 text-xs text-gray-400">{pregunta.points} pts</span>
          )}
          {falta.length > 0 && (
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-amber-500"
              aria-label="Le falta algo"
            />
          )}
          {/* La flecha sola, suelta entre el puntaje y los botones de acción,
              se perdía. Adentro de un círculo se lee como un control. */}
          <span className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors group-hover:bg-[#4dd0e1] group-hover:text-white">
            <ChevronDown
              className={`h-4 w-4 transition-transform ${abierta ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {/* Separador: sin esto, la flecha de plegar y las de mover el orden
            parecen la misma botonera. */}
        <span className="mx-1 h-5 w-px shrink-0 bg-gray-200" />

        <div className="flex shrink-0 gap-0.5">
          <Button size="sm" variant="ghost" title="Subir" onClick={() => onMover(-1)} disabled={index === 0}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" title="Bajar" onClick={() => onMover(1)} disabled={index === total - 1}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" title="Borrar la pregunta" onClick={onBorrar}>
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      </div>

      {!abierta ? null : (
      <CardContent className="space-y-3 border-t border-gray-100 py-4">
        <div>
          <Label className="text-xs">Pregunta</Label>
          <Textarea
            rows={2}
            placeholder="Escribí la pregunta"
            value={pregunta.text}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label className="text-xs">Tipo de respuesta</Label>
            {/* Pastillas y no un desplegable: son cuatro opciones fijas y se
                eligen una sola vez por pregunta. Con un select hay que abrirlo
                para saber qué está elegido y qué más había. */}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TIPOS_PREGUNTA.map((t) => (
                <FilterChip
                  key={t.value}
                  active={pregunta.kind === t.value}
                  onClick={() => cambiarTipo(t.value)}
                >
                  {t.label}
                </FilterChip>
              ))}
            </div>
          </div>
          {!esTexto && (
            <div>
              <Label className="text-xs">Cuánto vale</Label>
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  className="w-20"
                  value={puntos}
                  onChange={(e) => escribirPuntos(e.target.value)}
                  onBlur={salirDePuntos}
                />
                {/* Cuánto lleva repartido contando ésta: sin el acumulado,
                    poner puntajes es adivinar. */}
                <span
                  className={`whitespace-nowrap text-xs ${
                    acumuladoPrevio + (pregunta.points || 0) > PUNTAJE_TOTAL
                      ? "font-medium text-amber-600"
                      : "text-gray-400"
                  }`}
                >
                  {acumuladoPrevio + (pregunta.points || 0)} / {PUNTAJE_TOTAL}
                </span>
              </div>
            </div>
          )}
        </div>

        {!esTexto && (
          <div>
            <Label className="text-xs">
              Por qué {pregunta.kind === "vf" ? "(obligatorio)" : "(opcional)"}
            </Label>
            <Textarea
              rows={2}
              placeholder="Se muestra al terminar, para que quien se equivoca entienda"
              value={pregunta.explanation ?? ""}
              onChange={(e) => onChange({ explanation: e.target.value })}
            />
          </div>
        )}

        {esTexto ? (
          <p className="text-xs text-gray-500">No suma para la nota.</p>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs">
              Opciones {varias ? "(marcá todas las correctas)" : "(marcá la correcta)"}
            </Label>
            {pregunta.options.map((opcion) => (
              // El renglón entero marca la correcta: apuntarle al circulito
              // de 16px es innecesariamente difícil.
              <div
                key={opcion.id}
                onClick={() => onMarcarCorrecta(opcion.id, !opcion.is_correct)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition ${
                  opcion.is_correct
                    ? "border-green-300 bg-green-50"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <input
                  type={varias ? "checkbox" : "radio"}
                  name={`correcta-${pregunta.id}`}
                  checked={!!opcion.is_correct}
                  onChange={(e) => onMarcarCorrecta(opcion.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 shrink-0 accent-green-600"
                  title="Marcar como correcta"
                />
                <Input
                  placeholder="Texto de la opción"
                  value={opcion.text}
                  disabled={pregunta.kind === "vf"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onChange({
                      options: pregunta.options.map((o) =>
                        o.id === opcion.id ? { ...o, text: e.target.value } : o,
                      ),
                    })
                  }
                />
                {pregunta.kind !== "vf" && pregunta.options.length > 2 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Quitar esta opción"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange({ options: pregunta.options.filter((o) => o.id !== opcion.id) })
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                )}
              </div>
            ))}

            {pregunta.kind !== "vf" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    options: [
                      ...pregunta.options,
                      {
                        id: nuevoIdTemporal(),
                        text: "",
                        is_correct: false,
                        sort_order: pregunta.options.length + 1,
                      },
                    ],
                  })
                }
              >
                <Plus className="mr-1.5 h-3 w-3" />
                Agregar opción
              </Button>
            )}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  )
}

// ── Resultados ──────────────────────────────────────────────────────────

function ResultadosDeEncuesta({ filas }: { filas: SurveyAttemptRow[] | null }) {
  if (!filas) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  if (!filas.length) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-gray-500">
          Todavía no la rindió nadie.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">Persona</th>
              <th className="px-2 py-2 font-medium">Nota</th>
              <th className="px-2 py-2 font-medium">Resultado</th>
              <th className="px-2 py-2 font-medium">Cuándo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="border-b border-gray-100 last:border-0">
                <td className="px-2 py-2">
                  <span className="font-medium text-gray-800">{fila.person_name ?? "—"}</span>
                  {fila.person_email && (
                    <span className="block text-xs text-gray-400">{fila.person_email}</span>
                  )}
                </td>
                <td className="px-2 py-2 tabular-nums text-gray-700">
                  {fila.score != null ? `${Number(fila.score).toFixed(0)}%` : "—"}
                </td>
                <td className="px-2 py-2">
                  {fila.passed ? (
                    <span className="font-medium text-green-600">Aprobó</span>
                  ) : (
                    <span className="text-gray-500">No aprobó</span>
                  )}
                </td>
                <td className="px-2 py-2 text-gray-500">
                  {fila.submitted_at
                    ? new Date(fila.submitted_at).toLocaleDateString("es-AR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
