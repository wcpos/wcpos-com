'use client'

import { useTranslations } from 'next-intl'
import type { CheckoutFailureMessages } from '../checkout-safety'

export function useCheckoutFailureMessages(): CheckoutFailureMessages {
  const t = useTranslations('pro.checkout.errors')

  return {
    genericPaymentFailed: t('genericPaymentFailed'),
    genericCardFailed: t('genericCardFailed'),
    unexpectedPaymentStatus: t('unexpectedPaymentStatus'),
    orderPending: t('orderPending'),
    stripeDeclines: {
      insufficientFunds: t('stripeDeclines.insufficientFunds'),
    },
    stripeCodes: {
      cardDeclined: t('stripeCodes.cardDeclined'),
      expiredCard: t('stripeCodes.expiredCard'),
      incorrectCvc: t('stripeCodes.incorrectCvc'),
      invalidCvc: t('stripeCodes.invalidCvc'),
      incorrectNumber: t('stripeCodes.incorrectNumber'),
      invalidNumber: t('stripeCodes.invalidNumber'),
      invalidExpiryMonth: t('stripeCodes.invalidExpiryMonth'),
      invalidExpiryYear: t('stripeCodes.invalidExpiryYear'),
      processingError: t('stripeCodes.processingError'),
      authenticationFailure: t('stripeCodes.authenticationFailure'),
      authenticationRequired: t('stripeCodes.authenticationRequired'),
    },
  }
}
