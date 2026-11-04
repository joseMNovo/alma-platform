/**
 * La edad, calculada desde la fecha de nacimiento.
 *
 * Antes la edad era una COLUMNA aparte (`voluntarios.age`), cargada a mano en
 * un campo al lado del de la fecha de nacimiento. Dos problemas, los dos
 * pasando ya:
 *
 *   · Se congelaba. El número que alguien tipeó el día del alta seguía ahí
 *     años después: una persona anotada en 2024 con 40 seguía figurando con
 *     40, y la pantalla no daba ninguna pista de cuándo había sido cierto.
 *   · Se podían contradecir. Nada impedía guardar 1990 en la fecha y 25 en la
 *     edad; eran dos campos de texto libre sin relación entre sí.
 *
 * La edad es un dato DERIVADO. Guardarla es guardar algo que se vuelve falso
 * solo, mientras que la fecha de nacimiento no cambia nunca. Ahora se calcula
 * acá y la columna `age` ya no se escribe ni se lee.
 *
 * Quien no tenga fecha de nacimiento no muestra nada: es preferible el vacío
 * —que se nota y se completa— a un número viejo que nadie sabe de cuándo es.
 */

/**
 * Años cumplidos, o `null` si no hay fecha utilizable.
 *
 * Acepta lo que devuelve la API: `"1985-07-28"` o un ISO completo con hora.
 * Devuelve `null` —y no 0, ni NaN— ante cualquier cosa que no sirva: vacío,
 * `null`, texto inválido, o una fecha futura (que casi siempre es un error de
 * tipeo, un año tocado con la flechita del teclado).
 */
export function edadDesde(nacimiento?: string | null): number | null {
  const crudo = (nacimiento ?? "").slice(0, 10)
  // La fecha tiene que venir completa. Un `new Date("")` da Invalid Date, pero
  // un `new Date("2024")` da el 1 de enero: pasaría el control y mentiría.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(crudo)) return null

  const [anio, mes, dia] = crudo.split("-").map(Number)

  // Partido en números y no con `new Date("1985-07-28")`: ese constructor
  // interpreta la cadena como UTC y después la muestra en la zona local, así
  // que en Argentina (UTC-3) el 28 se vuelve el 27 a las 21:00. En un cumple
  // eso es un día entero de diferencia.
  const nace = new Date(anio, mes - 1, dia)
  if (nace.getFullYear() !== anio || nace.getMonth() !== mes - 1 || nace.getDate() !== dia) {
    // El 31 de febrero no existe: el constructor lo corre al 2 o 3 de marzo
    // en vez de fallar. Si lo que salió no es lo que entró, la fecha no era.
    return null
  }

  const hoy = new Date()
  let edad = hoy.getFullYear() - anio

  // Restar los años no alcanza: hasta que llega el cumpleaños, todavía se
  // tiene la edad del año pasado.
  const mesActual = hoy.getMonth() + 1
  const diaActual = hoy.getDate()
  if (mesActual < mes || (mesActual === mes && diaActual < dia)) edad -= 1

  // Una fecha futura da negativo; alguien de 130 años es un año mal tipeado.
  if (edad < 0 || edad > 120) return null

  return edad
}

/** `"43 años"`, `"1 año"`, o `null` para que quien llama decida qué poner. */
export function edadTexto(nacimiento?: string | null): string | null {
  const n = edadDesde(nacimiento)
  if (n === null) return null
  return `${n} ${n === 1 ? "año" : "años"}`
}

/** La fecha como se escribe acá: `"28/07/1985"`. */
export function fechaCorta(nacimiento?: string | null): string | null {
  const crudo = (nacimiento ?? "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(crudo)) return null
  return crudo.split("-").reverse().join("/")
}
