'use client'
import { useEffect } from 'react'
import type { BrandConfig } from '@/lib/branding'

export default function BrandProvider({
  brand,
  children,
}: {
  brand: BrandConfig
  children: React.ReactNode
}) {
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', brand.primaryColor)
    document.documentElement.style.setProperty('--brand-secondary', brand.secondaryColor)
  }, [brand.primaryColor, brand.secondaryColor])

  useEffect(() => {
    document.title = brand.portalName
  }, [brand.portalName])

  useEffect(() => {
    if (!brand.faviconUrl) return
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = brand.faviconUrl
  }, [brand.faviconUrl])

  return <>{children}</>
}
