"use client"

import { useEffect } from "react"

/**
 * Mientras hay una hoja abierta, lo de atrás no se mueve.
 *
 * ── El problema ───────────────────────────────────────────────────────
 *
 * Radix ya bloquea el scroll poniéndole `overflow: hidden` al body. En una
 * computadora alcanza. En un teléfono —y sobre todo en la PWA de iPhone— no:
 * `overflow: hidden` no frena al dedo. Lo que pasaba era esto:
 *
 *   · Arrastrabas sobre el formulario, llegabas al final de la hoja y el
 *     gesto seguía de largo hacia la página de atrás, que se movía.
 *   · Al cerrar la hoja, la lista aparecía en otra posición que cuando la
 *     abriste, y había que volver a buscar en qué fila estabas.
 *   · En iOS el rebote elástico corría la hoja entera, que es `position:
 *     fixed`, así que se despegaba de abajo y dejaba ver una franja gris.
 *
 * ── La solución ───────────────────────────────────────────────────────
 *
 * Al body se le pone `position: fixed` con un `top` negativo igual a lo que
 * había scrolleado. La página queda clavada EXACTAMENTE donde estaba —se
 * sigue viendo lo mismo detrás de la hoja— y deja de existir como cosa
 * desplazable, así que el dedo no tiene a dónde empujarla. Al cerrar se
 * devuelve el scroll guardado.
 *
 * `overflow: hidden` solo no sirve porque el body sigue siendo un contenedor
 * con scroll para el motor de gestos de iOS; `position: fixed` lo saca del
 * flujo y ahí sí no hay nada que correr.
 *
 * ── Por qué el contador ───────────────────────────────────────────────
 *
 * Hay hojas que abren otra hoja encima: habilitar un acceso termina en un
 * "¿seguro?", y editar una persona puede abrir el de borrar. Si cada una
 * guardara y restaurara por su cuenta, la segunda leería `scrollY = 0`
 * (porque el body ya está fijo) y al cerrarse te mandaría al principio de la
 * lista. Con el contador, la posición se guarda cuando se abre la PRIMERA y
 * se devuelve cuando se cierra la ÚLTIMA.
 *
 * Solo en teléfono: en escritorio el bloqueo de Radix nunca dio problemas, y
 * fijar el body ahí agrega un salto al aparecer y desaparecer la barra de
 * scroll sin arreglar nada.
 */

/** Cuántas hojas hay abiertas ahora mismo. */
let abiertas = 0
/** Dónde estaba la página cuando se abrió la primera. */
let scrollGuardado = 0
/** Los estilos que tenía el body, para devolvérselos tal cual. */
let estilosPrevios: Record<string, string> = {}

const ES_TELEFONO = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches

export function useFondoQuieto(activo = true) {
  useEffect(() => {
    if (!activo || !ES_TELEFONO()) return

    const body = document.body

    if (abiertas === 0) {
      scrollGuardado = window.scrollY
      estilosPrevios = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
      }
      body.style.position = "fixed"
      body.style.top = `-${scrollGuardado}px`
      body.style.left = "0"
      body.style.right = "0"
      body.style.width = "100%"
    }
    abiertas++

    return () => {
      abiertas--
      if (abiertas > 0) return

      body.style.position = estilosPrevios.position ?? ""
      body.style.top = estilosPrevios.top ?? ""
      body.style.left = estilosPrevios.left ?? ""
      body.style.right = estilosPrevios.right ?? ""
      body.style.width = estilosPrevios.width ?? ""

      // `instant` y no suave: esto no es una navegación, es devolver la
      // página a donde ya estaba. Animarlo se ve como si algo se hubiera
      // movido solo.
      window.scrollTo({ top: scrollGuardado, behavior: "instant" as ScrollBehavior })
    }
  }, [activo])
}
