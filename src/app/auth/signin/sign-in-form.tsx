'use client'

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignInForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showMfa, setShowMfa] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const mfaCode = formData.get('mfaCode') as string | null

    try {
      console.log('Attempting sign-in with:', { email, password: '***' })
      
      const result = await signIn('credentials', {
        email,
        password,
        mfaCode,
        redirect: false,
      })
      
      console.log('Sign-in result:', result)

      if (result?.error === 'MFA code required') {
        setShowMfa(true)
        setLoading(false)
        return
      }

      if (result?.error) {
        console.error('Sign-in error:', result.error)
        setError(result.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (result?.ok) {
        console.log('Sign-in successful, redirecting to home page')
        router.push('/')
        router.refresh()
      } else {
        console.log('Sign-in failed - no error but not ok')
        setError('Sign-in failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {process.env.NEXT_PUBLIC_ENV === 'development' && (
        <div className="mb-4 rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Development Mode
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>You can sign in with any Gmail address and any password.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
            placeholder="Email address"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
            placeholder="Password"
          />
        </div>
      </div>

      {showMfa && (
        <div>
          <label htmlFor="mfaCode" className="sr-only">
            MFA Code
          </label>
          <input
            id="mfaCode"
            name="mfaCode"
            type="text"
            required
            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
            placeholder="Enter your MFA code"
          />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
    </>
  )
}
