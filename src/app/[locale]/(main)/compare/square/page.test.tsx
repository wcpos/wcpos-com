import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SquareComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => Object.assign((key: string) => {
    const messages: Record<string, string> = {
      'square.metadata.title': 'Translated Square metadata title',
      'square.metadata.description':
        'Translated Square metadata description',
      'square.hero.title': 'Translated Square hero title',
      'square.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'square.faq.orders.question': 'Translated orders question',
      'square.faq.orders.answer': 'Translated orders answer',
      'square.glance.rows.orders.square':
        'Translated Square orders cell',
      'square.limits.location': 'Translated Square location limit',
    }
    return messages[key] ?? key
  }, { rich: (key: string) => `rich:${key}` })),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({ Link: 'a' }))

vi.mock('@/components/home/cta-section', () => ({
  CtaSection: () => <div data-testid="cta-section" />,
}))

// MoreComparisons is an async server component; it has its own test.
vi.mock('@/components/compare/more-comparisons', () => ({
  MoreComparisons: () => null,
}))

vi.mock('@/components/compare/choose-actions', () => ({
  CompareChooseActions: () => null,
}))

// compare.square shortAnswer.wcpos, glance.rows.catalog.wcpos and
// choose.wcpos.body as they read before "nothing to sync" was dropped.
const NOTHING_TO_SYNC_VALUES: Record<string, [string, string, string]> = {
  en: ['WCPOS is a register built on WooCommerce itself: it sells from your WooCommerce products and stock, and every sale is a WooCommerce order, so there is nothing to sync. It runs in any modern browser, as desktop apps for Windows, macOS and Linux, and as iOS and Android apps (beta). Its free version has no caps on products, orders, or customers, and Pro adds multi-store management, your store\'s other WooCommerce payment gateways and card-terminal integrations, Square Terminal among them, for a one-time payment that never switches off.', 'Sells from your WooCommerce products and stock; nothing to sync', 'You want every sale, online and in person, to be a WooCommerce order sold from one catalog with nothing to sync, run more than one store, sell outside Square\'s eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square.'],
  de: ['WCPOS ist eine Kasse, die direkt auf WooCommerce aufbaut: Sie verkauft aus Ihren WooCommerce-Produkten und -Beständen, und jeder Verkauf ist eine WooCommerce-Bestellung, sodass nichts synchronisiert werden muss. Sie läuft in jedem modernen Browser, als Desktop-App für Windows, macOS und Linux sowie als iOS- und Android-App (Beta). Die Gratis-Version hat keine Obergrenzen für Produkte, Bestellungen oder Kunden, und Pro ergänzt Multi-Store-Verwaltung, die anderen WooCommerce-Zahlungsgateways Ihres Shops und Kartenterminal-Integrationen, darunter Square Terminal, gegen eine Einmalzahlung, nach der nichts abgeschaltet wird.', 'Verkauft aus Ihren WooCommerce-Produkten und -Beständen; nichts zu synchronisieren', 'Sie möchten, dass jeder Online- und Vor-Ort-Verkauf eine WooCommerce-Bestellung aus einem einzigen Katalog ist, ohne Synchronisierung, betreiben mehr als einen Shop, verkaufen außerhalb der acht Länder von Square, möchten eine Kasse im Webbrowser oder als Desktop-App für Windows, macOS und Linux verwenden oder ein anderes Zahlungsgateway oder Kartenterminal als Square nutzen.'],
  nl: ['WCPOS is een kassa die op WooCommerce zelf is gebouwd: je verkoopt vanuit je WooCommerce-producten en -voorraad, en elke verkoop is een WooCommerce-bestelling, dus er valt niets te synchroniseren. Het werkt in elke moderne browser, als desktopapps voor Windows, macOS en Linux en als iOS- en Android-apps (bèta). De gratis versie heeft geen limieten op producten, bestellingen of klanten en Pro voegt beheer van meerdere winkels, de andere WooCommerce-betaalgateways van je winkel en integraties met pinterminals, waaronder Square Terminal, toe voor een eenmalige betaling waarna niets wordt uitgeschakeld.', 'Verkoopt vanuit je WooCommerce-producten en -voorraad; niets te synchroniseren', 'Je wilt dat elke verkoop, online en fysiek, een WooCommerce-bestelling uit één catalogus zonder synchronisatie is, runt meer dan één winkel, verkoopt buiten de acht landen van Square, wilt een kassa in een webbrowser of in desktopapps voor Windows, macOS en Linux of wilt een andere betaalgateway of pinterminal dan Square gebruiken.'],
  fr: ['WCPOS est une caisse intégrée à WooCommerce même : elle vend à partir de vos produits et stocks WooCommerce, et chaque vente est une commande WooCommerce, donc rien à synchroniser. Elle fonctionne dans tout navigateur moderne, sous forme d\'applications de bureau pour Windows, macOS et Linux et d\'applications iOS et Android (bêta). Sa version gratuite n\'impose aucune limite de produits, de commandes ou de clients, et Pro ajoute la gestion de plusieurs boutiques, les autres passerelles de paiement WooCommerce de votre boutique et les intégrations de terminaux de carte, dont Square Terminal, pour un paiement unique après lequel rien ne se désactive.', 'Vend à partir de vos produits et stocks WooCommerce ; rien à synchroniser', 'Vous voulez que chaque vente, en ligne ou en personne, soit une commande WooCommerce issue d\'un seul catalogue sans rien à synchroniser, gérez plus d\'une boutique, vendez hors des huit pays de Square, souhaitez une caisse dans un navigateur Web ou dans des applications de bureau pour Windows, macOS et Linux, ou voulez utiliser une passerelle de paiement ou un terminal de carte autre que Square.'],
  es: ['WCPOS es una caja integrada en el propio WooCommerce: vende a partir de sus productos y existencias de WooCommerce, y cada venta es un pedido de WooCommerce, así que no hay nada que sincronizar. Funciona en cualquier navegador moderno, como aplicación de escritorio para Windows, macOS y Linux y como aplicación para iOS y Android (beta). Su versión gratuita no tiene topes de productos, pedidos ni clientes, y Pro añade la gestión de varias tiendas, las demás pasarelas de pago de WooCommerce de su tienda e integraciones con terminales de tarjeta, entre ellas Square Terminal, por un pago único tras el que nada deja de funcionar.', 'Vende a partir de sus productos y existencias de WooCommerce; nada que sincronizar', 'Quiere que cada venta, en línea o presencial, sea un pedido de WooCommerce procedente de un único catálogo sin nada que sincronizar, gestiona más de una tienda, vende fuera de los ocho países de Square, quiere una caja en un navegador web o en aplicaciones de escritorio para Windows, macOS y Linux, o quiere utilizar una pasarela de pago o un terminal de tarjeta distinto de Square.'],
  it: ['WCPOS è una cassa basata direttamente su WooCommerce: vende dai vostri prodotti e dalle vostre scorte WooCommerce e ogni vendita è un ordine WooCommerce, quindi non c\'è nulla da sincronizzare. Funziona in qualsiasi browser moderno, come app desktop per Windows, macOS e Linux e come app iOS e Android (beta). La versione gratuita non pone limiti a prodotti, ordini o clienti e Pro aggiunge gestione multi-negozio, gli altri gateway di pagamento WooCommerce del vostro negozio e integrazioni con i terminali di pagamento, tra cui Square Terminal, con un pagamento una tantum dopo il quale nulla si disattiva.', 'Vende dai vostri prodotti e dalle vostre scorte WooCommerce; nulla da sincronizzare', 'Volete che ogni vendita, online e di persona, sia un ordine WooCommerce proveniente da un unico catalogo senza nulla da sincronizzare, gestite più di un negozio, vendete fuori dagli otto Paesi di Square, volete una cassa in un browser web o nelle app desktop per Windows, macOS e Linux oppure volete usare un gateway di pagamento o un terminale di pagamento diverso da Square.'],
  pt: ['O WCPOS é uma caixa integrada no próprio WooCommerce: vende a partir dos seus produtos e stock WooCommerce e cada venda é uma encomenda WooCommerce, pelo que não há nada a sincronizar. Funciona em qualquer navegador moderno, como aplicações de computador para Windows, macOS e Linux e como aplicações iOS e Android (beta). A versão gratuita não tem limites de produtos, encomendas ou clientes, e o Pro acrescenta gestão de várias lojas, os outros gateways de pagamento WooCommerce da sua loja e integrações com terminais de pagamento, incluindo Square Terminal, mediante um pagamento único após o qual nada se desativa.', 'Vende a partir dos seus produtos e stock WooCommerce; nada a sincronizar', 'Quer que todas as vendas, online e presenciais, sejam encomendas WooCommerce a partir de um único catálogo, sem nada a sincronizar, gere mais de uma loja, vende fora dos oito países do Square, quer uma caixa num navegador Web ou em aplicações de computador para Windows, macOS e Linux, ou quer usar um gateway de pagamento ou terminal de cartão diferente do Square.'],
  ja: ['WCPOSはWooCommerce自体に組み込まれたレジです。WooCommerceの商品と在庫を使って販売し、すべての販売がWooCommerceの注文になるため、同期するものはありません。あらゆるモダンブラウザ、Windows、macOS、Linuxのデスクトップアプリ、iOSとAndroidのアプリ（ベータ版）で動作します。無料版には商品・注文・顧客数の上限がなく、Proは複数店舗管理、店舗のその他のWooCommerce決済ゲートウェイの利用、Square Terminalを含むカード端末連携を買い切り価格で追加します。後から機能が停止することはありません。', 'WooCommerceの商品と在庫から販売し、同期は不要', 'オンラインと対面のすべての販売を一つのカタログからのWooCommerce注文にして同期を不要にしたい、複数の店舗を運営する、Squareが対応する8か国以外で販売する、WebブラウザまたはWindows、macOS、Linuxのデスクトップアプリでレジを使いたい、あるいはSquare以外の決済ゲートウェイやカード端末を使いたい場合。'],
  ko: ['WCPOS는 WooCommerce 자체에 구축된 계산대입니다. WooCommerce 상품과 재고를 사용해 판매하고 모든 판매가 WooCommerce 주문이 되므로 동기화할 것이 없습니다. 모든 최신 브라우저와 Windows, macOS 및 Linux 데스크톱 앱, iOS 및 Android 앱(베타)에서 작동합니다. 무료 버전에는 상품, 주문, 고객 수의 제한이 없으며, Pro는 다중 매장 관리, 매장의 다른 WooCommerce 결제 게이트웨이, Square Terminal을 포함한 카드 단말기 연동을 일회성 결제로 추가합니다. 이후 기능이 꺼지지 않습니다.', 'WooCommerce 상품과 재고에서 판매하며 동기화할 것이 없음', '온라인과 대면의 모든 판매가 동기화할 필요 없는 단일 카탈로그의 WooCommerce 주문이 되기를 원하거나, 매장을 둘 이상 운영하거나, Square의 8개국 밖에서 판매하거나, 웹 브라우저나 Windows, macOS 및 Linux 데스크톱 앱에서 계산대를 사용하고 싶거나, Square 이외의 결제 게이트웨이 또는 카드 단말기를 사용하고 싶다면.'],
  zh: ['WCPOS 是直接构建在 WooCommerce 上的收银台：它使用你的 WooCommerce 商品和库存销售，每笔销售都是 WooCommerce 订单，因此无需同步。它可在任何现代浏览器、Windows、macOS 和 Linux 桌面应用，以及 iOS 和 Android 应用（测试版）中运行。免费版不限制商品、订单或客户数量；Pro 版通过一次性付款提供多店铺管理、你店铺的其他 WooCommerce 支付网关和刷卡终端集成，其中包括 Square Terminal，付款后功能不会被停用。', '使用你的 WooCommerce 商品和库存销售；无需同步', '你希望线上和线下每笔销售都从一个商品目录生成 WooCommerce 订单，无需同步；经营多家店铺；在 Square 支持的 8 个国家以外销售；想在网页浏览器或 Windows、macOS 和 Linux 桌面应用中使用收银台；或想使用 Square 以外的支付网关或刷卡终端。'],
}

