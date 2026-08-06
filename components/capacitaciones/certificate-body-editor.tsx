"use client"

import { useEffect, useRef } from "react"

/**
 * Editor del texto del certificado con los datos como PASTILLAS.
 *
 * La persona escribe normal y los datos variables son objetos: se insertan con
 * un botón, se borran con backspace como una letra, y nunca se ve una llave.
 *
 * Guarda el MISMO formato de siempre (`{{clave}}` y bloques opcionales
 * `[[...]]`), así que el backend y el PDF no se enteran de nada: esto es solo
 * una forma distinta de escribir lo mismo.
 *
 * Sobre contenteditable, que es la parte delicada:
 *   - El HTML se pinta UNA sola vez por valor externo. Reescribirlo en cada
 *     tecla manda el cursor al principio.
 *   - Cada pastilla lleva su texto original en `data-raw`: serializar es
 *     leerlo, sin tener que reconstruir nada.
 *   - Al pegar se fuerza texto plano; si no, entra el HTML de Word entero.
 */

export interface CampoCertificado {
  key: string
  label: string
}

const CLASES_PASTILLA =
  "mx-0.5 inline-flex items-center gap-1 rounded-full bg-[#9A8BC2]/20 px-2 py-0.5 align-baseline text-[13px] font-medium text-[#5F5088]"

/** Reconoce un bloque opcional con su dato adentro, o un dato suelto. */
const TOKEN = /(\[\[[^\]]*?\{\{\w+\}\}[^\]]*?\]\]|\{\{\w+\}\})/g
// La misma, SIN la bandera global: `test()` sobre una regex global arrastra
// lastIndex entre llamadas y devuelve false una de cada dos veces.
const ES_TOKEN = /^(\[\[[^\]]*?\{\{\w+\}\}[^\]]*?\]\]|\{\{\w+\}\})$/

/** Espacio duro: es lo que se inserta detrás de una pastilla para poder
 *  seguir escribiendo. Al guardar vuelve a ser un espacio común. */
const NBSP = " "

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Qué dice la pastilla: la etiqueta humana del dato. */
function etiquetaDe(raw: string, campos: CampoCertificado[]): { texto: string; opcional: boolean; ayuda: string } {
  const clave = raw.match(/\{\{(\w+)\}\}/)?.[1] ?? ""
  const campo = campos.find((c) => c.key === clave)
  const opcional = raw.startsWith("[[")

  // El texto que acompaña al dato dentro del bloque opcional (", DNI") no
  // entra en la pastilla: la haría larguísima. Va en el título, al pasar el
  // mouse, y se imprime junto con el dato.
  const acompaña = opcional
    ? raw.replace(/^\[\[|\]\]$/g, "").replace(/\{\{\w+\}\}/, "").replace(/\s+/g, " ").trim()
    : ""

  return {
    texto: campo?.label ?? clave,
    opcional,
    ayuda: opcional
      ? `Se imprime como «${acompaña} ${campo?.label ?? clave}» y desaparece entero si el dato está vacío`
      : `Se reemplaza por ${campo?.label ?? clave}`,
  }
}

function pastillaHtml(raw: string, campos: CampoCertificado[]): string {
  const { texto, opcional, ayuda } = etiquetaDe(raw, campos)
  const punto = opcional
    ? '<span class="h-1.5 w-1.5 rounded-full bg-[#9A8BC2]"></span>'
    : ""
  return (
    `<span contenteditable="false" data-raw="${escaparHtml(raw).replace(/"/g, "&quot;")}"` +
    ` title="${escaparHtml(ayuda).replace(/"/g, "&quot;")}" class="${CLASES_PASTILLA}">` +
    `${punto}${escaparHtml(texto)}</span>`
  )
}

