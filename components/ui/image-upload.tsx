"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
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
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentSrc = preview || (value ? `/api/files/${value}/raw` : null)

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

    setUploading(true)
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
        reader.readAsDataURL(file)
      })

      // Preview inmediato mientras viaja: la imagen aparece sin esperar la red.
      setPreview(dataUrl)

      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mime_type: file.type,
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentSrc} alt={label} className="h-40 w-full object-cover" />

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
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition hover:border-[#4dd0e1] hover:text-[#4dd0e1] disabled:opacity-60"
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

      <p className="flex items-start gap-1 text-xs text-gray-400">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        Se redimensiona automáticamente al guardar, no hace falta achicarla antes.
      </p>
    </div>
  )
}
