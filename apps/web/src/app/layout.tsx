import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mosaic — Physical World Intelligence',
  description: 'Real-time shelf compliance. Verified by humans. Powered by AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
