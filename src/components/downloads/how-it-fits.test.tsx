import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HowItFits } from './how-it-fits'

const TEST_COPY = {
  eyebrow: 'Translated eyebrow',
  title: 'Translated title',
  points: {
    setup: {
      title: 'Translated setup title',
      body: 'Translated setup body',
    },
    sync: {
      title: 'Translated sync title',
      body: 'Translated sync body',
    },
    offline: {
      title: 'Translated offline title',
      body: 'Translated offline body',
    },
  },
  syncLabel: 'Translated sync label',
  chips: {
    c1: 'Translated chip 1',
    c2: 'Translated chip 2',
    c3: 'Translated chip 3',
    c4: 'Translated chip 4',
    c5: 'Translated chip 5',
  },
  diagram: {
    ariaLabel: 'Translated diagram aria label',
    devices: {
      desktop: 'Translated desktop',
      ios: 'Translated iPhone and iPad',
      android: 'Translated Android',
      web: 'Translated Web',
    },
    hub: {
      store: 'Translated store',
      platform: 'Translated platform',
      plugin: 'Translated plugin',
    },
  },
} as const

const OLD_SYNC_BODIES: Record<string, string> = {
  en: 'Ring up a sale on the desktop, refund it on your phone — one set of products, orders and customers, updating in real time.',
  de: 'Kassiere einen Verkauf am Desktop, erstatte ihn auf deinem Telefon — ein gemeinsamer Bestand an Produkten, Bestellungen und Kunden, der in Echtzeit aktualisiert wird.',
  nl: 'Sla een verkoop aan op de desktop, verwerk een terugbetaling op je telefoon — één set producten, bestellingen en klanten, realtime bijgewerkt.',
  fr: 'Encaissez une vente sur l’ordinateur, remboursez-la sur votre téléphone — un seul jeu de produits, commandes et clients, mis à jour en temps réel.',
  es: 'Cobra una venta en el escritorio, reembólsala en tu teléfono: un único conjunto de productos, pedidos y clientes, actualizado en tiempo real.',
  it: 'Registra una vendita sul desktop, rimborsala dal telefono — un unico set di prodotti, ordini e clienti, aggiornato in tempo reale.',
  pt: 'Registe uma venda no computador, faça o reembolso no telemóvel — um único conjunto de produtos, encomendas e clientes, atualizado em tempo real.',
  ja: 'デスクトップで販売し、スマートフォンで返金 — 商品、注文、顧客は1つのセットで、リアルタイムに更新されます。',
  ko: '데스크톱에서 판매를 처리하고 휴대폰에서 환불하세요 — 제품, 주문, 고객이 하나의 세트로 실시간 업데이트됩니다.',
  zh: '在桌面端完成销售，在手机上退款——同一套商品、订单和客户数据，实时更新。',
}

function readSyncBody(locale: string): string {
  const file = path.resolve(process.cwd(), 'messages', `${locale}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8')).downloads.howItFits.points.sync.body
}

// @ts-expect-error HowItFits must receive locale-specific copy from its page.
const missingCopyElement = <HowItFits />
void missingCopyElement

describe('HowItFits', () => {
  it('renders the sync diagram with the hub and all four device spheres', () => {
    render(<HowItFits copy={TEST_COPY} />)

    expect(
      screen.getByRole('img', { name: /Translated diagram aria label/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Translated store')).toBeInTheDocument()
    for (const label of [
      'Translated desktop',
      'Translated iPhone and iPad',
      'Translated Android',
      'Translated Web',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('keeps the explanation copy alongside the diagram', () => {
    render(<HowItFits copy={TEST_COPY} />)

    expect(
      screen.getByRole('heading', {
        name: 'Translated title',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Translated setup title')).toBeInTheDocument()
    expect(
      screen.queryByText('One store at the centre. Every till in sync.')
    ).toBeNull()
  })

  it('puts the heading before the diagram on narrow screens', () => {
    render(<HowItFits copy={TEST_COPY} />)

    const wrapper = screen.getByRole('img').parentElement
    expect(wrapper).toHaveClass('order-last', 'lg:order-first')
  })

  it('highlights device spheres when keyboard focus reaches them', () => {
    render(<HowItFits copy={TEST_COPY} />)

    const desktopWrapper = screen.getByTestId('device-wrapper-desktop')
    const desktopSphere = screen.getByTestId('device-sphere-desktop')

    expect(desktopWrapper).toHaveAttribute('tabindex', '0')

    fireEvent.focus(desktopWrapper)

    expect(desktopSphere).toHaveClass('bg-wcpos-red')

    fireEvent.blur(desktopWrapper)

    expect(desktopSphere).not.toHaveClass('bg-wcpos-red')
  })

  it('keeps the free sync example free of Pro features', () => {
    for (const [locale, oldBody] of Object.entries(OLD_SYNC_BODIES)) {
      expect(readSyncBody(locale), locale).not.toBe(oldBody)
    }
    expect(readSyncBody('en')).not.toMatch(/refund/i)
  })
})
