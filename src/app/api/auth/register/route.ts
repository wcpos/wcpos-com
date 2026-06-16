import { NextResponse } from 'next/server'
import { register, setAuthToken } from '@/lib/medusa-auth'
import { ApiError } from '@/lib/api/errors'
import { toErrorResponse } from '@/lib/api/to-error-response'

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
    // Typed domain errors (AccountExistsError -> 409 ACCOUNT_EXISTS) carry their
    // own status/code via the adapter. Everything else is an unclassified
    // registration failure surfaced as a 400 with its message (unchanged).
    if (error instanceof ApiError) {
      return toErrorResponse(error)
    }
    const message =
      error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
