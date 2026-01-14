import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/core/auth/auth-service'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Registration failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user?.id,
        email: result.user?.email,
        firstName: result.user?.firstName,
        lastName: result.user?.lastName,
      },
    })
  } catch (error) {
    console.error('[Auth] Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}