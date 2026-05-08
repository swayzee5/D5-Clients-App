import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === "/login"

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl.origin))
        return true
      }

      if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl.origin))
      return true
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      if (user?.isRebootOnly !== undefined) token.isRebootOnly = user.isRebootOnly
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.isRebootOnly = token.isRebootOnly ?? false
      }
      return session
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
}
