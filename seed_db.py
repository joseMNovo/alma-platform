#!/usr/bin/env python3
"""
seed_db.py — ALMA Platform — Población de la base de datos con datos de prueba
===============================================================================
Trunca las tablas de datos e inserta registros realistas de ejemplo.
Los datos son ficticios pero representativos del uso real de ALMA Rosario.

Uso:
    python -X utf8 seed_db.py

Dependencias:
    pip install mysql-connector-python bcrypt
"""

import os
import sys
from datetime import date, timedelta

# ──────────────────────────────────────────────────────────────────
# 1. Lectura de .env.local
# ──────────────────────────────────────────────────────────────────

def load_env(path: str) -> dict:
    env = {}
    if not os.path.exists(path):
        return env
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


ENV_PATH = os.path.join(os.path.dirname(__file__), ".env.local")
env = load_env(ENV_PATH)

DB_HOST     = env.get("DB_HOST", "localhost")
DB_PORT     = int(env.get("DB_PORT", "3306"))
DB_NAME     = env.get("DB_NAME", "alma_platform")
DB_USER     = env.get("DB_USER", "root")
DB_PASSWORD = env.get("DB_PASSWORD", "")

# ──────────────────────────────────────────────────────────────────
# 2. Verificar dependencias
# ──────────────────────────────────────────────────────────────────

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    print("\n  ERROR: mysql-connector-python no está instalado.")
    print("  Instalalo con:  pip install mysql-connector-python\n")
    sys.exit(1)

try:
    import bcrypt as bcryptlib
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False
    print("\n  ADVERTENCIA: bcrypt no está instalado.")
    print("  Los voluntarios se crearán SIN PIN (no podrán iniciar sesión).")
    print("  Para habilitarlo:  pip install bcrypt\n")

# ──────────────────────────────────────────────────────────────────
# 3. Colores de consola
# ──────────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"

def ok(msg):  print(f"  {GREEN}✓{RESET}  {msg}")
def err(msg): print(f"  {RED}✗  {msg}{RESET}")
def info(msg):print(f"  {CYAN}→{RESET}  {msg}")
def sep():    print(f"  {DIM}{'─' * 50}{RESET}")

# ──────────────────────────────────────────────────────────────────
# 4. Helper para hashear PIN
# ──────────────────────────────────────────────────────────────────

def hash_pin(pin: str) -> str | None:
    if not HAS_BCRYPT:
        return None
    return bcryptlib.hashpw(pin.encode(), bcryptlib.gensalt(rounds=12)).decode()

DEFAULT_PIN = "1234"

# ──────────────────────────────────────────────────────────────────
# 5. Datos de prueba
# ──────────────────────────────────────────────────────────────────

# ── Voluntarios ────────────────────────────────────────────────────
VOLUNTARIOS = [
    # id, name, last_name, age, gender, phone, email, reg_date, birth_date, is_admin, specialties
    (1,  "María",      "García",      58, "Femenino",  "341-555-0101", "maria.garcia@alma.org.ar",       "2020-03-15", "1966-07-12", 1, '["Administración","Psicología"]'),
    (2,  "José",       "Rodríguez",   45, "Masculino", "341-555-0102", "jose.rodriguez@gmail.com",        "2021-05-20", "1979-11-03", 0, '["Musicoterapia","Arte"]'),
    (3,  "Ana",        "López",       39, "Femenino",  "341-555-0103", "ana.lopez@gmail.com",             "2021-08-10", "1985-04-22", 0, '["Kinesiología","Yoga"]'),
    (4,  "Carlos",     "Martínez",    52, "Masculino", "341-555-0104", "carlos.martinez@gmail.com",       "2020-11-01", "1972-09-30", 0, '["Medicina","Neurología"]'),
    (5,  "Laura",      "Sánchez",     34, "Femenino",  "341-555-0105", "laura.sanchez@gmail.com",         "2022-02-14", "1990-02-28", 0, '["Nutrición","Cocina"]'),
    (6,  "Pedro",      "González",    61, "Masculino", "341-555-0106", "pedro.gonzalez@gmail.com",        "2020-07-07", "1963-05-15", 0, '["Educación","Terapia Ocupacional"]'),
    (7,  "Sofía",      "Díaz",        41, "Femenino",  "341-555-0107", "sofia.diaz@alma.org.ar",          "2021-01-18", "1983-12-01", 1, '["Administración","Coordinación"]'),
    (8,  "Miguel",     "Fernández",   47, "Masculino", "341-555-0108", "miguel.fernandez@gmail.com",      "2022-06-30", "1977-08-19", 0, '["Arte","Manualidades"]'),
    (9,  "Paula",      "Romero",      36, "Femenino",  "341-555-0109", "paula.romero@gmail.com",          "2023-01-09", "1988-03-07", 0, '["Psicología","Acompañamiento"]'),
    (10, "Diego",      "Torres",      29, "Masculino", "341-555-0110", "diego.torres@gmail.com",          "2023-04-22", "1995-10-14", 0, '["Informática","Comunicación"]'),
    (11, "Valentina",  "Álvarez",     55, "Femenino",  "341-555-0111", "valentina.alvarez@gmail.com",     "2020-09-05", "1969-06-28", 0, '["Trabajo Social","Psicología"]'),
    (12, "Roberto",    "Morales",     63, "Masculino", "341-555-0112", "roberto.morales@gmail.com",       "2021-03-12", "1961-01-25", 0, '["Medicina","Gerontología"]'),
]

