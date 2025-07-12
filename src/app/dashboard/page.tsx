import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import PublicDashboard from '@/components/dashboard/PublicDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  // If user is authenticated, redirect to their respective dashboard
  if (session) {
    switch (session.user.role) {
      case UserRole.CUSTOMER:
        redirect('/customer/dashboard')
      case UserRole.AGENT:
        redirect('/agent/dashboard')
      case UserRole.ADMIN:
        redirect('/admin/dashboard')
      case UserRole.MANAGER:
        redirect('/manager/dashboard')
      default:
        redirect('/auth/signin')
    }
  }

  // For anonymous users, show a public version of the dashboard.
  return <PublicDashboard />
} 