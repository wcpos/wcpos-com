// Keep the deferred chunk to the SDK code the config uses; a namespace import would pull in every integration.
import '../../sentry.client.config'
export { captureException } from '@sentry/nextjs'