# ── Talleres ────────────────────────────────────────────────────────
TALLERES = [
    # id, name, description, instructor, date, schedule, capacity, cost, enrolled, status
    (1, "Arte y Memoria",
        "Taller de expresión artística para estimular la memoria a través del dibujo y la pintura.",
        "Ana López", "2025-03-15", "10:00 - 12:00", 15, 0, 9, "activo"),
    (2, "Musicoterapia",
        "Sesiones de musicoterapia para trabajar las emociones y mejorar el bienestar general.",
        "José Rodríguez", "2025-04-20", "14:00 - 16:00", 12, 500, 7, "activo"),
    (3, "Yoga Suave",
        "Práctica de yoga adaptada para personas mayores, con énfasis en respiración y equilibrio.",
        "Ana López", "2025-02-10", "09:00 - 10:30", 10, 300, 10, "activo"),
    (4, "Taller de Lectura",
        "Lectura compartida y análisis de textos para estimular las funciones cognitivas.",
        "Pedro González", "2025-05-08", "15:00 - 17:00", 20, 0, 5, "activo"),
    (5, "Cocina Terapéutica",
        "Preparación de recetas simples como herramienta de estimulación cognitiva y socialización.",
        "Laura Sánchez", "2025-06-12", "11:00 - 13:00", 8, 800, 6, "activo"),
]

# ── Grupos ──────────────────────────────────────────────────────────
GRUPOS = [
    # id, name, description, coordinator, day, schedule, participants, status
    (1, "Grupo de Apoyo Familiar",
        "Espacio de contención y orientación para familiares de personas con Alzheimer.",
        "María García", "Lunes", "10:00 - 12:00", 15, "activo"),
    (2, "Estimulación Cognitiva",
        "Actividades y juegos diseñados para mantener y mejorar las funciones cognitivas.",
        "Carlos Martínez", "Martes y Jueves", "15:00 - 17:00", 10, "activo"),
    (3, "Actividad Física Adaptada",
        "Ejercicios físicos suaves y adaptados a las necesidades de cada participante.",
        "Ana López", "Miércoles", "09:00 - 10:30", 12, "activo"),
    (4, "Grupo de Conversación",
        "Encuentro semanal para compartir experiencias y fomentar la comunicación.",
        "Valentina Álvarez", "Viernes", "14:00 - 16:00", 8, "activo"),
]

# ── Actividades ─────────────────────────────────────────────────────
ACTIVIDADES = [
    # id, name, description, status
    (1, "Charla: ¿Qué es el Alzheimer?",
        "Conferencia abierta a la comunidad sobre el diagnóstico, evolución y cuidados del Alzheimer.",
        "activo"),
    (2, "Paseo al Parque Independencia",
        "Salida recreativa al parque para los participantes del programa y sus acompañantes.",
        "activo"),
    (3, "Tarde de Cine",
        "Proyección de una película seleccionada y espacio de reflexión posterior.",
        "activo"),
    (4, "Feria de Salud",
        "Jornada de controles de salud gratuitos y charlas informativas.",
        "activo"),
    (5, "Merienda Solidaria",
        "Encuentro mensual para compartir una merienda entre voluntarios y participantes.",
        "activo"),
]