const params = Promise.resolve({ locale: 'en' })

describe('SquareComparePage', () => {
  it('tightens the padding under the hero', async () => {
    render(await SquareComparePage({ params }))
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.closest('section')).toHaveClass('pb-6')
  })

  it('associates every comparison cell with headers', async () => {
    render(await SquareComparePage({ params }))
    for (const table of screen.getAllByRole('table')) {
      for (const row of table.querySelectorAll('tbody tr')) {
        expect(row.firstElementChild?.matches('th[scope="row"]')).toBe(true)
      }
      const headers = table.querySelectorAll('thead th')
      expect(headers).toHaveLength(2)
      for (const header of headers) {
        expect(header).toHaveAttribute('scope', 'col')
        expect(header.textContent?.trim()).not.toBe('')
      }
    }
  })

  it('renders the hero, answer-first block, glance table and limits', async () => {
    render(await SquareComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated Square hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated Square orders cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated Square location limit')
    ).toBeInTheDocument()
    expect(
      screen.getByText('square.squareBetter.hardware')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 9 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(10)
    expect(
      screen.queryByText('square.glance.rows.where.label')
    ).toBeNull()
    expect(
      screen.queryByText('square.glance.rows.gateways.label')
    ).toBeNull()
    expect(
      screen.queryByText('square.glance.rows.barcode.label')
    ).toBeNull()
  })

  it('emits FAQPage, BreadcrumbList and WebPage JSON-LD', async () => {
    const { container } = render(await SquareComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs, webPage] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated orders question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated orders answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/square'
    )
    expect(webPage['@type']).toBe('WebPage')
    expect(webPage.dateModified).toBe('2026-10-06')
    expect(webPage.url).toMatch(/\/compare\/square$/)
  })

  it('renders the Pro-adds paragraph through t.rich so its tags become links', async () => {
    render(await SquareComparePage({ params }))
    expect(screen.getByText('rich:square.pricing.proAdds').tagName).toBe('P')
    expect(screen.queryByText('square.pricing.proAdds')).toBeNull()
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toEqual({ absolute: 'Translated Square metadata title' })
    expect(metadata.description).toBe(
      'Translated Square metadata description'
    )
  })

  it('closes with the sources, then the call-to-action band, then the facts footer', async () => {
    render(await SquareComparePage({ params }))
    const faq = screen.getByRole('heading', { name: 'square.faq.title' })
    const sources = screen.getByRole('heading', { name: 'square.sources.title' })
    const cta = screen.getByTestId('cta-section')
    const footer = screen.getByText('square.footer.corrections')
    expect(faq.compareDocumentPosition(sources) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(sources.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cta.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('lists 14 nofollow sources on Square and WooCommerce hosts', async () => {
    render(await SquareComparePage({ params }))
    const heading = screen.getByRole('heading', { name: 'square.sources.title' })
    const list = heading.closest('section')!.querySelector('ul')!
    const links = list.querySelectorAll('a')
    expect(links).toHaveLength(14)
    for (const link of links) {
      expect(
        link.getAttribute('href')!.startsWith('https://squareup.com/') ||
          link.getAttribute('href')!.startsWith('https://woocommerce.com/document/woocommerce-square/')
      ).toBe(true)
      expect(link.getAttribute('rel')).toContain('nofollow')
    }
  })

  it('labels every source with a key from the en messages', async () => {
    render(await SquareComparePage({ params }))
    const file = path.resolve(process.cwd(), 'messages', 'en.json')
    const items = JSON.parse(fs.readFileSync(file, 'utf8')).compare.square.sources.items
    expect(Object.keys(items)).toHaveLength(14)
    const heading = screen.getByRole('heading', { name: 'square.sources.title' })
    const rows = heading.closest('section')!.querySelectorAll('li')
    expect(rows).toHaveLength(14)
    for (const row of rows) {
      const match = row.textContent!.match(/^square\.sources\.items\.(\w+)/)
      expect(match).not.toBeNull()
      expect(items).toHaveProperty(match![1])
    }
  })

  it('gives every locale the same sources keys and both dates in the intro', () => {
    const read = (locale: string) =>
      JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8')
      ).compare.square.sources
    const en = read('en')
    const itemKeys = Object.keys(en.items).sort()
    expect(itemKeys).toHaveLength(14)
    for (const locale of Object.keys(NOTHING_TO_SYNC_VALUES)) {
      const sources = read(locale)
      expect(Object.keys(sources).sort()).toEqual(['intro', 'items', 'title'])
      expect(Object.keys(sources.items).sort()).toEqual(itemKeys)
      expect(sources.title).toBeTruthy()
      expect(sources.intro).toContain('2026-10-06')
      expect(sources.intro).toContain('2026-11-18')
    }
  })

  it('puts the short answer before the disclosure and the disclosure before the glance table', async () => {
    render(await SquareComparePage({ params }))
    const answer = screen.getByRole('heading', { name: 'square.shortAnswer.title' })
    const disclosure = screen.getByRole('heading', { name: 'disclosure.title' })
    const glance = screen.getByRole('heading', { name: 'square.glance.title' })
    expect(answer.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(disclosure.compareDocumentPosition(glance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does not claim WCPOS has nothing to sync', () => {
    for (const [locale, oldValues] of Object.entries(NOTHING_TO_SYNC_VALUES)) {
      const file = path.resolve(process.cwd(), 'messages', `${locale}.json`)
      const square = JSON.parse(fs.readFileSync(file, 'utf8')).compare.square
      const values = [square.shortAnswer.wcpos, square.glance.rows.catalog.wcpos, square.choose.wcpos.body]
      values.forEach((value, i) => expect(value).not.toBe(oldValues[i]))
      if (locale === 'en') {
        for (const value of values) expect(value).not.toMatch(/nothing to sync/i)
      }
    }
  })
})
