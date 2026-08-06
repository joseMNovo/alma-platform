"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import ImageCropper from "@/components/ui/image-cropper"
import { toast } from "@/hooks/use-toast"
import { ImagePlus, Loader2, Trash2, AlertCircle } from "lucide-react"

interface ImageUploadProps {
  /** GUID del archivo ya subido (null = todavía no hay imagen) */
  value?: string | null
  /** Se dispara con el guid nuevo, o null cuando se quita la imagen */
  onChange: (guid: string | null) => void
  /** Uso habilitado en el backend (PURPOSES). Ej: "training_cover" */
  purpose: string
  ownerType?: string | null
  ownerId?: number | null
  label?: string
  /** Debe coincidir con el máximo del purpose en el backend */
  maxMB?: number
  /**
   * Cómo entra la imagen en el recuadro de vista previa. "contain" para las
   * que no se pueden recortar sin que se vean rotas (un logo, una firma
   * escaneada); "cover" para las que llenan un espacio, como una portada.
   */
  fit?: "cover" | "contain"
  /**
   * Proporción (ancho / alto) con la que se va a MOSTRAR la imagen. Con esto
   * puesto, al elegir el archivo se abre el recortador: la persona encuadra y
   * lo que se sube ya es la imagen final. Sin esto, se sube tal cual.
   */
  cropAspect?: number
  className?: string
}

const ACCEPTED = "image/jpeg,image/png,image/webp"

/**
 * Subida de imágenes contra /api/files.
 *
 * Manda el contenido en base64 y muestra la imagen ya subida con
 * /api/files/<guid>/raw (bytes cacheables, no base64 embebido).
 * La validación de verdad la hace el backend: acá solo se cortan los
 * errores obvios para no hacer viajar 5 MB al pedo.
 */
export default function ImageUpload({
  value,
  onChange,
  purpose,
  ownerType = null,
  ownerId = null,
  label = "Imagen",
  maxMB = 5,
  fit = "cover",
  cropAspect,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  // Archivo elegido esperando encuadre. Mientras esté acá NO se subió nada.
  const [aRecortar, setARecortar] = useState<{ dataUrl: string; mime: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentSrc = preview || (value ? `/api/files/${value}/raw` : null)

  /** Manda la imagen al servidor. Recibe el data URL ya listo (recortado o no). */
  const subir = async (dataUrl: string, mime: string, name: string) => {
    setUploading(true)
    // Preview inmediato mientras viaja: la imagen aparece sin esperar la red.
    setPreview(dataUrl)

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mime_type: mime,
          purpose,
          owner_type: ownerType,
          owner_id: ownerId,
          data_base64: dataUrl.split(",")[1],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo subir la imagen")

      onChange(data.guid)
      setPreview(null) // a partir de acá manda la imagen del servidor (ya optimizada)
      toast({
        title: "Imagen subida",
        description: `${(data.size_bytes / 1024).toFixed(0)} KB${data.width ? ` · ${data.width}×${data.height}px` : ""}`,
      })
    } catch (error: any) {
      setPreview(null)
      toast({
        title: "No se pudo subir la imagen",
        description: error?.message || "Intentá de nuevo en un momento.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFile = async (file: File) => {
    if (!ACCEPTED.split(",").includes(file.type)) {
      toast({
        title: "Formato no permitido",
        description: "Subí una imagen JPG, PNG o WebP.",
        variant: "destructive",
      })
      return
    }

    if (file.size > maxMB * 1024 * 1024) {
      toast({
        title: "La imagen es muy pesada",
        description: `El máximo es ${maxMB} MB y esta pesa ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
        variant: "destructive",
      })
      return
    }

    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
        reader.readAsDataURL(file)
      })

      // Con proporción definida, primero se encuadra: lo que se sube es el
      // recorte, no el original.
      if (cropAspect) {
        setARecortar({ dataUrl, mime: file.type, name: file.name })
        return
      }

      await subir(dataUrl, file.type, file.name)
    } catch (error: any) {
      toast({
        title: "No se pudo leer el archivo",
        description: error?.message || "Probá con otra imagen.",
        variant: "destructive",
      })
    } finally {
      // Se limpia siempre: sin esto, volver a elegir el MISMO archivo no
      // dispara el onChange del input y parece que no pasa nada.
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {currentSrc ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {/* Con cropAspect, el recuadro tiene la proporción REAL con la que
              se va a mostrar la imagen: lo que se ve acá es lo que sale. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={label}
            style={cropAspect ? { aspectRatio: String(cropAspect) } : undefined}
            className={`w-full ${cropAspect ? "" : "h-40"} ${fit === "contain" ? "object-contain p-3" : "object-cover"}`}
          />

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}

          <div className="absolute right-2 top-2 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploading}
              // Reencuadrar es volver a elegir el archivo: lo guardado ya es
              // el recorte, el original no queda en ningún lado.
              title={cropAspect ? "Elegir otra foto y encuadrarla" : "Elegir otra foto"}
              onClick={() => inputRef.current?.click()}
            >
              Cambiar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={uploading}
              onClick={() => {
                // Solo se desvincula del formulario. El archivo NO se borra:
                // eso lo decide una persona desde el ABM de archivos.
                onChange(null)
                setPreview(null)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          style={cropAspect ? { aspectRatio: String(cropAspect) } : undefined}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition hover:border-[#4dd0e1] hover:text-[#4dd0e1] disabled:opacity-60 ${
            cropAspect ? "" : "h-40"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Subiendo…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm font-medium">Subir imagen</span>
              <span className="text-xs">JPG, PNG o WebP · hasta {maxMB} MB</span>
            </>
          )}
        </button>
      )}

      <p className="flex items-start gap-1 text-xs text-gray-500">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        {cropAspect
          ? "Al elegir la foto vas a poder acomodarla dentro del recuadro. Se achica sola: no hace falta prepararla antes."
          : "Se achica sola al guardar, no hace falta prepararla antes."}
      </p>

      {aRecortar && cropAspect && (
        <ImageCropper
          src={aRecortar.dataUrl}
          mime={aRecortar.mime}
          aspect={cropAspect}
          title={`Acomodá ${label.toLowerCase()}`}
          onCancel={() => setARecortar(null)}
          onConfirm={({ dataUrl, mime }) => {
            setARecortar(null)
            subir(dataUrl, mime, aRecortar.name)
          }}
        />
      )}
    </div>
  )
}
