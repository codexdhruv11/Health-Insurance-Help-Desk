import React from 'react'
import { CustomerNav } from '@/components/navigation/customer-nav'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CustomerNav />
      {children}
    </>
  )
} 