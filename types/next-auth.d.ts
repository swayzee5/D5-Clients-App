import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      isRebootOnly: boolean
    }
  }

  interface User {
    id?: string
    isRebootOnly?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isRebootOnly: boolean
  }
}
