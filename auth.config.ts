import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string } }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }: { session: Record<string, unknown> & { user?: Record<string, unknown> }; token: Record<string, unknown> }) {
      if (token && session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
