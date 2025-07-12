import NextAuth from 'next-auth'
import { compare } from 'bcryptjs'
import { authenticator } from 'otplib'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().optional(),
})

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password')
        }

        try {
          // Validate input
          const { email, password, mfaCode } = loginSchema.parse(credentials)

          // Find user
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password')
          }

          // Verify password
          const isValid = await compare(password, user.passwordHash)
          if (!isValid) {
            throw new Error('Invalid email or password')
          }

          // Check MFA if enabled
          if (user.mfaEnabled) {
            if (!mfaCode) {
              throw new Error('MFA_REQUIRED')
            }

            if (!user.mfaSecret) {
              throw new Error('MFA not properly configured')
            }

            const isValidMFA = authenticator.verify({
              token: mfaCode,
              secret: user.mfaSecret,
            })

            if (!isValidMFA) {
              throw new Error('Invalid MFA code')
            }
          }

          // Return user data
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error('Invalid input data')
          }
          throw error
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role
        session.user.id = token.id
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})

export { handler as GET, handler as POST }