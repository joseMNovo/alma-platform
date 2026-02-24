"use client"

import { config } from "@/lib/config"

export default function AlmaFooter({ borderTop = false }: { borderTop?: boolean }) {
  return (
    <footer className={`py-4 bg-white ${borderTop ? "border-t border-gray-200" : ""}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="text-sm text-gray-700">Creado con amor por ALMA Rosario - 2026</p>
          </div>
          <div className="text-xs text-gray-600">
            v{config.app.version}
          </div>
        </div>
      </div>
    </footer>
  )
}
