"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import CertificateBodyEditor from "@/components/capacitaciones/certificate-body-editor"
import { toast } from "@/hooks/use-toast"
import type { CertificateTemplate } from "@/lib/data-manager"
import {
  Award, Loader2, Download, AlertTriangle, Check,
} from "lucide-react"

/**
 * Datos que se completan solos al emitir.
 *
 * `key` es lo que entiende el backend; `label` es lo ÚNICO que ve la persona
 * que escribe la plantilla. Nadie tiene que aprenderse la sintaxis: toca el
 * botón "Nombre y apellido" y el hueco se inserta donde tenga el cursor.
 *
 * Se declaran acá y no se importan de data-manager a propósito: este es un
 * componente cliente, y traer un valor (no un tipo) de ese módulo arrastraría
 * el cliente HTTP del backend al bundle del navegador. Tienen que coincidir
 * con PLACEHOLDERS en app/schemas/certificate.py.
 */
const CAMPOS = [
  { key: "nombre_completo", label: "Nombre y apellido", ejemplo: "María Fernández" },
  { key: "nombre", label: "Nombre", ejemplo: "María" },
  { key: "apellido", label: "Apellido", ejemplo: "Fernández" },
  { key: "dni", label: "DNI", ejemplo: "12.345.678" },
  { key: "capacitacion", label: "Capacitación", ejemplo: "Acompañamiento en Alzheimer" },
  { key: "fecha", label: "Fecha", ejemplo: "2 de agosto de 2026" },
  { key: "horas", label: "Carga horaria", ejemplo: "8 horas" },
  { key: "codigo", label: "Código de verificación", ejemplo: "MUESTRA-0000" },
] as const

// Lo que necesita el editor de pastillas. Se arma una sola vez: si se
// recreara en cada render, el editor repintaría su contenido mientras la
// persona escribe.
const CAMPOS_EDITOR = CAMPOS.map((c) => ({ key: c.key, label: c.label }))

/**
 * Caracteres que la fuente del PDF NO sabe dibujar.
 *
 * El certificado se imprime con Helvetica, que maneja el juego occidental
 * (WinAnsi): entran las tildes, la ñ, las comillas «» y los símbolos de
 * moneda, pero NO los emojis ni los alfabetos no latinos. Si se cuelan, el
 * PDF sale con cuadraditos o directamente falla al generarse.
 *
 * Se valida acá para avisar mientras se escribe, y de nuevo en el backend,
 * que es el que manda.
 */
const EXTRAS_PERMITIDOS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ''\"\"•–—˜™š›œžŸ"

function caracteresRaros(...textos: (string | null | undefined)[]): string[] {
  const encontrados = new Set<string>()
  for (const texto of textos) {
    // for...of recorre por CARÁCTER real: con índices, un emoji se partiría
    // en dos mitades sueltas y el aviso quedaría ilegible.
    for (const caracter of texto ?? "") {
      if (caracter === "\n" || caracter === "\r" || caracter === "\t") continue
      const codigo = caracter.codePointAt(0) ?? 0
      if (codigo <= 0xff || EXTRAS_PERMITIDOS.includes(caracter)) continue
      encontrados.add(caracter)
    }
  }
  return [...encontrados]
}

/**
 * Una parte del certificado, como caja aparte con su encabezado.
 *
 * Cajas y no renglones separados por una línea: con seis campos seguidos, la
 * línea no alcanza para ver de un vistazo qué pedazo del PDF se está tocando.
 */
function Caja({
  titulo,
  detalle,
  children,
}: {
  titulo: string
  detalle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{titulo}</h4>
        {detalle && <span className="text-xs text-gray-400">{detalle}</span>}
      </div>
      <CardContent className="space-y-3 py-4">{children}</CardContent>
    </Card>
  )
}

/**
 * El certificado, con el texto sugerido ya escrito.
 *
 * Es lo que se ve la primera vez, con la base recién migrada: mejor "revisá
 * este texto" que una hoja en blanco.
 *
 * El texto no vive en el .sql de la migración porque lleva llaves dobles y
 * los clientes SQL con interfaz (DBeaver) las leen como parámetros a enlazar
 * y frenan el script pidiendo valores.
 *
 * `name` es interno y no se muestra: hoy hay UNA sola plantilla y ponerle
 * nombre para distinguirla de las otras no le sirve a nadie. La tabla y el
 * backend siguen soportando varias, por si más adelante existe un módulo de
 * PDFs con plantillas distintas.
 */
