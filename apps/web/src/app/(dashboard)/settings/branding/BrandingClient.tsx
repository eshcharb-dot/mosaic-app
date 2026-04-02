'use client'
import { useState, useRef } from 'react'
import { Upload, Check, AlertCircle, Palette, Monitor } from 'lucide-react'
import type { BrandConfig } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'

interface Props {
  brand: BrandConfig
  isAdmin: boolean
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '124, 109, 245'
}

export default function BrandingClient({ brand: initialBrand, isAdmin }: Props) {
  const [primaryColor, setPrimaryColor] = useState(initialBrand.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(initialBrand.secondaryColor)
  const [portalName, setPortalName] = useState(initialBrand.portalName)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialBrand.logoUrl)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(initialBrand.faviconUrl)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(
    file: File,
    type: 'logo' | 'favicon',
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void,
  ) {
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${type}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(path, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data } = supabase.storage.from('brand-assets').getPublicUrl(path)
      setUrl(data.publicUrl)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          portalName,
          logoUrl,
          faviconUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save branding')

      // Apply changes live
      document.documentElement.style.setProperty('--brand-primary', primaryColor)
      document.documentElement.style.setProperty('--brand-secondary', secondaryColor)
      document.title = portalName

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Branding</h1>
        <p className="text-[#b0b0d0] text-sm">Customise your portal's appearance with your brand identity.</p>
      </div>

      {!isAdmin && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-[#ffc947]/10 border border-[#ffc947]/20 rounded-xl text-sm text-[#ffc947]">
          <AlertCircle size={16} />
          Only admins can edit branding settings. You are viewing the current configuration.
        </div>
      )}

      <div className="flex gap-8">
        {/* Left — form */}
        <div className="flex-1 space-y-6">

          {/* Portal name */}
          <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Portal Name</h2>
            <input
              type="text"
              value={portalName}
              onChange={e => setPortalName(e.target.value)}
              placeholder="Mosaic"
              maxLength={60}
              disabled={!isAdmin}
              className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444466] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ ['--tw-ring-color' as string]: primaryColor }}
              onFocus={e => { e.currentTarget.style.borderColor = primaryColor }}
              onBlur={e => { e.currentTarget.style.borderColor = '' }}
            />
            <p className="mt-2 text-xs text-[#b0b0d0]">Shown in the browser tab and sidebar. Max 60 characters.</p>
          </section>

          {/* Colors */}
          <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Brand Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#b0b0d0] mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      disabled={!isAdmin}
                      className="w-12 h-12 rounded-xl border border-[#222240] cursor-pointer bg-transparent p-1 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-mono text-white">{primaryColor}</div>
                    <div className="text-xs text-[#b0b0d0] mt-0.5">
                      rgb({hexToRgb(primaryColor)})
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#b0b0d0] mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      disabled={!isAdmin}
                      className="w-12 h-12 rounded-xl border border-[#222240] cursor-pointer bg-transparent p-1 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-mono text-white">{secondaryColor}</div>
                    <div className="text-xs text-[#b0b0d0] mt-0.5">
                      rgb({hexToRgb(secondaryColor)})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Logo */}
          <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Logo</h2>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl border border-[#222240] bg-[#030305] flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <Palette size={20} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#b0b0d0] mb-3">
                  Recommended: SVG or PNG, transparent background, min 200×200px.
                </p>
                {isAdmin && (
                  <>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'logo', setUploadingLogo, setLogoUrl)
                      }}
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#222240] text-sm text-[#b0b0d0] hover:text-white hover:border-[#444466] transition-colors disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {uploadingLogo ? 'Uploading...' : logoUrl ? 'Change logo' : 'Upload logo'}
                    </button>
                    {logoUrl && (
                      <button
                        onClick={() => setLogoUrl(null)}
                        className="ml-2 px-4 py-2 rounded-xl border border-[#222240] text-sm text-[#ff4d6d] hover:bg-[#ff4d6d]/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Favicon */}
          <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Favicon</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg border border-[#222240] bg-[#030305] flex items-center justify-center overflow-hidden flex-shrink-0">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                ) : (
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <span className="text-[10px] text-white font-bold">M</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#b0b0d0] mb-3">ICO or PNG, 32×32px or 64×64px recommended.</p>
                {isAdmin && (
                  <>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'favicon', setUploadingFavicon, setFaviconUrl)
                      }}
                    />
                    <button
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#222240] text-sm text-[#b0b0d0] hover:text-white hover:border-[#444466] transition-colors disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {uploadingFavicon ? 'Uploading...' : faviconUrl ? 'Change favicon' : 'Upload favicon'}
                    </button>
                    {faviconUrl && (
                      <button
                        onClick={() => setFaviconUrl(null)}
                        className="ml-2 px-4 py-2 rounded-xl border border-[#222240] text-sm text-[#ff4d6d] hover:bg-[#ff4d6d]/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Error / Save */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-xl text-sm text-[#ff4d6d]">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 80%, #000))` }}
            >
              {saved ? (
                <><Check size={15} /> Saved</>
              ) : saving ? (
                'Saving...'
              ) : (
                'Save changes'
              )}
            </button>
          )}
        </div>

        {/* Right — preview */}
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 mb-3">
              <Monitor size={14} className="text-[#b0b0d0]" />
              <span className="text-xs text-[#b0b0d0] uppercase tracking-wider font-semibold">Preview</span>
            </div>
            {/* Mini sidebar mockup */}
            <div className="rounded-2xl border border-[#222240] overflow-hidden bg-[#0c0c18]" style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
              {/* Logo row */}
              <div className="p-3 border-b border-[#222240] flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded object-contain" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <Palette size={12} className="text-white" />
                  </div>
                )}
                <span className="text-white text-sm font-black tracking-tight truncate">{portalName || 'Portal'}</span>
              </div>

              {/* Nav items */}
              <div className="p-2 space-y-0.5">
                {/* Active item */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white"
                  style={{
                    background: `color-mix(in srgb, ${primaryColor} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${primaryColor} 30%, transparent)`,
                  }}
                >
                  <div className="w-3 h-3 rounded-sm" style={{ background: primaryColor, opacity: 0.8 }} />
                  <span>Dashboard</span>
                </div>
                {/* Inactive items */}
                {['Analytics', 'Campaigns', 'Gallery'].map(item => (
                  <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#b0b0d0]">
                    <div className="w-3 h-3 rounded-sm bg-[#222240]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Settings section */}
              <div className="px-2 pb-2 border-t border-[#222240] pt-2">
                <div className="text-[10px] text-[#444466] px-3 py-1 font-semibold uppercase tracking-wider">Settings</div>
                {/* Active sub-item */}
                <div
                  className="flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-lg text-[10px] font-medium"
                  style={{
                    background: `color-mix(in srgb, ${primaryColor} 10%, transparent)`,
                    color: `color-mix(in srgb, ${primaryColor} 80%, #ffffff)`,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: primaryColor, opacity: 0.7 }} />
                  <span>Branding</span>
                </div>
              </div>

              {/* User row */}
              <div className="p-2 border-t border-[#222240] flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  U
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 bg-[#222240] rounded w-16 mb-1" />
                  <div className="h-1 bg-[#1a1a2e] rounded w-10" />
                </div>
              </div>
            </div>

            {/* Color swatches */}
            <div className="mt-4 flex gap-2">
              <div className="flex-1 h-8 rounded-lg" style={{ background: primaryColor }} title="Primary" />
              <div className="flex-1 h-8 rounded-lg" style={{ background: secondaryColor }} title="Secondary" />
              <div
                className="flex-1 h-8 rounded-lg"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                title="Gradient"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
