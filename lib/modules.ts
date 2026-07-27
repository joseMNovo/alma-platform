import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Package,
  CheckSquare,
  Users,
  Database,
  Calendar,
  Activity,
  Lightbulb,
  CreditCard,
  ClipboardCheck,
  BarChart3,
  Megaphone,
  UserCircle,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Heart,
} from "lucide-react"

export type Role = "admin" | "voluntario" | "participante"

export interface ModuleDef {
  /** Clave estable. Para los módulos HOJA es lo que se guarda en
   *  person_access_grants.module_key — no renombrar a la ligera. */
  key: string
  label: string
  route: string
  icon: LucideIcon
  /** Roles que lo ven SIN necesitar habilitación */
  defaultRoles: Role[]
  /** ¿Aparece en el panel de habilitaciones? Solo módulos hoja. */
  grantable: boolean
  /** ¿Además se habilita ítem por ítem (ej: una capacitación puntual)? */
  itemGrants?: boolean
  /** Sub-módulos agrupados bajo una misma pestaña */
  children?: ModuleDef[]
  /** Fuera del nav sin borrar el módulo */
  hidden?: boolean
  /** Va en el menú del avatar en vez de la barra de módulos */
  inUserMenu?: boolean
}

/**
 * Registro de módulos — fuente única de verdad del nav.
 *
 * Por qué vive en código y no en una tabla: un módulo ES una ruta + un
 * componente. Una fila en la base no puede crear una pestaña. Lo que sí vive
 * en la base son las HABILITACIONES (person_access_grants), o sea quién ve
 * qué más allá de su rol.
 *
 * ESTRUCTURA: 5 grupos en la barra + 3 ítems en el menú del avatar. Los
 * GRUPOS son presentación pura y NUNCA son `grantable`: las habilitaciones
 * apuntan siempre al módulo hoja (`capacitaciones`, `personas`…). Si un grupo
 * fuera grantable, invalidaría las filas ya guardadas en la base.
 *
 * Para agregar un módulo: una entrada acá + una en MODULE_CONTENT (dashboard).
 */
