const GENERIC_HEADING =
  /^(?:changelog|release notes|what[’']?s new(?:\s+in\s+v?\d[\w.-]*)?)$/i

const BARE_VERSION = /^v?\d+(?:\.\d+)*$/i

function stripEmoji(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim()
}

/**
 * Strip a redundant leading heading from a GitHub release body.
 *
 * Release bodies are authored for GitHub's releases page, where the body
 * stands alone. On our site the version and date already appear in the
 * surrounding UI, so a leading "Changelog" / "What's new in 1.9.5" / bare
 * version heading is pure noise. Descriptive feature headlines are kept.
 *
 * @param body - Raw release body markdown.
 * @param version - The release's tag/version; when given, only that
 *   release's own version heading counts as redundant.
 */
export function cleanReleaseNotes(body: string, version?: string): string {
  const lines = body.split('\n')
  let start = 0
  while (start < lines.length && lines[start].trim() === '') start++

  const heading = lines[start]?.trim().match(/^#{1,6}\s+(.+?)(?:\s+#+)?$/)
  if (heading) {
    const text = stripEmoji(heading[1])
    const normalizedVersion = version?.replace(/^v/i, '')
    // With a version we only strip that release's own heading, so rolled-up
    // sub-version headings (e.g. "## 1.9.8" inside 1.9.9 notes) survive.
    const isRedundant =
      GENERIC_HEADING.test(text) ||
      (normalizedVersion !== undefined
        ? text.replace(/^v/i, '') === normalizedVersion
        : BARE_VERSION.test(text))
    if (isRedundant) {
      start++
      while (start < lines.length && lines[start].trim() === '') start++
    }
  }

  return lines.slice(start).join('\n').trim()
}
