import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Raleway", "Helvetica", "Arial", "sans-serif"],
        gotham: ["Gotham Rounded", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        /**
         * Los colores de ALMA, con nombre.
         *
         * Salen del manual «Alma 2025» (D:\Alma\mkt), muestreados del PDF:
         * la página de paleta es una imagen, así que los hex no se leen, se
         * miden sobre el píxel.
         *
         *   alma         #5ec0cf  el turquesa de la marca
         *   alma-fuerte  #04799a  el turquesa oscuro de la marca
         *   alma-oscuro  #03617b  derivado: el hover del anterior
         *
         * Por qué hacen falta dos y no uno: con texto blanco encima,
         * #5EC0CF da 2,14:1 de contraste y el mínimo legible es 4,5:1. Se ve
         * lindo en una captura y no se lee al sol. #04799A da 4,99:1 y pasa,
         * así que el claro queda para bandas, chips, bordes, fondos e íconos,
         * y el oscuro para todo lo que se toca.
         *
         * OJO si alguien abre el PDF: el círculo del turquesa oscuro está
         * **mal rotulado**. Dice #F4F4F4, que es el gris claro repetido por
         * error. El color real de ese círculo es #04799A.
         *
         * Dos valores que estuvieron acá y NO son de ALMA, por si vuelven:
         *   · #00838f — venía de estar escrito a mano en 34 archivos del
         *     código. Estar en el código no es estar en la marca.
         *   · #1a6b7a — salió de una nota vieja que lo daba como «Dark Teal».
         *     Ese valor no aparece en ninguna página del manual.
         *
         * `alma-oscuro` sí es derivado, y es el único: el manual no trae nada
         * más oscuro que #04799A y el hover necesita algo. Es el mismo color
         * con la luminosidad bajada, no un tono nuevo.
         */
        alma: {
          DEFAULT: "#5ec0cf",
          fuerte: "#04799a",
          oscuro: "#03617b",
          // Fondo tenue para seleccionados y avisos: el turquesa de marca
          // mezclado con blanco al 20%. Opaco y no `alma/10`, porque sobre
          // una tarjeta con sombra el turquesa translúcido deja ver lo de
          // abajo y el renglón seleccionado queda sucio.
          suave: "#dff2f5",
          lavanda: "#9a8bc2",
          // Gris de los textos secundarios: mails, fechas, subtítulos.
          tinta: "#5b6b78",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        /**
         * `primary` es lo que usa el <Button> por defecto: `bg-primary` con
         * `text-primary-foreground`, que es blanco al 98%.
         *
         * Estaba en #4dd0e1 —un celeste que no es de la marca y que el
         * código arrastraba de antes— y daba 1,84:1 de contraste en 36
         * botones, los que no traen clases propias. Se ve bien en una captura
         * y no se lee en la calle. Con el turquesa oscuro del manual
         * (#04799A) da 4,99:1 y pasa el mínimo.
         *
         * El celeste no se perdió: sigue siendo `alma`, que es lo que pinta
         * bandas, chips, bordes e íconos. Lo único que cambió es el color de
         * lo que se aprieta.
         */
        primary: {
          DEFAULT: "#04799a",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // El "+1" que sale de la tarjeta al tocarla en el puesto de venta.
        "sumar-uno": {
          "0%": { opacity: "0", transform: "translate(-50%, 0) scale(0.8)" },
          "25%": { opacity: "1", transform: "translate(-50%, -6px) scale(1)" },
          "100%": { opacity: "0", transform: "translate(-50%, -26px) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "sumar-uno": "sumar-uno 700ms ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
