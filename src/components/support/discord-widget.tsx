'use client'

import WidgetBot from '@widgetbot/react-embed'

export function DiscordWidget() {
  return (
    <WidgetBot
      server="711884517081612298"
      channel="1093100746372829254"
      shard="https://emerald.widgetbot.io"
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
      }}
    />
  )
}