const blankTemplate = (): Partial<CertificateTemplate> => ({
  name: "Certificado institucional",
  heading: "Certificado de finalización",
  body: [
    "Se deja constancia de que {{nombre_completo}}[[, DNI {{dni}}]], completó la ",
    "capacitación «{{capacitacion}}»[[, con una carga horaria de {{horas}}]], ",
    "dictada por ALMA Rosario.\n\nRosario, {{fecha}}.",
  ].join(""),
  legal_note:
    "Certificado emitido por Comunidad ALMA. Su autenticidad puede verificarse con el " +
    "código {{codigo}} en comunidadalma.org.ar.",
  is_default: true,
})

/**
 * Redacción del certificado.
 *
 * Se edita el TEXTO, no el diseño: la hoja (apaisada, marco, encabezado,
 * firma abajo) es fija. Un editor de posiciones es otro proyecto.
 *
 * La vista previa manda la plantilla completa al backend SIN guardarla, así
 * se puede iterar la redacción sin dejar veinte versiones en la base.
 */
/**
 * Foto de lo único que se guarda. Comparar contra esto es lo que permite
 * saber si hay algo pendiente: sin la copia, Guardar quedaría siempre
 * habilitado y nadie sabría si lo que ve en pantalla ya está en la base.
 */
function instantanea(t: Partial<CertificateTemplate> | null): string {
  return JSON.stringify({
    heading: t?.heading ?? "",
    body: t?.body ?? "",
    legal_note: t?.legal_note ?? "",
    signature_name: t?.signature_name ?? "",
    signature_role: t?.signature_role ?? "",
  })
}

