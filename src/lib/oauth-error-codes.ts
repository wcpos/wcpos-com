export const OAUTH_ERROR_CODES = [
  'account_security_hold',
  'oauth_failed',
  'oauth_callback_failed',
  'oauth_provider_error',
  'oauth_code_missing',
  'oauth_state_missing',
  'oauth_token_exchange_failed',
  'oauth_access_token_missing',
  'oauth_user_fetch_failed',
  'oauth_email_missing',
  'oauth_email_unverified',
  'oauth_identity_update_failed',
  'oauth_registration_not_supported',
] as const

export type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number]

const OAUTH_ERROR_CODE_SET = new Set<string>(OAUTH_ERROR_CODES)

export function isOAuthErrorCode(value: unknown): value is OAuthErrorCode {
  return typeof value === 'string' && OAUTH_ERROR_CODE_SET.has(value)
}
