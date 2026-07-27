import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getPublicTraining, type Training } from "@/lib/data-manager"
import AlmaFooter from "@/components/ui/alma-footer"

/**
 * Landing PÚBLICA de una capacitación — /capacitacion/<slug>
 *
 * Es el link que ALMA pone en Instagram y en el pie de los videos. Sin login.
 *
 * En singular a propósito: /capacitaciones (plural) es el módulo interno y
 * está protegido por el middleware. Si esta página viviera ahí, redirigiría
 * al login y no serviría para difundir nada.
 *
 * Server component: así el título y la portada viajan en el HTML y el
 * preview de WhatsApp/Instagram se ve bien.
 */

export const dynamic = "force-dynamic"

async function fetchTraining(slug: string): Promise<Training | null> {
  try {
    return await getPublicTraining(slug)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const training = await fetchTraining(slug)
  if (!training) return { title: "Capacitación no encontrada — ALMA" }

  return {
    title: `${training.title} — ALMA`,
    description: training.description?.slice(0, 160) ?? "Capacitación de ALMA Rosario",
    openGraph: {
      title: training.title,
      description: training.description?.slice(0, 160) ?? "",
      type: "website",
    },
  }
}

export default async function CapacitacionPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const training = await fetchTraining(slug)

  if (!training) notFound()

  const totalMinutes = training.items.reduce((acc, i) => acc + (i.duration_minutes ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            <span className="text-lg font-bold">
              Comunidad <span className="text-[#4dd0e1]">ALMA</span>
            </span>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[#4dd0e1] underline-offset-2 hover:underline"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {training.cover_file_guid && (
          <div className="mb-8 overflow-hidden rounded-xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${training.cover_file_guid}/raw`}
              alt={training.title}
              className="h-56 w-full object-cover sm:h-72"
            />
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{training.title}</h1>
            {training.description && (
              <p className="mt-4 whitespace-pre-wrap text-gray-600">{training.description}</p>
            )}

            {training.items.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Qué vas a ver</h2>
                <ol className="space-y-2">
                  {training.items.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4dd0e1]/10 text-xs font-bold text-[#4dd0e1]">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-800">{item.title}</span>
                        {item.description && (
                          <span className="block text-sm text-gray-500">{item.description}</span>
                        )}
                      </span>
                      {item.duration_minutes ? (
                        <span className="shrink-0 text-xs text-gray-400">{item.duration_minutes} min</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              {Number(training.price) > 0 ? (
                <p className="text-3xl font-bold text-gray-900">
                  ${Number(training.price).toLocaleString("es-AR")}
                  <span className="ml-1 text-sm font-normal text-gray-500">{training.currency}</span>
                </p>
              ) : (
                <p className="text-2xl font-bold text-green-600">Gratuita</p>
              )}

              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                <li>
                  {training.item_count} {training.item_count === 1 ? "módulo" : "módulos"}
                </li>
                {totalMinutes > 0 && <li>{totalMinutes} minutos de contenido</li>}
                <li>
                  {training.default_access_days
                    ? `Acceso por ${training.default_access_days} días`
                    : "Acceso sin vencimiento"}
                </li>
              </ul>

              <Link
                href="/registro"
                className="mt-5 block rounded-lg bg-[#4dd0e1] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#3bb8c9]"
              >
                Quiero inscribirme
              </Link>

              <p className="mt-3 text-xs text-gray-500">
                Creá tu cuenta en la plataforma y escribinos para coordinar el pago. Apenas
                lo registremos, te habilitamos el acceso.
              </p>
            </div>

            <div className="rounded-xl bg-[#4dd0e1]/5 p-5 text-sm text-gray-600">
              <p className="font-medium text-gray-800">¿Ya tenés cuenta?</p>
              <p className="mt-1">
                <Link href="/" className="text-[#4dd0e1] underline-offset-2 hover:underline">
                  Ingresá
                </Link>{" "}
                y vas a ver la capacitación en la pestaña Capacitaciones apenas te habilitemos.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <AlmaFooter />
    </div>
  )
}
