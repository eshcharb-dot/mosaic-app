import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, Plus, ArrowRight } from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface Campaign {
  id: string
  name: string
  product_name: string
  product_sku: string | null
  status: string
  compliance_score: number | null
  created_at: string
  campaign_stores: { count: number }[]
}

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, product_name, product_sku, status, compliance_score, created_at, campaign_stores(count)')
    .eq('organization_id', profile?.organization_id)
    .order('created_at', { ascending: false })

  const rows = (campaigns ?? []) as Campaign[]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Campaigns</h1>
          <p className="text-[#b0b0d0] mt-1">
            {rows.length} campaign{rows.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <Plus size={16} />
          New Campaign
        </Link>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#7c6df5]/10 border border-[#7c6df5]/20 flex items-center justify-center mb-5">
            <Megaphone size={28} className="text-[#7c6df5]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No campaigns yet</h2>
          <p className="text-[#b0b0d0] text-sm max-w-xs mb-6">
            Create your first campaign to start collecting shelf intelligence from the field.
          </p>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Plus size={16} />
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_110px_90px_90px_80px_60px] gap-4 px-6 py-3 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">
            <span>Campaign</span>
            <span>Product</span>
            <span>Status</span>
            <span className="text-center">Stores</span>
            <span className="text-center">Compliance</span>
            <span>Created</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#222240]">
            {rows.map((c) => {
              const storeCount = c.campaign_stores?.[0]?.count ?? 0
              const created = new Date(c.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[2fr_1fr_110px_90px_90px_80px_60px] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{c.name}</div>
                    {c.product_sku && (
                      <div className="text-xs text-[#b0b0d0] mt-0.5">{c.product_sku}</div>
                    )}
                  </div>

                  {/* Product */}
                  <div className="text-sm text-[#b0b0d0] truncate">{c.product_name}</div>

                  {/* Status badge */}
                  <div>
                    <Badge status={c.status} size="sm" />
                  </div>

                  {/* Store count */}
                  <div className="text-center">
                    <span className="text-white font-semibold">{storeCount}</span>
                  </div>

                  {/* Compliance */}
                  <div className="text-center">
                    {c.compliance_score !== null ? (
                      <span
                        className="font-bold"
                        style={{ color: c.compliance_score >= 80 ? '#00e096' : c.compliance_score >= 60 ? '#ffc947' : '#ff6b9d' }}
                      >
                        {Math.round(c.compliance_score)}%
                      </span>
                    ) : (
                      <span className="text-[#b0b0d0]">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-[#b0b0d0]">{created}</div>

                  {/* View link */}
                  <div className="flex justify-end">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="flex items-center gap-1 text-[#7c6df5] hover:text-white text-sm font-medium transition-colors"
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
