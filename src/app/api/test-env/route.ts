import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  })
}
