import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        d5: {
          bg: "#0D0D0D",
          surface: "#1A1A1A",
          "surface-2": "#222222",
          border: "#2A2A2A",
          gold: "#C9A84C",
          "gold-light": "#DFC16E",
          muted: "#6B7280",
          text: "#F9FAFB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
}

export default config
