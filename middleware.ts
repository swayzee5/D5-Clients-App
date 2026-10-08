import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { estRoutePublique } from "@/lib/routes-publiques"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token")

  const isLoggedIn = !!sessionToken
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", request.url))
    return NextResponse.next()
  }

  // Page d'invitation : celui qui arrive dessus n'a justement pas de compte.
  if (estRoutePublique(pathname)) return NextResponse.next()

  if (!isLoggedIn) return NextResponse.redirect(new URL("/login", request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.png$).*)"],
}
