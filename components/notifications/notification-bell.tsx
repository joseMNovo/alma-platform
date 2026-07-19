"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, BellOff, Megaphone, CalendarClock, CalendarPlus, Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AppNotification } from "@/lib/data-manager"

const POLL_MS = 60_000

// Ícono + color por tipo de notificación.
const KIND_STYLES: Record<string, { Icon: typeof Bell; bg: string; fg: string }> = {
  announcement: { Icon: Megaphone, bg: "bg-[#4dd0e1]/10", fg: "text-[#4dd0e1]" },
  calendar_reminder: { Icon: CalendarClock, bg: "bg-[#4dd0e1]/10", fg: "text-[#4dd0e1]" },
  calendar_new: { Icon: CalendarPlus, bg: "bg-[#4dd0e1]/10", fg: "text-[#4dd0e1]" },
  system: { Icon: Info, bg: "bg-gray-100", fg: "text-gray-400" },
}

function timeAgo(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - d)
  const min = Math.floor(diff / 60000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const days = Math.floor(h / 24)
  return `hace ${days} d`
}

/**
 * Campanita del header. Consulta el conteo de no leídas cada 60s (pausado
 * cuando la pestaña no está visible) y refresca al instante si el Service
 * Worker avisa que llegó un push. Al abrir el panel, marca todo como leído.
 */
export default function NotificationBell() {
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setUnread(data.unread ?? 0)
    } catch {
      /* silencioso: la campanita no debe romper nada */
    }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (!res.ok) return
      setItems(await res.json())
    } catch {
      /* silencioso */
    }
  }, [])

  // Polling con pausa por visibilidad.
  useEffect(() => {
    fetchCount()

    const start = () => {
      if (timerRef.current) return
      timerRef.current = setInterval(fetchCount, POLL_MS)
    }
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        fetchCount()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener("visibilitychange", onVisibility)

    // Refresco instantáneo cuando el SW avisa que llegó un push.
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "alma-push") fetchCount()
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage)

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
      navigator.serviceWorker?.removeEventListener("message", onSwMessage)
    }
  }, [fetchCount])

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      await fetchList()
      // Al abrir, marcamos todo como leído y bajamos el badge.
      if (unread > 0) {
        setUnread(0)
        try {
          await fetch("/api/notifications/mark-read", { method: "POST" })
        } catch {
          /* silencioso */
        }
      }
    }
  }

  function handleClick(n: AppNotification) {
    setOpen(false)
    if (n.url) router.push(n.url)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-600 hover:text-[#4dd0e1] hover:bg-gray-100 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0 overflow-hidden rounded-xl shadow-md">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Bell className="w-4 h-4 text-[#4dd0e1]" />
          <p className="font-semibold text-sm text-gray-700">Notificaciones</p>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center text-center">
              <BellOff className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No tenés notificaciones</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((n) => {
                const style = KIND_STYLES[n.kind] ?? KIND_STYLES.system
                const { Icon } = style
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`relative w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        n.is_read ? "" : "bg-[#4dd0e1]/[0.07]"
                      }`}
                    >
                      {/* Barra de acento para no leídas */}
                      {!n.is_read && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#4dd0e1]" />}
                      {/* Ícono por tipo */}
                      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${style.bg}`}>
                        <Icon className={`w-4 h-4 ${style.fg}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm truncate ${n.is_read ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>
                            {n.title}
                          </p>
                          {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#4dd0e1] shrink-0" />}
                        </div>
                        {n.body && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
