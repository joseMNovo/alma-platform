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
  TrendingUp,
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
  ShoppingCart,
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
  /**
   * Cómo le dice la gente a esta pantalla cuando no se acuerda del nombre.
   *
   * El buscador (Ctrl K) matchea contra esto además del label. Sin sinónimos,
   * el índice solo le sirve a quien YA sabe cómo se llama cada cosa, que es
   * justamente quien no lo necesita: "cobrar" no encontraba "Link de pago" y
   * "stock" no encontraba "Inventario".
   *
   * Van sin tilde y en minúscula por costumbre, aunque la comparación
   * normaliza las dos puntas.
   */
  sinonimos?: string[]
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
      { key: "calendarios", label: "Calendarios", route: "/calendarios", icon: CalendarDays, defaultRoles: ["admin", "voluntario", "participante"], grantable: false , sinonimos: ["agenda", "eventos", "encuentros", "fechas", "reuniones"] },
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
      { key: "talleres", label: "Talleres", route: "/talleres", icon: Calendar, defaultRoles: ["admin", "voluntario", "participante"], grantable: false , sinonimos: ["cursos", "clases"] },
      { key: "grupos", label: "Grupos", route: "/grupos", icon: Users, defaultRoles: ["admin", "voluntario", "participante"], grantable: false , sinonimos: ["grupo de apoyo", "familiares", "cuidadores"] },
      { key: "actividades", label: "Actividades", route: "/actividades", icon: Sparkles, defaultRoles: ["admin", "voluntario", "participante"], grantable: false , sinonimos: ["eventos", "salidas", "paseos"] },
      // Inscripciones: solo staff. El participante se anota desde el Calendario.
      { key: "inscripciones", label: "Inscripciones", route: "/inscripciones", icon: ClipboardCheck, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["anotar", "anotados", "cupos", "inscribir"] },
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
      { key: "personas", label: "Base de datos", route: "/personas", icon: Database, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["base de datos", "contactos", "gente", "socios", "miembros", "fichas"] },
      { key: "voluntarios", label: "Voluntarios", route: "/voluntarios", icon: Heart, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["equipo", "staff", "colaboradores"] },
      { key: "participantes", label: "Participantes", route: "/participantes", icon: UserCircle, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["usuarios", "alumnos", "asistentes"] },
      { key: "aprobaciones", label: "Aprobaciones", route: "/aprobaciones", icon: ClipboardCheck, defaultRoles: ["admin"], grantable: false , sinonimos: ["aprobar", "altas", "solicitudes", "pendientes de alta"] },
    ],
  },
  {
    key: "contenido",
    label: "Academia",
    route: "/academia",
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
      { key: "capacitaciones", label: "Capacitaciones", route: "/academia", icon: GraduationCap, defaultRoles: ["admin", "voluntario", "participante"], grantable: true, itemGrants: true , sinonimos: ["academia", "cursos", "videos", "formacion", "capacitacion"] },
      {
        key: "accesos",
        label: "Accesos",
        route: "/accesos",
        icon: KeyRound,
        defaultRoles: ["admin"],
        grantable: false,
        // Tres vistas del mismo tablero: quién puede ver, quién miró y a
        // quién hay que mirarle el uso.
        //
        // "Pagos" vivía acá y se mudó a Plata. La plata la mira quien lleva
        // las cuentas y los accesos los maneja quien coordina: son dos
        // trabajos de personas distintas. Que confirmar un pago habilite el
        // acceso sigue pasando solo, en la misma transacción, así que
        // separar las pantallas no parte ningún recorrido.
        children: [
          { key: "habilitaciones", label: "Habilitaciones", route: "/accesos", icon: UserCheck, defaultRoles: ["admin"], grantable: false , sinonimos: ["accesos", "permisos", "dar acceso", "habilitar"] },
          { key: "auditoria", label: "Auditoría", route: "/auditoria", icon: ScrollText, defaultRoles: ["admin"], grantable: false , sinonimos: ["quien miro", "registro", "historial de uso"] },
          { key: "alertas", label: "Alertas", route: "/alertas", icon: ShieldAlert, defaultRoles: ["admin"], grantable: false , sinonimos: ["avisos", "sospechas", "compartido"] },
        ],
      },
      { key: "encuestas", label: "Evaluaciones", route: "/encuestas", icon: ClipboardList, defaultRoles: ["admin"], grantable: false , sinonimos: ["evaluaciones", "examenes", "preguntas", "feedback"] },
      {
        key: "certificacion",
        label: "Certificados",
        route: "/certificados",
        icon: Award,
        defaultRoles: ["admin"],
        grantable: false,
        // En su orden natural: se redacta, se emite, queda el historial.
        children: [
          { key: "certificados", label: "Redacción", route: "/certificados", icon: FileSignature, defaultRoles: ["admin"], grantable: false , sinonimos: ["diplomas", "constancias", "redaccion"] },
          { key: "emision", label: "Emisión", route: "/emision", icon: Send, defaultRoles: ["admin"], grantable: false , sinonimos: ["entregar certificados", "mandar diploma", "emitir"] },
          { key: "historial-certificados", label: "Historial", route: "/historial-certificados", icon: History, defaultRoles: ["admin"], grantable: false , sinonimos: ["certificados emitidos", "entregados"] },
        ],
      },
      { key: "link-pago", label: "Link de pago", route: "/link-de-pago", icon: CreditCard, defaultRoles: ["admin"], grantable: false , sinonimos: ["cobrar", "mercado pago", "link", "cobro", "precio"] },
    ],
  },
  {
    key: "tareas",
    label: "Tareas",
    route: "/pendientes",
    icon: ClipboardCheck,
    defaultRoles: ["admin", "voluntario"],
    grantable: false,
    // Lo que hay que hacer y lo que se propone hacer. Antes vivían en
    // "Gestión", que era el cajón de lo que no entraba en ningún lado: cinco
    // cosas de naturaleza distinta bajo un nombre que no significaba nada.
    children: [
      { key: "pendientes", label: "Pendientes", route: "/pendientes", icon: CheckSquare, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["tareas", "to do", "hacer", "deberes"] },
      { key: "ideas", label: "Ideas", route: "/ideas", icon: Lightbulb, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["propuestas", "sugerencias", "mejoras"] },
    ],
  },
  // Inventario queda como pantalla directa, sin hijos: una sola vista ya
  // contesta las tres preguntas que importan —qué tiene ALMA, quién lo tiene
  // y qué está a la venta—. Meterlo en un grupo obligaba a renombrarlo para
  // no quedar como "Inventario › Inventario".
  { key: "inventario", label: "Inventario", route: "/inventario", icon: Package, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["stock", "cosas", "materiales", "prestamos", "elementos"] },
  {
    key: "plata",
    label: "Plata",
    route: "/ingresos",
    icon: TrendingUp,
    // Lo ve el voluntario: "¿cuánta plata tiene ALMA?" es una pregunta
    // razonable de cualquiera que trabaje acá, y hasta ahora no tenía
    // respuesta salvo para un admin. Lo que NO ve un voluntario es el detalle
    // con nombres —quién pagó qué— que vive en Pagos y en el informe
    // descargable; eso es información personal de participantes.
    defaultRoles: ["admin", "voluntario"],
    grantable: false,
    children: [
      { key: "ingresos", label: "Resumen", route: "/ingresos", icon: TrendingUp, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["plata", "dinero", "caja", "resumen", "cuanto entro", "balance"] },
      { key: "pagos-capacitaciones", label: "Pagos", route: "/pagos-capacitaciones", icon: Receipt, defaultRoles: ["admin"], grantable: false , sinonimos: ["cobros", "comprobantes", "transferencias", "quien pago", "recibos"] },
      { key: "puesto-venta", label: "Puesto de venta", route: "/puesto-venta", icon: ShoppingCart, defaultRoles: ["admin", "voluntario"], grantable: false , sinonimos: ["stand", "venta", "feria", "vender", "caja", "gondola"] },
    ],
  },

  // ── Menú del avatar ────────────────────────────────────────────────
  // Estas tres salieron de la barra. No son lugares donde se trabaja: son
  // los datos propios, los avisos y las métricas de uso — cosas que se miran
  // cada tanto. Sacarlas dejó la barra en ocho pestañas, MENOS que antes de
  // partir Gestión en tres, y todas de trabajo diario.
  { key: "mis-datos", label: "Mi perfil", route: "/mis-datos", icon: UserCircle, defaultRoles: ["admin", "voluntario", "participante"], grantable: false, inUserMenu: true , sinonimos: ["perfil", "mi cuenta", "pin", "contrasena", "notificaciones", "mis datos"] },
  { key: "anuncios", label: "Anuncios", route: "/anuncios", icon: Megaphone, defaultRoles: ["admin"], grantable: false, inUserMenu: true , sinonimos: ["novedades", "avisos", "comunicados", "broadcast"] },
  { key: "actividad", label: "Actividad", route: "/actividad", icon: BarChart3, defaultRoles: ["admin"], grantable: false, inUserMenu: true , sinonimos: ["estadisticas", "uso", "metricas", "tablero"] },
]

/**
 * Cómo se agrupan los módulos en la pantalla de Inicio.
 *
 * Es OTRA cosa que el nav. La barra de pestañas ordena por frecuencia de uso
 * —lo que tocás todos los días, a mano—; Inicio ordena por tema, que es lo
 * que sirve cuando todavía no sabés dónde está algo. Un módulo aparece en los
 * dos lados y no se duplica: son dos vistas del mismo registro.
 *
 * Son solo etiquetas: no se guardan en ningún lado, no se pueden habilitar y
 * no afectan permisos. Un módulo que no figure acá cae igual en la última
 * columna, así que agregar uno nuevo no lo hace desaparecer de Inicio.
 */
export const SECCIONES_INICIO: { titulo: string; modulos: string[] }[] = [
  { titulo: "Comunidad", modulos: ["comunidad", "espacios", "contenido"] },
  { titulo: "Día a día", modulos: ["agenda", "tareas"] },
  { titulo: "Gestión", modulos: ["plata", "inventario"] },
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
