// Forzar renderizado dinámico para evitar problemas de prerendering
export const dynamic = 'force-dynamic'

import HomePageClient from "@/components/home-page-client"

export default function HomePage() {
  const gamesUrl = process.env.GAMES_URL ?? ""
  return <HomePageClient gamesUrl={gamesUrl} />
}
