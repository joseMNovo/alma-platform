/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Probar desde el celular contra la IP de la LAN. Sin esto, Next 15 avisa
   * que el pedido a /_next/* es cross-origin y en una versión futura lo va a
   * bloquear. Es SOLO para desarrollo: en producción todo sale del dominio.
   *
   * Los rangos privados cubren cualquier IP que te dé el router.
   */
  allowedDevOrigins: ["192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // youtube.com + s.ytimg.com: la IFrame API del player de capacitaciones
              // (se carga desde el cliente para saber la posición del video).
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // i.ytimg.com: miniaturas de los videos.
              "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              // Sin frame-src, el iframe del player caería en default-src 'self'
              // y YouTube quedaría bloqueado: el video no se vería nunca.
              //
              // blob: es para la vista previa del certificado: el PDF llega
              // como bytes, se arma un blob en el navegador y se muestra en un
              // iframe. Sin esto el recuadro sale gris y vacío, sin más pista
              // que un aviso en la consola.
              "frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
