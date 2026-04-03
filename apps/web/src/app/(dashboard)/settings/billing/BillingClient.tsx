'use client'

import { useState } from 'react'
import { CreditCard, TrendingUp, CheckCircle, AlertTriangle, X, ChevronRight } from 'lucide-react'

// ── Plan config ─────────────────────────────────────────────────────────────

const PLANS = {
  starter: {
    label: 'Starter',
    color: '#6366f1',
    price: 99,
    limits: { submissions: 50, stores: 10, members: 1, aiScores: 50 },
  },
  growth: {
    label: 'Growth',
    color: '#10b981',
    price: 299,
    limits: { submissions: 500, stores: 100, members: 5, aiScores: 500 },
  },
  enterprise: {
    label: 'Enterprise',
    color: '#f59e0b',
    price: null,
    limits: { submissions: 999999, stores: 999999, members: 999999, aiScores: 999999 },
  },
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  trialing: '#6366f1',
  past_due: '#f59e0b',
  canceled: '#ef4444',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function pct(used: number, limit: number) {
  if (limit >= 999999) return 0
  return Math.min((used / limit) * 100, 100)
}

function usageColor(used: number, limit: number) {
  if (limit >= 999999) return '#10b981'
  const p = (used / limit) * 100
  if (p > 100) return '#ef4444'
  if (p > 80) return '#f59e0b'
  return '#10b981'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const unlimited = limit >= 999999
  const color = usageColor(used, limit)
  const percent = pct(used, limit)
  const over = !unlimited && used > limit

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#b0b0d0]">{label}</span>
        <span className="text-white font-medium tabular-nums">
          {used.toLocaleString()} {unlimited ? '' : `/ ${limit.toLocaleString()}`}
          {unlimited && <span className="text-[#b0b0d0] font-normal ml-1">unlimited</span>}
          {over && <span className="text-[#ef4444] ml-2 text-xs font-bold">OVERAGE</span>}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 bg-[#222240] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%`, background: color }}
          />
        </div>
      )}
      {!unlimited && used > limit * 0.8 && (
        <p className="text-xs flex items-center gap-1" style={{ color }}>
          <AlertTriangle size={11} />
          {over ? 'Usage limit exceeded — upgrade to avoid interruption' : 'Approaching limit'}
        </p>
      )}
    </div>
  )
}

