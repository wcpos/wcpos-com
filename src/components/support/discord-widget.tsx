'use client'

// The channel embed needs no API client query string.
const WIDGETBOT_SRC = 'https://emerald.widgetbot.io/channels/711884517081612298/1093100746372829254/'

export function DiscordWidget() {
  return (
    <iframe
      src={WIDGETBOT_SRC}
      title="Discord chat embed"
      allow="clipboard-write; fullscreen"
      loading="lazy"
      className="block h-full w-full border-0 bg-[#36393e]"
    />
  )
}
