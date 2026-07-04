// Minimum length for NEW passwords (register, reset). Length only — no
// complexity rules. The login route must never enforce this: accounts that
// predate the policy may have shorter passwords and must still sign in.
export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`

export function isPasswordTooShort(password: string): boolean {
  return password.length < MIN_PASSWORD_LENGTH
}
