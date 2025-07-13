'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { UserNav } from './UserNav'
import { CoinBalance } from '@/components/ui/coin-balance'

export function MainNav() {
  const { data: session, status } = useSession()

  return (
    <nav className="border-b">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">Health Insurance Help Desk</span>
        </Link>

        {/* Main Navigation Links */}
        <div className="mx-6 flex items-center space-x-4 lg:space-x-6">
          <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
            Dashboard
          </Link>
          <Link href="/plans" className="text-sm font-medium transition-colors hover:text-primary">
            Plans
          </Link>
          <Link href="/hospitals" className="text-sm font-medium transition-colors hover:text-primary">
            Hospitals
          </Link>
          <Link href="/quote" className="text-sm font-medium transition-colors hover:text-primary">
            Get Quote
          </Link>
          {session && (
            <>
              <Link href="/coins" className="text-sm font-medium transition-colors hover:text-primary">
                Coins
              </Link>
              <Link href="/rewards" className="text-sm font-medium transition-colors hover:text-primary">
                Rewards
              </Link>
              <Link href="/referral" className="text-sm font-medium transition-colors hover:text-primary">
                Refer & Earn
              </Link>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : session ? (
            <>
              <CoinBalance variant="compact" />
              <UserNav user={session.user} />
            </>
          ) : (
            <>
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
} 