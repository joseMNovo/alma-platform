export type Action =
  | "calendar:create"
  | "calendar:edit"
  | "calendar:delete"
  | "calendar:generate"
  | "grupos:create"
  | "grupos:edit"
  | "grupos:delete"
  | "talleres:create"
  | "talleres:edit"
  | "talleres:delete"
  | "actividades:create"
  | "actividades:edit"
  | "actividades:delete"
  | "participante:edit_profile"

/**
 * Returns true if the given user is allowed to perform the given action.
 * Pass null for unauthenticated users — always returns false.
 *
 * Roles:
 *   "admin"        — full access
 *   "voluntario"   — can edit calendar/grupos/talleres; cannot create/delete grupos/talleres
 *   "participante" — read-only on all modules; can only edit their own profile
 */
export function can(user: { role: string } | null, action: Action): boolean {
  if (!user) return false

  const isAdmin = user.role === "admin"
  const isParticipant = user.role === "participante"

  // Participantes: solo pueden editar su propio perfil
  if (isParticipant) {
    return action === "participante:edit_profile"
  }

  switch (action) {
    // Calendar: authenticated non-participant users can create/edit; only admin can delete or bulk-generate
    case "calendar:create":
    case "calendar:edit":
      return true

    case "calendar:delete":
    case "calendar:generate":
      return isAdmin

    // Grupos: only admin can create/delete; all authenticated non-participant users can edit
    case "grupos:create":
    case "grupos:delete":
      return isAdmin
    case "grupos:edit":
      return true

    // Talleres: only admin can create/delete; all authenticated non-participant users can edit
    case "talleres:create":
    case "talleres:delete":
      return isAdmin
    case "talleres:edit":
      return true

    // Actividades: admin only for all mutations
    case "actividades:create":
    case "actividades:edit":
    case "actividades:delete":
      return isAdmin

    // Profile edit: only for participants (handled above)
    case "participante:edit_profile":
      return false

    default:
      return false
  }
}
