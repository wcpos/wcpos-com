const LOOPBACK_HOST_PATTERN =
  /^(?:(?:localhost|127\.0\.0\.1)(?::\d+)?|\[::1\](?::\d+)?)$/

/** Accept only a literal loopback hostname, optionally followed by a port. */
export function isLoopbackHost(host: string | null | undefined): boolean {
  return LOOPBACK_HOST_PATTERN.test((host ?? '').trim().toLowerCase())
}
