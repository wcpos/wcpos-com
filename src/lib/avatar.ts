function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isLikelyAvatarUrl(value: string): boolean {
  if (!value) return false
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:image/')
  )
}

function firstAvatarUrlInRecord(
  record: Record<string, unknown>,
  depth: number = 0
): string {
  if (depth > 3) return ''

  const directKeys = [
    'oauth_avatar_url',
    'avatar_url',
    'avatarUrl',
    'picture',
    'image',
    'image_url',
    'photo_url',
    'profile_image_url',
  ]

  for (const key of directKeys) {
    const candidate = asString(record[key])
    if (isLikelyAvatarUrl(candidate)) {
      return candidate
    }
  }

  for (const value of Object.values(record)) {
    if (!isRecord(value)) continue
    const nested = firstAvatarUrlInRecord(value, depth + 1)
    if (nested) return nested
  }

  return ''
}

export function getConnectedAvatarUrlFromMetadata(
  metadata: Record<string, unknown> | undefined
): string {
  if (!isRecord(metadata)) return ''
  return firstAvatarUrlInRecord(metadata)
}

export function getConnectedAvatarUrlFromUserMetadata(
  userMetadata: Record<string, string> | undefined
): string {
  if (!userMetadata) return ''

  const direct = [
    userMetadata.oauth_avatar_url,
    userMetadata.avatar_url,
    userMetadata.picture,
    userMetadata.image,
    userMetadata.image_url,
    userMetadata.photo_url,
    userMetadata.profile_image_url,
  ].find((value) => isLikelyAvatarUrl(asString(value)))

  return asString(direct)
}