# ── Inventario ──────────────────────────────────────────────────────
INVENTARIO = [
    # id, name, category, quantity, minimum_stock, price, supplier, assigned_volunteer_id, entry_date
    (1,  "Sillas plásticas apilables",    "Mobiliario",        30, 20, 4500.00,  "Mueblería Del Plata",      None,       "2023-01-15"),
    (2,  "Mesas plegables",               "Mobiliario",         8,  5, 12000.00, "Mueblería Del Plata",      None,       "2023-01-15"),
    (3,  "Proyector Epson",               "Tecnología",         1,  1, 85000.00, "Tecnología Rosario",        10,        "2022-06-20"),
    (4,  "Pantalla de proyección",        "Tecnología",         1,  1, 18000.00, "Tecnología Rosario",        10,        "2022-06-20"),
    (5,  "Botiquín de primeros auxilios", "Salud",              2,  2, 6500.00,  "Farmacia Central",         None,       "2023-03-10"),
    (6,  "Set de materiales de arte",     "Arte y Manualidades",50, 15, 850.00,  "El Artista Rosario",        8,        "2024-02-01"),
    (7,  "Libros de estimulación cognitiva","Materiales",       25, 10, 2200.00, "Librería Hernández",        6,        "2023-09-05"),
    (8,  "Equipo de sonido portátil",     "Tecnología",         1,  1, 45000.00, "Electrónica Sur",           2,        "2022-11-18"),
    (9,  "Colchonetas para yoga",         "Deporte y Salud",   15,  8, 3200.00,  "Sport House",               3,        "2023-07-22"),
    (10, "Vajilla y utensilios cocina",   "Cocina",            40, 20, 1500.00,  "Bazar El Hogar",           None,       "2024-01-10"),
    (11, "Impresora multifunción",        "Tecnología",         1,  1, 38000.00, "Tecnología Rosario",       None,       "2023-05-14"),
    (12, "Resmas de papel A4",            "Insumos de oficina", 8,  5, 1800.00,  "Librería Hernández",       None,       "2024-03-01"),
]

# ── Inscripciones ────────────────────────────────────────────────────
# Algunos voluntarios inscriptos en talleres, grupos y actividades
INSCRIPCIONES = [
    # id, user_id, type, item_id, enrollment_date, status
    (1,  2, "taller",    1, "2025-03-01", "confirmada"),
    (2,  3, "taller",    1, "2025-03-02", "confirmada"),
    (3,  5, "taller",    1, "2025-03-03", "confirmada"),
    (4,  9, "taller",    2, "2025-04-01", "confirmada"),
    (5,  11,"taller",    2, "2025-04-02", "confirmada"),
    (6,  2, "taller",    3, "2025-01-28", "confirmada"),
    (7,  3, "taller",    3, "2025-01-29", "confirmada"),
    (8,  6, "grupo",     1, "2021-06-10", "confirmada"),
    (9,  9, "grupo",     1, "2022-03-15", "confirmada"),
    (10, 11,"grupo",     1, "2021-09-20", "confirmada"),
    (11, 4, "grupo",     2, "2021-07-01", "confirmada"),
    (12, 12,"grupo",     2, "2022-01-18", "confirmada"),
    (13, 3, "grupo",     3, "2022-05-10", "confirmada"),
    (14, 5, "grupo",     3, "2023-02-07", "confirmada"),
    (15, 9, "grupo",     4, "2023-06-01", "confirmada"),
    (16, 11,"actividad", 1, "2025-04-01", "confirmada"),
    (17, 2, "actividad", 1, "2025-04-01", "confirmada"),
    (18, 6, "actividad", 2, "2025-04-10", "confirmada"),
    (19, 8, "actividad", 3, "2025-04-28", "confirmada"),
    (20, 3, "actividad", 5, "2025-06-01", "confirmada"),
]

