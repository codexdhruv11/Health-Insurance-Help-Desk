import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserNav } from './UserNav'

export function MainNav() {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="font-bold text-xl text-blue-600">
          Health Insurance Help Desk
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <Link href="/insurance/compare">
            <Button variant="ghost">Compare Plans</Button>
          </Link>
          <Link href="/claims">
            <Button variant="ghost">Claims</Button>
          </Link>
          <Link href="/support">
            <Button variant="ghost">Support</Button>
          </Link>
          <UserNav />
        </div>
      </div>
    </nav>
  )
} 