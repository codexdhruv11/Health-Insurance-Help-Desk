import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserNav } from './UserNav'

export function MainNav() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">HIHD</span>
            </Link>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link href="/insurance/compare">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Compare Plans
              </Button>
            </Link>
            <Link href="/claims">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Claims
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Support
              </Button>
            </Link>
            <UserNav />
          </div>
          <div className="flex md:hidden">
            <Button variant="ghost" className="text-gray-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
} 