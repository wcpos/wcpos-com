import { NextRequest, NextResponse } from 'next/server'
import { UnifiedCustomerService } from '@/services/customer/unified-customer-service'
import { SessionService } from '@/services/core/auth/session-service'

/**
 * Update Customer Profile API
 * 
 * Updates customer profile information in both wcpos-com and MedusaJS systems.
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await SessionService.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { firstName, lastName, phone } = body

    // Validate input
    if (!firstName && !lastName && !phone) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 }
      )
    }

    // Update customer profile
    const result = await UnifiedCustomerService.updateCustomerProfile(
      session.userId,
      {
        firstName,
        lastName,
        phone,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update profile' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      customer: result.user,
    })

  } catch (error) {
    console.error('[API] Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get Current Customer Profile
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await SessionService.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current customer
    const customer = await UnifiedCustomerService.getCurrentCustomer()
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      customer,
    })

  } catch (error) {
    console.error('[API] Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}