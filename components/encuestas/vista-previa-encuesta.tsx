"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { SurveyQuestion } from "@/lib/data-manager"
import { ClipboardList, Eye } from "lucide-react"

/**
 * Cómo se ve la evaluación del otro lado.
 *
 * Se dibuja con los datos que ya están en pantalla, no pidiéndole nada al
 * servidor: así funciona con una evaluación en borrador (que la vista de la
 * persona todavía no serviría) y, desde el editor, muestra los cambios que
 * todavía no se guardaron.
 *
 * Es FIEL a propósito: no marca cuál es la correcta ni muestra el porqué. Eso
 * la persona lo ve recién al terminar, y el editor lo tiene al lado. Si acá
 * apareciera pintado de verde, la vista previa dejaría de responder la única
 * pregunta que tiene que responder: qué le llega a quien la rinde.
 */
export default function VistaPreviaEncuesta({
  title,
  description,
  passingScore,
  preguntas,
  onClose,
}: {
  title: string
  description?: string | null
  passingScore: number
  preguntas: SurveyQuestion[]
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#4dd0e1]" />
            Así la ve la persona
          </DialogTitle>
        </DialogHeader>

        {/* pointer-events-none: es una foto, no un formulario. Si se pudiera
            tildar una opción, parecería que se está guardando algo. */}
        <div className="flex-1 space-y-5 overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 [&_*]:pointer-events-none">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title || "Sin título"}</h3>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
            <p className="mt-2 text-xs text-gray-400">
              {preguntas.length} {preguntas.length === 1 ? "pregunta" : "preguntas"} · aprueba con{" "}
              {passingScore}%
            </p>
          </div>

          {preguntas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-gray-400">
              <ClipboardList className="h-8 w-8 text-gray-300" />
              <p className="text-sm">Todavía no tiene preguntas.</p>
            </div>
          ) : (
            preguntas.map((pregunta, index) => {
              const varias = pregunta.kind === "multiple"
              return (
                <div key={pregunta.id} className="space-y-2 border-t border-gray-100 pt-4">
                  <p className="font-medium text-gray-900">
                    {index + 1}. {pregunta.text || <span className="text-gray-300">(sin texto)</span>}
                  </p>
                  {pregunta.help && <p className="text-xs text-gray-500">{pregunta.help}</p>}
                  {varias && <p className="text-xs text-gray-400">Podés marcar más de una.</p>}

                  {pregunta.kind === "texto" ? (
                    <Textarea rows={3} value="" readOnly />
                  ) : (
                    <div className="space-y-1.5">
                      {pregunta.options
                        .filter((o) => o.text.trim())
                        .map((opcion) => (
                          <label
                            key={opcion.id}
                            className="flex items-center gap-2.5 rounded-lg border border-gray-200 p-3 text-sm"
                          >
                            <input
                              type={varias ? "checkbox" : "radio"}
                              checked={false}
                              readOnly
                              className="h-4 w-4 shrink-0 accent-[#4dd0e1]"
                            />
                            {opcion.text}
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-3">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
