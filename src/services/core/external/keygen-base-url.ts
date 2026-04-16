const ALLOWED_KEYGEN_HOSTS = new Set(['license.wcpos.com'])
const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

type NodeEnvironment = 'development' | 'production' | 'test'

export function getKeygenBaseUrl(
  host: string,
  nodeEnv: NodeEnvironment
): string {
  const trimmedHost = host.trim()

  if (!trimmedHost || trimmedHost.includes('://')) {
    throw new Error('KEYGEN_HOST must be a hostname only')
  }

  const parsedUrl = new URL(`https://${trimmedHost}`)

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('KEYGEN_HOST must be a hostname only')
  }

  const isAllowedProductionHost = ALLOWED_KEYGEN_HOSTS.has(parsedUrl.hostname)
  const isAllowedLocalHost =
    nodeEnv !== 'production' && ALLOWED_LOCAL_HOSTS.has(parsedUrl.hostname)

  if (nodeEnv === 'production' && parsedUrl.port) {
    throw new Error('KEYGEN_HOST must not include a port in production')
  }

  if (!isAllowedProductionHost && !isAllowedLocalHost) {
    throw new Error('KEYGEN_HOST must be a trusted Keygen host')
  }

  return parsedUrl.origin
}
