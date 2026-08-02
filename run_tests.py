#!/usr/bin/env python3
"""
run_tests.py — corre la suite de tests del frontend.

    python run_tests.py                       # todo
    python run_tests.py tests/permissions      # los que matcheen ese nombre
    python run_tests.py --watch                # re-corre al guardar

Cualquier argumento extra se le pasa tal cual a vitest.

Existe para que el comando sea el MISMO en los dos repos (el backend tiene su
propio run_tests.py). Por debajo esto es vitest; si preferís, `npx vitest run`
hace exactamente lo mismo.

Los tests no salen a la red: las llamadas al backend están mockeadas.

La primera vez:  npm install
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> int:
    # La consola de Windows arranca en cp1252 y se ahoga con los acentos.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not (ROOT / "node_modules").is_dir():
        print("Faltan las dependencias. Corré primero:\n\n    npm install\n", file=sys.stderr)
        return 1

    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        print("No encontré npx en el PATH. ¿Está instalado Node?", file=sys.stderr)
        return 1

    args = sys.argv[1:]
    # Sin argumentos, vitest se queda en modo watch: `run` lo hace de una pasada.
    if not any(a in ("--watch", "-w") for a in args):
        args = ["run", *args]

    print("── Tests del frontend ALMA ────────────────────────────────────")
    print("Backend: mockeado · Sin llamadas de red reales")
    print()

    return subprocess.call([npx, "vitest", *args], cwd=ROOT, shell=False)


if __name__ == "__main__":
    sys.exit(main())
