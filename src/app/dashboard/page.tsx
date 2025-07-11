import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { PublicDashboard } from '@/components/dashboard/PublicDashboard'

export default async function DashboardPage() {
  const session = await getServerSession()

  // If no session, show public dashboard
  if (!session) {
    return <PublicDashboard />
  }

  // Redirect authenticated users to their role-specific dashboard
  const role = session.user.role.toLowerCase()
  redirect(`/${role}/dashboard`)
} 