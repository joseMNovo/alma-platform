import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getPublicTraining, type Training } from "@/lib/data-manager"
import CompraWizard from "@/components/capacitaciones/compra-wizard"
import AlmaFooter from "@/components/ui/alma-footer"
import MarcaAlma from "@/components/ui/marca-alma"

/**
 * Compra exprés — /capacitacion/<slug>/comprar
 *
 * Pública, como la landing. Existe para asegurar que la persona tenga cuenta
 * con el mail verificado ANTES de mandarla a pagar: si paga primero y se
 * registra después (o nunca), ALMA se queda con una transferencia sin dueño.
 */

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const training = await getPublicTraining(slug)
    return { title: `Comprar ${training.title} — ALMA`, robots: { index: false } }
  } catch {
    return { title: "Comprar — ALMA", robots: { index: false } }
  }
}

export default async function ComprarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ verificado?: string }>
}) {
  const { slug } = await params
  const { verificado } = await searchParams

  let training: Training | null = null
  try {
    training = await getPublicTraining(slug)
  } catch {
    training = null
  }

  if (!training) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href={`/capacitacion/${slug}`} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            <MarcaAlma className="text-xl" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-[#4dd0e1] underline-offset-2 hover:underline"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="mb-6">
          <p className="text-sm text-gray-500">Estás comprando</p>
          <h1 className="text-2xl font-bold text-gray-900">{training.title}</h1>
          {Number(training.price) > 0 && (
            <p className="mt-1 text-xl font-bold text-[#4dd0e1]">
              ${Number(training.price).toLocaleString("es-AR")}
              <span className="ml-1 text-sm font-normal text-gray-500">{training.currency}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <CompraWizard
            slug={slug}
            titulo={training.title}
            precio={Number(training.price)}
            moneda={training.currency}
            paymentUrl={training.payment_url}
            verificado={verificado === "1"}
          />
        </div>

        <Link
          href={`/capacitacion/${slug}`}
          className="mt-6 block text-center text-sm text-gray-500 underline-offset-2 hover:underline"
        >
          Volver al detalle de la capacitación
        </Link>
      </main>

      <AlmaFooter />
    </div>
  )
}