/** Texto guardado → HTML con pastillas. */
function aHtml(valor: string, campos: CampoCertificado[]): string {
  return (valor || "")
    .split(TOKEN)
    .map((parte) =>
      ES_TOKEN.test(parte)
        ? pastillaHtml(parte, campos)
        : escaparHtml(parte).replace(/\n/g, "<br>"),
    )
    .join("")
}

/** HTML del editor → texto guardado. */
function serializar(raiz: HTMLElement | null): string {
  if (!raiz) return ""
  let salida = ""

  const recorrer = (nodo: Node) => {
    nodo.childNodes.forEach((hijo) => {
      if (hijo.nodeType === Node.TEXT_NODE) {
        salida += hijo.textContent ?? ""
        return
      }
      if (!(hijo instanceof HTMLElement)) return

      const raw = hijo.dataset.raw
      if (raw) {
        salida += raw
        return
      }
      if (hijo.tagName === "BR") {
        salida += "\n"
        return
      }
      // El navegador envuelve cada renglón nuevo en un div: eso es un salto.
      if ((hijo.tagName === "DIV" || hijo.tagName === "P") && salida && !salida.endsWith("\n")) {
        salida += "\n"
      }
      recorrer(hijo)
    })
  }

  recorrer(raiz)
  // El espacio duro se usa para poder escribir después de una pastilla; al
  // guardar vuelve a ser un espacio común.
  return salida.replace(new RegExp(NBSP, "g"), " ")
}

export default function CertificateBodyEditor({
  value,
  onChange,
  campos,
}: {
  value: string
  onChange: (valor: string) => void
  campos: CampoCertificado[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Última versión que salió de acá. Sirve para no repintar el DOM con lo
  // mismo que el usuario acaba de tipear.
  const propio = useRef<string>("")

  useEffect(() => {
    if (!ref.current || value === propio.current) return
    ref.current.innerHTML = aHtml(value, campos)
    propio.current = value
  }, [value, campos])

  const emitir = () => {
    const texto = serializar(ref.current)
    propio.current = texto
    onChange(texto)
  }

  /** Mete una pastilla donde está el cursor. */
  const insertar = (campo: CampoCertificado) => {
    const raiz = ref.current
    if (!raiz) return
    raiz.focus()

    const seleccion = window.getSelection()
    const molde = document.createElement("div")
    molde.innerHTML = pastillaHtml(`{{${campo.key}}}`, campos)
    const pastilla = molde.firstElementChild
    if (!pastilla) return

    // Espacio duro después: sin esto el cursor queda pegado a la pastilla y
    // no hay forma de seguir escribiendo.
    const espacio = document.createTextNode(NBSP)

    let rango: Range
    if (seleccion?.rangeCount && raiz.contains(seleccion.anchorNode)) {
      rango = seleccion.getRangeAt(0)
      rango.deleteContents()
    } else {
      rango = document.createRange()
      rango.selectNodeContents(raiz)
      rango.collapse(false)
    }

    rango.insertNode(espacio)
    rango.insertNode(pastilla)

    const despues = document.createRange()
    despues.setStartAfter(espacio)
    despues.collapse(true)
    seleccion?.removeAllRanges()
    seleccion?.addRange(despues)

    emitir()
  }

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitir}
        onBlur={emitir}
        onPaste={(e) => {
          // Texto plano: pegar desde Word traería su HTML y rompería todo.
          e.preventDefault()
          const plano = e.clipboardData.getData("text/plain")
          document.execCommand("insertText", false, plano)
        }}
        className="min-h-[150px] w-full whitespace-pre-wrap break-words rounded-md border border-input bg-background px-3 py-2 text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-400">Insertar:</span>
        {campos.map((campo) => (
          <button
            key={campo.key}
            type="button"
            onClick={() => insertar(campo)}
            className="rounded-full bg-[#9A8BC2]/15 px-2.5 py-1 text-xs font-medium text-[#5F5088] transition hover:bg-[#9A8BC2]/30"
          >
            {campo.label}
          </button>
        ))}
      </div>
    </div>
  )
}
