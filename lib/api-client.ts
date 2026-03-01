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
        detail = json?.detail ?? JSON.stringify(json)
      } catch {
        // Si no es JSON, dejamos el texto crudo para diagnóstico
      }
    }

    throw new Error(`API ${options?.method ?? 'GET'} ${path} → ${res.status}: ${detail}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: <T = null>(path: string) => request<T>(path, { method: 'DELETE' }),
}
