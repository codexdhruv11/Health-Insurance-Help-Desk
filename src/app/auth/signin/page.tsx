import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SignInForm from './sign-in-form'

export const dynamic = 'force-dynamic'

export default async function SignIn() {
  const session = await getServerSession(authOptions)

  // Redirect authenticated users to their dashboard
  if (session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access the Health Insurance Help Desk
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
} 