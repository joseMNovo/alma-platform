"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import type { Certificate } from "@/lib/data-manager"
import { Award, Loader2, ExternalLink, Search, Ban } from "lucide-react"

/**
 * Historial de certificados entregados.
 *
 * Es la pantalla de consulta: quién tiene qué, con qué código y desde cuándo.
 * La ACCIÓN (emitir, mandar) vive en Emisión — separarlas evita que alguien
 * emita de nuevo sin querer mientras busca un dato.
 *
 * Los anulados se listan igual, marcados: el historial tiene que mostrar que
 * existieron, no hacerlos desaparecer.
 */
export default function HistorialCertificados() {
  const [filas, setFilas] = useState<Certificate[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/certificados/emitidos")
        if (!res.ok) throw new Error()
        setFilas(await res.json())
      } catch {
        toast({
          title: "Error",
          description: "No se pudo cargar el historial",
          variant: "destructive",
        })
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return filas
    return filas.filter(
      (c) =>
        c.holder_name.toLowerCase().includes(q) ||
        (c.training_title ?? "").toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    )
  }, [filas, busqueda])

  const formatear = (valor?: string | null) =>
    valor ? new Date(valor).toLocaleDateString("es-AR") : "—"

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#5ec0cf]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Oculto en el teléfono: el encabezado de sección, arriba, ya dice esto mismo. */}
          <h3 className="hidden font-semibold text-gray-900 sm:block">Historial</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-600">
            {filas.length} {filas.length === 1 ? "certificado" : "certificados"}
          </span>
        </div>
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por persona, capacitación o código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {!visibles.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
            <Award className="h-10 w-10 text-gray-300" />
            <p className="font-medium">
              {filas.length ? "Sin resultados" : "No se emitió ningún certificado"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        {/*
          Teléfono: una tarjeta por certificado.

          La tabla pide 640px de ancho mínimo. En un teléfono eso significa
          que para ver el código hay que arrastrar hasta perder de vista a
          quién pertenece, que es justo el dato que se está buscando cuando
          alguien llama preguntando por su certificado.
        */}
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white sm:hidden">
          {visibles.map((c) => (
            <div key={c.id} className={`px-3 py-3 ${c.revoked_at ? "bg-gray-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${c.revoked_at ? "text-gray-400 line-through" : "text-gray-900"}`}>
                    {c.holder_name}
                  </p>
                  <p className="truncate text-[12.5px] text-alma-tinta">{c.training_title ?? "—"}</p>
                </div>
                {c.revoked_at && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    <Ban className="h-3 w-3" />
                    Anulado
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500">Emitido {formatear(c.issued_at)}</span>
                {c.sent_at ? (
                  <span className="text-green-600">Enviado {formatear(c.sent_at)}</span>
                ) : (
                  <span className="text-amber-600">Sin enviar</span>
                )}
                <a
                  href={`/certificado/${c.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 font-mono text-alma-fuerte"
                >
                  {c.code}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Escritorio: la tabla, donde las columnas se comparan de un vistazo. */}
        <Card className="hidden sm:block">
          <CardContent className="overflow-x-auto py-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-2 py-2 font-medium">Persona</th>
                  <th className="px-2 py-2 font-medium">Capacitación</th>
                  <th className="px-2 py-2 font-medium">Emitido</th>
                  <th className="px-2 py-2 font-medium">Enviado</th>
                  <th className="px-2 py-2 font-medium">Código</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 last:border-0 ${
                      c.revoked_at ? "bg-gray-50 text-gray-400" : ""
                    }`}
                  >
                    <td className="px-2 py-2">
                      <span className="font-medium text-gray-800">{c.holder_name}</span>
                      {c.revoked_at && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                          <Ban className="h-3 w-3" />
                          Anulado
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-600">{c.training_title ?? "—"}</td>
                    <td className="px-2 py-2 text-gray-500">{formatear(c.issued_at)}</td>
                    <td className="px-2 py-2">
                      {c.sent_at ? (
                        <span className="text-green-600">{formatear(c.sent_at)}</span>
                      ) : (
                        <span className="text-amber-600">Sin enviar</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <a
                        href={`/certificado/${c.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-alma-fuerte underline-offset-2 hover:underline"
                      >
                        {c.code}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  )
}
