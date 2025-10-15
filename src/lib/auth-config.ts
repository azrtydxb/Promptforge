import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { generateRandomUsername } from "@/lib/username-generator"
import type { AuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { Session, User } from "next-auth"

export const authOptions: AuthOptions = {
  // Note: PrismaAdapter is incompatible with CredentialsProvider
  // adapter: PrismaAdapter(db),
  debug: true,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('[AUTH] Authorization attempt:', { email: credentials?.email });

        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials');
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        console.log('[AUTH] User found:', { exists: !!user, hasPassword: !!user?.password });

        if (!user || !user.password) {
          console.log('[AUTH] User not found or no password');
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        console.log('[AUTH] Password valid:', isPasswordValid);

        if (!isPasswordValid) {
          console.log('[AUTH] Invalid password');
          return null
        }

        console.log('[AUTH] Login successful for user:', user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  callbacks: {
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