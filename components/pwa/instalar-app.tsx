"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Download, Share, SquarePlus, Compass } from "lucide-react"

/**
 * Botón para instalar la app en el teléfono.
 *
 * Los dos sistemas no juegan el mismo partido:
 *
 * - **Android/Chrome** dispara `beforeinstallprompt`. Se intercepta, se
 *   guarda, y el botón abre el diálogo nativo. Un toque y queda instalada.
 * - **iOS/Safari** no tiene nada equivalente: Apple no expone ninguna API
 *   para disparar "Agregar a inicio". Lo único posible son instrucciones.
 *
 * Y hay una trampa que en una jornada muerde seguido: en iOS la PWA **solo**
 * se puede instalar desde Safari. Si el link se abrió dentro de Instagram o
 * WhatsApp, la opción ni aparece en el menú, y la persona prueba tres veces y
 * abandona sin entender. Por eso ese caso se detecta y se dice qué hacer.
 *
 * Si ya está corriendo como app, no se muestra nada.
 */

type Plataforma =
  | "android"
  | "ios-safari"
  | "ios-otro-navegador"      // Chrome, Edge, Firefox: sí se puede, pero el menú está en otro lado
  | "ios-navegador-interno"   // Instagram, WhatsApp: no se puede
  | "ninguna"

export default function InstalarApp({ className }: { className?: string }) {
  const [promptDiferido, setPromptDiferido] = useState<any>(null)
  const [plataforma, setPlataforma] = useState<Plataforma>("ninguna")
  const [ayudaAbierta, setAyudaAbierta] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent

    // Ya está instalada y abierta como app: no hay nada que ofrecer.
    const enApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    if (enApp) return

    // El iPad moderno se declara como Mac; se lo reconoce por el táctil.
    const esIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)

    if (esIOS) {
      // En iPhone NINGÚN navegador puede instalar por código: Apple no expone
      // la API, y todos usan WebKit por obligación. Lo único que cambia entre
      // uno y otro es dónde está el menú, así que hay que decirlo bien.
      if (/FBAN|FBAV|Instagram|Line|WhatsApp|Snapchat/i.test(ua)) {
        setPlataforma("ios-navegador-interno")
      } else if (/CriOS|EdgiOS|FxiOS|OPiOS|YaBrowser/i.test(ua)) {
        setPlataforma("ios-otro-navegador")
      } else {
        setPlataforma("ios-safari")
      }
      return
    }

    /**
     * Android: el navegador avisa cuándo se puede instalar. Se le pide que no
     * muestre su propia barra para ofrecerlo donde tenga sentido.
     *
     * Ojo: el evento puede dispararse antes de que este componente se monte y
     * ahí se pierde. No es grave —el navegador lo vuelve a ofrecer por su
     * cuenta— pero explica que a veces el botón no aparezca de entrada.
     */
    const alPoderInstalar = (e: Event) => {
      e.preventDefault()
      setPromptDiferido(e)
      setPlataforma("android")
    }
    window.addEventListener("beforeinstallprompt", alPoderInstalar)

    // Cuando se instala, el botón desaparece sin necesidad de recargar.
    const alInstalar = () => { setPromptDiferido(null); setPlataforma("ninguna") }
    window.addEventListener("appinstalled", alInstalar)

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoderInstalar)
      window.removeEventListener("appinstalled", alInstalar)
    }
  }, [])

  if (plataforma === "ninguna") return null

  const instalarEnAndroid = async () => {
    if (!promptDiferido) return
    promptDiferido.prompt()
    await promptDiferido.userChoice
    // El evento es de un solo uso: si se descarta, hay que esperar a que el
    // navegador lo vuelva a ofrecer.
    setPromptDiferido(null)
    setPlataforma("ninguna")
  }

  return (
    <>
      <Button
        variant="outline"
        className={`gap-2 ${className ?? ""}`}
        onClick={plataforma === "android" ? instalarEnAndroid : () => setAyudaAbierta(true)}
      >
        <Download className="h-4 w-4" />
        Instalar la app
      </Button>

      <Dialog open={ayudaAbierta} onOpenChange={setAyudaAbierta}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tener ALMA a mano</DialogTitle>
          </DialogHeader>

          {plataforma === "ios-navegador-interno" ? (
            <div className="space-y-3 text-sm text-gray-700">
              <p className="flex items-start gap-2">
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-[#4dd0e1]" />
                <span>
                  Estás viendo esto dentro de otra aplicación. Desde acá iOS no deja
                  agregar nada a la pantalla de inicio.
                </span>
              </p>
              <p>
                Tocá el menú <strong>···</strong> y elegí{" "}
                <strong>&ldquo;Abrir en Safari&rdquo;</strong>. Una vez en Safari, volvé a
                tocar este botón.
              </p>
            </div>
          ) : (
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Share className="mt-0.5 h-5 w-5 shrink-0 text-[#4dd0e1]" />
                <span>
                  Tocá el botón <strong>Compartir</strong>, el cuadradito con la flecha
                  hacia arriba,{" "}
                  {plataforma === "ios-safari"
                    ? "abajo en el centro de la pantalla"
                    : "arriba a la derecha, al lado de la dirección"}
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <SquarePlus className="mt-0.5 h-5 w-5 shrink-0 text-[#4dd0e1]" />
                <span>
                  Deslizá la lista y elegí <strong>Agregar a inicio</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="mt-0.5 h-5 w-5 shrink-0 text-[#4dd0e1]" />
                <span>
                  Confirmá con <strong>Agregar</strong>. Te queda el ícono de ALMA
                  junto al resto de tus aplicaciones.
                </span>
              </li>
            </ol>
          )}

          {plataforma === "ios-otro-navegador" && (
            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              En iPhone ningún navegador puede instalarla de un toque: Apple no lo
              permite. Si no encontrás la opción, probá desde <strong>Safari</strong>,
              que es donde siempre aparece.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
