import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare, hash } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // In development, allow any user to sign in
        if (process.env.NODE_ENV === 'development') {
          let user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          // If user doesn't exist, create them
          if (!user) {
            const hashedPassword = await hash(credentials.password, 10);
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                passwordHash: hashedPassword,
                role: 'CUSTOMER', // Default role
              }
            });
          }

          // In development, accept any password
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        }

        // Production authentication logic
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    session: ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          role: token.role,
        }
      };
    },
    jwt: ({ token, user }) => {
      if (user) {
        return {
          ...token,
          role: user.role,
        };
      }
      return token;
    }
  }
}; 