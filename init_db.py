#!/usr/bin/env python3
"""
init_db.py — ALMA Platform — Inicializador de base de datos
=====================================================================
Borra (si existe) y recrea la base de datos con todas las tablas.
Uso: python init_db.py

Dependencia única:
    pip install mysql-connector-python
"""

import os
import sys

# ──────────────────────────────────────────────────────────────────
# 1. Lectura de .env.local  (sin python-dotenv)
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
# 2. Verificar dependencia
# ──────────────────────────────────────────────────────────────────

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    print("\n  ERROR: mysql-connector-python no está instalado.")
    print("  Instalalo con:  pip install mysql-connector-python\n")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────────
# 3. Definición del esquema — en orden de dependencia
# ──────────────────────────────────────────────────────────────────

# Cada entrada es (descripción, SQL).
# Se ejecutan en orden; los ALTER TABLE van al final.

STATEMENTS = [

    # ── Tablas base (sin FK entre sí) ─────────────────────────────

    ("voluntarios", """
    CREATE TABLE voluntarios (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      name              VARCHAR(100)  NOT NULL,
      last_name         VARCHAR(100),
      age               INT,
      gender            VARCHAR(20),
      photo             TEXT,
      phone             VARCHAR(50),
      email             VARCHAR(150),
      registration_date DATE          NOT NULL,
      birth_date        DATE,
      status            ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
      specialties       JSON,
      is_admin          TINYINT(1)    NOT NULL DEFAULT 0,
      pin_hash          VARCHAR(255)  NULL,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("talleres", """
    CREATE TABLE talleres (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(200)  NOT NULL,
      description TEXT,
      instructor  VARCHAR(100),
      date        DATE,
      schedule    VARCHAR(50),
      capacity    INT  NOT NULL DEFAULT 0,
      cost        INT  NOT NULL DEFAULT 0,
      enrolled    INT  NOT NULL DEFAULT 0,
      status      VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("grupos", """
    CREATE TABLE grupos (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(200) NOT NULL,
      description  TEXT,
      coordinator  VARCHAR(100),
      day          VARCHAR(20),
      schedule     VARCHAR(50),
      participants INT  NOT NULL DEFAULT 0,
      status       VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("actividades", """
    CREATE TABLE actividades (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      description TEXT,
      status      VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("pendientes", """
    CREATE TABLE pendientes (
      id                    VARCHAR(36) PRIMARY KEY,
      description           TEXT        NOT NULL,
      assigned_volunteer_id VARCHAR(20),
      completed             TINYINT(1)  NOT NULL DEFAULT 0,
      created_date          DATETIME    NOT NULL,
      completed_date        DATETIME,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    # ── auth_users (FK opcional a voluntarios) ────────────────────

    ("auth_users", """
    CREATE TABLE auth_users (
      id                    INT AUTO_INCREMENT PRIMARY KEY,
      volunteer_id          INT          NULL,
      email                 VARCHAR(150) NOT NULL,
      password_hash         VARCHAR(255) NOT NULL,
      email_verified        TINYINT(1)   NOT NULL DEFAULT 0,
      is_volunteer          TINYINT(1)   NOT NULL DEFAULT 0,
      is_active             TINYINT(1)   NOT NULL DEFAULT 1,
      last_login_at         DATETIME     NULL,
      last_login_ip         VARCHAR(45)  NULL,
      last_login_user_agent VARCHAR(255) NULL,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_auth_users_email UNIQUE (email),
      CONSTRAINT fk_auth_users_volunteer
        FOREIGN KEY (volunteer_id) REFERENCES voluntarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    # ── Tablas con FK a voluntarios ───────────────────────────────

    ("pagos", """
    CREATE TABLE pagos (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      user_id        INT          NOT NULL,
      concept        VARCHAR(200) NOT NULL,
      amount         INT          NOT NULL,
      due_date       DATE         NOT NULL,
      payment_method ENUM('efectivo','transferencia','tarjeta'),
      status         ENUM('pendiente','pagado','vencido') NOT NULL DEFAULT 'pendiente',
      payment_date   DATE,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_pagos_user FOREIGN KEY (user_id) REFERENCES voluntarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("inventario", """
    CREATE TABLE inventario (
      id                    INT AUTO_INCREMENT PRIMARY KEY,
      name                  VARCHAR(200)  NOT NULL,
      category              VARCHAR(100),
      quantity              INT           NOT NULL DEFAULT 0,
      minimum_stock         INT           NOT NULL DEFAULT 1,
      price                 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      supplier              VARCHAR(200),
      assigned_volunteer_id INT,
      entry_date            DATE          NOT NULL,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_inventario_volunteer
        FOREIGN KEY (assigned_volunteer_id) REFERENCES voluntarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("inscripciones", """
    CREATE TABLE inscripciones (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT  NOT NULL,
      type            ENUM('taller','grupo','actividad') NOT NULL,
      item_id         INT  NOT NULL,
      enrollment_date DATE NOT NULL,
      status          VARCHAR(50) NOT NULL DEFAULT 'confirmada',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_inscripciones_user FOREIGN KEY (user_id) REFERENCES voluntarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("pending_items", """
    CREATE TABLE pending_items (
      id                    VARCHAR(36) PRIMARY KEY,
      pending_id            VARCHAR(36) NOT NULL,
      description           TEXT        NOT NULL,
      assigned_volunteer_id VARCHAR(20),
      completed             TINYINT(1)  NOT NULL DEFAULT 0,
      created_date          DATETIME    NOT NULL,
      completed_date        DATETIME,
      created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_pending_items_parent FOREIGN KEY (pending_id) REFERENCES pendientes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    # ── Tablas auth con FK a auth_users ───────────────────────────

    ("email_verification_tokens", """
    CREATE TABLE email_verification_tokens (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      auth_user_id INT         NOT NULL,
      token_hash   VARCHAR(64) NOT NULL,
      expires_at   DATETIME    NOT NULL,
      used_at      DATETIME    NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_evt_token_hash UNIQUE (token_hash),
      CONSTRAINT fk_evt_auth_user
        FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("auth_login_events", """
    CREATE TABLE auth_login_events (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      auth_user_id   INT          NULL,
      email          VARCHAR(150) NOT NULL,
      success        TINYINT(1)   NOT NULL DEFAULT 0,
      failure_reason VARCHAR(100) NULL,
      ip_address     VARCHAR(45)  NULL,
      user_agent     VARCHAR(255) NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_ale_auth_user
        FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("auth_sessions", """
    CREATE TABLE auth_sessions (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      auth_user_id       INT         NOT NULL,
      session_token_hash VARCHAR(64) NOT NULL,
      expires_at         DATETIME    NOT NULL,
      revoked_at         DATETIME    NULL,
      ip_address         VARCHAR(45)  NULL,
      user_agent         VARCHAR(255) NULL,
      created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_as_token_hash UNIQUE (session_token_hash),
      CONSTRAINT fk_as_auth_user
        FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("password_reset_tokens", """
    CREATE TABLE password_reset_tokens (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      auth_user_id INT         NOT NULL,
      token_hash   VARCHAR(64) NOT NULL,
      expires_at   DATETIME    NOT NULL,
      used_at      DATETIME    NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_prt_token_hash UNIQUE (token_hash),
      CONSTRAINT fk_prt_auth_user
        FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    # ── Calendarios ───────────────────────────────────────────────

    ("calendar_instances", """
    CREATE TABLE calendar_instances (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      type        ENUM('grupo', 'taller', 'actividad') NOT NULL,
      source_id   INT NULL,
      date        DATE NOT NULL,
      start_time  TIME NOT NULL DEFAULT '10:00:00',
      end_time    TIME NOT NULL DEFAULT '12:00:00',
      notes       TEXT,
      status      ENUM('programado','realizado','cancelado') NOT NULL DEFAULT 'programado',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("calendar_assignments", """
    CREATE TABLE calendar_assignments (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      instance_id  INT NOT NULL,
      volunteer_id INT NOT NULL,
      role         ENUM('coordinator','co_coordinator') NOT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ca_instance_role (instance_id, role),
      CONSTRAINT fk_ca_instance  FOREIGN KEY (instance_id)  REFERENCES calendar_instances(id) ON DELETE CASCADE,
      CONSTRAINT fk_ca_volunteer FOREIGN KEY (volunteer_id) REFERENCES voluntarios(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    # ── Índices ───────────────────────────────────────────────────

    ("idx: pagos_user",              "CREATE INDEX idx_pagos_user            ON pagos(user_id)"),
    ("idx: pagos_status",            "CREATE INDEX idx_pagos_status          ON pagos(status)"),
    ("idx: inscripciones_user",      "CREATE INDEX idx_inscripciones_user    ON inscripciones(user_id)"),
    ("idx: inscripciones_type",      "CREATE INDEX idx_inscripciones_type    ON inscripciones(type, item_id)"),
    ("idx: inventario_volunteer",    "CREATE INDEX idx_inventario_volunteer  ON inventario(assigned_volunteer_id)"),
    ("idx: voluntarios_email",       "CREATE INDEX idx_voluntarios_email     ON voluntarios(email)"),
    ("idx: pending_items_parent",    "CREATE INDEX idx_pending_items_parent  ON pending_items(pending_id)"),
    ("idx: auth_users_email_ver",    "CREATE INDEX idx_auth_users_email_ver  ON auth_users(email_verified)"),
    ("idx: auth_users_volunteer_id", "CREATE INDEX idx_auth_users_vol_id     ON auth_users(volunteer_id)"),
    ("idx: auth_users_is_active",    "CREATE INDEX idx_auth_users_is_active  ON auth_users(is_active)"),
    ("idx: evt_auth_user_id",        "CREATE INDEX idx_evt_auth_user_id      ON email_verification_tokens(auth_user_id)"),
    ("idx: evt_expires_at",          "CREATE INDEX idx_evt_expires_at        ON email_verification_tokens(expires_at)"),
    ("idx: ale_auth_user_id",        "CREATE INDEX idx_ale_auth_user_id      ON auth_login_events(auth_user_id)"),
    ("idx: ale_email",               "CREATE INDEX idx_ale_email             ON auth_login_events(email)"),
    ("idx: ale_success",             "CREATE INDEX idx_ale_success           ON auth_login_events(success)"),
    ("idx: as_auth_user_id",         "CREATE INDEX idx_as_auth_user_id       ON auth_sessions(auth_user_id)"),
    ("idx: as_expires_at",           "CREATE INDEX idx_as_expires_at         ON auth_sessions(expires_at)"),

    # ── ALTER TABLE: relación circular voluntarios ↔ auth_users ──
    # Se hace al final porque auth_users ya existe en este punto

    ("ALTER voluntarios: auth_user_id", """
    ALTER TABLE voluntarios
      ADD COLUMN auth_user_id INT NULL,
      ADD CONSTRAINT uq_voluntarios_auth_user UNIQUE (auth_user_id),
      ADD CONSTRAINT fk_voluntarios_auth_user
        FOREIGN KEY (auth_user_id) REFERENCES auth_users(id) ON DELETE SET NULL
    """),

    ("idx: voluntarios_auth_user_id", "CREATE INDEX idx_voluntarios_auth_user ON voluntarios(auth_user_id)"),
    ("idx: ci_date",                 "CREATE INDEX idx_ci_date               ON calendar_instances(date)"),
    ("idx: ci_type",                 "CREATE INDEX idx_ci_type               ON calendar_instances(type)"),
    ("idx: ca_inst",                 "CREATE INDEX idx_ca_inst               ON calendar_assignments(instance_id)"),
    ("idx: ca_vol",                  "CREATE INDEX idx_ca_vol                ON calendar_assignments(volunteer_id)"),

    # ── Participantes (usuarios externos a ALMA) ───────────────────

    ("participants", """
    CREATE TABLE participants (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      email      VARCHAR(150) NOT NULL,
      pin_hash   VARCHAR(255) NULL,
      is_active  TINYINT(1)   NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_participants_email UNIQUE (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("participant_profiles", """
    CREATE TABLE participant_profiles (
      id                      INT AUTO_INCREMENT PRIMARY KEY,
      participant_id          INT          NOT NULL,
      name                    VARCHAR(100),
      last_name               VARCHAR(100),
      phone                   VARCHAR(50),
      birth_date              DATE,
      city                    VARCHAR(100),
      province                VARCHAR(100),
      address                 VARCHAR(200),
      emergency_contact_name  VARCHAR(100),
      emergency_contact_phone VARCHAR(50),
      notes                   TEXT,
      accepts_notifications   TINYINT(1)   NOT NULL DEFAULT 0,
      accepts_whatsapp        TINYINT(1)   NOT NULL DEFAULT 0,
      created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_pp_participant UNIQUE (participant_id),
      CONSTRAINT fk_pp_participant
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("calendar_event_participants", """
    CREATE TABLE calendar_event_participants (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      event_id       INT NOT NULL,
      participant_id INT NOT NULL,
      status         ENUM('inscripto','cancelado','asistio') NOT NULL DEFAULT 'inscripto',
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_cep UNIQUE (event_id, participant_id),
      CONSTRAINT fk_cep_event
        FOREIGN KEY (event_id) REFERENCES calendar_instances(id) ON DELETE CASCADE,
      CONSTRAINT fk_cep_participant
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("participant_program_enrollments", """
    CREATE TABLE participant_program_enrollments (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      participant_id INT NOT NULL,
      type           ENUM('taller','grupo','actividad') NOT NULL,
      item_id        INT NOT NULL,
      enrolled_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ppe_enrollment (participant_id, type, item_id),
      CONSTRAINT fk_ppe_participant
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """),

    ("idx: participants_email",   "CREATE INDEX idx_participants_email  ON participants(email)"),
    ("idx: pp_participant_id",    "CREATE INDEX idx_pp_participant_id   ON participant_profiles(participant_id)"),
    ("idx: cep_event_id",         "CREATE INDEX idx_cep_event_id        ON calendar_event_participants(event_id)"),
    ("idx: cep_participant_id",   "CREATE INDEX idx_cep_participant_id  ON calendar_event_participants(participant_id)"),
    ("idx: ppe_participant_id",   "CREATE INDEX idx_ppe_participant_id  ON participant_program_enrollments(participant_id)"),
]

# ──────────────────────────────────────────────────────────────────
# 4. Ejecución
# ──────────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def main():
    print(f"\n{BOLD}{CYAN}  ALMA Platform — init_db.py{RESET}")
    print(f"  Base de datos : {BOLD}{DB_NAME}{RESET}")
    print(f"  Host          : {DB_HOST}:{DB_PORT}")
    print(f"  Usuario       : {DB_USER}\n")

    # Confirmación
    answer = input(f"  {YELLOW}¿Borrar y recrear '{DB_NAME}'? (s/N): {RESET}").strip().lower()
    if answer != "s":
        print("  Cancelado.\n")
        sys.exit(0)

    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset="utf8mb4",
            autocommit=True,
        )
        cursor = conn.cursor()

        # Drop + create database
        print(f"\n  {YELLOW}▶ Borrando base de datos '{DB_NAME}'...{RESET}")
        cursor.execute(f"DROP DATABASE IF EXISTS `{DB_NAME}`")

        print(f"  {YELLOW}▶ Creando base de datos '{DB_NAME}'...{RESET}\n")
        cursor.execute(
            f"CREATE DATABASE `{DB_NAME}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        cursor.execute(f"USE `{DB_NAME}`")

        # Ejecutar statements
        ok = 0
        for label, sql in STATEMENTS:
            try:
                cursor.execute(sql.strip())
                print(f"  {GREEN}✓{RESET}  {label}")
                ok += 1
            except MySQLError as e:
                print(f"  {RED}✗  {label}{RESET}")
                print(f"     {RED}{e}{RESET}")
                cursor.close()
                conn.close()
                sys.exit(1)

        cursor.close()
        conn.close()

        print(f"\n  {GREEN}{BOLD}✔ Listo — {ok} statements ejecutados sin errores.{RESET}")
        print(f"  Ya podés correr:  {CYAN}npm run dev{RESET}\n")

    except MySQLError as e:
        print(f"\n  {RED}ERROR de conexión: {e}{RESET}")
        print("  Verificá DB_HOST, DB_PORT, DB_USER y DB_PASSWORD en .env.local\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