export default function CertificadosAdmin() {
  const [editing, setEditing] = useState<Partial<CertificateTemplate> | null>(null)
  // Cómo quedó en la base la última vez. Vacío = todavía no se guardó nunca.
  const [guardado, setGuardado] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  // Muchas personas de la base no tienen DNI cargado. Este modo muestra cómo
  // les va a salir el certificado a ellas, que es donde se nota si el texto
  // no usó bloques opcionales.
  const [sinDni, setSinDni] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/certificados")
      if (!res.ok) throw new Error("No se pudieron cargar las plantillas")
      const data: CertificateTemplate[] = await res.json()

      // La predeterminada es la que se usa al emitir. Si no hubiera ninguna
      // marcada, se toma la primera antes que dejar la pantalla vacía.
      const actual = data.find((t) => t.is_default) ?? data[0] ?? null
      setEditing(actual ?? blankTemplate())
      // Sin filas todavía se muestra el certificado sugerido, que NO está
      // guardado: por eso queda como pendiente y Guardar arranca habilitado.
      setGuardado(actual ? instantanea(actual) : null)
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las plantillas", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El blob de la vista previa se libera al cambiarlo o al desmontar: si no,
  // cada click deja una copia del PDF viva en memoria hasta recargar.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const update = (patch: Partial<CertificateTemplate>) =>
    setEditing((prev) => ({ ...(prev ?? {}), ...patch }))

  const save = async () => {
    if (!editing) return

    setSaving(true)
    try {
      const isNew = !editing.id
      const res = await fetch(isNew ? "/api/certificados" : `/api/certificados/${editing.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar")

      toast({ title: "Certificado guardado" })
      // Se toma la respuesta del backend, no lo que había en pantalla: puede
      // haber recortado espacios o normalizado algo al validar.
      setEditing(data)
      setGuardado(instantanea(data))
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Todo lo que cambia el PDF, junto. Sirve de disparador del refresco: el
  // nombre de la plantilla, por ejemplo, no sale impreso y no tiene por qué
  // hacer trabajar al servidor.
  const claveDelPdf = JSON.stringify({
    heading: editing?.heading ?? "",
    body: editing?.body ?? "",
    legal_note: editing?.legal_note ?? "",
    signature_name: editing?.signature_name ?? "",
    signature_role: editing?.signature_role ?? "",
    sinDni,
  })

  /**
   * Regenera el PDF a medida que se escribe.
   *
   * Con media pausa de por medio: sin la espera sería un pedido por tecla.
   * Y con AbortController, porque si dos pedidos se cruzan el que llega
   * último no es necesariamente el más nuevo, y quedaría en pantalla un PDF
   * viejo sin que nada lo delate.
   */
  useEffect(() => {
    if (!editing) return

    const controlador = new AbortController()
    const espera = setTimeout(async () => {
      setPreviewing(true)
      setPreviewError(false)
      try {
        const res = await fetch("/api/certificados/muestra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controlador.signal,
          body: JSON.stringify({
            heading: editing.heading || "Certificado",
            body: editing.body ?? "",
            legal_note: editing.legal_note ?? "",
            signature_name: editing.signature_name ?? null,
            signature_role: editing.signature_role ?? null,
            signature_file_guid: editing.signature_file_guid ?? null,
            logo_file_guid: editing.logo_file_guid ?? null,
            ...(sinDni ? { dni: "" } : {}),
          }),
        })
        if (!res.ok) throw new Error("No se pudo generar el PDF")

        const blob = await res.blob()
        setPreviewUrl((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior)
          return URL.createObjectURL(blob)
        })
      } catch (error: any) {
        // Un pedido cancelado no es un error: es el refresco siguiente.
        if (error?.name !== "AbortError") setPreviewError(true)
      } finally {
        if (!controlador.signal.aborted) setPreviewing(false)
      }
    }, 500)

    return () => {
      clearTimeout(espera)
      controlador.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDelPdf])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  const hayCambios = instantanea(editing) !== guardado

  const raros = caracteresRaros(
    editing?.heading,
    editing?.body,
    editing?.legal_note,
    editing?.signature_name,
    editing?.signature_role,
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Redacción</h3>
        <p className="text-sm text-gray-500">
          El texto del PDF que reciben quienes terminan una capacitación.
        </p>
      </div>

      {editing && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          {/* ── Formulario ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <Caja titulo="Título" detalle="Arriba de todo, en grande">
              <Input
                value={editing.heading ?? ""}
                onChange={(e) => update({ heading: e.target.value })}
              />
            </Caja>

            <Caja titulo="Texto" detalle="El cuerpo del certificado">
              <CertificateBodyEditor
                value={editing.body ?? ""}
                onChange={(body) => update({ body })}
                campos={CAMPOS_EDITOR}
              />
            </Caja>

            <Caja titulo="Aclaración" detalle="Abajo de todo, en letra chica">
              <Textarea
                rows={3}
                value={editing.legal_note ?? ""}
                onChange={(e) => update({ legal_note: e.target.value })}
              />
            </Caja>

            {/* El logo y la firma escaneada se cargan por ahora fuera de esta
                pantalla: el backend los sigue soportando (columnas
                logo_file_guid / signature_file_guid) y el PDF usa el logo de
                ALMA por defecto. */}
            <Caja titulo="Firma" detalle="Sobre la línea del pie">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Nombre y apellido</Label>
                  <Input
                    placeholder="Ej: Ana Pérez"
                    value={editing.signature_name ?? ""}
                    onChange={(e) => update({ signature_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input
                    placeholder="Ej: Presidenta de ALMA Rosario"
                    value={editing.signature_role ?? ""}
                    onChange={(e) => update({ signature_role: e.target.value })}
                  />
                </div>
              </div>
            </Caja>

            {/* Barra pegada al pie de la columna: el formulario es largo y el
                botón quedaba abajo de todo, fuera de la vista justo cuando
                más se lo necesita. El borde de arriba se pinta solo cuando
                hay algo pendiente, para que la barra no grite si no hay nada
                que hacer. */}
            <div
              className={`sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-t-lg border-t-2 bg-white/95 px-3 py-3 backdrop-blur ${
                hayCambios ? "border-amber-300" : "border-transparent"
              }`}
            >
              <Button
                onClick={save}
                disabled={saving || !hayCambios || raros.length > 0}
                className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>

              {hayCambios ? (
                <span className="text-sm text-amber-600">Hay cambios sin guardar</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <Check className="h-4 w-4" />
                  Guardado
                </span>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={sinDni}
                  onChange={(e) => setSinDni(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#4dd0e1]"
                />
                Probar con alguien que no tiene el DNI cargado
              </label>

              {raros.length > 0 && (
                <p className="flex w-full items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>
                    El certificado no puede imprimir{" "}
                    <strong className="font-mono">{raros.join(" ")}</strong>. Sacá esos
                    caracteres para poder guardar: la tipografía del PDF no los dibuja y
                    saldrían como cuadraditos.
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* ── El PDF, en vivo ─────────────────────────────────────────
              Se rearma solo mientras se escribe. Queda fijo al hacer scroll
              porque el formulario es más largo que la pantalla: si se fuera
              hacia arriba, escribirías a ciegas. */}
          <div className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">Así va a salir</p>
              {previewing && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Actualizando
                </span>
              )}
            </div>

            {previewUrl ? (
              <>
                <iframe
                  src={previewUrl}
                  title="Vista previa del certificado"
                  className="h-[520px] w-full rounded-xl border border-gray-200 bg-white"
                />
                <a
                  href={previewUrl}
                  download="certificado-muestra.pdf"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00838f] underline-offset-2 hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Descargar este ejemplo
                </a>
              </>
            ) : (
              <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
                {previewError ? (
                  <>
                    <AlertTriangle className="h-8 w-8 text-amber-400" />
                    <p className="text-sm">
                      No se pudo armar el PDF. Revisá el texto o probá de nuevo.
                    </p>
                  </>
                ) : (
                  <>
                    <Award className="h-10 w-10 text-gray-300" />
                    <p className="text-sm">Armando el certificado…</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
