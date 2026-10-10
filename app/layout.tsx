import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Comunidad ALMA",
  description: "Comunidad ALMA — plataforma de gestión de ALMA Rosario",
  icons: {
    icon: "/images/flor.png",
    shortcut: "/images/flor.png",
    apple: "/images/flor.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/images/flor.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/flor.png" />
        <meta name="theme-color" content="#00bcd4" />
        <meta name="msapplication-TileImage" content="/images/flor.png" />
        <meta name="msapplication-TileColor" content="#00bcd4" />

        {/*
          Atrapar `beforeinstallprompt` ANTES de que React se monte.

          Chrome dispara ese evento una sola vez y apenas carga la página —
          normalmente antes de que hidrate React. El componente que dibuja el
          botón lo escuchaba desde un `useEffect`, o sea después, así que
          bastante seguido llegaba tarde y el evento ya se había perdido: el
          botón "Instalar la app" simplemente no aparecía, sin ningún error y
          sin forma de que la persona se diera cuenta de por qué.

          Este script corre en el `<head>`, antes que cualquier otra cosa, y
          deja el evento guardado en `window`. El componente lo busca ahí al
          montarse. Ver components/pwa/instalar-app.tsx.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){" +
              "e.preventDefault();window.__almaInstalar=e;" +
              "window.dispatchEvent(new Event('alma:instalable'))});",
          }}
        />
      </head>
      <body className={inter.className} style={{ fontFamily: '"Raleway", Helvetica, Arial, sans-serif' }}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
