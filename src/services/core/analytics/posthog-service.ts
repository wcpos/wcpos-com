export type ProCheckoutVariant = 'control' | 'value_copy'

type VariantEvaluationResult = string | boolean | null | undefined

type ResolveProCheckoutVariantOptions = {
  distinctId: string
  analyticsEnabled?: boolean
  timeoutMs?: number
  evaluate?: (distinctId: string) => Promise<VariantEvaluationResult>
}

const DEFAULT_TIMEOUT_MS = 150

function normalizeVariant(value: VariantEvaluationResult): ProCheckoutVariant {
  if (value === 'value_copy') {
    return 'value_copy'
  }

  return 'control'
}

export async function resolveProCheckoutVariant({
  distinctId,
  analyticsEnabled = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  evaluate,
}: ResolveProCheckoutVariantOptions): Promise<ProCheckoutVariant> {
  if (!analyticsEnabled) {
    return 'control'
  }

  const evaluateVariant = evaluate ?? (async () => 'control')

  try {
    const timeoutPromise = new Promise<'__timeout__'>((resolve) => {
      setTimeout(() => resolve('__timeout__'), timeoutMs)
    })

    const evaluation = await Promise.race([
      evaluateVariant(distinctId),
      timeoutPromise,
    ])

    if (evaluation === '__timeout__') {
      return 'control'
    }

    return normalizeVariant(evaluation)
  } catch {
    return 'control'
  }
}
