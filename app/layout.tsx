import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ALMA - Alzheimer Rosario",
  description: "Plataforma de gestión para ALMA",
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
      </head>
      <body className={inter.className} style={{ fontFamily: '"Raleway", Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
