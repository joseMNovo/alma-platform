"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import type { SurveyPublic, SurveyResult } from "@/lib/data-manager"
import {
  ClipboardList, Loader2, CheckCircle2, XCircle, Award, AlertTriangle, Lock,
} from "lucide-react"

/**
 * La evaluación de una capacitación, del lado de quien la hace.
 *
 * Lo que llega del servidor NO trae las respuestas correctas: se piden aparte
 * al entregar, y solo si la evaluación está configurada para mostrarlas. Este
 * componente nunca sabe qué opción es la buena antes de tiempo, ni podría.
 *
 * Se habilita cuando terminó todo el contenido: rendir sin haber visto los
 * videos no mide nada.
 */
export default function TrainingSurvey({
  trainingId,
  contenidoCompleto,
}: {
  trainingId: number
  /** ¿Vio todo el contenido publicado? */
  contenidoCompleto: boolean
}) {
  const [survey, setSurvey] = useState<SurveyPublic | null>(null)
  const [cargando, setCargando] = useState(true)
  const [rindiendo, setRindiendo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [respuestas, setRespuestas] = useState<Record<number, number[]>>({})
  const [textos, setTextos] = useState<Record<number, string>>({})
  const [resultado, setResultado] = useState<SurveyResult | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await fetch(`/api/encuestas/de/capacitacion/${trainingId}`)
      if (!res.ok) throw new Error()
      setSurvey(await res.json())
    } catch {
      setSurvey(null)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId])

  if (cargando) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#4dd0e1]" />
        </CardContent>
      </Card>
    )
  }

  // Sin evaluación cargada no se muestra nada: no todas las capacitaciones
  // tienen que tener una.
  if (!survey) return null

  const elegir = (preguntaId: number, opcionId: number, varias: boolean) => {
    setRespuestas((prev) => {
      const actuales = prev[preguntaId] ?? []
      if (!varias) return { ...prev, [preguntaId]: [opcionId] }
      return {
        ...prev,
        [preguntaId]: actuales.includes(opcionId)
          ? actuales.filter((id) => id !== opcionId)
          : [...actuales, opcionId],
      }
    })
  }

  const sinResponder = survey.questions.filter(
    (p) =>
      p.is_required &&
      (p.kind === "texto" ? !(textos[p.id] ?? "").trim() : !(respuestas[p.id] ?? []).length),
  )

  const entregar = async () => {
    if (sinResponder.length) {
      toast({
        title: "Te faltan respuestas",
        description: `Quedan ${sinResponder.length} sin contestar.`,
        variant: "destructive",
      })
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`/api/encuestas/${survey.id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: survey.questions.map((p) => ({
            question_id: p.id,
            option_ids: respuestas[p.id] ?? [],
            text_answer: textos[p.id] ?? null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo entregar")

      setResultado(data)
      setRindiendo(false)
      cargar() // refresca intentos usados y si ya aprobó
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setEnviando(false)
    }
  }

  // ── Resultado recién entregado ──────────────────────────────────────
  if (resultado) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-start gap-3">
            {resultado.passed ? (
              <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 shrink-0 text-amber-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {resultado.passed ? "¡Aprobaste!" : "Todavía no alcanzó"}
              </h3>
              <p className="text-sm text-gray-600">
                Acertaste {resultado.correct_questions} de {resultado.total_questions}:{" "}
                <strong>{Number(resultado.score).toFixed(0)}%</strong>. Se necesita{" "}
                {resultado.passing_score}%.
              </p>
            </div>
          </div>

          {resultado.certificate_code && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-green-50 p-4">
              <Award className="h-5 w-5 shrink-0 text-green-600" />
              <p className="min-w-0 flex-1 text-sm text-green-900">
                Tu certificado ya está emitido.
              </p>
              <Link
                href={`/certificado/${resultado.certificate_code}`}
                className="rounded-lg bg-[#4dd0e1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3bb8c9]"
              >
                Ver mi certificado
              </Link>
            </div>
          )}

          {/* El repaso es la parte que enseña: ver qué se erró y por qué vale
              más que el número de arriba. */}
          {resultado.results.some((r) => r.explanation) && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700">Repaso</p>
              {survey.questions.map((pregunta, index) => {
                const detalle = resultado.results.find((r) => r.question_id === pregunta.id)
                if (!detalle?.explanation) return null
                return (
                  <div
                    key={pregunta.id}
                    className={`rounded-lg border p-3 ${
                      detalle.is_correct
                        ? "border-green-200 bg-green-50/60"
                        : "border-amber-200 bg-amber-50/60"
                    }`}
                  >
                    <p className="flex items-start gap-2 text-sm font-medium text-gray-800">
                      {detalle.is_correct ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      {index + 1}. {pregunta.text}
                    </p>
                    <p className="mt-1.5 pl-6 text-sm text-gray-600">{detalle.explanation}</p>
                  </div>
                )
              })}
            </div>
          )}

          {!resultado.passed && (
            <Button
              variant="outline"
              onClick={() => {
                setResultado(null)
                setRespuestas({})
                setTextos({})
              }}
            >
              Volver a intentar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Rindiendo ───────────────────────────────────────────────────────
  if (rindiendo) {
    return (
      <Card>
        <CardContent className="space-y-5 py-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
            {survey.description && (
              <p className="mt-1 text-sm text-gray-600">{survey.description}</p>
            )}
          </div>

          {survey.questions.map((pregunta, index) => {
            const varias = pregunta.kind === "multiple"
            const elegidas = respuestas[pregunta.id] ?? []

            return (
              <div key={pregunta.id} className="space-y-2 border-t border-gray-100 pt-4">
                <p className="font-medium text-gray-900">
                  {index + 1}. {pregunta.text}
                </p>
                {pregunta.help && <p className="text-xs text-gray-500">{pregunta.help}</p>}
                {varias && (
                  <p className="text-xs text-gray-400">Podés marcar más de una.</p>
                )}

                {pregunta.kind === "texto" ? (
                  <Textarea
                    rows={3}
                    value={textos[pregunta.id] ?? ""}
                    onChange={(e) =>
                      setTextos((prev) => ({ ...prev, [pregunta.id]: e.target.value }))
                    }
                  />
                ) : (
                  <div className="space-y-1.5">
                    {pregunta.options.map((opcion) => {
                      const marcada = elegidas.includes(opcion.id)
                      return (
                        <label
                          key={opcion.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition ${
                            marcada
                              ? "border-[#4dd0e1] bg-[#4dd0e1]/5 font-medium text-[#00838f]"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type={varias ? "checkbox" : "radio"}
                            name={`pregunta-${pregunta.id}`}
                            checked={marcada}
                            onChange={() => elegir(pregunta.id, opcion.id, varias)}
                            className="h-4 w-4 shrink-0 accent-[#4dd0e1]"
                          />
                          {opcion.text}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <Button
              onClick={entregar}
              disabled={enviando}
              className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
            >
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entregar
            </Button>
            <Button variant="outline" onClick={() => setRindiendo(false)}>
              Cancelar
            </Button>
            {sinResponder.length > 0 && (
              <span className="text-sm text-amber-600">
                Te faltan {sinResponder.length}{" "}
                {sinResponder.length === 1 ? "respuesta" : "respuestas"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Presentación ────────────────────────────────────────────────────
  const intentosRestantes =
    survey.max_attempts != null ? survey.max_attempts - survey.attempts_used : null

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-start gap-3">
          <ClipboardList className="h-6 w-6 shrink-0 text-[#9A8BC2]" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{survey.title}</h3>
            <p className="text-sm text-gray-600">
              {survey.passed
                ? "Ya la aprobaste."
                : `Se aprueba con ${survey.passing_score}% o más.`}
            </p>
          </div>
        </div>

        {survey.passed ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <span className="min-w-0 flex-1">
              Aprobaste con {Number(survey.best_score ?? 0).toFixed(0)}%. Tu certificado está
              disponible.
            </span>
          </div>
        ) : !contenidoCompleto ? (
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            Terminá de ver todo el contenido y acá se te habilita la evaluación.
          </div>
        ) : !survey.can_attempt ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            Ya usaste todos los intentos. Escribinos si necesitás otra oportunidad.
          </div>
        ) : (
          <>
            <Button onClick={() => setRindiendo(true)} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
              {survey.attempts_used > 0 ? "Volver a rendir" : "Rendir la evaluación"}
            </Button>
            <p className="text-xs text-gray-500">
              {survey.questions.length}{" "}
              {survey.questions.length === 1 ? "pregunta" : "preguntas"}
              {intentosRestantes != null
                ? ` · te quedan ${intentosRestantes} ${intentosRestantes === 1 ? "intento" : "intentos"}`
                : " · sin límite de intentos"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
