import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Mosaic', template: '%s | Mosaic' },
  description: 'Real-time shelf compliance. Verified by humans. Powered by AI.',
  openGraph: {
    title: 'Mosaic — Physical World Intelligence',
    description: 'Real-time shelf compliance. Verified by humans. Powered by AI.',
    type: 'website',
  },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
