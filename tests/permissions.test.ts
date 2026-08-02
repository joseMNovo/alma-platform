import { describe, it, expect } from "vitest"
import { can, canDeleteCalendarInstance, type Action } from "@/lib/permissions"

/**
 * Tests de control de acceso.
 *
 * `can()` es la puerta de entrada de TODO el sistema: la usan la UI (para
 * mostrar u ocultar botones) y las API routes (para permitir o negar). Si acá se
 * cuela un error, se cuela en los dos lados a la vez.
 *
 * La tabla de abajo es la fuente de verdad: dice explícitamente qué puede hacer
 * cada rol. Si mañana alguien cambia permissions.ts sin querer, este test lo
 * agarra con el nombre exacto de la acción que se rompió.
 */

const admin = { id: 1, role: "admin" }
const voluntario = { id: 2, role: "voluntario" }
const participante = { id: 3, role: "participante" }

/** Acciones que puede hacer un voluntario (el admin puede todas). */
const PUEDE_VOLUNTARIO: Action[] = [
  "calendar:create",
  "calendar:edit",
  "grupos:edit",
  "talleres:edit",
  "actividades:create",
  "actividades:edit",
  "historiales:view",
  "historiales:create",
  "historiales:edit",
  "historiales:delete",
  "ideas:create",
  "ideas:edit",
  "ideas:comment",
  "personas:view",
  "personas:create",
  "personas:edit",
  "capacitaciones:view",
  "files:upload",
  "files:edit",
]

/** Acciones reservadas al admin: un voluntario NO puede hacerlas. */
const SOLO_ADMIN: Action[] = [
  "calendar:delete",
  "calendar:generate",
  "grupos:create",
  "grupos:delete",
  "talleres:create",
  "talleres:delete",
  "actividades:delete",
  "ideas:delete",
  "personas:delete",
  "capacitaciones:manage",
  "capacitaciones:report",
  "accesos:view",
  "accesos:manage",
  "files:delete",
  "tracking:view",
]

/** Lo único que puede tocar un participante. */
const PUEDE_PARTICIPANTE: Action[] = ["participante:edit_profile", "capacitaciones:view"]

const TODAS: Action[] = [...PUEDE_VOLUNTARIO, ...SOLO_ADMIN, "participante:edit_profile"]

describe("can() — sin sesión", () => {
  it.each(TODAS)("un usuario no autenticado no puede %s", (accion) => {
    expect(can(null, accion)).toBe(false)
  })
})

describe("can() — admin", () => {
  it.each([...PUEDE_VOLUNTARIO, ...SOLO_ADMIN])("el admin puede %s", (accion) => {
    expect(can(admin, accion)).toBe(true)
  })

  it("el admin NO edita el perfil de participante (no es su rol)", () => {
    expect(can(admin, "participante:edit_profile")).toBe(false)
  })
})

describe("can() — voluntario", () => {
  it.each(PUEDE_VOLUNTARIO)("el voluntario puede %s", (accion) => {
    expect(can(voluntario, accion)).toBe(true)
  })

  it.each(SOLO_ADMIN)("el voluntario NO puede %s", (accion) => {
    expect(can(voluntario, accion)).toBe(false)
  })
})

describe("can() — participante", () => {
  it.each(PUEDE_PARTICIPANTE)("el participante puede %s", (accion) => {
    expect(can(participante, accion)).toBe(true)
  })

  const prohibidas = TODAS.filter((a) => !PUEDE_PARTICIPANTE.includes(a))
  it.each(prohibidas)("el participante NO puede %s", (accion) => {
    expect(can(participante, accion)).toBe(false)
  })

  it("es de solo lectura: no puede crear, editar ni borrar nada del sistema", () => {
    const escrituras = TODAS.filter(
      (a) => /:(create|edit|delete|manage|generate)$/.test(a) && a !== "participante:edit_profile",
    )
    for (const accion of escrituras) {
      expect(can(participante, accion), `participante pudo ${accion}`).toBe(false)
    }
  })
})

describe("can() — casos raros", () => {
  it("un rol desconocido no puede nada", () => {
    for (const accion of TODAS) {
      expect(can({ id: 9, role: "inventado" }, accion)).toBe(false)
    }
  })

  it("una acción que no existe devuelve false", () => {
    expect(can(admin, "modulo:inexistente" as Action)).toBe(false)
  })
})

describe("canDeleteCalendarInstance()", () => {
  it("el admin borra cualquier evento", () => {
    expect(canDeleteCalendarInstance(admin, { created_by_volunteer_id: 999 })).toBe(true)
  })

  it("el voluntario borra los eventos que creó él", () => {
    expect(canDeleteCalendarInstance(voluntario, { created_by_volunteer_id: voluntario.id })).toBe(true)
  })

  it("el voluntario NO borra eventos de otro", () => {
    expect(canDeleteCalendarInstance(voluntario, { created_by_volunteer_id: 999 })).toBe(false)
  })

  it("los eventos viejos sin autor solo los borra el admin", () => {
    expect(canDeleteCalendarInstance(voluntario, { created_by_volunteer_id: null })).toBe(false)
    expect(canDeleteCalendarInstance(voluntario, {})).toBe(false)
    expect(canDeleteCalendarInstance(admin, { created_by_volunteer_id: null })).toBe(true)
  })

  it("sin usuario o sin evento, no se borra nada", () => {
    expect(canDeleteCalendarInstance(null, { created_by_volunteer_id: 1 })).toBe(false)
    expect(canDeleteCalendarInstance(admin, null)).toBe(false)
  })

  it("el participante no borra nada", () => {
    expect(canDeleteCalendarInstance(participante, { created_by_volunteer_id: participante.id })).toBe(false)
  })
})
