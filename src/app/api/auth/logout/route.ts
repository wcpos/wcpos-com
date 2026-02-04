import { NextResponse } from 'next/server'
import { logout } from '@/lib/medusa-auth'

export async function POST(request: Request) {
  await logout()
  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, 303)
}
