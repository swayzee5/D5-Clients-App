import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { pool } from "@/lib/db"
import { z } from "zod"
import { authConfig } from "@/auth.config"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        try {
          const result = await pool.query(
            "SELECT id, email, password_hash, first_name, last_name, is_active, is_blocked FROM clients WHERE email = $1",
            [email.toLowerCase().trim()]
          )

          const user = result.rows[0]
          if (!user || !user.is_active || user.is_blocked) return null

          const isValid = await bcrypt.compare(password, user.password_hash)
          if (!isValid) return null

          return {
            id: user.id as string,
            email: user.email as string,
            name: `${user.first_name} ${user.last_name}`,
          }
        } catch (error) {
          console.error("[Auth] Database error:", error)
          return null
        }
      },
    }),
  ],
})
