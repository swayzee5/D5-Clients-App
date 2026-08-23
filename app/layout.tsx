import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: {
    default: "D5 Coaching",
    template: "%s — D5 Coaching",
  },
  description: "Ton espace personnel D5 Coaching",
  // Sans manifeste, un raccourci ajouté à l'écran d'accueil rouvre simplement
  // le navigateur avec sa barre d'adresse. Avec lui, l'app s'ouvre en plein
  // écran, avec son icône et son nom — et Chrome propose l'installation.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "D5 Coaching",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS ne lit pas le manifeste : c'est cette balise qui donne l'icône
    // quand un client ajoute le site à son écran d'accueil depuis Safari.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D0D0D",
  // Obligatoire pour que env(safe-area-inset-*) renvoie une valeur non nulle.
  // Dans l'app native Capacitor, la meta apple-mobile-web-app-status-bar-style
  // est ignorée : c'est la seule façon de décaler le header sous l'heure.
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} font-sans bg-d5-bg text-white antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
