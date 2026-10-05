/**
 * Baja al disco un archivo que el backend mandó en base64.
 *
 * El backend arma el PDF y el Excel y los devuelve adentro de un JSON, que es
 * lo que sabe hablar `api-client`. Acá se vuelve a bytes y se dispara la
 * descarga.
 *
 * El `URL.revokeObjectURL` no es opcional: sin él, cada descarga deja el
 * archivo entero retenido en memoria hasta que se recarga la página. Con un
 * informe de unos MB y alguien probando rangos de fechas, se nota.
 */
export interface ArchivoDescargable {
  filename: string
  mime: string
  base64: string
}

export function descargarBase64(archivo: ArchivoDescargable) {
  const binario = atob(archivo.base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)

  const url = URL.createObjectURL(new Blob([bytes], { type: archivo.mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = archivo.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
