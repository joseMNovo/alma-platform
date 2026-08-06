import type { Metadata } from "next"
import Link from "next/link"
import { BadgeCheck, ShieldAlert, Download, GraduationCap } from "lucide-react"
import { verifyCertificate, type CertificateVerification } from "@/lib/data-manager"
import AlmaFooter from "@/components/ui/alma-footer"

/**
 * Verificación PÚBLICA de un certificado — /certificado/<codigo>
 *
 * Es el link que va en el mail y el que alguien tipea para confirmar que el
 * certificado que le mostraron es real. Sin sesión: si pidiera login, no
 * serviría para verificar nada.
 *
 * Muestra a nombre de quién está, de qué capacitación y de qué fecha —sin eso
 * no se puede confirmar que sea de quien lo presenta— pero nunca el DNI.
 *
 * Server component: el resultado viaja en el HTML, así que se ve al instante
 * y sin parpadeo.
 */

export const dynamic = "force-dynamic"

// Los buscadores no tienen por qué indexar los certificados de la gente.
export const metadata: Metadata = {
  title: "Verificar certificado — Comunidad ALMA",
  robots: { index: false, follow: false },
}

function formatearFecha(valor?: string | null): string {
  if (!valor) return ""
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime())
    ? ""
    : fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
}

export default async function VerificarCertificadoPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  let dato: CertificateVerification | null = null
  try {
    dato = await verifyCertificate(code)
  } catch {
    // Si el backend no contesta, se muestra la pantalla de "no encontrado"
    // en vez de un error 500: para quien verifica, el resultado práctico es
    // el mismo y una pantalla rota da peor impresión que una respuesta clara.
    dato = null
  }

  const valido = Boolean(dato?.valido)
  const anulado = Boolean(dato?.revoked)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/academia" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            <span className="text-lg font-bold">
              Comunidad <span className="text-[#4dd0e1]">ALMA</span>
            </span>
          </Link>
          <Link
            href="/academia"
            className="text-sm font-medium text-[#4dd0e1] underline-offset-2 hover:underline"
          >
            Ver capacitaciones
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div
            className={`flex items-center gap-3 px-6 py-5 ${
              valido ? "bg-green-50" : "bg-amber-50"
            }`}
          >
            {valido ? (
              <BadgeCheck className="h-8 w-8 shrink-0 text-green-600" />
            ) : (
              <ShieldAlert className="h-8 w-8 shrink-0 text-amber-500" />
            )}
            <div>
              <h1 className={`text-xl font-bold ${valido ? "text-green-800" : "text-amber-900"}`}>
                {valido
                  ? "Certificado válido"
                  : anulado
                    ? "Certificado anulado"
                    : "No encontramos este certificado"}
              </h1>
              <p className={`text-sm ${valido ? "text-green-700" : "text-amber-800"}`}>
                {valido
                  ? "Fue emitido por ALMA Rosario."
                  : anulado
                    ? "Este certificado fue dado de baja por ALMA Rosario."
                    : "Revisá que el código esté completo y bien escrito."}
              </p>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Código</p>
              <p className="font-mono text-lg text-gray-900">{dato?.code ?? code}</p>
            </div>

            {valido && (
              <>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    A nombre de
                  </p>
                  <p className="text-lg font-semibold text-gray-900">{dato?.holder_name}</p>
                </div>

                {dato?.training_title && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Capacitación
                    </p>
                    <p className="flex items-center gap-2 text-gray-800">
                      <GraduationCap className="h-4 w-4 shrink-0 text-[#4dd0e1]" />
                      {dato.training_title}
                      {dato.hours && (
                        <span className="text-sm text-gray-500">· {dato.hours}</span>
                      )}
                    </p>
                  </div>
                )}

                {dato?.issued_at && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Emitido el
                    </p>
                    <p className="text-gray-800">{formatearFecha(dato.issued_at)}</p>
                  </div>
                )}

                <a
                  href={`/api/publico/certificado/${encodeURIComponent(dato!.code)}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4dd0e1] px-4 py-3 font-semibold text-white transition hover:bg-[#3bb8c9]"
                >
                  <Download className="h-4 w-4" />
                  Descargar el certificado
                </a>
              </>
            )}

            {anulado && dato?.revoked_reason && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Motivo</p>
                <p className="text-gray-800">{dato.revoked_reason}</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Dudas sobre este certificado? Escribinos y lo verificamos con vos.
        </p>
      </main>

      <AlmaFooter />
    </div>
  )
}
