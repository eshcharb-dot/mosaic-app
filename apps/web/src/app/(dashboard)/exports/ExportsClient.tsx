'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Store,
  Megaphone,
  Users,
  Bell,
  Archive,
  Printer,
  Download,
  Clock,
  Calendar,
  Loader2,
  ChevronDown,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
}

interface Props {
  campaigns: Campaign[]
  orgName: string
}

type ExportType =
  | 'compliance'
  | 'stores'
  | 'campaigns'
  | 'collectors'
  | 'alerts'
  | 'full'
  | 'analytics_pdf'

type Frequency = 'daily' | 'weekly' | 'monthly'

const SCHEDULE_KEY = 'mosaic_export_schedules'
const LAST_EXPORTED_KEY = 'mosaic_export_last_exported'

function getSchedules(): Record<ExportType, Frequency> {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '{}')
  } catch {
    return {} as Record<ExportType, Frequency>
  }
}

function saveSchedule(type: ExportType, freq: Frequency | null) {
  const schedules = getSchedules()
  if (freq === null) {
    delete schedules[type]
  } else {
    schedules[type] = freq
  }
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedules))
}

function getLastExported(): Record<ExportType, number> {
  try {
    return JSON.parse(localStorage.getItem(LAST_EXPORTED_KEY) ?? '{}')
  } catch {
    return {} as Record<ExportType, number>
  }
}

function markExported(type: ExportType) {
  const data = getLastExported()
  data[type] = Date.now()
  localStorage.setItem(LAST_EXPORTED_KEY, JSON.stringify(data))
}

