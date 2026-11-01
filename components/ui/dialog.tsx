"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useFondoQuieto } from "@/lib/fondo-quieto"

/**
 * Clava la página de atrás mientras la hoja está abierta.
 *
 * Es un componente y no una llamada suelta adentro de `DialogContent` por una
 * razón concreta: el cuerpo de `DialogContent` se ejecuta SIEMPRE, esté la
 * hoja abierta o cerrada, porque quien la usa la escribe fija en su JSX. Lo
 * que Radix monta y desmonta según el estado es lo que va adentro del portal.
 * Así que el gancho tiene que vivir acá adentro, donde montarse significa de
 * verdad "se abrió".
 */
function FondoQuieto() {
  useFondoQuieto()
  return null
}

/**
 * ── La guarda de lo escrito ───────────────────────────────────────────
 *
 * Un formulario a medio llenar no se cierra de un toque al voleo.
 *
 * El caso real: estás cargando una ficha de encuentro, con el relato y seis
 * asistentes, rozás el costado de la pantalla y se cierra todo. No hay
 * "deshacer": lo escrito no existió nunca. En el teléfono pasa seguido,
 * porque la hoja ocupa media pantalla y la otra media es zona de cierre.
 *
 * Qué se intercepta:
 *   · tocar afuera, Escape y la X  → preguntan antes
 *   · el botón "Cancelar" del pie  → pregunta antes
 *   · guardar                      → NO pregunta
 *
 * Guardar no pasa por acá, y es a propósito: el que guarda cierra cambiando
 * `open` desde su propio estado, que no es un gesto de cierre sino el final
 * del trabajo. Preguntarle "¿descartás?" a alguien que acaba de apretar
 * Guardar sería absurdo.
 *
 * Y si no se escribió nada no hay guarda: una ventana que solo se miró se
 * cierra de un toque, como siempre.
 */
interface GuardaCtx {
  sucio: boolean
  /** Corre `accion` si está limpio; si no, pregunta primero. */
  guardar: (accion: () => void) => void
}

