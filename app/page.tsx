// Forzar renderizado dinámico para evitar problemas de prerendering
export const dynamic = 'force-dynamic'

import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import HomePageClient from "@/components/home-page-client"

/**
 * ¿La cookie de sesión es válida? Se verifica la FIRMA, no solo que exista.
 *
 * Esto se resuelve en el servidor a propósito. Antes lo decidía el cliente
 * mirando `localStorage`, que no es la autoridad: el token vive en una cookie
 * httpOnly que el navegador no puede leer. Cuando los dos se desincronizaban
 * —cookie vencida, o `JWT_SECRET` rotado— "/" empujaba a /inicio, el
 * middleware no estaba de acuerdo y rebotaba: loop infinito, que en la PWA se
 * veía como un spinner eterno sin forma de salir.
 */
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

export default async function HomePage() {
  const gamesUrl = process.env.NEXT_PUBLIC_GAMES_URL ?? ""
  return <HomePageClient gamesUrl={gamesUrl} sesionValida={await haySesion()} />
}
