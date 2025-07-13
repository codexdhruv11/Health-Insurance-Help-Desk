'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { UserNav } from './UserNav'
import { CoinBalance } from '@/components/ui/coin-balance'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function MainNav() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigationLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/plans', label: 'Plans' },
    { href: '/hospitals', label: 'Hospitals' },
    { href: '/quote', label: 'Get Quote' },
    ...(session ? [
      { href: '/coins', label: 'Coins' },
      { href: '/rewards', label: 'Rewards' },
      { href: '/referral', label: 'Refer & Earn' },
    ] : []),
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">Health Insurance Help Desk</span>
        </Link>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          className="ml-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1">
          <div className="mx-6 flex items-center space-x-4 lg:space-x-6">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Auth/User Section */}
        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session ? (
            <>
              <CoinBalance variant="compact" />
              <UserNav user={session.user} />
            </>
          ) : (
            <div className="hidden md:flex md:items-center md:space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-background md:hidden">
          <div className="container divide-y divide-border">
            <div className="flex flex-col space-y-4 py-4">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {!session && (
              <div className="flex flex-col space-y-4 py-4">
                <Link href="/auth/signin">
                  <Button variant="ghost" className="w-full justify-start">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="w-full justify-start">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
} 