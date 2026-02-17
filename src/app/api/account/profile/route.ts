import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'

interface ProfilePayload {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
}

function normalizeField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim()
}

export async function PATCH(request: NextRequest) {
  const currentCustomer = await getCustomer()
  if (!currentCustomer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as ProfilePayload
    const email = normalizeField(body.email)

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const payload: ProfilePayload = {
      email,
      first_name: normalizeField(body.first_name),
      last_name: normalizeField(body.last_name),
      phone: normalizeField(body.phone),
    }

    const updatedCustomer = await updateCustomer(payload)

    if (!updatedCustomer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update profile'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
