"use client"

import { useState, useRef } from "react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Copy, ExternalLink, Printer } from "lucide-react"

/**
 * QR para mostrarle a alguien que está parado enfrente.
 *
 * Un QR sirve cuando hay dos personas y dos teléfonos; si no, es decoración.
 * Por eso los destinos son pocos y elegidos: la vidriera, una capacitación
 * puntual, y la app para dar de alta a un voluntario en una reunión.
 *
 * Cada botón apunta a UN destino y nada más: el de Inicio a la app, el de
 * Academia a la vidriera, el de una capacitación a esa capacitación. Se probó
 * con un selector adentro y sobraba — quien lo abre ya sabe qué quiere
 * mostrar, y elegir era un paso de más.
 *
 * La URL se arma con `window.location.origin` en vez de una constante: así el
 * QR que se genera en desarrollo apunta a desarrollo, y nadie termina pegando
 * un cartel con localhost.
 */

export default function QrVidriera({
  className,
  ruta,
  titulo,
  soloIcono = false,
}: {
  className?: string
  /** Ruta interna a la que apunta ESTE código. Un QR, un destino. */
  ruta: string
  /** Encabezado del diálogo y de la hoja impresa. */
  titulo: string
  /** Botón chico, solo el ícono: para meterlo al lado de un título. */
  soloIcono?: boolean
}) {
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)
  const contenedorQr = useRef<HTMLDivElement>(null)

  const url = typeof window !== "undefined" ? `${window.location.origin}${ruta}` : ""

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copiado" })
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" })
    }
  }

  /**
   * Arma una hoja aparte y la manda a imprimir.
   *
   * Se copia el SVG que ya está en pantalla en vez de regenerarlo: es el
   * mismo código, garantizado. Y se abre una ventana limpia porque imprimir
   * el diálogo directo arrastraría el overlay y el resto de la aplicación.
   */
  const imprimir = () => {
    const svg = contenedorQr.current?.querySelector("svg")?.outerHTML
    if (!svg) return
    const hoja = window.open("", "_blank", "width=800,height=900")
    if (!hoja) {
      toast({ title: "El navegador bloqueó la ventana de impresión", variant: "destructive" })
      return
    }
    hoja.document.write(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>QR — ${titulo}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: system-ui, Arial, sans-serif; text-align: center; color: #111; }
  h1 { font-size: 30px; margin: 0 0 6px; }
  p.bajada { font-size: 17px; color: #444; margin: 0 0 28px; }
  .qr { display: inline-block; padding: 16px; border: 1px solid #ddd; border-radius: 12px; }
  .qr svg { width: 340px; height: 340px; }
  p.url { font-size: 14px; color: #666; margin-top: 22px; word-break: break-all; }
</style></head>
<body>
  <h1>${titulo}</h1>
  <p class="bajada">Escaneá el código con la cámara del teléfono</p>
  <div class="qr">${svg}</div>
  <p class="url">${url}</p>
</body></html>`)
    hoja.document.close()
    hoja.focus()
    hoja.print()
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={soloIcono ? "icon" : "default"}
          title="Mostrar QR"
          className={`gap-2 ${className ?? ""}`}
        >
          <QrCode className="h-4 w-4" />
          {!soloIcono && "Mostrar QR"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          Mostrale esta pantalla a la persona para que la escanee con la cámara
          del teléfono.
        </p>

        {/* Fondo blanco explícito y margen propio: un QR sobre un fondo gris o
            pegado al borde cuesta más de leer, sobre todo al aire libre. */}
        <div ref={contenedorQr} className="mx-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          {url && (
            <QRCode
              value={url}
              size={232}
              level="M"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          )}
        </div>

        <p className="break-all text-center text-xs text-gray-500">{url}</p>

        <Button className="w-full gap-2 bg-[#4dd0e1] hover:bg-[#3bb8c9]" onClick={imprimir}>
          <Printer className="h-4 w-4" /> Imprimir para el stand
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={copiar}>
            <Copy className="h-4 w-4" /> Copiar link
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => window.open(ruta, "_blank")}
          >
            <ExternalLink className="h-4 w-4" /> Abrir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
