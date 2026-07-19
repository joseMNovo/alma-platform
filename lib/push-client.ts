/**
 * push-client.ts — Registro del Service Worker y gestión de la suscripción
 * Web Push del lado del navegador.
 *
 * Todo acá es defensivo: si el navegador no soporta push (o es iOS sin la PWA
 * instalada), las funciones devuelven un estado claro sin romper nada.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

export type PushSupport =
  | "ready" // soportado y listo para pedir permiso
  | "unsupported" // el navegador no soporta push
  | "needs-install" // iOS: hay que instalar la PWA primero
  | "no-key" // falta configurar la clave VAPID pública

/** Detecta si el entorno puede usar Web Push. */
export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported"
  if (!VAPID_PUBLIC_KEY) return "no-key"

  const hasSW = "serviceWorker" in navigator
  const hasPush = "PushManager" in window
  const hasNotification = "Notification" in window
  if (!hasSW || !hasPush || !hasNotification) {
    // iOS soporta push solo con la PWA instalada (standalone). Distinguimos ese caso.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    if (isIOS && !isStandalone) return "needs-install"
    return "unsupported"
  }
  return "ready"
}

/** Registra el Service Worker (idempotente). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js")
  } catch {
    return null
  }
}

/** ¿Este navegador ya está suscrito? */
export async function isSubscribed(): Promise<boolean> {
  if (getPushSupport() !== "ready") return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * Pide permiso, crea la suscripción y la guarda en el backend (via BFF).
 * Devuelve true si quedó suscrito. La identidad del usuario la resuelve el
 * BFF desde la cookie de sesión, no hace falta pasarla acá.
 */
export async function enablePush(): Promise<boolean> {
  if (getPushSupport() !== "ready") return false

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker())
  if (!reg) return false

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    } catch (e) {
      // Algunos navegadores (ej. Brave con el push de Google desactivado)
      // rechazan la suscripción. Devolvemos false para mostrar el aviso.
      console.warn("pushManager.subscribe falló:", e)
      return false
    }
  }

  const json = sub.toJSON()
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      user_agent: navigator.userAgent.slice(0, 250),
    }),
  })
  return res.ok
}

/** Cancela la suscripción local y la borra del backend. */
export async function disablePush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (!sub) return true

  const endpoint = sub.endpoint
  try {
    await sub.unsubscribe()
  } catch {
    /* seguimos igual: borramos del backend de todos modos */
  }
  const res = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  })
  return res.ok
}
