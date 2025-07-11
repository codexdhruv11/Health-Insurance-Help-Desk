import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { UserRole } from '../../types'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  // Redirect unauthenticated users to sign in
  if (!session) {
    redirect('/auth/signin')
  }

  // Redirect users based on their role
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

  // This will never be rendered due to redirects
  return null
} 