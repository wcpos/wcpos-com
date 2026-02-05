import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'WCPOS - WooCommerce Point of Sale'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a4a3a 0%, #2D6F4F 50%, #3a8a65 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            marginBottom: 16,
          }}
        >
          WCPOS
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          WooCommerce Point of Sale
        </div>
      </div>
    ),
    { ...size }
  )
}
