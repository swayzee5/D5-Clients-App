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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "D5 Coaching",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D0D0D",
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