# ── Pagos ────────────────────────────────────────────────────────────
# Cuotas sociales y pagos de talleres
PAGOS = [
    # id, user_id, concept, amount, due_date, payment_method, status, payment_date
    (1,  2,  "Cuota mensual - Enero 2025",    2000, "2025-01-10", "transferencia", "pagado",   "2025-01-08"),
    (2,  2,  "Cuota mensual - Febrero 2025",  2000, "2025-02-10", "transferencia", "pagado",   "2025-02-09"),
    (3,  2,  "Cuota mensual - Marzo 2025",    2000, "2025-03-10", "efectivo",      "pagado",   "2025-03-11"),
    (4,  2,  "Musicoterapia - Inscripción",    500, "2025-04-01", None,            "pendiente", None),
    (5,  3,  "Cuota mensual - Enero 2025",    2000, "2025-01-10", "transferencia", "pagado",   "2025-01-07"),
    (6,  3,  "Cuota mensual - Febrero 2025",  2000, "2025-02-10", None,            "vencido",  None),
    (7,  3,  "Cuota mensual - Marzo 2025",    2000, "2025-03-10", "efectivo",      "pagado",   "2025-03-15"),
    (8,  5,  "Cuota mensual - Enero 2025",    2000, "2025-01-10", "transferencia", "pagado",   "2025-01-10"),
    (9,  5,  "Cuota mensual - Febrero 2025",  2000, "2025-02-10", "transferencia", "pagado",   "2025-02-10"),
    (10, 5,  "Cocina Terapéutica - Inscripción", 800, "2025-06-01", None,          "pendiente", None),
    (11, 6,  "Cuota mensual - Enero 2025",    2000, "2025-01-10", "efectivo",      "pagado",   "2025-01-12"),
    (12, 6,  "Cuota mensual - Febrero 2025",  2000, "2025-02-10", None,            "vencido",  None),
    (13, 6,  "Cuota mensual - Marzo 2025",    2000, "2025-03-10", None,            "vencido",  None),
    (14, 8,  "Cuota mensual - Marzo 2025",    2000, "2025-03-10", "tarjeta",       "pagado",   "2025-03-09"),
    (15, 9,  "Tarde de Cine - Entrada",        200, "2025-05-01", "efectivo",      "pagado",   "2025-05-03"),
    (16, 11, "Cuota mensual - Enero 2025",    2000, "2025-01-10", "transferencia", "pagado",   "2025-01-09"),
    (17, 11, "Cuota mensual - Febrero 2025",  2000, "2025-02-10", "transferencia", "pagado",   "2025-02-08"),
    (18, 12, "Cuota mensual - Enero 2025",    2000, "2025-01-10", "efectivo",      "pagado",   "2025-01-13"),
    (19, 12, "Cuota mensual - Febrero 2025",  2000, "2025-02-10", None,            "pendiente", None),
]

# ── Pendientes ───────────────────────────────────────────────────────
# Categorías principales con sub-tareas
PENDIENTES = [
    # id (str), description, assigned_volunteer_id, completed, created_date
    ("task-001", "Preparación del Evento Anual 2025",        "7",  0, "2025-01-10 09:00:00"),
    ("task-002", "Mantenimiento y refacción de la sede",     "1",  0, "2025-01-15 10:30:00"),
    ("task-003", "Capacitaciones del equipo de voluntarios", "7",  0, "2025-02-01 08:00:00"),
    ("task-004", "Actualizar materiales de difusión",        "10", 0, "2025-02-15 11:00:00"),
    ("task-005", "Gestión de donaciones pendientes",         "1",  0, "2025-03-01 09:30:00"),
]

PENDING_ITEMS = [
    # id (str), pending_id, description, assigned_volunteer_id, completed, created_date
    ("sub-001", "task-001", "Reservar salón para el evento",            "7",  1, "2025-01-10 09:05:00"),
    ("sub-002", "task-001", "Confirmar catering para 80 personas",      "5",  0, "2025-01-10 09:05:00"),
    ("sub-003", "task-001", "Imprimir y distribuir invitaciones",       "10", 0, "2025-01-10 09:05:00"),
    ("sub-004", "task-001", "Coordinar actuación musical",              "2",  0, "2025-01-10 09:05:00"),
    ("sub-005", "task-002", "Pintar sala principal",                    "1",  1, "2025-01-15 10:35:00"),
    ("sub-006", "task-002", "Reparar ventanas del fondo",               None, 0, "2025-01-15 10:35:00"),
    ("sub-007", "task-002", "Revisar instalación eléctrica",            None, 0, "2025-01-15 10:35:00"),
    ("sub-008", "task-002", "Reemplazar mobiliario deteriorado",        "1",  0, "2025-01-15 10:35:00"),
    ("sub-009", "task-003", "Taller de primeros auxilios",              "4",  1, "2025-02-01 08:05:00"),
    ("sub-010", "task-003", "Capacitación en manejo del estrés",        "9",  0, "2025-02-01 08:05:00"),
    ("sub-011", "task-003", "Curso sobre Alzheimer y demencias",        "4",  0, "2025-02-01 08:05:00"),
    ("sub-012", "task-004", "Rediseñar folleto institucional",          "10", 1, "2025-02-15 11:05:00"),
    ("sub-013", "task-004", "Actualizar redes sociales",                "10", 0, "2025-02-15 11:05:00"),
    ("sub-014", "task-004", "Grabar video institucional",               "10", 0, "2025-02-15 11:05:00"),
    ("sub-015", "task-005", "Contactar empresa de alimentos",           "1",  0, "2025-03-01 09:35:00"),
    ("sub-016", "task-005", "Gestionar donación de equipos tecnológicos","1", 0, "2025-03-01 09:35:00"),
]

