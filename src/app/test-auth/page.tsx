'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function TestAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="mb-4">
        <p>Status: {status}</p>
        <p>Session: {JSON.stringify(session, null, 2)}</p>
      </div>

      {session ? (
        <div>
          <p>Signed in as {session.user?.email}</p>
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div>
          <p>Not signed in</p>
          <button
            onClick={() => signIn()}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  )
}
