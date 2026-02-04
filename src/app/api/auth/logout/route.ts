import { NextResponse } from 'next/server'
import { logout } from '@/lib/medusa-auth'

export async function POST() {
  await logout()
  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  await logout()
  const url = new URL('/login', request.url)
  return NextResponse.redirect(url)
}
