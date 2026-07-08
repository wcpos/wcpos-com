import { NextRequest, NextResponse } from 'next/server'
import {
  getCustomer,
  updateCustomer,
  type UpdateCustomerInput,
} from '@/lib/medusa-auth'
import { apiLogger } from '@/lib/logger'
import { assertViewOnly, ViewOnlyError } from '@/lib/impersonation'
import { locales, type Locale } from '@/i18n/config'

type LocaleErrorCode =
  | 'read_only_inspection'
  | 'unauthorized'
  | 'invalid_locale'
  | 'update_failed'

function errorResponse(errorCode: LocaleErrorCode, status: number): NextResponse {
  return NextResponse.json({ errorCode }, { status })
}

function supportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale)
}

export async function PATCH(request: NextRequest) {
  try {
    await assertViewOnly()
  } catch (error) {
    if (error instanceof ViewOnlyError) {
      return errorResponse('read_only_inspection', 403)
    }
    throw error
  }

  const currentCustomer = await getCustomer()
  if (!currentCustomer) {
    return errorResponse('unauthorized', 401)
  }

  try {
    const body = (await request.json()) as { locale?: unknown }
    if (!supportedLocale(body.locale)) {
      return errorResponse('invalid_locale', 400)
    }

    if (currentCustomer.metadata?.locale === body.locale) {
      return NextResponse.json({ locale: body.locale }, { status: 200 })
    }

    const payload: UpdateCustomerInput = {
      metadata: {
        locale: body.locale,
      },
    }

    await updateCustomer(payload)

    return NextResponse.json({ locale: body.locale }, { status: 200 })
  } catch (error) {
    apiLogger.error`account_locale_update_failed ${error}`

    return errorResponse('update_failed', 400)
  }
}
