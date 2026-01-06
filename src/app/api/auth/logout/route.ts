import { NextResponse } from 'next/server'
import { AuthService } from '@/services/core/auth/auth-service'

export async function POST() {
  await AuthService.logout()

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

export async function GET() {
  await AuthService.logout()

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

