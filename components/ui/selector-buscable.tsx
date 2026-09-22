"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

/**
 * Desplegable de una sola opción, con buscador.
 *
 * Existe porque los `<Select>` comunes muestran una lista y nada más: con once
 * voluntarios ya hay que scrollear adentro del desplegable para encontrar a
 * alguien, y con treinta es inusable. Acá se escribe y la lista se achica.
 *
 * Es genérico a propósito (`opciones`, no "voluntarios"): el mismo problema va
 * a aparecer con capacitaciones, personas o productos.
 *
 * NO usa Popover de Radix, y es a propósito. `PopoverContent` se renderiza en
 * un portal colgado de `document.body`, o sea FUERA del DOM del `<Dialog>`. El
 * Dialog monta un FocusScope en modo `trapped`, así que apenas el buscador
 * tomaba el foco, el modal se lo devolvía: el campo se veía pero no dejaba
 * escribir. Esto se renderiza inline, dentro del modal, y el foco nunca sale
 * de ahí.
 */
export default function SelectorBuscable({
  opciones,
  valor,
  onChange,
  placeholder = "Seleccionar…",
  textoBusqueda = "Buscar…",
  sinResultados = "Sin resultados",
  id,
  className = "",
}: {
  opciones: { valor: string; texto: string }[]
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
  textoBusqueda?: string
  sinResultados?: string
  id?: string
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [resaltada, setResaltada] = useState(0)
  const [haciaArriba, setHaciaArriba] = useState(false)
  const [altoMax, setAltoMax] = useState(240)

  const contenedor = useRef<HTMLDivElement>(null)
  const disparador = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  const elegida = opciones.find((o) => o.valor === valor)
  const filtradas = busqueda.trim()
    ? opciones.filter((o) => o.texto.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : opciones

  // Cerrar al tocar afuera. En `mousedown` y no en `click` para que cerrar no
  // dispare de paso lo que haya debajo.
  useEffect(() => {
    if (!abierto) return
    const afuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", afuera)
    return () => document.removeEventListener("mousedown", afuera)
  }, [abierto])

  const abrir = () => {
    const caja = disparador.current?.getBoundingClientRect()
    if (caja) {
      // Quién recorta: el ancestro con scroll —el `DialogContent`, que lleva
      // `overflow-y-auto`— o, si no hay ninguno, la ventana. Sin esta cuenta
      // la lista se dibuja pasando el borde del modal y queda cortada, porque
      // `overflow` recorta a los hijos absolutos aunque no haya scrollbar.
      let topeAbajo = window.innerHeight
      let topeArriba = 0
      let nodo = contenedor.current?.parentElement
      while (nodo) {
        if (/(auto|scroll|hidden)/.test(getComputedStyle(nodo).overflowY)) {
          const r = nodo.getBoundingClientRect()
          topeAbajo = Math.min(topeAbajo, r.bottom)
          topeArriba = Math.max(topeArriba, r.top)
          break
        }
        nodo = nodo.parentElement
      }

      const espacioAbajo = topeAbajo - caja.bottom - 8
      const espacioArriba = caja.top - topeArriba - 8
      // Se despliega para arriba solo si abajo no entra Y arriba entra mejor.
      const arriba = espacioAbajo < 160 && espacioArriba > espacioAbajo
      setHaciaArriba(arriba)
      setAltoMax(Math.max(120, Math.floor(arriba ? espacioArriba : espacioAbajo)))
    }
    setBusqueda("")
    setResaltada(0)
    setAbierto(true)
    // Al toque siguiente, cuando el input ya existe en el DOM.
    requestAnimationFrame(() => campo.current?.focus())
  }

  const elegir = (v: string) => {
    onChange(v)
    setAbierto(false)
    disparador.current?.focus()
  }

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      setAbierto(false)
      disparador.current?.focus()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setResaltada((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setResaltada((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtradas[resaltada]) elegir(filtradas[resaltada].valor)
    }
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        id={id}
        ref={disparador}
        type="button"
        role="combobox"
        aria-expanded={abierto}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        className={`flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          elegida ? "" : "text-muted-foreground"
        } ${className}`}
      >
        <span className="truncate">{elegida?.texto ?? placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {abierto && (
        <div
          style={{ maxHeight: altoMax }}
          className={`absolute left-0 right-0 z-50 flex flex-col overflow-hidden rounded-md border bg-popover shadow-md ${
            haciaArriba ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="flex shrink-0 items-center gap-2 border-b px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              ref={campo}
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setResaltada(0) }}
              onKeyDown={teclas}
              placeholder={textoBusqueda}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {/* `min-h-0` para que el flex la deje achicarse: sin eso el hijo
              con scroll empuja al panel más allá de su propio maxHeight. */}
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {filtradas.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-gray-400">{sinResultados}</li>
            ) : (
              filtradas.map((o, i) => (
                <li key={o.valor}>
                  <button
                    type="button"
                    // `mousedown` y no `click`: el listener de "tocar afuera"
                    // corre en mousedown y desmontaría el botón antes de que
                    // llegue el click.
                    onMouseDown={(e) => { e.preventDefault(); elegir(o.valor) }}
                    onMouseEnter={() => setResaltada(i)}
                    className={`flex w-full items-center px-2.5 py-1.5 text-left text-sm ${
                      i === resaltada ? "bg-[#4dd0e1]/10 text-[#00838f]" : "text-gray-700"
                    }`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 shrink-0 ${valor === o.valor ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="truncate">{o.texto}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
