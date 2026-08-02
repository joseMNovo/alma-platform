import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Test de una API route. Sirve de MOLDE para las demás.
 *
 * La receta es siempre la misma:
 *   1. vi.mock de lib/data-manager   → el backend nunca se llama de verdad
 *   2. vi.mock de lib/serverAuth     → se simula quién está logueado
 *   3. lib/permissions va SIN mockear → se prueba el permiso real
 *
 * El punto 3 es a propósito: mockear los permisos haría que el test pase aunque
 * el control de acceso esté roto, que es justo lo que queremos detectar.
 */

vi.mock("@/lib/data-manager", () => ({
  notifyEventReminder: vi.fn(),
  logActivityEvent: vi.fn(() => Promise.resolve()),
  toUserType: vi.fn(() => "voluntario"),
}))

vi.mock("@/lib/serverAuth", () => ({
  getSessionUser: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

import { POST } from "@/app/api/calendarios/notificar/route"
import { notifyEventReminder } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"

const pedido = (body: unknown) =>
  new Request("http://localhost/api/calendarios/notificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/calendarios/notificar", () => {
  it("sin sesión responde 401 y no llama al backend", async () => {
    vi.mocked(getSessionUser).mockReturnValue(null as any)

    const res = await POST(pedido({ event_id: 1 }))

    expect(res.status).toBe(401)
    expect(notifyEventReminder).not.toHaveBeenCalled()
  })

  it("un participante no puede disparar recordatorios", async () => {
    vi.mocked(getSessionUser).mockReturnValue({ id: 5, role: "participante" } as any)

    const res = await POST(pedido({ event_id: 1 }))

    expect(res.status).toBe(403)
    expect(notifyEventReminder).not.toHaveBeenCalled()
  })

  it("un voluntario sí puede", async () => {
    vi.mocked(getSessionUser).mockReturnValue({ id: 2, role: "voluntario" } as any)
    vi.mocked(notifyEventReminder).mockResolvedValue({ recipients: 4 })

    const res = await POST(pedido({ event_id: 113 }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ recipients: 4 })
    expect(notifyEventReminder).toHaveBeenCalledWith(113)
  })

  it("sin event_id responde 400", async () => {
    vi.mocked(getSessionUser).mockReturnValue({ id: 2, role: "voluntario" } as any)

    const res = await POST(pedido({}))

    expect(res.status).toBe(400)
    expect(notifyEventReminder).not.toHaveBeenCalled()
  })

  it("si el evento no existe responde 404", async () => {
    vi.mocked(getSessionUser).mockReturnValue({ id: 2, role: "voluntario" } as any)
    vi.mocked(notifyEventReminder).mockRejectedValue(new Error("Request failed: 404"))

    const res = await POST(pedido({ event_id: 999 }))

    expect(res.status).toBe(404)
  })

  it("un error del backend no se filtra al cliente", async () => {
    vi.mocked(getSessionUser).mockReturnValue({ id: 2, role: "voluntario" } as any)
    vi.mocked(notifyEventReminder).mockRejectedValue(new Error("connection reset por 10.0.0.5"))

    const res = await POST(pedido({ event_id: 1 }))

    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.5")
  })
})
