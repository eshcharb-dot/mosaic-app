import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, Plus } from 'lucide-react'
import CampaignsClient from './CampaignsClient'

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

      {/* Empty state (no data at all) */}
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
        <CampaignsClient campaigns={rows} />
      )}
    </div>
  )
}