# ── Instancias de Calendario 2025 ────────────────────────────────────
# Generamos instancias cada 14 días, alternando grupo/taller, de marzo a noviembre
def gen_calendar_instances():
    instances = []
    start = date(2025, 3, 1)
    end   = date(2025, 11, 30)
    current = start
    types = ["grupo", "taller"]
    type_idx = 0
    i = 1
    while current <= end:
        tipo = types[type_idx % 2]
        source_id = 1 if tipo == "grupo" else 2  # grupo 1 y taller 2
        # Determinar estado según la fecha actual
        today = date.today()
        if current < today - timedelta(days=14):
            status = "realizado"
        elif current < today:
            status = "realizado" if type_idx % 3 != 0 else "cancelado"
        else:
            status = "programado"
        instances.append((
            i, tipo, source_id,
            current.isoformat(),
            "10:00:00", "12:00:00",
            None, status
        ))
        current += timedelta(days=14)
        type_idx += 1
        i += 1
    return instances

CALENDAR_INSTANCES = gen_calendar_instances()

# ── Asignaciones de calendario ────────────────────────────────────────
# Coordinadores y co-coordinadores para las primeras instancias
def gen_calendar_assignments(instances):
    assignments = []
    coordinators = [1, 7, 4, 12, 6, 11, 3, 7, 1, 4]   # volunteer IDs, rotando
    co_coordinators = [7, 3, 9, 11, 4, 1, 6, 12, 9, 3] # volunteer IDs, rotando
    for i, inst in enumerate(instances):
        inst_id = inst[0]
        coord_id = coordinators[i % len(coordinators)]
        cocoord_id = co_coordinators[i % len(co_coordinators)]
        if coord_id != cocoord_id:
            assignments.append((inst_id, "coordinator",   coord_id))
            assignments.append((inst_id, "co_coordinator", cocoord_id))
        else:
            assignments.append((inst_id, "coordinator", coord_id))
    return assignments

CALENDAR_ASSIGNMENTS = gen_calendar_assignments(CALENDAR_INSTANCES)

# ── Participantes ────────────────────────────────────────────────────
# Personas externas a ALMA que se registran para participar en actividades
# PIN por defecto: "1234" (mismo que voluntarios en seeds)
PARTICIPANTES = [
    # email, is_active
    ("elena.vidal@gmail.com",        1),
    ("marcos.perez@gmail.com",       1),
    ("norma.gutierrez@hotmail.com",  1),
]

# ── Perfiles de participantes ────────────────────────────────────────
# (email_ref, name, last_name, phone, city, accepts_notifications, accepts_whatsapp)
PARTICIPANT_PROFILES = [
    ("elena.vidal@gmail.com",       "Elena",  "Vidal",     "341-555-0201", "Rosario", 1, 1),
    ("marcos.perez@gmail.com",      "Marcos", "Pérez",     "341-555-0202", "Rosario", 1, 0),
    # norma.gutierrez no completó su perfil
]

