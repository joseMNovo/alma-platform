import { describe, it, expect, vi, afterEach } from "vitest"
import { edadDesde, edadTexto, fechaCorta } from "@/lib/edad"

const hoyEs = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}
afterEach(() => vi.useRealTimers())

describe("edadDesde", () => {
  it("cuenta los años cumplidos", () => {
    hoyEs("2026-11-04T12:00:00")
    expect(edadDesde("1985-07-28")).toBe(41)
  })

  it("todavía no suma si el cumpleaños no llegó", () => {
    hoyEs("2026-11-04T12:00:00")
    expect(edadDesde("1985-12-25")).toBe(40)
  })

  it("suma el mismo día del cumpleaños", () => {
    hoyEs("2026-11-04T00:30:00")
    expect(edadDesde("1985-11-04")).toBe(41)
  })

  it("no se corre un día por la zona horaria", () => {
    // new Date("1985-07-28") es UTC: en Argentina cae el 27 a las 21:00.
    hoyEs("2026-07-28T10:00:00")
    expect(edadDesde("1985-07-28")).toBe(41)
  })

  it("devuelve null sin fecha", () => {
    expect(edadDesde(null)).toBeNull()
    expect(edadDesde("")).toBeNull()
    expect(edadDesde(undefined)).toBeNull()
  })

  it("devuelve null con fechas que no son fechas", () => {
    expect(edadDesde("1985")).toBeNull()
    expect(edadDesde("ayer")).toBeNull()
    expect(edadDesde("1985-02-31")).toBeNull()
  })

  it("devuelve null con una fecha futura", () => {
    hoyEs("2026-11-04T12:00:00")
    expect(edadDesde("2030-01-01")).toBeNull()
  })

  it("acepta el ISO completo que manda la API", () => {
    hoyEs("2026-11-04T12:00:00")
    expect(edadDesde("1985-07-28T00:00:00.000Z")).toBe(41)
  })
})

describe("edadTexto", () => {
  it("usa el singular para el primer año", () => {
    hoyEs("2026-11-04T12:00:00")
    expect(edadTexto("2025-01-01")).toBe("1 año")
    expect(edadTexto("1985-07-28")).toBe("41 años")
    expect(edadTexto(null)).toBeNull()
  })
})

describe("fechaCorta", () => {
  it("escribe la fecha como se lee acá", () => {
    expect(fechaCorta("1985-07-28")).toBe("28/07/1985")
    expect(fechaCorta("")).toBeNull()
  })
})
