import VentaExpress from "@/components/venta/venta-express"

/**
 * `/venta` — la caja del puesto, en una sola pantalla.
 *
 * Ruta corta a propósito: va en un QR, pero sobre todo se dicta por teléfono
 * ("entrá a comunidadalma punto org punto ar barra venta").
 *
 * NO está en `PROTECTED_PATHS` del middleware, y eso es deliberado. Si lo
 * estuviera, quien no tiene sesión sería mandado a `/` y perdería la pantalla
 * — justo el rebote que esta página existe para evitar. La protección real no
 * se pierde: las APIs del stand siguen exigiendo sesión, así que sin entrar no
 * se ve ni un producto.
 */
export default function VentaPage() {
  return <VentaExpress />
}
