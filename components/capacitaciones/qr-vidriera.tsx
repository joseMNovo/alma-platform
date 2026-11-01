"use client"

import { useState } from "react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Copy, ExternalLink, AlertTriangle } from "lucide-react"

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
  descripcion,
  aviso,
}: {
  className?: string
  /** Ruta interna a la que apunta ESTE código. Un QR, un destino. */
  ruta: string
  /** Encabezado del diálogo y de la hoja impresa. */
  titulo: string
  /** Botón chico, solo el ícono: para meterlo al lado de un título. */
  soloIcono?: boolean
  /**
   * Para quién es el código.
   *
   * Hacía falta que fuera por destino y no una sola frase para todos. El
   * texto genérico —"mostrale esta pantalla a la persona"— es correcto para
   * la vidriera y para una capacitación, donde «la persona» es justamente
   * alguien de afuera. En el puesto de venta decía lo contrario de lo que
   * pasa: ahí el código abre la CAJA, y el que está enfrente es el que
   * compra.
   */
  descripcion?: string
  /** Lo que NO hay que hacer con este código, cuando confundirse cuesta. */
  aviso?: string
}) {
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)

  const url = typeof window !== "undefined" ? `${window.location.origin}${ruta}` : ""

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Enlace copiado" })
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
          {descripcion ??
            "Mostrá esta pantalla para que la escaneen con la cámara del teléfono."}
        </p>

        {aviso && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{aviso}</span>
          </div>
        )}

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

        <DialogFooter>
          <Button variant="outline" className="gap-2" onClick={copiar}>
            <Copy className="h-4 w-4" /> Copiar enlace
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(ruta, "_blank")}
          >
            <ExternalLink className="h-4 w-4" /> Abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
