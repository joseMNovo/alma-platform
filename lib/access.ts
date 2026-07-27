import { MODULES, MODULES_BY_KEY, type ModuleDef, type Role } from "@/lib/modules"

/**
 * lib/access.ts — Habilitaciones (capa 2 del control de acceso)
 *
 *   acceso efectivo = rol (lib/permissions.ts, reglas de la organización)
 *                     OR habilitación (datos, person_access_grants)
 *
 * Las habilitaciones solo SUMAN. Nunca restan: si pudieran quitar permisos,
 * cada problema de acceso sería una investigación entre dos capas que se
 * contradicen.
 *
 * IMPORTANTE: esto se usa para PINTAR la UI. La verificación real la hace
 * el servidor en cada API route — el cliente nunca es la fuente de verdad.
 */

export interface Grant {
  id?: number
  person_id?: number
  module_key: string
  /** 0 = el módulo entero; > 0 = un ítem puntual de ese módulo */
  resource_id: number
  is_active?: boolean
  expires_at?: string | null
  revoked_at?: string | null
  is_live?: boolean
  resource_title?: string | null
}

interface AccessUser {
  role: string
}

/** ¿La habilitación está vigente? Activa, no revocada y sin vencer. */
export function isLive(grant: Grant): boolean {
  if (grant.is_live !== undefined) return grant.is_live
  if (grant.is_active === false) return false
  if (grant.revoked_at) return false
  if (!grant.expires_at) return true
  return new Date(grant.expires_at) > new Date()
}

/**
 * ¿Ve la pestaña del módulo?
 *
 * Alcanza con CUALQUIER habilitación vigente de ese module_key: tener la
 * capacitación 7 implica ver el módulo. Sin esta regla aparece el clásico
 * "le habilité la capacitación pero no le sale la pestaña".
 */
export function canSeeModule(user: AccessUser | null, moduleKey: string, grants: Grant[] = []): boolean {
  if (!user) return false

  const mod = MODULES_BY_KEY[moduleKey]
  if (!mod) return false

  // Un GRUPO se ve si se ve alguno de sus hijos. Así el participante que tiene
  // una capacitación habilitada ve el grupo "Formación" aunque el grupo en sí
  // no le corresponda por rol. Los grupos nunca se habilitan directamente:
  // las habilitaciones se guardan siempre contra el módulo hoja.
  if (mod.children?.length) {
    return (
      mod.defaultRoles.includes(user.role as Role) ||
      mod.children.some((child) => canSeeModule(user, child.key, grants))
    )
  }

  if (mod.defaultRoles.includes(user.role as Role)) return true
  if (!mod.grantable) return false

  return grants.some((g) => g.module_key === moduleKey && isLive(g))
}

/** Sub-módulos visibles dentro de un grupo, en orden. */
export function visibleChildren(user: AccessUser | null, group: ModuleDef, grants: Grant[] = []): ModuleDef[] {
  if (!user || !group.children?.length) return []
  return group.children.filter((c) => !c.hidden && canSeeModule(user, c.key, grants))
}

/**
 * ¿Puede abrir ESTE contenido puntual (una capacitación)?
 *
 * Staff siempre: por decisión del proyecto, voluntarios y admin ven las
 * capacitaciones sin pagar.
 */
export function canSeeItem(
  user: AccessUser | null,
  moduleKey: string,
  resourceId: number,
  grants: Grant[] = [],
  opts?: { accessMode?: string },
): boolean {
  if (!user) return false
  if (user.role === "admin" || user.role === "voluntario") return true
  if (opts?.accessMode === "abierta") return canSeeModule(user, moduleKey, grants)

  return grants.some((g) => g.module_key === moduleKey && g.resource_id === resourceId && isLive(g))
}

/**
 * Grupos visibles en la barra de módulos, en orden.
 * Excluye los ocultos y los que viven en el menú del avatar.
 */
export function visibleModules(user: AccessUser | null, grants: Grant[] = []): ModuleDef[] {
  if (!user) return []
  return MODULES.filter((m) => !m.hidden && !m.inUserMenu && canSeeModule(user, m.key, grants))
}

/** Ítems del menú del avatar (Mi cuenta, Anuncios, Actividad). */
export function userMenuModules(user: AccessUser | null, grants: Grant[] = []): ModuleDef[] {
  if (!user) return []
  return MODULES.filter((m) => m.inUserMenu && canSeeModule(user, m.key, grants))
}

/** Fecha de vencimiento de un ítem habilitado, si la tiene. */
export function grantExpiry(moduleKey: string, resourceId: number, grants: Grant[] = []): string | null {
  const grant = grants.find(
    (g) => g.module_key === moduleKey && g.resource_id === resourceId && isLive(g),
  )
  return grant?.expires_at ?? null
}
