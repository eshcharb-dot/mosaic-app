'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, MapPin, Clock } from 'lucide-react'

export default function NewCampaignPage() {
  const router = useRouter()
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

  function set(key: string, val: any) {
    setForm(f => ({ ...f, [key]: val }))
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

    if (!error && data) router.push(`/campaigns/${data.id}`)
    else setLoading(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">New Campaign</h1>
        <p className="text-[#b0b0d0] mt-1">Configure your field intelligence campaign</p>
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
