import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/LoginForm"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Connexion",
}

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-5 py-12 overflow-hidden">
      {/* Photo de fond */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/image00002.png"
          alt=""
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-block w-24 h-24 rounded-3xl overflow-hidden mb-5 shadow-lg">
            <Image
              src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/Logo%20D5%20App.jpeg"
              alt="D5 Coaching"
              width={96}
              height={96}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">D5 Coaching</h1>
          <p className="text-white/60 mt-1.5 text-sm">Ton espace personnel</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
