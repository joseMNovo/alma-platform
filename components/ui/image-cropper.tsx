"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Move, ZoomIn, Loader2 } from "lucide-react"

/**
 * Recorte de imagen antes de subirla.
 *
 * El marco tiene la MISMA proporción con la que después se va a mostrar la
 * imagen, así que lo que se ve acá es literalmente lo que va a salir. Se
 * arrastra para elegir qué parte entra y se acerca con la barra.
 *
 * El recorte se hace en el navegador con un canvas: lo que viaja al servidor
 * ya es la imagen final. Nada de guardar coordenadas ni recortar al mostrar —
 * eso obliga a repetir el mismo cálculo en cada lugar donde aparece la foto.
 *
 * La contra, asumida: reencuadrar después es volver a subir el archivo.
 *
 * Va INLINE y no en un modal a propósito: este componente se usa adentro del
 * formulario de la capacitación, que ya es un modal. Radix bloquea los clicks
 * de un diálogo anidado dentro de otro, y el botón de confirmar no respondía.
 */

/** Ancho del archivo que se sube. Alto = ancho / proporción. */
const ANCHO_SALIDA = 1280

export interface CropResult {
  dataUrl: string
  mime: string
}

export default function ImageCropper({
  src,
  aspect,
  title = "Encuadrar la imagen",
  mime = "image/jpeg",
  onConfirm,
  onCancel,
}: {
  /** Imagen original como data URL */
  src: string
  /** Proporción del marco (ancho / alto). 16/9 para las portadas. */
  aspect: number
  title?: string
  /** Tipo del archivo original: define el del recorte. */
  mime?: string
  onConfirm: (result: CropResult) => void
  onCancel: () => void
}) {
  const marcoRef = useRef<HTMLDivElement>(null)
  const imagenRef = useRef<HTMLImageElement | null>(null)

  const [marco, setMarco] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [listo, setListo] = useState(false)
  const arrastre = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Escala mínima para que la imagen SIEMPRE tape el marco: nunca puede
  // quedar un borde vacío.
  const base =
    natural.w && natural.h && marco.w && marco.h
      ? Math.max(marco.w / natural.w, marco.h / natural.h)
      : 1
  const ancho = natural.w * base * zoom
  const alto = natural.h * base * zoom

  const acotar = useCallback(
    (x: number, y: number) => ({
      x: Math.min(0, Math.max(marco.w - ancho, x)),
      y: Math.min(0, Math.max(marco.h - alto, y)),
    }),
    [marco.w, marco.h, ancho, alto],
  )

  const medirMarco = useCallback(() => {
    const rect = marcoRef.current?.getBoundingClientRect()
    if (rect) setMarco({ w: rect.width, h: rect.height })
  }, [])

  useLayoutEffect(() => {
    medirMarco()
    window.addEventListener("resize", medirMarco)
    return () => window.removeEventListener("resize", medirMarco)
  }, [medirMarco])

  // Carga la imagen aparte del DOM: se necesita su tamaño real para calcular
  // el encuadre, y el mismo objeto se reusa después para dibujar el canvas.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imagenRef.current = img
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
      setListo(true)
    }
    img.src = src
  }, [src])

  // Arranca centrada, que es el encuadre que la mayoría va a dejar.
  useEffect(() => {
    if (!marco.w || !natural.w) return
    setPos({ x: (marco.w - ancho) / 2, y: (marco.h - alto) / 2 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marco.w, marco.h, natural.w, natural.h])

  // Al acercar/alejar se mantiene fijo el centro del marco, si no la imagen
  // se escapa para un costado en cada movimiento de la barra.
  const cambiarZoom = (nuevo: number) => {
    const anchoNuevo = natural.w * base * nuevo
    const altoNuevo = natural.h * base * nuevo
    const cx = (marco.w / 2 - pos.x) / ancho
    const cy = (marco.h / 2 - pos.y) / alto

    const x = Math.min(0, Math.max(marco.w - anchoNuevo, marco.w / 2 - cx * anchoNuevo))
    const y = Math.min(0, Math.max(marco.h - altoNuevo, marco.h / 2 - cy * altoNuevo))

    setZoom(nuevo)
    setPos({ x, y })
  }

  const alPresionar = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
  }

  const alMover = (e: React.PointerEvent) => {
    if (!arrastre.current) return
    const { x, y, ox, oy } = arrastre.current
    setPos(acotar(ox + (e.clientX - x), oy + (e.clientY - y)))
  }

  const alSoltar = () => {
    arrastre.current = null
  }

  const confirmar = () => {
    const img = imagenRef.current
    if (!img || !marco.w) return

    const salidaW = ANCHO_SALIDA
    const salidaH = Math.round(ANCHO_SALIDA / aspect)
    const canvas = document.createElement("canvas")
    canvas.width = salidaW
    canvas.height = salidaH

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Del marco en pantalla al canvas: una sola escala para todo.
    const k = salidaW / marco.w
    // Fondo blanco: si el original es un PNG con transparencia y sale como
    // JPEG, las zonas vacías quedarían negras.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, salidaW, salidaH)
    ctx.drawImage(img, pos.x * k, pos.y * k, ancho * k, alto * k)

    const salidaMime = mime === "image/png" ? "image/png" : "image/jpeg"
    onConfirm({
      dataUrl: canvas.toDataURL(salidaMime, 0.9),
      mime: salidaMime,
    })
  }

  return (
    <div className="space-y-3 rounded-lg border-2 border-[#4dd0e1] bg-white p-3">
      <p className="text-sm font-medium text-gray-800">{title}</p>

      <p className="text-sm text-gray-500">
          Arrastrá la imagen para elegir qué parte se ve. Lo que quede adentro del
          recuadro es exactamente lo que se va a mostrar.
        </p>

      <div
        ref={marcoRef}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          // touch-none: sin esto, arrastrar en el celular scrollea la página
          // en vez de mover la imagen.
          className="relative w-full cursor-grab touch-none overflow-hidden rounded-lg bg-gray-100 active:cursor-grabbing"
          style={{ aspectRatio: String(aspect) }}
        >
          {listo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: pos.x, top: pos.y, width: ancho, height: alto }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
            className="w-full accent-[#4dd0e1]"
            aria-label="Acercar o alejar la imagen"
          />
        </div>

        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Move className="h-3 w-3 shrink-0" />
          También podés acercar y después mover para ajustar el detalle.
        </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={confirmar}
          disabled={!listo}
          className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
        >
          Usar este encuadre
        </Button>
      </div>
    </div>
  )
}
