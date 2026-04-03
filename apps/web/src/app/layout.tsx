import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import { I18nProvider } from '@/components/I18nProvider'

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
      <head>
        {/* Zero-flash theme: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('mosaic_theme') || 'dark';
            const resolved = t === 'system'
              ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
              : t;
            document.documentElement.setAttribute('data-theme', resolved);
          } catch(e) {}
        ` }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <I18nProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
