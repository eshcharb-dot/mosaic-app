export type BrandConfig = {
  primaryColor: string    // default #7c6df5
  secondaryColor: string  // default #00d4d4
  logoUrl: string | null
  portalName: string      // default 'Mosaic'
  faviconUrl: string | null
}

export const DEFAULT_BRAND: BrandConfig = {
  primaryColor: '#7c6df5',
  secondaryColor: '#00d4d4',
  logoUrl: null,
  portalName: 'Mosaic',
  faviconUrl: null,
}
