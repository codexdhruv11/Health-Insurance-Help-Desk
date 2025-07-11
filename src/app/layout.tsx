import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '../providers/auth-provider'
import { Toaster } from '../components/ui/toaster'
import './globals.css'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Health Insurance Help Desk',
  description: 'A secure platform for managing health insurance policies and support.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <main className="min-h-screen bg-gray-50">
          {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
} 