/*
 * Service Worker de ALMA — SOLO Web Push.
 *
 * IMPORTANTE: este SW NO intercepta 'fetch' ni cachea nada. No cambia en
 * absoluto cómo carga ni navega la app. Solo escucha dos eventos:
 *   • 'push'            → muestra la notificación
 *   • 'notificationclick' → abre/enfoca la app en la ruta indicada
 *
 * Por eso es seguro registrarlo en una app en producción: su superficie de
 * efecto es únicamente las notificaciones.
 */

self.addEventListener("install", () => {
  // Activar de inmediato la versión nueva del SW.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  // Tomar control de las pestañas abiertas sin necesidad de recargar.
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: "ALMA", body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "ALMA"
  const options = {
    body: data.body || "",
    icon: "/images/flor.png",
    badge: "/images/flor.png",
    // La URL a abrir viaja en 'data' para usarla en el click.
    data: { url: data.url || "/" },
    // Reemplaza notificaciones previas del mismo "tag" en vez de apilar.
    tag: data.tag || "alma-notification",
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))

  // Avisar a las pestañas abiertas para que refresquen la campanita al instante.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "alma-push", payload: data }))
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Si ya hay una pestaña de la app abierta, la enfocamos y navegamos.
      for (const client of clients) {
        if ("focus" in client) {
          client.focus()
          if ("navigate" in client && targetUrl) client.navigate(targetUrl)
          return
        }
      }
      // Si no hay ninguna, abrimos una nueva.
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
