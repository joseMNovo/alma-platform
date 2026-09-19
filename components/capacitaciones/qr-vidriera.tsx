"use client"

import { useState } from "react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Copy, ExternalLink } from "lucide-react"

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

  const url = typeof window !== "undefined" ? `${window.location.origin}${ruta}` : ""

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copiado" })
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" })
    }
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
        <div className="mx-auto rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
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
