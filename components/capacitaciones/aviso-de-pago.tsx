"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, CheckCircle2, Receipt } from "lucide-react"

/**
 * "Ya pagué": el comprador avisa y adjunta el comprobante.
 *
 * NO le da acceso ni marca el pago. Solo deja una fila en la cola que mira un
 * voluntario, que abre el comprobante y decide. La plataforma nunca le cree al
 * comprador — le cree a quien lo verificó. Eso es lo mismo que cuando no
 * existía este botón; lo que cambia es que antes la persona quedaba en el
 * limbo y su única salida era mandar un mail que se perdía.
 *
 * El comprobante es OPCIONAL a propósito: no tenerlo a mano no puede impedir
 * avisar. Un aviso sin comprobante igual sirve — le dice a ALMA a quién ir a
 * buscar en el panel de MercadoPago.
 */
export default function AvisoDePago({
  trainingId,
  trainingTitle,
}: {
  trainingId: number
  trainingTitle: string
}) {
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const leerBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const lector = new FileReader()
      lector.onload = () => resolve(String(lector.result).split(",")[1] ?? "")
      lector.onerror = () => reject(new Error("No se pudo leer el archivo"))
      lector.readAsDataURL(f)
    })

  const enviar = async () => {
    setEnviando(true)
    try {
      let fileGuid: string | null = null

      if (archivo) {
        const res = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: archivo.name,
            mime_type: archivo.type,
            purpose: "comprobante_pago",
            data_base64: await leerBase64(archivo),
          }),
        })
        if (!res.ok) {
          // El backend explica el motivo real (tipo no permitido, muy pesado).
          const detalle = await res.json().catch(() => ({}))
          throw new Error(detalle?.error || "No se pudo subir el comprobante")
        }
        fileGuid = (await res.json())?.guid ?? null
      }

      const res = await fetch("/api/accesos/avisos-de-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept_id: trainingId,
          concept_label: trainingTitle,
          file_guid: fileGuid,
          message: mensaje.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("No se pudo registrar el aviso")

      setEnviado(true)
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <p className="text-green-900">
          Recibimos tu aviso. Un voluntario va a revisarlo y te habilita el acceso;
          cuando pase, el contenido aparece acá mismo.
        </p>
      </div>
    )
  }

  return (
    <>
      <Button variant="outline" className="w-full gap-2" onClick={() => setAbierto(true)}>
        <Receipt className="h-4 w-4" />
        Ya pagué, avisar a ALMA
      </Button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Avisanos que pagaste</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">
            Esto no habilita el acceso solo: un voluntario revisa el comprobante y te
            lo da. Sirve para que sepamos que estás esperando.
          </p>

          <div>
            <Label>Comprobante (opcional)</Label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600 transition hover:border-[#4dd0e1]">
              <Upload className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate">
                {archivo ? archivo.name : "Elegir imagen o PDF"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Si no lo tenés a mano, avisanos igual.
            </p>
          </div>

          <div>
            <Label>¿Querés agregar algo?</Label>
            <Textarea
              rows={3}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Por ejemplo: pagué por transferencia el viernes"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              className="gap-2 bg-[#4dd0e1] hover:bg-[#3bb8c9]"
              onClick={enviar}
              disabled={enviando}
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
