import { auth } from "@/auth"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isLoginPage = nextUrl.pathname === "/login"

  if (isLoginPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", nextUrl.origin))
    }
    return
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl.origin))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.png$).*)"],
}
