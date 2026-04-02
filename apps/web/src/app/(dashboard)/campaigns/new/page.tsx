'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, LayoutTemplate, X, ArrowRight, Check } from 'lucide-react'

interface Template {
  id: string
  name: string
  category: string | null
  brief: string | null
  price_per_task_cents: number | null
  description: string | null
}

export default function NewCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    product_name: '',
    product_sku: '',
    instructions: '',
    sla_minutes: 30,
    price_per_task_cents: 2500,
  })
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null)

  function set(key: string, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  const applyTemplate = useCallback((t: Template) => {
    setForm(f => ({
      ...f,
      instructions: t.brief ?? f.instructions,
      price_per_task_cents: t.price_per_task_cents ?? f.price_per_task_cents,
    }))
    setAppliedTemplate(t.name)
    setShowTemplatePicker(false)
  }, [])

  // Pre-fill from ?template=id query param
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (!templateId) return

    supabase
      .from('campaign_templates')
      .select('*')
      .eq('id', templateId)
      .single()
      .then(({ data }) => {
        if (data) applyTemplate(data)
      })
  }, [searchParams, applyTemplate, supabase])

  async function loadTemplates() {
    setTemplatesLoading(true)
    const res = await fetch('/api/campaigns/templates')
    if (res.ok) {
      const json = await res.json()
      setTemplates((json.templates ?? []).slice(0, 4))
    }
    setTemplatesLoading(false)
  }

  function handleOpenTemplatePicker() {
    setShowTemplatePicker(true)
    loadTemplates()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles').select('organization_id').eq('id', user!.id).single()

    const { data, error } = await supabase.from('campaigns').insert({
      ...form,
      organization_id: profile?.organization_id,
      created_by: user!.id,
      collector_payout_cents: Math.round(form.price_per_task_cents * 0.48),
      status: 'draft',
    }).select().single()

    if (!error && data) {
      if (saveAsTemplate) {
        await fetch('/api/campaigns/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            brief: form.instructions,
            price_per_task_cents: form.price_per_task_cents,
          }),
        })
      }
      router.push(`/campaigns/${data.id}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">New Campaign</h1>
        <p className="text-[#b0b0d0] mt-1">Configure your field intelligence campaign</p>
      </div>

      {/* Template bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleOpenTemplatePicker}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium"
        >
          <LayoutTemplate size={15} />
          Use a Template
        </button>
        {appliedTemplate && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[#7c6df5] bg-[#7c6df5]/10 border border-[#7c6df5]/25 px-3 py-1.5 rounded-lg">
            <Check size={11} />
            {appliedTemplate} applied
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white">Product & Brand</h2>
          <Field label="Campaign Name" required>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Oat+ 1L — Tesco Summer 2026" required
              className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Name" required>
              <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
                placeholder="Oat+ Oat Milk 1L" required className="input" />
            </Field>
            <Field label="SKU">
              <input value={form.product_sku} onChange={e => set('product_sku', e.target.value)}
                placeholder="OAT-001-1L" className="input" />
            </Field>
          </div>
          <Field label="Capture Instructions">
            <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
              placeholder="Photograph the full shelf section where this product should appear. Include the eye-level shelf and the one above and below."
              rows={3} className="input resize-none" />
          </Field>
        </div>

        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white">Campaign Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SLA (minutes)" hint="Target delivery time">
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
                <select value={form.sla_minutes} onChange={e => set('sla_minutes', Number(e.target.value))}
                  className="input pl-9">
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={480}>Same day</option>
                </select>
              </div>
            </Field>
            <Field label="Price per store (£)" hint={`Collector gets £${((form.price_per_task_cents * 0.48) / 100).toFixed(2)}`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0] text-sm">£</span>
                <input type="number" min={5} max={100} step={0.5}
                  value={(form.price_per_task_cents / 100).toFixed(2)}
                  onChange={e => set('price_per_task_cents', Math.round(parseFloat(e.target.value) * 100))}
                  className="input pl-7" />
              </div>
            </Field>
          </div>
        </div>

        {/* Save as template */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setSaveAsTemplate(v => !v)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              saveAsTemplate
                ? 'bg-[#7c6df5] border-[#7c6df5]'
                : 'border-[#222240] group-hover:border-[#7c6df5]/50'
            }`}
          >
            {saveAsTemplate && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>
          <span className="text-sm text-[#b0b0d0] group-hover:text-white transition-colors">
            Save as template for future campaigns
          </span>
        </label>

        <div className="flex gap-4">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors font-medium">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Campaign →'}
          </button>
        </div>
      </form>

      {/* Template picker modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplatePicker(false)} />
          <div className="relative bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Recent Templates</h2>
              <button onClick={() => setShowTemplatePicker(false)} className="text-[#b0b0d0] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {templatesLoading ? (
              <div className="py-8 text-center text-[#b0b0d0] text-sm">Loading…</div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[#b0b0d0] text-sm mb-4">No templates saved yet.</p>
                <a href="/campaigns/templates" className="text-[#7c6df5] text-sm hover:underline">Browse templates →</a>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#222240] hover:border-[#7c6df5]/40 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-white text-sm truncate">{t.name}</div>
                      {t.category && (
                        <div className="text-xs text-[#b0b0d0] mt-0.5">{t.category}</div>
                      )}
                    </div>
                    <ArrowRight size={14} className="text-[#7c6df5] flex-shrink-0" />
                  </button>
                ))}
                <div className="pt-2 text-center">
                  <a href="/campaigns/templates" className="text-xs text-[#b0b0d0] hover:text-[#7c6df5] transition-colors">
                    View all templates →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <label className="text-sm text-[#b0b0d0]">{label}{required && <span className="text-[#ff6b9d] ml-0.5">*</span>}</label>
        {hint && <span className="text-xs text-[#b0b0d0] opacity-60">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