# ──────────────────────────────────────────────────────────────────
# 6. Ejecución principal
# ──────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}{CYAN}  ALMA Platform — seed_db.py{RESET}")
    print(f"  Base de datos : {BOLD}{DB_NAME}{RESET}")
    print(f"  Host          : {DB_HOST}:{DB_PORT}")
    print(f"  PIN por defecto para voluntarios: {BOLD}{DEFAULT_PIN}{RESET}\n")

    if not HAS_BCRYPT:
        print(f"  {YELLOW}⚠ bcrypt no disponible — los voluntarios no tendrán PIN.{RESET}")
        print(f"  {YELLOW}  Instalalo con: pip install bcrypt{RESET}\n")

    answer = input(f"  {YELLOW}¿Truncar datos existentes y poblar '{DB_NAME}'? (s/N): {RESET}").strip().lower()
    if answer != "s":
        print("  Cancelado.\n")
        sys.exit(0)

    try:
        conn = mysql.connector.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER,
            password=DB_PASSWORD, database=DB_NAME,
            charset="utf8mb4", autocommit=False,
        )
        cursor = conn.cursor()

        # ── Truncar en orden inverso de FK ─────────────────────────
        print(f"\n  {YELLOW}▶ Truncando tablas existentes...{RESET}")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        for tabla in [
            "calendar_event_participants",
            "calendar_assignments", "calendar_instances",
            "pending_items", "pendientes",
            "inscripciones", "pagos", "inventario",
            "actividades", "grupos", "talleres", "voluntarios",
            "participant_profiles", "participants",
        ]:
            cursor.execute(f"TRUNCATE TABLE `{tabla}`")
            cursor.execute(f"ALTER TABLE `{tabla}` AUTO_INCREMENT = 1")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        ok("Tablas truncadas")
        sep()

        # ── Hash del PIN por defecto ────────────────────────────────
        pin_hash = hash_pin(DEFAULT_PIN) if HAS_BCRYPT else None

        # ── Voluntarios ─────────────────────────────────────────────
        # Tuple layout: (id, name, last_name, age, gender, phone, email,
        #                reg_date, birth_date, is_admin, specialties)
        print(f"\n  {CYAN}Insertando voluntarios...{RESET}")
        import json as _json
        for v in VOLUNTARIOS:
            vid, vname, vlast, vage, vgender, vphone, vemail, vreg, vbirth, vis_admin, vspec = v
            specialties_json = _json.dumps(_json.loads(vspec), ensure_ascii=False)
            cursor.execute("""
                INSERT INTO voluntarios
                  (id, name, last_name, age, gender, phone, email,
                   registration_date, birth_date, status, specialties, is_admin, pin_hash)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'activo',%s,%s,%s)
            """, (vid, vname, vlast, vage, vgender, vphone, vemail, vreg, vbirth,
                  specialties_json, vis_admin, pin_hash))
        conn.commit()
        ok(f"{len(VOLUNTARIOS)} voluntarios  (PIN: {DEFAULT_PIN if HAS_BCRYPT else 'no configurado'})")

        # ── Talleres ─────────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando talleres...{RESET}")
        for t in TALLERES:
            cursor.execute("""
                INSERT INTO talleres
                  (id, name, description, instructor, date, schedule,
                   capacity, cost, enrolled, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, t)
        conn.commit()
        ok(f"{len(TALLERES)} talleres")

        # ── Grupos ───────────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando grupos...{RESET}")
        for g in GRUPOS:
            cursor.execute("""
                INSERT INTO grupos
                  (id, name, description, coordinator, day, schedule, participants, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, g)
        conn.commit()
        ok(f"{len(GRUPOS)} grupos")

        # ── Actividades ──────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando actividades...{RESET}")
        for a in ACTIVIDADES:
            cursor.execute("""
                INSERT INTO actividades
                  (id, name, description, status)
                VALUES (%s,%s,%s,%s)
            """, a)
        conn.commit()
        ok(f"{len(ACTIVIDADES)} actividades")

        # ── Inventario ───────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando inventario...{RESET}")
        for item in INVENTARIO:
            cursor.execute("""
                INSERT INTO inventario
                  (id, name, category, quantity, minimum_stock, price,
                   supplier, assigned_volunteer_id, entry_date)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, item)
        conn.commit()
        ok(f"{len(INVENTARIO)} ítems de inventario")

        # ── Inscripciones ────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando inscripciones...{RESET}")
        for ins in INSCRIPCIONES:
            cursor.execute("""
                INSERT INTO inscripciones
                  (id, user_id, type, item_id, enrollment_date, status)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, ins)
        conn.commit()
        ok(f"{len(INSCRIPCIONES)} inscripciones")

        # ── Pagos ────────────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando pagos...{RESET}")
        for p in PAGOS:
            cursor.execute("""
                INSERT INTO pagos
                  (id, user_id, concept, amount, due_date,
                   payment_method, status, payment_date)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, p)
        conn.commit()
        ok(f"{len(PAGOS)} pagos")

        # ── Pendientes ───────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando pendientes...{RESET}")
        for p in PENDIENTES:
            cursor.execute("""
                INSERT INTO pendientes
                  (id, description, assigned_volunteer_id, completed, created_date)
                VALUES (%s,%s,%s,%s,%s)
            """, p)
        for s in PENDING_ITEMS:
            cursor.execute("""
                INSERT INTO pending_items
                  (id, pending_id, description, assigned_volunteer_id, completed, created_date)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, s)
        conn.commit()
        ok(f"{len(PENDIENTES)} categorías  /  {len(PENDING_ITEMS)} sub-tareas")

        # ── Calendar instances ────────────────────────────────────────
        print(f"\n  {CYAN}Insertando instancias de calendario...{RESET}")
        for ci in CALENDAR_INSTANCES:
            cursor.execute("""
                INSERT INTO calendar_instances
                  (id, type, source_id, date, start_time, end_time, notes, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, ci)
        conn.commit()
        ok(f"{len(CALENDAR_INSTANCES)} instancias  (marzo–noviembre 2025, cada 14 días)")

        # ── Calendar assignments ──────────────────────────────────────
        print(f"\n  {CYAN}Insertando asignaciones de calendario...{RESET}")
        for ca in CALENDAR_ASSIGNMENTS:
            # Tuple: (instance_id, role, volunteer_id)
            cursor.execute("""
                INSERT INTO calendar_assignments (instance_id, role, volunteer_id)
                VALUES (%s,%s,%s)
                ON DUPLICATE KEY UPDATE volunteer_id = VALUES(volunteer_id)
            """, ca)
        conn.commit()
        ok(f"{len(CALENDAR_ASSIGNMENTS)} asignaciones (coordinadores y co-coordinadores)")

        # ── Participantes ─────────────────────────────────────────────
        print(f"\n  {CYAN}Insertando participantes...{RESET}")
        participant_ids: dict = {}  # email → id
        for p_email, p_active in PARTICIPANTES:
            cursor.execute("""
                INSERT INTO participants (email, pin_hash, is_active)
                VALUES (%s, %s, %s)
            """, (p_email, pin_hash, p_active))
            participant_ids[p_email] = cursor.lastrowid
        conn.commit()
        ok(f"{len(PARTICIPANTES)} participantes  (PIN: {DEFAULT_PIN if HAS_BCRYPT else 'no configurado'})")

        # ── Perfiles de participantes ─────────────────────────────────
        print(f"\n  {CYAN}Insertando perfiles de participantes...{RESET}")
        for pp in PARTICIPANT_PROFILES:
            p_email, p_name, p_last, p_phone, p_city, p_notif, p_wa = pp
            p_id = participant_ids.get(p_email)
            if p_id:
                cursor.execute("""
                    INSERT INTO participant_profiles
                      (participant_id, name, last_name, phone, city, accepts_notifications, accepts_whatsapp)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)
                """, (p_id, p_name, p_last, p_phone, p_city, p_notif, p_wa))
        conn.commit()
        ok(f"{len(PARTICIPANT_PROFILES)} perfiles de participantes")

        # ── Resumen final ─────────────────────────────────────────────
        sep()
        print(f"\n  {GREEN}{BOLD}✔ Base de datos poblada correctamente.{RESET}\n")
        print(f"  {DIM}Voluntarios creados:{RESET}")
        for v in VOLUNTARIOS:
            rol = "admin" if v[9] else "voluntario"
            print(f"    {DIM}·{RESET} {v[1]} {v[2]}  ←  {v[6]}  /  PIN: {DEFAULT_PIN if HAS_BCRYPT else 'N/A'}  [{rol}]")
        print()
        print(f"  {DIM}Participantes creados:{RESET}")
        for p_email, _ in PARTICIPANTES:
            print(f"    {DIM}·{RESET} {p_email}  /  PIN: {DEFAULT_PIN if HAS_BCRYPT else 'N/A'}  [participante]")
        print()
        print(f"  {DIM}Ya podés correr:{RESET}  {CYAN}npm run dev{RESET}\n")

        cursor.close()
        conn.close()

    except MySQLError as e:
        print(f"\n  {RED}ERROR: {e}{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
