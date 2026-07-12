import { NextResponse } from 'next/server'

export type StoreCartErrorCode =
  | 'read_only_inspection'
  | 'authentication_required'
  | 'rate_limited'
  | 'rate_limit_unavailable'
  | 'invalid_request_body'
  | 'cart_id_required'
  | 'cart_not_found'
  | 'failed_create_cart'
  | 'failed_update_cart'
  | 'failed_fetch_cart'
  | 'internal'
  | 'quantity_must_be_one'
  | 'current_pro_offer_required'
  | 'current_pro_offer_cart_required'
  | 'failed_add_item'
  | 'payment_collection_mismatch'
  | 'failed_create_payment_collection'
  | 'failed_create_payment_session'
  | 'failed_complete_cart'
  | 'order_pending'
  | 'paypal_order_id_required'
  | 'failed_capture_paypal_order'

export function storeCartErrorResponse(
  errorCode: StoreCartErrorCode,
  status: number,
  extra?: Record<string, string>
) {
  return NextResponse.json({ errorCode, ...extra }, { status })
}
