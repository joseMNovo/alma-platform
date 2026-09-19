import { redirect } from "next/navigation"

/** Ver app/formacion/page.tsx: la ruta vieja sobrevive como redirect. */
export default async function FormacionSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/academia/${slug}`)
}
