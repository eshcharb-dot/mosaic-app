'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Store, Users, BarChart3, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Campaign { id: string; name: string; status: string; created_at: string; payout_amount: number }
interface StoreRow { id: string; name: string; city: string; country: string; created_at: string }
interface Member { id: string; full_name: string; email: string; role: string; created_at: string }
interface UsageEvent { event_type: string; recorded_at: string }
interface Org {
  id: string; name: string; plan: string; is_active: boolean; created_at: string
  [key: string]: any
}

interface Props {
  org: Org
  campaigns: Campaign[]
  stores: StoreRow[]
  members: Member[]
  usageEvents: UsageEvent[]
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: '#00e0961a', text: '#00e096' },
  draft: { bg: '#1a1a30', text: '#b0b0d0' },
  paused: { bg: '#ffc9471a', text: '#ffc947' },
  completed: { bg: '#7c6df51a', text: '#7c6df5' },
}

function fmt(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return '—' }
}

function fmtTime(dateStr: string) {
  try { return format(parseISO(dateStr), 'MMM d, HH:mm') } catch { return '—' }
}

export default function OrgDetailClient({ org, campaigns, stores, members, usageEvents }: Props) {
  const router = useRouter()
  const [suspending, setSuspending] = useState(false)
  const [isActive, setIsActive] = useState(org.is_active ?? true)

  async function handleSuspendToggle() {
    setSuspending(true)
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (res.ok) setIsActive(v => !v)
    } finally {
      setSuspending(false)
    }
  }

  const recentActivity = [...campaigns.slice(0, 3), ...usageEvents.slice(0, 5)]
    .map((item: any) => ({
      label: 'event_type' in item ? item.event_type : `Campaign: ${item.name}`,
      time: item.recorded_at ?? item.created_at,
    }))
    .sort((a, b) => (a.time > b.time ? -1 : 1))
    .slice(0, 8)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/organizations')}
          className="p-2 rounded-xl bg-[#0c0c18] border border-[#222240] hover:border-[#7c6df5] transition-colors"
        >
          <ArrowLeft size={16} className="text-[#b0b0d0]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">{org.name}</h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isActive ? 'bg-[#00e0961a] text-[#00e096]' : 'bg-[#ff4d6d1a] text-[#ff4d6d]'
              }`}
            >
              {isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
          <p className="text-[#b0b0d0] mt-0.5 text-sm">Created {fmt(org.created_at)} · Plan: {org.plan ?? 'starter'}</p>
        </div>
        <button
          onClick={handleSuspendToggle}
          disabled={suspending}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            isActive
              ? 'bg-[#ff4d6d1a] text-[#ff4d6d] hover:bg-[#ff4d6d]/20 border border-[#ff4d6d]/30'
              : 'bg-[#00e0961a] text-[#00e096] hover:bg-[#00e096]/20 border border-[#00e096]/30'
          } disabled:opacity-50`}
        >
          {isActive ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {suspending ? 'Updating...' : isActive ? 'Suspend Org' : 'Reactivate Org'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Campaigns', value: campaigns.length, icon: BarChart3 },
          { label: 'Stores', value: stores.length, icon: Store },
          { label: 'Members', value: members.length, icon: Users },
          { label: 'Events This Month', value: usageEvents.length, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7c6df5]/10 flex items-center justify-center">
              <Icon size={16} className="text-[#7c6df5]" />
            </div>
            <div>
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-[#b0b0d0]">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Campaigns */}
        <div className="col-span-2 space-y-6">
          <Section title="Campaigns" count={campaigns.length}>
            {campaigns.length === 0 ? (
              <Empty text="No campaigns" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222240]">
                    <TH>Name</TH><TH>Status</TH><TH>Payout</TH><TH>Created</TH>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-b border-[#222240] last:border-0">
                      <td className="px-4 py-3 text-sm text-white">{c.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">
                        {c.payout_amount != null ? `$${c.payout_amount}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">{fmt(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Stores" count={stores.length}>
            {stores.length === 0 ? (
              <Empty text="No stores" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222240]">
                    <TH>Name</TH><TH>City</TH><TH>Country</TH><TH>Added</TH>
                  </tr>
                </thead>
                <tbody>
                  {stores.map(s => (
                    <tr key={s.id} className="border-b border-[#222240] last:border-0">
                      <td className="px-4 py-3 text-sm text-white">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">{s.city ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">{s.country ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">{fmt(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Team Members" count={members.length}>
            {members.length === 0 ? (
              <Empty text="No members" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222240]">
                    <TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Joined</TH>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-[#222240] last:border-0">
                      <td className="px-4 py-3 text-sm text-white">{m.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">{m.email ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0] capitalize">{m.role ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#b0b0d0]">{fmt(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        {/* Activity timeline */}
        <div>
          <Section title="Recent Activity" count={recentActivity.length}>
            {recentActivity.length === 0 ? (
              <Empty text="No recent activity" />
            ) : (
              <div className="space-y-1 px-2 pb-2">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex gap-3 py-2.5">
                    <div className="flex flex-col items-center">
                      <Clock size={12} className="text-[#7c6df5] mt-0.5" />
                      {i < recentActivity.length - 1 && (
                        <div className="w-px flex-1 bg-[#222240] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{item.label}</div>
                      <div className="text-[10px] text-[#b0b0d0] mt-0.5">{fmtTime(item.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

// Sub-components
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#222240] flex items-center justify-between">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <span className="text-xs text-[#b0b0d0] bg-[#1a1a30] px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {children}
    </div>
  )
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#b0b0d0] uppercase tracking-wide">
      {children}
    </th>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-[#b0b0d0]">{text}</div>
}
