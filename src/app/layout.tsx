import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '../providers/auth-provider'
import { Toaster } from '../components/ui/toaster'
import './globals.css'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Health Insurance Help Desk',
  description: 'Your trusted health insurance assistant',
  icons: {
    icon: '/icon.svg'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
} 