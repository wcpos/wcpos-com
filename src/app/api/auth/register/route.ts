import { NextResponse } from 'next/server'
import { register, setAuthToken } from '@/lib/medusa-auth'

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { token, customer } = await register({
      email,
      password,
      firstName,
      lastName,
    })
    await setAuthToken(token)

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Registration failed'

    // Medusa returns "Identity with email already exists" or similar for duplicates
    const isDuplicate =
      message.toLowerCase().includes('already exists') ||
      message.toLowerCase().includes('duplicate')
    const status = isDuplicate ? 409 : 400

    return NextResponse.json(
      {
        error: message,
        ...(isDuplicate && { code: 'ACCOUNT_EXISTS' }),
      },
      { status }
    )
  }
}
