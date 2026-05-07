import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/LoginForm"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Connexion",
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-d5-bg flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        {/* Photo coach — petite, entière, centrée */}
        <div className="flex justify-center mb-6">
          <div className="relative w-36 h-48 rounded-2xl overflow-hidden border border-d5-border shadow-lg">
            <Image
              src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/image00002.png"
              alt="Coach D5"
              fill
              className="object-cover object-top"
              priority
            />
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white mb-5 overflow-hidden shadow-md">
            <Image
              src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/Logo%20D5.PNG"
              alt="D5 Coaching"
              width={72}
              height={72}
              className="object-contain p-1"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">D5 Coaching</h1>
          <p className="text-d5-muted mt-1.5 text-sm">Ton espace personnel</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
