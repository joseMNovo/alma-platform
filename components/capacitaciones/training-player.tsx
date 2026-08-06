"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Lock } from "lucide-react"
import type { TrainingItem } from "@/lib/data-manager"

/**
 * Player de YouTube con marca de agua identificatoria y registro de progreso.
 *
 * SOBRE LA PROTECCIÓN DEL CONTENIDO — leer antes de "mejorar" esto:
 *
 * Un iframe de YouTube NO tiene DRM. La grabación de pantalla y las capturas
 * funcionan siempre, y no hay JavaScript que lo impida (OBS no dispara ningún
 * evento del navegador). Bloquear F12 o el click derecho es teatro: no frena
 * a nadie, molesta al usuario legítimo y da una falsa sensación de seguridad.
 *
 * Lo que SÍ hace este componente:
 *   1. El contenido llega gateado desde el servidor (item.locked / video_ref
 *      en null). Acá no se filtra nada: si el dato llegó, es porque el backend
 *      verificó el acceso.
 *   2. Marca de agua con el email de quien mira, moviéndose de lugar. No
 *      previene la copia: IDENTIFICA a quien filtre. Es el disuasivo real.
 *   3. Registra la reproducción (con la IP que resuelve el servidor) y el
 *      avance, que alimenta la detección de cuentas compartidas.
 */

const PING_INTERVAL_MS = 15000   // cada cuánto se guarda el progreso
const WATERMARK_MOVE_MS = 8000   // cada cuánto salta la marca de agua

interface TrainingPlayerProps {
  item: TrainingItem
  userEmail: string
  userName?: string
  /**
   * Vista previa de administración: se ve igual pero NO registra nada.
   *
   * Sin esto, cada vez que un admin abre un video para revisarlo le queda
   * cargado como visto y las reproducciones quedan mezcladas con las de la
   * gente. La marca de agua se deja igual, que es gratis y correcta.
   */
  soloVistaPrevia?: boolean
}

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Carga la IFrame API una sola vez para toda la aplicación. */
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null)
  if (window.YT?.Player) return Promise.resolve(window.YT)

  return new Promise((resolve) => {
    const existing = document.getElementById("youtube-iframe-api")
    if (!existing) {
      const script = document.createElement("script")
      script.id = "youtube-iframe-api"
      script.src = "https://www.youtube.com/iframe_api"
      document.head.appendChild(script)
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }

    // Por si la API ya estaba cargada y el callback no vuelve a dispararse.
    const poll = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(poll)
        resolve(window.YT)
      }
    }, 300)
  })
}

export default function TrainingPlayer({
  item,
  userEmail,
  userName,
  soloVistaPrevia = false,
}: TrainingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const lastTickRef = useRef<number | null>(null)
  const pendingWatchedRef = useRef(0)
  const positionRef = useRef(item.last_position_sec || 0)
  const viewLoggedRef = useRef(false)

  const [watermarkPos, setWatermarkPos] = useState({ x: 8, y: 12 })
  const [ready, setReady] = useState(false)

  /** Guarda el avance. `logView` solo en el primer play de la sesión. */
  const sendProgress = useCallback(
    (completed = false, logView = false) => {
      const delta = Math.round(pendingWatchedRef.current)
      pendingWatchedRef.current = 0
      if (soloVistaPrevia) return
      if (!delta && !completed && !logView) return

      fetch("/api/capacitaciones/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          last_position_sec: Math.round(positionRef.current),
          watched_delta: delta,
          completed,
          log_view: logView,
        }),
        keepalive: true, // sobrevive al cierre de la pestaña
      }).catch(() => {})
    },
    [item.id, soloVistaPrevia],
  )

  // ── Player ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (item.locked || !item.video_ref) return
    let cancelled = false

    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT || !containerRef.current) return

      playerRef.current = new YT.Player(containerRef.current, {
        videoId: item.video_ref,
        playerVars: {
          rel: 0,                // sin videos sugeridos de otros canales
          modestbranding: 1,
          iv_load_policy: 3,     // sin anotaciones
          playsinline: 1,
          start: Math.max(0, item.last_position_sec || 0), // "seguir viendo"
          origin: window.location.origin,
        },
        host: "https://www.youtube-nocookie.com",
        events: {
          onReady: () => setReady(true),
          onStateChange: (event: any) => {
            const state = event.data
            if (state === YT.PlayerState.PLAYING) {
              lastTickRef.current = Date.now()
              if (!viewLoggedRef.current) {
                viewLoggedRef.current = true
                sendProgress(false, true)
              }
            } else {
              // Al pausar/terminar se cierra el tramo reproducido.
              if (lastTickRef.current) {
                pendingWatchedRef.current += (Date.now() - lastTickRef.current) / 1000
                lastTickRef.current = null
              }
              if (state === YT.PlayerState.ENDED) {
                positionRef.current = playerRef.current?.getCurrentTime?.() ?? positionRef.current
                sendProgress(true)
              }
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy?.()
      } catch {
        /* el iframe ya no existe */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.video_ref, item.locked])

  // ── Ping de progreso ─────────────────────────────────────────────────
  useEffect(() => {
    if (item.locked || !ready) return

    const timer = setInterval(() => {
      // Se acumula el tiempo REAL reproducido: arrastrar la barra al final
      // no suma segundos, así "completado" significa que lo vio de verdad.
      if (lastTickRef.current) {
        const now = Date.now()
        pendingWatchedRef.current += (now - lastTickRef.current) / 1000
        lastTickRef.current = now
      }
      const current = playerRef.current?.getCurrentTime?.()
      if (typeof current === "number") positionRef.current = current
      sendProgress()
    }, PING_INTERVAL_MS)

    const flush = () => {
      if (lastTickRef.current) {
        pendingWatchedRef.current += (Date.now() - lastTickRef.current) / 1000
        lastTickRef.current = null
      }
      sendProgress()
    }
    window.addEventListener("pagehide", flush)

    return () => {
      clearInterval(timer)
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [ready, item.locked, sendProgress])

  // ── Marca de agua: cambia de lugar para que no se pueda tapar ─────────
  useEffect(() => {
    if (item.locked) return
    const timer = setInterval(() => {
      setWatermarkPos({
        x: 6 + Math.random() * 60,
        y: 8 + Math.random() * 74,
      })
    }, WATERMARK_MOVE_MS)
    return () => clearInterval(timer)
  }, [item.locked])

  if (item.locked || !item.video_ref) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg bg-gray-100 text-gray-500">
        <Lock className="h-8 w-8" />
        <p className="text-sm font-medium">Este contenido todavía no está habilitado</p>
        <p className="max-w-sm text-center text-xs">
          Escribinos para activar tu acceso a la capacitación.
        </p>
      </div>
    )
  }

  const stamp = new Date().toLocaleDateString("es-AR")

  return (
    <div className="relative aspect-video w-full select-none overflow-hidden rounded-lg bg-black">
      <div ref={containerRef} className="h-full w-full" />

      {/*
        Marca de agua. pointer-events-none es obligatorio: sin eso taparía
        los controles del player y el video sería inusable.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className="absolute whitespace-nowrap font-mono text-[11px] text-white/25 transition-all duration-1000 sm:text-xs"
          style={{ left: `${watermarkPos.x}%`, top: `${watermarkPos.y}%` }}
        >
          {userName ? `${userName} · ` : ""}
          {userEmail} · {stamp}
        </span>
      </div>
    </div>
  )
}