export const MODULES: ModuleDef[] = [
  {
    key: "agenda",
    label: "Agenda",
    route: "/calendarios",
    icon: CalendarDays,
    defaultRoles: ["admin", "voluntario", "participante"],
    grantable: false,
    children: [
      { key: "calendarios", label: "Calendarios", route: "/calendarios", icon: CalendarDays, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
    ],
  },
  {
    key: "espacios",
    label: "Espacios",
    route: "/talleres",
    icon: LayoutGrid,
    defaultRoles: ["admin", "voluntario", "participante"],
    grantable: false,
    children: [
      { key: "talleres", label: "Talleres", route: "/talleres", icon: Calendar, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
      { key: "grupos", label: "Grupos", route: "/grupos", icon: Users, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
      { key: "actividades", label: "Actividades", route: "/actividades", icon: Activity, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
      // Inscripciones: solo staff. El participante se anota desde el Calendario.
      { key: "inscripciones", label: "Inscripciones", route: "/inscripciones", icon: ClipboardCheck, defaultRoles: ["admin", "voluntario"], grantable: false },
    ],
  },
  {
    key: "comunidad",
    label: "Personas",
    route: "/personas",
    icon: Users,
    defaultRoles: ["admin", "voluntario"],
    grantable: false,
    children: [
      { key: "personas", label: "Base de datos", route: "/personas", icon: Database, defaultRoles: ["admin", "voluntario"], grantable: false },
      { key: "voluntarios", label: "Voluntarios", route: "/voluntarios", icon: Heart, defaultRoles: ["admin", "voluntario"], grantable: false },
      { key: "participantes", label: "Participantes", route: "/participantes", icon: UserCircle, defaultRoles: ["admin", "voluntario"], grantable: false },
      { key: "aprobaciones", label: "Aprobaciones", route: "/aprobaciones", icon: ClipboardCheck, defaultRoles: ["admin"], grantable: false },
    ],
  },
  {
    key: "formacion",
    label: "Formación",
    route: "/capacitaciones",
    icon: GraduationCap,
    // Staff entra siempre. El participante llega por habilitación sobre el
    // hijo `capacitaciones`: es el grupo que se cobra.
    defaultRoles: ["admin", "voluntario"],
    grantable: false,
    children: [
      { key: "capacitaciones", label: "Capacitaciones", route: "/capacitaciones", icon: GraduationCap, defaultRoles: ["admin", "voluntario"], grantable: true, itemGrants: true },
      { key: "accesos", label: "Accesos", route: "/accesos", icon: KeyRound, defaultRoles: ["admin"], grantable: false },
    ],
  },
  {
    key: "gestion",
    label: "Gestión",
    route: "/pendientes",
    icon: ClipboardCheck,
    defaultRoles: ["admin", "voluntario"],
    grantable: false,
    children: [
      { key: "pendientes", label: "Pendientes", route: "/pendientes", icon: CheckSquare, defaultRoles: ["admin", "voluntario"], grantable: false },
      { key: "inventario", label: "Inventario", route: "/inventario", icon: Package, defaultRoles: ["admin", "voluntario"], grantable: false },
      { key: "ideas", label: "Ideas", route: "/ideas", icon: Lightbulb, defaultRoles: ["admin", "voluntario"], grantable: false },
      { key: "pagos", label: "Pagos", route: "/pagos", icon: CreditCard, defaultRoles: ["admin", "voluntario"], grantable: false, hidden: true },
    ],
  },

  // Mi perfil: pestaña propia y visible para todos. Es donde cada uno
  // completa/edita sus datos (nombre, contacto, etc.).
  { key: "mis-datos", label: "Mi perfil", route: "/mis-datos", icon: UserCircle, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
  // Herramientas de sistema (admin): pestañas visibles, no menús ocultos.
  { key: "anuncios", label: "Anuncios", route: "/anuncios", icon: Megaphone, defaultRoles: ["admin"], grantable: false },
  { key: "actividad", label: "Actividad", route: "/actividad", icon: BarChart3, defaultRoles: ["admin"], grantable: false },
]

export const MODULES_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.flatMap((m) => [[m.key, m], ...(m.children ?? []).map((c) => [c.key, c] as const)]),
)

/** Todos los módulos aplanados (grupos + hojas). */
export const ALL_MODULES: ModuleDef[] = MODULES.flatMap((m) => [m, ...(m.children ?? [])])

/** Módulos habilitables por persona. Son siempre HOJAS: los grupos son
 *  presentación y no se guardan nunca en person_access_grants.module_key. */
export const GRANTABLE_MODULES = ALL_MODULES.filter((m) => m.grantable)

/** Los que van en el menú del avatar en vez de la barra de módulos. */
export const USER_MENU_MODULES = MODULES.filter((m) => m.inUserMenu)

export function getModule(key: string): ModuleDef | undefined {
  return MODULES_BY_KEY[key]
}

/**
 * Qué grupo y qué sub-módulo corresponden a una URL.
 *
 * Se ordena por ruta más larga primero para que "/actividades" no matchee con
 * "/actividad": son dos módulos distintos y el prefijo de uno es el del otro.
 */
export function resolveRoute(pathname: string): { group: ModuleDef; child?: ModuleDef } | undefined {
  const matches = (route: string) => pathname === route || pathname.startsWith(route + "/")

  const candidates: { group: ModuleDef; child?: ModuleDef }[] = []
  for (const group of MODULES) {
    if (group.children?.length) {
      for (const child of group.children) candidates.push({ group, child })
    } else {
      candidates.push({ group })
    }
  }

  candidates.sort(
    (a, b) => (b.child?.route ?? b.group.route).length - (a.child?.route ?? a.group.route).length,
  )

  return candidates.find((c) => matches(c.child?.route ?? c.group.route))
}