function daysAgo(ts: number): string {
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function triggerDownload(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export default function ExportsClient({ campaigns, orgName }: Props) {
  const [loading, setLoading] = useState<ExportType | null>(null)
  const [lastExported, setLastExported] = useState<Record<ExportType, number>>({} as any)
  const [schedules, setSchedules] = useState<Record<ExportType, Frequency>>({} as any)
  const [scheduleOpen, setScheduleOpen] = useState<Record<ExportType, boolean>>({} as any)

  // Compliance filters
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]?.id ?? '')
  const [compDateFrom, setCompDateFrom] = useState('')
  const [compDateTo, setCompDateTo] = useState('')

  // Store filters
  const [storeDateFrom, setStoreDateFrom] = useState('')
  const [storeDateTo, setStoreDateTo] = useState('')

  useEffect(() => {
    setLastExported(getLastExported())
    setSchedules(getSchedules())
  }, [])

  async function doExport(type: ExportType) {
    if (type === 'analytics_pdf') {
      window.print()
      markExported(type)
      setLastExported(getLastExported())
      return
    }

    if (type === 'full') {
      setLoading('full')
      const exportTypes: Array<[string, string]> = [
        [`/api/reports/${selectedCampaign || (campaigns[0]?.id ?? 'none')}/export`, 'compliance'],
        [buildUrl('/api/exports/stores', { date_from: storeDateFrom, date_to: storeDateTo }), 'stores'],
        ['/api/exports/campaigns', 'campaigns'],
        ['/api/exports/collectors', 'collectors'],
        ['/api/exports/alerts', 'alerts'],
      ]
      exportTypes.forEach(([url], i) => {
        setTimeout(() => triggerDownload(url), i * 600)
      })
      setTimeout(() => {
        setLoading(null)
        ;(['compliance', 'stores', 'campaigns', 'collectors', 'alerts', 'full'] as ExportType[]).forEach(t => {
          markExported(t)
        })
        setLastExported(getLastExported())
      }, exportTypes.length * 600 + 500)
      return
    }

    setLoading(type)
    let url = ''
    if (type === 'compliance') {
      const campaignId = selectedCampaign || campaigns[0]?.id
      if (!campaignId) { setLoading(null); return }
      const params = new URLSearchParams()
      if (compDateFrom) params.set('date_from', compDateFrom)
      if (compDateTo) params.set('date_to', compDateTo)
      url = `/api/reports/${campaignId}/export${params.toString() ? '?' + params.toString() : ''}`
    } else if (type === 'stores') {
      url = buildUrl('/api/exports/stores', { date_from: storeDateFrom, date_to: storeDateTo })
    } else if (type === 'campaigns') {
      url = '/api/exports/campaigns'
    } else if (type === 'collectors') {
      url = '/api/exports/collectors'
    } else if (type === 'alerts') {
      url = '/api/exports/alerts'
    }

    triggerDownload(url)
    setTimeout(() => {
      setLoading(null)
      markExported(type)
      setLastExported(getLastExported())
    }, 1500)
  }

  function buildUrl(base: string, params: Record<string, string>) {
    const p = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v) })
    return p.toString() ? `${base}?${p.toString()}` : base
  }

  function toggleScheduleOpen(type: ExportType) {
    setScheduleOpen(prev => ({ ...prev, [type]: !prev[type] }))
  }

  function handleScheduleChange(type: ExportType, freq: string) {
    if (freq === '') {
      saveSchedule(type, null)
      const s = { ...schedules }
      delete s[type]
      setSchedules(s)
    } else {
      saveSchedule(type, freq as Frequency)
      setSchedules(prev => ({ ...prev, [type]: freq as Frequency }))
    }
  }

  const scheduledList = Object.entries(schedules) as [ExportType, Frequency][]

  const cards: Array<{
    type: ExportType
    icon: React.ReactNode
    title: string
    description: string
    color: string
    filters?: React.ReactNode
    schedulable: boolean
  }> = [
    {
      type: 'compliance',
      icon: <FileText size={20} />,
      title: 'Compliance Report',
      description: 'All submissions with compliance scores for a campaign and date range.',
      color: '#7c6df5',
      schedulable: true,
      filters: (
        <div className="flex flex-wrap gap-2 mt-3">
          <select
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            className="flex-1 min-w-0 bg-[#0a0a14] border border-[#222240] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7c6df5]/60"
          >
            {campaigns.length === 0 && <option value="">No campaigns</option>}
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={compDateFrom}
            onChange={e => setCompDateFrom(e.target.value)}
            className="bg-[#0a0a14] border border-[#222240] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#7c6df5]/60"
          />
          <input
            type="date"
            value={compDateTo}
            onChange={e => setCompDateTo(e.target.value)}
            className="bg-[#0a0a14] border border-[#222240] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#7c6df5]/60"
          />
        </div>
      ),
    },
    {
      type: 'stores',
      icon: <Store size={20} />,
      title: 'Store Performance',
      description: 'All stores with avg score, audit count, compliance rate, and territory.',
      color: '#00d4d4',
      schedulable: true,
      filters: (
        <div className="flex flex-wrap gap-2 mt-3">
          <input
            type="date"
            value={storeDateFrom}
            onChange={e => setStoreDateFrom(e.target.value)}
            className="bg-[#0a0a14] border border-[#222240] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4d4]/60"
          />
          <input
            type="date"
            value={storeDateTo}
            onChange={e => setStoreDateTo(e.target.value)}
            className="bg-[#0a0a14] border border-[#222240] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4d4]/60"
          />
        </div>
      ),
    },
    {
      type: 'campaigns',
      icon: <Megaphone size={20} />,
      title: 'Campaign Summary',
      description: 'All campaigns with store count, submission stats, open tasks, and last activity.',
      color: '#00e096',
      schedulable: true,
    },
    {
      type: 'collectors',
      icon: <Users size={20} />,
      title: 'Collector Earnings',
      description: 'Anonymized collector payouts — ID prefix, tier, tasks, avg score, total earned.',
      color: '#ffc947',
      schedulable: true,
    },
    {
      type: 'alerts',
      icon: <Bell size={20} />,
      title: 'Alert History',
      description: 'All alert events with triggered/resolved timestamps and resolution time.',
      color: '#ff6b9d',
      schedulable: true,
    },
    {
      type: 'full',
      icon: <Archive size={20} />,
      title: 'Full Data Export',
      description: 'Downloads all 5 CSV reports as sequential files. Use for a full data snapshot.',
      color: '#a78bfa',
      schedulable: false,
    },
    {
      type: 'analytics_pdf',
      icon: <Printer size={20} />,
      title: 'Analytics PDF',
      description: 'Print-optimized summary of key metrics, compliance trends, and top/bottom stores.',
      color: '#38bdf8',
      schedulable: false,
    },
  ]

  return (
    <>
      {/* ─── Print styles ─── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-analytics { display: block !important; }
        }
        #print-analytics { display: none; }
      `}</style>

      {/* ─── Hidden printable div ─── */}
      <div id="print-analytics" style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', color: '#000' }}>
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{orgName} — Analytics Report</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>
            Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {[
            { label: 'Active Campaigns', value: campaigns.length },
            { label: 'Export Date', value: new Date().toLocaleDateString('en-GB') },
            { label: 'Organization', value: orgName },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px' }}>{value}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Campaign Overview</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              {['Campaign Name', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.slice(0, 20).map((c, i) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#f9f9f9' : 'transparent' }}>
                <td style={{ padding: '8px 12px' }}>{c.name}</td>
                <td style={{ padding: '8px 12px' }}>Active</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: '32px', fontSize: '11px', color: '#aaa', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          Mosaic Enterprise Portal — Confidential. For full data export, use the CSV exports.
        </p>
      </div>

      {/* ─── Main UI ─── */}
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Export Center</h1>
          <p className="text-[#b0b0d0] mt-1">Download your data in CSV or PDF format. All exports are org-scoped.</p>
        </div>

        {/* Export cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
          {cards.map(({ type, icon, title, description, color, filters, schedulable }) => {
            const isLoading = loading === type
            const ts = lastExported[type]
            const scheduled = schedules[type]
            const showSchedulePanel = scheduleOpen[type]

            return (
              <div
                key={type}
                className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#333360] transition-colors"
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm leading-tight">{title}</div>
                    <div className="text-[#b0b0d0] text-xs mt-0.5 leading-relaxed">{description}</div>
                  </div>
                </div>

                {/* Filters */}
                {filters}

                {/* Footer row */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  {/* Last exported */}
                  <div className="flex items-center gap-1.5 text-[10px] text-[#555580]">
                    <Clock size={10} />
                    {ts ? daysAgo(ts) : 'Never exported'}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Schedule toggle */}
                    {schedulable && (
                      <button
                        onClick={() => toggleScheduleOpen(type)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                          scheduled
                            ? 'border-[#7c6df5]/40 text-[#a89cf7] bg-[#7c6df5]/10'
                            : 'border-[#222240] text-[#555580] hover:text-[#b0b0d0] hover:border-[#333360]'
                        }`}
                      >
                        <Calendar size={10} />
                        {scheduled ? `${scheduled.charAt(0).toUpperCase() + scheduled.slice(1)}` : 'Schedule'}
                        <ChevronDown size={9} className={`transition-transform ${showSchedulePanel ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {/* Export button */}
                    <button
                      onClick={() => doExport(type)}
                      disabled={isLoading || (type !== 'analytics_pdf' && type !== 'full' && type === 'compliance' && campaigns.length === 0)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                      style={{
                        background: `${color}18`,
                        border: `1px solid ${color}35`,
                        color,
                      }}
                    >
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : type === 'analytics_pdf' ? (
                        <Printer size={12} />
                      ) : (
                        <Download size={12} />
                      )}
                      {isLoading
                        ? type === 'full' ? 'Preparing…' : 'Exporting…'
                        : type === 'analytics_pdf' ? 'Print PDF'
                        : type === 'full' ? 'Export All'
                        : 'Export CSV'}
                    </button>
                  </div>
                </div>

                {/* Schedule panel */}
                {showSchedulePanel && schedulable && (
                  <div className="border-t border-[#222240] pt-3 flex items-center gap-3">
                    <span className="text-xs text-[#b0b0d0] flex-shrink-0">Frequency</span>
                    <select
                      value={scheduled ?? ''}
                      onChange={e => handleScheduleChange(type, e.target.value)}
                      className="flex-1 bg-[#0a0a14] border border-[#222240] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#7c6df5]/60"
                    >
                      <option value="">— Off —</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Export Scheduler */}
        <ExportScheduler scheduledList={scheduledList} cards={cards} />
      </div>
    </>
  )
}

function ExportScheduler({
  scheduledList,
  cards,
}: {
  scheduledList: [ExportType, Frequency][]
  cards: Array<{ type: ExportType; title: string; color: string }>
}) {
  if (scheduledList.length === 0) return null

  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-white text-sm">Scheduled Exports</h2>
          <p className="text-[#555580] text-xs mt-0.5">Schedules are saved locally — automated delivery coming soon.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#555580] bg-[#0a0a14] border border-[#222240] rounded-lg px-2.5 py-1.5">
          <Calendar size={10} />
          {scheduledList.length} active
        </div>
      </div>

      <div className="space-y-2">
        {scheduledList.map(([type, freq]) => {
          const card = cards.find(c => c.type === type)
          if (!card) return null
          return (
            <div
              key={type}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-[#222240] bg-[#0a0a14]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: card.color }}
                />
                <span className="text-sm text-white font-medium">{card.title}</span>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{
                  color: card.color,
                  background: `${card.color}15`,
                  border: `1px solid ${card.color}30`,
                }}
              >
                {freq}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
