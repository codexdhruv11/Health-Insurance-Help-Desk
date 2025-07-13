import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'

// Development-only auth configuration
const isDevelopment = process.env.NODE_ENV === 'development'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Auth attempt:', { email: credentials?.email, isDevelopment })
        
        if (!credentials?.email) {
          return null
        }

        // In development, accept any email/password combination
        if (isDevelopment) {
          console.log('Development mode - allowing sign in for:', credentials.email)
          return {
            id: 'dev-' + Date.now(),
            email: credentials.email,
            name: credentials.email.split('@')[0],
            role: 'CUSTOMER',
          }
        }

        // Production logic would go here
        throw new Error('Production auth not implemented')
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = user.role || 'CUSTOMER'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: isDevelopment, // Enable debug logs in development
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }