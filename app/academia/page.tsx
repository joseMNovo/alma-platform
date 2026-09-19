import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { GraduationCap } from "lucide-react"
import { getPublicTrainings, type Training } from "@/lib/data-manager"
import CatalogoCapacitaciones from "@/components/capacitaciones/catalogo-capacitaciones"
import AcademiaInterna from "@/components/capacitaciones/academia-interna"
import AlmaFooter from "@/components/ui/alma-footer"
import MarcaAlma from "@/components/ui/marca-alma"

/**
 * Academia — UNA sola ruta para las dos caras.
 *
 * Sin sesión muestra la vidriera pública; con sesión, el módulo dentro del
 * dashboard. Se unificó a pedido del usuario: antes eran dos URLs distintas y
 * había que explicar cuál compartir.
 *
 * Por eso `/academia` NO está en el middleware: si estuviera, el visitante sin
 * cuenta rebotaría al login y la vidriera no cumpliría su función. Lo que
 * protege el contenido pago no es esta ruta sino el backend, que no manda el
 * `video_ref` sin habilitación.
 *
 * Server component a propósito: el HTML de la vidriera sale armado, así Google
 * y el preview de WhatsApp ven el catálogo de verdad.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Academia — Comunidad ALMA",
  description:
    "Capacitaciones de ALMA Rosario sobre Alzheimer y acompañamiento: formación para cuidadores, familiares y voluntarios.",
  openGraph: {
    title: "Academia — Comunidad ALMA",
    description: "Capacitaciones de ALMA Rosario sobre Alzheimer y acompañamiento.",
    type: "website",
  },
}

/** ¿El visitante trae una sesión válida? Se verifica la firma, no solo la
 *  presencia de la cookie: si no, cualquiera se pone `alma_token=x` y entra. */
async function haySesion(): Promise<boolean> {
  const token = (await cookies()).get("alma_token")?.value
  const secret = process.env.JWT_SECRET
  if (!token || !secret) return false
  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

export default async function AcademiaPage() {
  if (await haySesion()) return <AcademiaInterna />

  let trainings: Training[] = []
  try {
    trainings = await getPublicTrainings()
  } catch {
    // Si el backend no contesta, la página igual sale: es pública y la puede
    // estar abriendo alguien que llegó desde Instagram. Mejor un cartel que
    // un error 500.
    trainings = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            <MarcaAlma className="text-xl" />
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[#4dd0e1] underline-offset-2 hover:underline"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-10 max-w-2xl">
          {/* Mismo encabezado que el módulo de adentro (ícono + título), para
              que quien entra desde afuera reconozca la pantalla al loguearse. */}
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            <GraduationCap className="h-8 w-8 shrink-0 text-[#4dd0e1]" />
            Academia ALMA
          </h1>
          <p className="mt-3 text-gray-600">
            Formación sobre Alzheimer y acompañamiento, dictada por el equipo de ALMA
            Rosario. Elegí una capacitación para ver el temario y cómo inscribirte.
          </p>
        </div>

        {trainings.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 font-medium text-gray-700">
              Todavía no hay capacitaciones publicadas
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Volvé a visitarnos pronto: estamos preparando las próximas.
            </p>
          </div>
        ) : (
          /* Mismo catálogo que ve quien está logueado: las dos vistas comparten
             el componente justamente para que no se separen con el tiempo. */
          <CatalogoCapacitaciones trainings={trainings} hrefBase="/academia" />
        )}

        <div className="mt-12 rounded-xl bg-[#4dd0e1]/5 p-6 text-center">
          <p className="font-medium text-gray-800">¿Ya te inscribiste?</p>
          <p className="mt-1 text-sm text-gray-600">
            <Link href="/" className="text-[#4dd0e1] underline-offset-2 hover:underline">
              Ingresá a la plataforma
            </Link>{" "}
            y vas a encontrar tus capacitaciones en la pestaña Academia.
          </p>
        </div>
      </main>

      <AlmaFooter />
    </div>
  )
}
