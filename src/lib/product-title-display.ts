export type KnownProductTitleKey = 'yearly' | 'lifetime'

export type KnownProductTitleMessages = Record<KnownProductTitleKey, string>

export function knownProductTitleKey(title: string): KnownProductTitleKey | null {
  const normalized = title.trim().toLowerCase()
  if (/^wcpos pro\s*(?:\(|-|–)?\s*yearly\)?$/.test(normalized)) {
    return 'yearly'
  }
  if (/^wcpos pro\s*(?:\(|-|–)?\s*lifetime\)?$/.test(normalized)) {
    return 'lifetime'
  }
  return null
}

export function localizeKnownProductTitle(
  title: string,
  messages: KnownProductTitleMessages
): string {
  const key = knownProductTitleKey(title)
  return key ? messages[key] : title
}
