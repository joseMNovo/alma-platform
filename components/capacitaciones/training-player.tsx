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
 *
 * EXCEPCIÓN — `modoIntro`: el video de introducción de una capacitación es
 * público a propósito (se mira desde la landing, sin cuenta). Ahí los puntos
 * 2 y 3 no aplican: no hay a quién identificar ni a quién atribuirle avance.
 * La marca pasa a firmar con la dirección del sitio y solo se cuenta la
 * reproducción. Ver el comentario de la prop.
 */

const PING_INTERVAL_MS = 15000   // cada cuánto se guarda el progreso
const WATERMARK_MOVE_MS = 8000   // cada cuánto salta la marca de agua

interface TrainingPlayerProps {
  item: TrainingItem
  /** Se estampa en la marca de agua. Vacío cuando `modoIntro` está prendido. */
  userEmail?: string
  userName?: string
  /**
   * El admin está revisando el video: se ve igual pero NO registra nada.
   *
   * Sin esto, cada vez que un admin abre un video para revisarlo le queda
   * cargado como visto y las reproducciones quedan mezcladas con las de la
   * gente. La marca de agua se deja igual, que es gratis y correcta.
   *
   * Se llamaba `soloVistaPrevia`, pero "vista previa" pasó a ser el nombre de
   * OTRA cosa —el video abierto que se muestra en la landing— y dos conceptos
   * distintos con el mismo nombre terminan mezclados. Este dice lo que hace.
   */
  sinRegistrar?: boolean
  /**
   * Introducción abierta: el video que se mira desde la landing pública, sin
   * pagar y sin cuenta. Cambia tres cosas:
   *
   *   1. La marca de agua deja de identificar y pasa a firmar. No hay email
   *      que estampar, y tampoco haría falta: este video es público a
   *      propósito, así que no hay filtración que rastrear. Se pone la
   *      dirección del sitio, que viaja con el video si alguien lo comparte.
   *   2. No se guarda progreso. `training_item_progress` cuelga de una persona
   *      del registro maestro y un visitante anónimo no es ninguna.
   *   3. La reproducción SÍ se cuenta, contra un endpoint público, para saber
   *      si la intro convierte.
   */
  modoIntro?: boolean
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
  sinRegistrar = false,
  modoIntro = false,
}: TrainingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const lastTickRef = useRef<number | null>(null)
  const pendingWatchedRef = useRef(0)
  const positionRef = useRef(item.last_position_sec || 0)
  const viewLoggedRef = useRef(false)

  const [watermarkPos, setWatermarkPos] = useState({ x: 8, y: 12 })
  const [ready, setReady] = useState(false)

  /**
   * Cuenta la reproducción de la intro. Endpoint público: quien la mira puede
   * no tener sesión, así que `/api/capacitaciones/progreso` (que exige login)
   * devolvería 401 y no registraría nada.
   */
  const logIntroView = useCallback(() => {
    fetch("/api/publico/capacitacion/vista", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id }),
      keepalive: true,
    }).catch(() => {})
  }, [item.id])

  /** Guarda el avance. `logView` solo en el primer play de la sesión. */
  const sendProgress = useCallback(
    (completed = false, logView = false) => {
      const delta = Math.round(pendingWatchedRef.current)
      pendingWatchedRef.current = 0
      // En modo intro no hay a quién atribuirle el avance: person_id es NOT
      // NULL en training_item_progress. La vista se cuenta por otro lado.
      if (sinRegistrar || modoIntro) return
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
    [item.id, sinRegistrar, modoIntro],
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
                if (modoIntro) logIntroView()
                else sendProgress(false, true)
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
    // En modo intro no se arma el timer: sin esto, un visitante anónimo
    // dispararía un POST fallido cada 15 segundos contra un endpoint que le
    // va a contestar 401.
    if (item.locked || !ready || modoIntro) return

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
  }, [ready, item.locked, modoIntro, sendProgress])

  // ── Marca de agua: cambia de lugar para que no se pueda tapar ─────────
  useEffect(() => {
    // En la intro se queda quieta: ahí la marca firma, no vigila, y una firma
    // que salta por la pantalla es una molestia sin contrapartida.
    if (item.locked || modoIntro) return
    const timer = setInterval(() => {
      setWatermarkPos({
        x: 6 + Math.random() * 60,
        y: 8 + Math.random() * 74,
      })
    }, WATERMARK_MOVE_MS)
    return () => clearInterval(timer)
  }, [item.locked, modoIntro])

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

  // Qué dice la marca. En el contenido pago identifica a quien mira (es el
  // disuasivo). En la intro no hay nada que disuadir —el video es público a
  // propósito—, así que firma: si alguien la comparte, la dirección viaja con
  // el video. Por eso también se ve un poco más, en vez de esconderse.
  const marca = modoIntro
    ? "comunidadalma.org.ar"
    : `${userName ? `${userName} · ` : ""}${userEmail ?? ""} · ${stamp}`

  return (
    <div className="relative aspect-video w-full select-none overflow-hidden rounded-lg bg-black">
      <div ref={containerRef} className="h-full w-full" />

      {/*
        Marca de agua. pointer-events-none es obligatorio: sin eso taparía
        los controles del player y el video sería inusable.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className={`absolute whitespace-nowrap font-mono text-[11px] transition-all duration-1000 sm:text-xs ${
            modoIntro ? "text-white/40" : "text-white/25"
          }`}
          style={{ left: `${watermarkPos.x}%`, top: `${watermarkPos.y}%` }}
        >
          {marca}
        </span>
      </div>
    </div>
  )
}
