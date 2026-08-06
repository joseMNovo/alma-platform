/**
 * api-client.ts — Cliente HTTP centralizado para alma-platform-backend
 *
 * Todas las llamadas a la API FastAPI pasan por aquí.
 * La URL base se configura desde BACKEND_URL en .env.local
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8001'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': INTERNAL_API_KEY,
      ...options?.headers,
    },
    // No cache en server components de Next.js
    cache: 'no-store',
  })

  if (res.status === 204) return null as T

  if (!res.ok) {
    const rawBody = await res.text()
    let detail = rawBody

    if (rawBody) {
      try {
        const json = JSON.parse(rawBody)
        const d = json?.detail ?? json
        // El detail de FastAPI en un 422 es un array de objetos; lo serializamos para que sea legible
        detail = typeof d === 'string' ? d : JSON.stringify(d)
      } catch {
        // Si no es JSON, dejamos el texto crudo para diagnóstico
      }
    }

    throw new Error(`API ${options?.method ?? 'GET'} ${path} → ${res.status}: ${detail}`)
  }

  return res.json() as Promise<T>
}

/**
 * Variante que devuelve la respuesta cruda, sin parsear JSON.
 * La usa el proxy de archivos (/api/files/[guid]/raw) para pasar los bytes
 * de una imagen tal cual, con su Content-Type y sus headers de cache.
 */
async function requestRaw(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-API-Key': INTERNAL_API_KEY,
      ...options?.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`API ${options?.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`)
  }

  return res
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  getRaw: (path: string) => requestRaw(path),

  /** POST que devuelve la respuesta cruda. Lo usa la generación de PDFs. */
  postRaw: (path: string, body?: unknown) =>
    requestRaw(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: <T = null>(path: string) => request<T>(path, { method: 'DELETE' }),
}
