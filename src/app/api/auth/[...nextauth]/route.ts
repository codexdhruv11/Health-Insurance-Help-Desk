import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '../../../../lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    role: UserRole
    name?: string
  }
  
  interface Session {
    user: {
      id: string
      email: string
      role: UserRole
      name?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    name?: string
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().optional(),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const { email, password, mfaCode } = loginSchema.parse(credentials)

          // Find user
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              customer: true,
              supportAgent: true,
            },
          })

          if (!user || !user.passwordHash) {
            return null
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash)
          if (!isValid) {
            return null
          }

          // Check MFA if enabled
          if (user.mfaEnabled) {
            if (!mfaCode) {
              throw new Error('MFA code required')
            }
            // TODO: Implement MFA verification
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.customer?.firstName || user.supportAgent?.firstName || undefined,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours instead of 30 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Only store essential data in the token
        token.role = user.role
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      // Only include essential user data in the session
      return {
        ...session,
        user: {
          id: token.sub!,
          email: session.user.email,
          role: token.role as UserRole,
          name: token.name as string | undefined,
        },
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 