function PlanModal({ current, onClose }: { current: string; onClose: () => void }) {
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null)

  const features: Record<string, string[]> = {
    starter: ['50 submissions/mo', '10 stores', '1 user', 'Basic reports'],
    growth: ['500 submissions/mo', '100 stores', '5 users', 'Full analytics'],
    enterprise: ['Unlimited submissions', 'Unlimited stores', 'Unlimited users', 'White-label'],
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#222240]">
          <h2 className="text-lg font-semibold text-white">Compare Plans</h2>
          <button onClick={onClose} className="text-[#b0b0d0] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-4">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS['starter']][]).map(([key, plan]) => {
            const isCurrent = key === current
            return (
              <div
                key={key}
                className="rounded-xl border p-4 flex flex-col gap-3"
                style={{
                  borderColor: isCurrent
                    ? `color-mix(in srgb, ${plan.color} 50%, transparent)`
                    : '#222240',
                  background: isCurrent
                    ? `color-mix(in srgb, ${plan.color} 8%, transparent)`
                    : 'transparent',
                }}
              >
                <div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${plan.color} 20%, transparent)`, color: plan.color }}
                  >
                    {plan.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 text-xs text-[#b0b0d0]">current</span>
                  )}
                </div>

                <div className="text-2xl font-black text-white">
                  {plan.price ? `£${plan.price}/mo` : 'Custom'}
                </div>

                <ul className="space-y-1.5 flex-1">
                  {features[key].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#b0b0d0]">
                      <CheckCircle size={12} style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {key === 'enterprise' ? (
                  <a
                    href="mailto:sales@mosaic.app"
                    className="mt-2 block text-center text-sm font-medium py-2 px-3 rounded-lg border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-colors"
                  >
                    Contact sales
                  </a>
                ) : isCurrent ? (
                  <div className="mt-2 text-center text-xs text-[#b0b0d0] py-2">Current plan</div>
                ) : (
                  <button
                    onClick={() => setUpgradeMsg('Contact us at sales@mosaic.app to upgrade your plan.')}
                    className="mt-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    style={{
                      background: `color-mix(in srgb, ${plan.color} 20%, transparent)`,
                      color: plan.color,
                      border: `1px solid color-mix(in srgb, ${plan.color} 40%, transparent)`,
                    }}
                  >
                    Upgrade to {plan.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {upgradeMsg && (
          <div className="mx-6 mb-6 px-4 py-3 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/30 text-sm text-[#a5b4fc]">
            {upgradeMsg}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Subscription {
  plan: string
  status: string
  current_period_start?: string | null
  current_period_end?: string | null
  monthly_price_cents?: number | null
}

interface Usage {
  submissions: number
  aiScores: number
  stores: number
  members: number
}

interface Props {
  orgName: string
  billingEmail: string
  subscription: Subscription | null
  usage: Usage
  periodStart: string
}

// Mock billing history for MVP
const MOCK_HISTORY = [
  { date: '2026-03-01', description: 'Monthly subscription', amount: 9900, status: 'Paid' },
  { date: '2026-02-01', description: 'Monthly subscription', amount: 9900, status: 'Paid' },
  { date: '2026-01-01', description: 'Monthly subscription', amount: 9900, status: 'Paid' },
]

export default function BillingClient({ orgName, billingEmail, subscription, usage, periodStart }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [paymentMsg, setPaymentMsg] = useState(false)

  const plan = (subscription?.plan ?? 'starter') as keyof typeof PLANS
  const planConfig = PLANS[plan] ?? PLANS.starter
  const status = subscription?.status ?? 'active'
  const statusColor = STATUS_COLORS[status] ?? '#10b981'
  const limits = planConfig.limits

  const periodLabel =
    subscription?.current_period_start && subscription?.current_period_end
      ? `${formatDate(subscription.current_period_start)} – ${formatDate(subscription.current_period_end)}`
      : `${formatDate(periodStart)} – ${formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString())}`

  const monthlyPrice = subscription?.monthly_price_cents
    ? `£${(subscription.monthly_price_cents / 100).toFixed(0)}/month`
    : planConfig.price
    ? `£${planConfig.price}/month`
    : 'Custom pricing'

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-[#b0b0d0] text-sm mt-1">{orgName} · {billingEmail}</p>
      </div>

      {/* Current Plan */}
      <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider">Current Plan</h2>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{
              background: `color-mix(in srgb, ${planConfig.color} 20%, transparent)`,
              color: planConfig.color,
            }}
          >
            {planConfig.label}
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
            style={{
              background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
              color: statusColor,
            }}
          >
            {status === 'past_due' ? 'Past Due' : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#b0b0d0]">Monthly cost</p>
            <p className="text-white font-semibold mt-0.5">{monthlyPrice}</p>
          </div>
          <div>
            <p className="text-[#b0b0d0]">Current period</p>
            <p className="text-white font-semibold mt-0.5">{periodLabel}</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)',
            color: '#ffffff',
          }}
        >
          <TrendingUp size={15} />
          Upgrade Plan
          <ChevronRight size={14} />
        </button>
      </section>

      {/* Usage Metrics */}
      <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider">
          Usage — Current Period
        </h2>
        <UsageBar label="Submissions" used={usage.submissions} limit={limits.submissions} />
        <UsageBar label="AI Scores" used={usage.aiScores} limit={limits.aiScores} />
        <UsageBar label="Active Stores" used={usage.stores} limit={limits.stores} />
        <UsageBar label="Team Members" used={usage.members} limit={limits.members} />
      </section>

      {/* Billing History */}
      <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider">Billing History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222240] text-[#b0b0d0] text-xs uppercase tracking-wider">
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 text-center font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222240]">
              {MOCK_HISTORY.map((row, i) => (
                <tr key={i}>
                  <td className="py-3 text-[#b0b0d0]">{formatDate(row.date)}</td>
                  <td className="py-3 text-white">{row.description}</td>
                  <td className="py-3 text-right text-white tabular-nums">
                    £{(row.amount / 100).toFixed(2)}
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981]">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment Method */}
      <section className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider">Payment Method</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 bg-[#1a1a3e] border border-[#222240] rounded-md flex items-center justify-center">
            <CreditCard size={16} className="text-[#b0b0d0]" />
          </div>
          <span className="text-white font-mono text-sm tracking-widest">
            •••• •••• •••• 4242
          </span>
          <span className="text-xs text-[#b0b0d0]">Visa</span>
        </div>

        {paymentMsg ? (
          <p className="text-sm text-[#b0b0d0] bg-[#222240] rounded-xl px-4 py-3">
            To update your payment method, contact{' '}
            <a href="mailto:support@mosaic.app" className="text-[#6366f1] hover:underline">
              support@mosaic.app
            </a>
          </p>
        ) : (
          <button
            onClick={() => setPaymentMsg(true)}
            className="text-sm font-medium px-4 py-2 rounded-xl text-[#b0b0d0] hover:text-white border border-[#222240] hover:border-[#333360] transition-colors"
          >
            Update payment method
          </button>
        )}
      </section>

      {showModal && (
        <PlanModal current={plan} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
