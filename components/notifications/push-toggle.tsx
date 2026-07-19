"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getPushSupport,
  isSubscribed,
  enablePush,
  disablePush,
  registerServiceWorker,
  type PushSupport,
} from "@/lib/push-client"

/**
 * Tarjeta "Notificaciones" para Mis datos: permite activar/desactivar el push
 * en este dispositivo. Se muestra tanto a voluntarios como a participantes.
 */
export default function PushToggle() {
  const { toast } = useToast()
  const [support, setSupport] = useState<PushSupport>("unsupported")
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = getPushSupport()
      if (s === "ready") await registerServiceWorker()
      const sub = s === "ready" ? await isSubscribed() : false
      if (!cancelled) {
        setSupport(s)
        setSubscribed(sub)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleEnable() {
    setBusy(true)
    try {
      const ok = await enablePush()
      setSubscribed(ok)
      toast({
        title: ok ? "Notificaciones activadas" : "No se pudo activar",
        description: ok
          ? "Vas a recibir avisos de ALMA en este dispositivo."
          : "Revisá que hayas dado permiso de notificaciones.",
        variant: ok ? "default" : "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await disablePush()
      setSubscribed(false)
      toast({ title: "Notificaciones desactivadas", description: "Ya no recibirás avisos en este dispositivo." })
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#4dd0e1]" />
          Notificaciones
        </CardTitle>
        <CardDescription>Recibí avisos de eventos, recordatorios y novedades de ALMA.</CardDescription>
      </CardHeader>
      <CardContent>
        {support === "no-key" && (
          <p className="text-sm text-gray-500">Las notificaciones aún no están habilitadas en el servidor.</p>
        )}
        {support === "needs-install" && (
          <p className="text-sm text-gray-500">
            Para recibir notificaciones en iPhone/iPad, primero agregá la app a la pantalla de inicio
            (Compartir → “Agregar a inicio”) y abrila desde ahí.
          </p>
        )}
        {support === "unsupported" && (
          <p className="text-sm text-gray-500">Este navegador no soporta notificaciones push.</p>
        )}
        {support === "ready" && !subscribed && (
          <Button onClick={handleEnable} disabled={busy} className="bg-[#4dd0e1] hover:bg-[#3bbccd] text-white">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
            Activar notificaciones
          </Button>
        )}
        {support === "ready" && subscribed && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-600 font-medium">Activadas en este dispositivo ✓</span>
            <Button onClick={handleDisable} disabled={busy} variant="outline" size="sm">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellOff className="w-4 h-4 mr-2" />}
              Desactivar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
