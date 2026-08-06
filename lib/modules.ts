import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Package,
  CheckSquare,
  Users,
  Database,
  Calendar,
  Sparkles,
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
  Award,
  ClipboardList,
  Receipt,
  ScrollText,
  ShieldAlert,
  FileSignature,
  History,
  Send,
  UserCheck,
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
 * ESTRUCTURA: grupos en la barra, cada uno con sus sub-pestañas. Los GRUPOS
 * son presentación pura y NUNCA son `grantable`: las habilitaciones apuntan
 * siempre al módulo hoja (`capacitaciones`, `personas`…). Si un grupo fuera
 * grantable, invalidaría las filas ya guardadas en la base.
 *
 * Dos grupos NO pueden llamarse igual: el nombre es lo único que distingue una
 * pestaña de otra.
 *
 * Los ÍCONOS tampoco se repiten entre pestañas que se ven juntas. Un ícono
 * repetido en la misma barra hace que las dos se lean como la misma cosa.
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
      { key: "actividades", label: "Actividades", route: "/actividades", icon: Sparkles, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
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
    key: "contenido",
    label: "Contenido",
    route: "/capacitaciones",
    icon: GraduationCap,
    // El participante entra: la vidriera es justamente para que vea lo que
    // todavía no compró. El contenido lo sigue gateando el backend.
    defaultRoles: ["admin", "voluntario", "participante"],
    grantable: false,
    // Todo lo de capacitaciones vive acá: el contenido, quién puede verlo, la
    // plata y los certificados. Antes estaba repartido en tres grupos, y uno de
    // ellos se llamaba "Personas" igual que el grupo de la base de datos: dos
    // pestañas con el mismo nombre en la misma barra.
    //
    // El participante ve una sola de estas (Capacitaciones) y por eso no le
    // aparece la barra de sub-pestañas: el resto es admin.
    children: [
      { key: "capacitaciones", label: "Capacitaciones", route: "/capacitaciones", icon: GraduationCap, defaultRoles: ["admin", "voluntario", "participante"], grantable: true, itemGrants: true },
      {
        key: "accesos",
        label: "Accesos",
        route: "/accesos",
        icon: KeyRound,
        defaultRoles: ["admin"],
        grantable: false,
        // Las cuatro son vistas del mismo tablero: quién puede ver, quién
        // pagó, quién miró y a quién hay que mirarle el uso.
        children: [
          { key: "habilitaciones", label: "Habilitaciones", route: "/accesos", icon: UserCheck, defaultRoles: ["admin"], grantable: false },
          { key: "pagos-capacitaciones", label: "Pagos", route: "/pagos-capacitaciones", icon: Receipt, defaultRoles: ["admin"], grantable: false },
          { key: "auditoria", label: "Auditoría", route: "/auditoria", icon: ScrollText, defaultRoles: ["admin"], grantable: false },
          { key: "alertas", label: "Alertas", route: "/alertas", icon: ShieldAlert, defaultRoles: ["admin"], grantable: false },
        ],
      },
      { key: "encuestas", label: "Evaluaciones", route: "/encuestas", icon: ClipboardList, defaultRoles: ["admin"], grantable: false },
      {
        key: "certificacion",
        label: "Certificados",
        route: "/certificados",
        icon: Award,
        defaultRoles: ["admin"],
        grantable: false,
        // En su orden natural: se redacta, se emite, queda el historial.
        children: [
          { key: "certificados", label: "Redacción", route: "/certificados", icon: FileSignature, defaultRoles: ["admin"], grantable: false },
          { key: "emision", label: "Emisión", route: "/emision", icon: Send, defaultRoles: ["admin"], grantable: false },
          { key: "historial-certificados", label: "Historial", route: "/historial-certificados", icon: History, defaultRoles: ["admin"], grantable: false },
        ],
      },
      { key: "link-pago", label: "Link de pago", route: "/link-de-pago", icon: CreditCard, defaultRoles: ["admin"], grantable: false },
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
    ],
  },

  // Mi perfil: pestaña propia y visible para todos. Es donde cada uno
  // completa/edita sus datos (nombre, contacto, etc.).
  { key: "mis-datos", label: "Mi perfil", route: "/mis-datos", icon: UserCircle, defaultRoles: ["admin", "voluntario", "participante"], grantable: false },
  // Herramientas de sistema (admin): pestañas visibles, no menús ocultos.
  { key: "anuncios", label: "Anuncios", route: "/anuncios", icon: Megaphone, defaultRoles: ["admin"], grantable: false },
  { key: "actividad", label: "Actividad", route: "/actividad", icon: BarChart3, defaultRoles: ["admin"], grantable: false },
]

/** Todos los módulos aplanados, a cualquier profundidad (grupos + hojas). */
export const ALL_MODULES: ModuleDef[] = (function aplanar(lista: ModuleDef[]): ModuleDef[] {
  return lista.flatMap((m) => [m, ...aplanar(m.children ?? [])])
})(MODULES)

export const MODULES_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m]),
)

/** Módulos habilitables por persona. Son siempre HOJAS: los grupos son
 *  presentación y no se guardan nunca en person_access_grants.module_key. */
export const GRANTABLE_MODULES = ALL_MODULES.filter((m) => m.grantable)

/** Los que van en el menú del avatar en vez de la barra de módulos. */
export const USER_MENU_MODULES = MODULES.filter((m) => m.inUserMenu)

export function getModule(key: string): ModuleDef | undefined {
  return MODULES_BY_KEY[key]
}

/**
 * Qué grupo, qué sub-módulo y qué sub-sub-módulo corresponden a una URL.
 *
 * Se ordena por ruta más larga primero para que "/actividades" no matchee con
 * "/actividad": son dos módulos distintos y el prefijo de uno es el del otro.
 *
 * A igual ruta gana el candidato MÁS PROFUNDO: "Accesos" y su primera
 * sub-pestaña "Habilitaciones" comparten /accesos, y lo que hay que marcar es
 * la sub-pestaña (el padre queda activo por arrastre).
 */
export function resolveRoute(
  pathname: string,
): { group: ModuleDef; child?: ModuleDef; grandchild?: ModuleDef } | undefined {
  const matches = (route: string) => pathname === route || pathname.startsWith(route + "/")

  const candidates: { group: ModuleDef; child?: ModuleDef; grandchild?: ModuleDef }[] = []
  for (const group of MODULES) {
    if (!group.children?.length) {
      candidates.push({ group })
      continue
    }
    for (const child of group.children) {
      if (child.children?.length) {
        for (const grandchild of child.children) candidates.push({ group, child, grandchild })
      } else {
        candidates.push({ group, child })
      }
    }
  }

  const rutaDe = (c: (typeof candidates)[number]) =>
    c.grandchild?.route ?? c.child?.route ?? c.group.route
  const profundidad = (c: (typeof candidates)[number]) => (c.grandchild ? 3 : c.child ? 2 : 1)

  candidates.sort(
    (a, b) => rutaDe(b).length - rutaDe(a).length || profundidad(b) - profundidad(a),
  )

  return candidates.find((c) => matches(rutaDe(c)))
}

/**
 * La primera ruta REAL de un módulo: baja hasta la hoja.
 *
 * Tocar un grupo tiene que llevar a algo que se pueda mostrar. Sin esto, entrar
 * a uno cuyo primer hijo es a su vez una sección deja la pantalla en blanco.
 */
export function primeraRutaHoja(mod: ModuleDef): string {
  let actual = mod
  while (actual.children?.length) actual = actual.children[0]
  return actual.route
}
