'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The key an order issued, drawn the Licenses way: masked in Geist Mono with
 * labelled Show key / Copy key. The full key stays one click away because the
 * order page is where customers retrieve it for plugin activation.
 */
export function OrderLicenseKey({ licenseKey }: { licenseKey: string }) {
  const t = useTranslations('account.licenses')
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const suffix = licenseKey.slice(-4)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard refused: the key can still be revealed and selected.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="me-1 break-all font-mono text-sm text-foreground">
        {revealed ? licenseKey : `••••-••••-${suffix}`}
      </code>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRevealed((value) => !value)}
        aria-pressed={revealed}
        aria-label={t(revealed ? 'hideKeyAria' : 'showKeyAria', { suffix })}
      >
        {revealed ? <EyeOff /> : <Eye />}
        {t(revealed ? 'hideKey' : 'showKey')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={copy}
        aria-label={copied ? t('copiedKey') : t('copyKeyAria', { suffix })}
      >
        {copied ? <Check className="text-green-600" /> : <Copy />}
        {copied ? t('copiedKey') : t('copyKey')}
      </Button>
    </div>
  )
}
