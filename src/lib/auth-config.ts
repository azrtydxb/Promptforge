import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { generateRandomUsername } from "@/lib/username-generator"
import type { AuthOptions, Account, Profile } from "next-auth"
import type { OAuthConfig } from "next-auth/providers/oauth"
import type { JWT } from "next-auth/jwt"
import type { Session, User } from "next-auth"

interface ZitadelProfile {
  sub: string
  email?: string
  name?: string
  email_verified?: boolean
}

const providers: AuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      const user = await db.user.findUnique({
        where: {
          email: credentials.email
        }
      })

      if (!user || !user.password) {
        return null
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

      if (!isPasswordValid) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    }
  }),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
    : []),
]

// Zitadel OIDC (Kryton SSO) — additive: only enabled when configured, so local
// dev / environments without Zitadel creds keep working with just credentials auth.
if (process.env.ZITADEL_ISSUER && process.env.ZITADEL_CLIENT_ID) {
  providers.push({
    id: "zitadel",
    name: "Kryton SSO",
    type: "oauth",
    wellKnown: `${process.env.ZITADEL_ISSUER}/.well-known/openid-configuration`,
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    clientId: process.env.ZITADEL_CLIENT_ID,
    clientSecret: process.env.ZITADEL_CLIENT_SECRET,
    checks: ["pkce", "state"],
    profile(profile: ZitadelProfile) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
      }
    },
  } as OAuthConfig<ZitadelProfile>)
}

export const authOptions: AuthOptions = {
  // Note: PrismaAdapter is incompatible with CredentialsProvider
  // adapter: PrismaAdapter(db),
  debug: process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG === 'true',
  providers,
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: User; account?: Account | null; profile?: Profile }) {
      // Zitadel (Kryton SSO) sign-ins have no local password; link/create the
      // local User by email so the credentials path is unaffected.
      if (account?.provider === "zitadel") {
        if (!user.email) {
          return false
        }

        // Only link/create a local account when Zitadel asserts the email is
        // verified. Without this check, an SSO identity could present an
        // unverified email matching an existing credentials user and
        // silently take over that account.
        const zitadelProfile = profile as ZitadelProfile | undefined
        if (zitadelProfile?.email_verified !== true) {
          return false
        }

        let localUser = await db.user.findUnique({
          where: { email: user.email },
        })

        if (!localUser) {
          let username = generateRandomUsername()
          let isUnique = false
          let attempts = 0

          while (!isUnique && attempts < 10) {
            const existingUsername = await db.user.findUnique({
              where: { username },
            })

            if (!existingUsername) {
              isUnique = true
            } else {
              username = generateRandomUsername()
              attempts++
            }
          }

          localUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email,
              username,
              // SSO users have no local password.
              password: null,
            },
          })
        }

        // Reuse the same object reference so the subsequent jwt callback sees
        // the local database id instead of the Zitadel `sub`.
        user.id = localUser.id
      }

      return true
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && token.id) {
        session.user.id = token.id
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + "/dashboard"
    },
  },
  events: {
    async createUser({ user }: { user: User }) {
      // Generate username for new users if they don't have one
      if (!user.username) {
        let username = generateRandomUsername();
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
          const existingUser = await db.user.findUnique({
            where: { username },
          });
          
          if (!existingUser) {
            isUnique = true;
          } else {
            username = generateRandomUsername();
            attempts++;
          }
        }

        if (isUnique) {
          await db.user.update({
            where: { id: user.id },
            data: { username },
          });
        }
      }
    },
  },
}