const Guarda = React.createContext<GuardaCtx>({
  sucio: false,
  guardar: (accion) => accion(),
})

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Menos negro que antes (80% tapaba del todo). En una hoja que ocupa
      // media pantalla, ver asomar la lista de atrás es lo que explica que
      // tocar afuera cierra.
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * El modal de la aplicación. En el teléfono es una hoja que sube desde abajo.
 *
 * ── Por qué no hay un componente nuevo ────────────────────────────────
 *
 * Hay 29 pantallas con modales. Hacer un `<Sheet>` aparte y migrarlas una por
 * una habría significado 29 oportunidades de romper algo que hoy funciona, y
 * durante la migración la mitad de la app se vería de una forma y la otra
 * mitad de otra.
 *
 * Como `Dialog` y `Sheet` son el MISMO primitivo de Radix por debajo, alcanza
 * con cambiar dónde se para `DialogContent`: pegado abajo y de lado a lado en
 * el teléfono, centrado en escritorio. Ningún llamador se tocó.
 *
 * ── Por qué el scroll vive en `DialogContent` y no en un div interno ──
 *
 * Porque los llamadores le pasan `p-0`, `gap-0`, `max-h-[90vh]` y
 * `overflow-hidden` a ESTE elemento. Si el contenido real pasara a un
 * envoltorio de adentro, todos esos ajustes quedarían apuntando a una caja
 * vacía y las pantallas completas (vista previa de encuesta, recorte de
 * imagen) se desarmaban. El precio es el truco del agarre y la X, abajo.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onInteractOutside, onEscapeKeyDown, ...props }, ref) => {
  const [sucio, setSucio] = React.useState(false)
  /** La acción de cierre que quedó esperando el "sí, descartá". */
  const [pendiente, setPendiente] = React.useState<null | (() => void)>(null)
  const refCerrar = React.useRef<HTMLButtonElement>(null)

  /**
   * ¿Se tocó algo?
   *
   * `input` cubre escribir en cualquier campo de texto; `change` cubre los
   * `<select>` y las casillas nativas. Los controles de Radix (el Select
   * lindo, el Switch) son botones y no emiten ninguno de los dos, así que se
   * miran por su `role`. No es infalible —un componente raro puede
   * escaparse—, pero el costo de errarle es que la hoja se cierre como se
   * cerraba antes, no que se trabe.
   *
   * Se marca, y no se compara contra el valor inicial, a propósito: comparar
   * exigiría conocer el formulario de cada pantalla, y acá no se conoce
   * ninguno.
   */
  const ensuciar = React.useCallback(() => setSucio(true), [])

  const tocar = React.useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement | null
    if (t?.closest('[role="option"],[role="checkbox"],[role="switch"],[role="radio"]')) {
      setSucio(true)
    }
  }, [])

  /** Corre la acción, o pregunta primero si hay algo escrito. */
  const guardar = React.useCallback(
    (accion: () => void) => {
      if (sucio) setPendiente(() => accion)
      else accion()
    },
    [sucio]
  )

  /** Cierra de verdad, por el picaporte que Radix sabe accionar. */
  const cerrarDeVerdad = React.useCallback(() => refCerrar.current?.click(), [])

  const frenar = (e: { preventDefault: () => void; defaultPrevented: boolean }) => {
    if (e.defaultPrevented || !sucio) return
    e.preventDefault()
    setPendiente(() => cerrarDeVerdad)
  }

  const valorGuarda = React.useMemo(() => ({ sucio, guardar }), [sucio, guardar])

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onInput={ensuciar}
        onChange={ensuciar}
        onClick={tocar}
        // Tocar afuera y Escape: los dos gestos con los que se pierde un
        // formulario sin querer.
        onInteractOutside={(e) => {
          onInteractOutside?.(e)
          frenar(e)
        }}
        onEscapeKeyDown={(e) => {
          onEscapeKeyDown?.(e)
          frenar(e)
        }}
        className={cn(
          // ── Teléfono: hoja pegada abajo ──────────────────────────────
          "fixed inset-x-0 bottom-0 z-50 grid w-full gap-4",
          // `max-sm:!max-w-none` no es paranoia: casi todos los llamadores
          // pasan `max-w-sm` o `max-w-md` para la ventana de escritorio, y esa
          // clase no lleva prefijo, así que también aplica en el teléfono. El
          // resultado era una hoja de 384px pegada a la izquierda, con una
          // franja gris a la derecha, en cualquier teléfono de 390px o más.
          // El `!` es para ganarle sin depender del orden en que Tailwind
          // emita las reglas; el `max-sm:` lo deja encerrado en el teléfono.
          "max-sm:!max-w-none",
          // 92dvh y no 92vh: en Safari, `vh` ignora la barra de direcciones,
          // así que el pie de la hoja quedaba tapado por el navegador.
          "max-h-[92dvh] rounded-t-[22px] border-t bg-background p-5 pt-3 shadow-lg",
          // `overflow-x-hidden` es a propósito: cualquier campo que se pase de
          // ancho se recorta en vez de habilitar arrastre lateral. Ese arrastre
          // era el bug más molesto: tocabas un campo y la hoja se iba de lado.
          "overflow-y-auto overflow-x-hidden overscroll-contain",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          // ── Escritorio: la ventana centrada de siempre ───────────────
          "sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%]",
          "sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:max-h-[85vh]",
          "sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6",
          // Devuelven la animación de zoom del centro y anulan la de abajo.
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=open]:slide-in-from-left-1/2",
          "sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        {...props}
      >
        <FondoQuieto />

        {/* El cierre que usa la guarda. Escondido: no es un botón más, es el
            picaporte que Radix sabe accionar. */}
        <DialogPrimitive.Close ref={refCerrar} className="hidden" aria-hidden tabIndex={-1} />

        {/*
          El agarre. No arrastra nada —es una marca visual— y eso es
          deliberado: implementar el arrastre para cerrar pelea con el scroll
          del contenido, y en un formulario largo el resultado es que querés
          bajar y se te cierra la hoja encima de lo que escribiste.

          Tampoco queda clavado arriba: si lo fuera, al desplazar se
          superpondría con el título del encabezado, que sí está clavado. Se ve
          al abrir, que es cuando dice lo que tiene que decir —"esto se cierra
          tirando para abajo"—, y después se va con el resto.

          El `-mb-4` cancela el espacio de la grilla que viene después, que si
          no mete 16px de aire entre el agarre y el título.
        */}
        <div
          aria-hidden
          className="mx-auto -mb-4 h-1.5 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden"
        />

        {/*
          La X, en una capa de alto cero.
          Al no ocupar lugar en la grilla, flota sobre el encabezado en vez de
          empujarlo; y al ser `sticky`, se queda arriba cuando el contenido se
          desplaza. Un formulario largo sin esto te dejaba sin botón de cerrar
          a la vista.
        */}
        <div className="sticky top-0 z-30 -mb-4 h-0 sm:static sm:z-auto sm:mb-0">
          <button
            type="button"
            onClick={() => guardar(cerrarDeVerdad)}
            className={cn(
              "absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full",
              "bg-gray-100/90 text-gray-600 backdrop-blur transition-colors",
              "hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-alma focus:ring-offset-2",
              "sm:right-4 sm:top-4 sm:h-7 sm:w-7 sm:bg-transparent sm:backdrop-blur-none sm:hover:bg-gray-100"
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>

        <Guarda.Provider value={valorGuarda}>{children}</Guarda.Provider>

        {/*
          El aviso va como hoja propia de Radix y no como un cartel absoluto
          acá adentro: en escritorio este contenido lleva `translate`, y un
          hijo `fixed` dentro de algo con `transform` se posiciona contra ese
          algo en vez de contra la pantalla. Anidando, además, Radix se encarga
          del foco y de que tocar afuera del aviso no cierre la hoja de atrás.
        */}
        <DialogPrimitive.Root
          open={!!pendiente}
          onOpenChange={(abierto) => {
            if (!abierto) setPendiente(null)
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-5 shadow-xl data-[state=open]:animate-in data-[state=open]:zoom-in-95">
              <DialogPrimitive.Title className="text-base font-semibold text-gray-900">
                ¿Descartar lo que escribiste?
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-alma-tinta">
                Lo que cargaste en este formulario se pierde y no se puede
                recuperar.
              </DialogPrimitive.Description>
              <div className="mt-4 flex gap-2">
                {/* La opción que conserva va primera y más ancha: es donde cae
                    el pulgar cuando se contesta sin leer. La que destruye es
                    roja y queda del otro lado. */}
                <button
                  type="button"
                  onClick={() => setPendiente(null)}
                  className="h-11 flex-[1.4] rounded-xl border border-gray-300 text-sm font-medium text-gray-700 transition-colors active:bg-gray-100"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const accion = pendiente
                    setPendiente(null)
                    accion?.()
                  }}
                  className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors active:bg-red-700"
                >
                  Descartar
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * El encabezado queda clavado arriba mientras se baja por el contenido, así
 * en un formulario de doce campos siempre se sabe qué se está editando.
 *
 * `pr-11` en el teléfono le deja el lugar a la X, que flota por encima.
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky top-0 z-20 -mx-5 flex flex-col space-y-1.5 bg-background px-5 pb-3 pr-11 pt-1 text-left",
      "sm:static sm:z-auto sm:m-0 sm:bg-transparent sm:p-0 sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

/**
 * El pie queda clavado abajo: el botón de guardar está siempre a la vista, al
 * alcance del pulgar, sin tener que bajar hasta el final del formulario.
 *
 * Los botones van uno al lado del otro y no apilados, con el principal al
 * doble de ancho (`flex-[2]` sobre el último). Apilados comían 100px de alto
 * en una pantalla donde el alto es lo único que falta.
 *
 * `env(safe-area-inset-bottom)` es por la barra de gestos del iPhone, que si
 * no se tiene en cuenta se come el borde inferior del botón.
 *
 * ── Por qué el pie intercepta clicks ──────────────────────────────────
 *
 * "Cancelar" cierra llamando a una función del llamador, que cambia su propio
 * estado: no pasa por ningún gesto que Radix pueda avisar. La única forma de
 * meter la guarda sin editar las 29 pantallas es acá, atajando el click en
 * fase de captura antes de que llegue al botón.
 *
 * Se mira el texto: solo un botón que diga exactamente "Cancelar" se ataja.
 * Es una convención que este código ya respetaba en todas las pantallas, y
 * errarle es barato —preguntar de más en un botón secundario— mientras que la
 * alternativa, adivinar por posición, atajaría cosas como "Enviar por mail".
 */
const DialogFooter = ({
  className,
  onClickCapture,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { sucio, guardar } = React.useContext(Guarda)

  return (
    <div
      onClickCapture={(e) => {
        onClickCapture?.(e)
        if (!sucio || e.defaultPrevented) return
        const boton = (e.target as HTMLElement | null)?.closest("button")
        if (!boton || boton.dataset.almaSinGuardia !== undefined) return
        if ((boton.textContent ?? "").trim().toLowerCase() !== "cancelar") return
        e.preventDefault()
        e.stopPropagation()
        guardar(() => boton.click())
      }}
      className={cn(
        // Sin `-mb-5`, a propósito: hay modales que se declaran
        // `overflow-hidden` con su propio armado interno (el asistente de
        // accesos, la ficha de encuentro). Ahí un margen negativo abajo empuja
        // al pie fuera de la caja y el borde inferior del botón se recorta.
        // Pegado al borde queda igual —el fondo es blanco de los dos lados— y
        // funciona en los 29 casos en vez de en 25.
        "sticky bottom-0 z-20 -mx-5 flex flex-row items-center gap-2 border-t bg-background px-5 pt-3",
        "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        "[&>*]:min-w-0 [&>*]:flex-1 [&>*:last-child]:flex-[2]",
        "sm:static sm:z-auto sm:m-0 sm:justify-end sm:border-0 sm:p-0",
        "sm:[&>*]:flex-none sm:[&>*:last-child]:flex-none sm:space-x-2",
        className
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-alma-tinta", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
