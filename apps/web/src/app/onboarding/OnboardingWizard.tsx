'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WizardState {
  orgName: string
  industry: string
  country: string
  campaignName: string
  brief: string
  payoutAmount: number
  inviteEmails: string[]
}

const INDUSTRIES = ['FMCG', 'Retail', 'Food & Beverage', 'Other']
const COUNTRIES = ['UK', 'Germany', 'France', 'Netherlands', 'Spain', 'Other']
const STEPS = ['Organization', 'First Campaign', 'Invite Team']

// ─── Shared Field wrapper ────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-[#b0b0d0]">
        {label}
        {required && <span className="text-[#ff6b9d] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function EmailChip({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#7c6df5]/15 border border-[#7c6df5]/30 text-[#b0b0d0] text-xs rounded-lg px-3 py-1.5">
      {email}
      <button
        type="button"
        onClick={onRemove}
        className="text-[#b0b0d0] hover:text-white transition-colors leading-none"
        aria-label={`Remove ${email}`}
      >
        ×
      </button>
    </span>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-3">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? 'bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white'
                    : i === step
                    ? 'bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white ring-2 ring-[#7c6df5]/40 ring-offset-2 ring-offset-[#030305]'
                    : 'bg-[#0c0c18] border border-[#222240] text-[#b0b0d0]'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  i <= step ? 'text-white' : 'text-[#b0b0d0]'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 mx-3 transition-all ${
                  i < step ? 'bg-[#7c6df5]' : 'bg-[#222240]'
                }`}
                style={{ minWidth: '2rem' }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="h-1 bg-[#222240] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] transition-all duration-500"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─── Step 1: Organization ────────────────────────────────────────────────────

function Step1({
  state,
  onChange,
  onNext,
}: {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  onNext: () => void
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!state.orgName.trim()) e.orgName = 'Company name is required'
    if (!state.industry) e.industry = 'Please select an industry'
    if (!state.country) e.country = 'Please select a country'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white">Set up your organization</h2>
        <p className="text-[#b0b0d0] text-sm mt-1">Tell us about your company</p>
      </div>

      <Field label="Company name" required>
        <input
          value={state.orgName}
          onChange={e => onChange({ orgName: e.target.value })}
          placeholder="Acme Foods Ltd"
          className="input"
        />
        {errors.orgName && <p className="text-[#ff6b9d] text-xs mt-1">{errors.orgName}</p>}
      </Field>

      <Field label="Industry" required>
        <select
          value={state.industry}
          onChange={e => onChange({ industry: e.target.value })}
          className="input"
        >
          <option value="">Select industry…</option>
          {INDUSTRIES.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        {errors.industry && <p className="text-[#ff6b9d] text-xs mt-1">{errors.industry}</p>}
      </Field>

      <Field label="Country" required>
        <select
          value={state.country}
          onChange={e => onChange({ country: e.target.value })}
          className="input"
        >
          <option value="">Select country…</option>
          {COUNTRIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.country && <p className="text-[#ff6b9d] text-xs mt-1">{errors.country}</p>}
      </Field>

      <button
        type="button"
        onClick={() => validate() && onNext()}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold hover:opacity-90 transition-opacity"
      >
        Continue →
      </button>
    </div>
  )
}

// ─── Step 2: First Campaign ──────────────────────────────────────────────────

function Step2({
  state,
  onChange,
  onNext,
}: {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  onNext: () => void
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!state.campaignName.trim()) e.campaignName = 'Campaign name is required'
    if (!state.brief.trim()) e.brief = 'Brief is required'
    if (!state.payoutAmount || state.payoutAmount <= 0) e.payoutAmount = 'Enter a valid payout'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white">Create your first campaign</h2>
        <p className="text-[#b0b0d0] text-sm mt-1">What should collectors look for in the field?</p>
      </div>

      <Field label="Campaign name" required>
        <input
          value={state.campaignName}
          onChange={e => onChange({ campaignName: e.target.value })}
          placeholder="e.g. Oat+ Summer 2026 — Tesco"
          className="input"
        />
        {errors.campaignName && <p className="text-[#ff6b9d] text-xs mt-1">{errors.campaignName}</p>}
      </Field>

      <Field label="Brief / compliance criteria" required>
        <textarea
          value={state.brief}
          onChange={e => onChange({ brief: e.target.value })}
          placeholder="Describe what collectors should look for..."
          rows={4}
          className="input resize-none"
        />
        {errors.brief && <p className="text-[#ff6b9d] text-xs mt-1">{errors.brief}</p>}
      </Field>

      <Field label="Payout per task (£)" required>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0] text-sm">£</span>
          <input
            type="number"
            min={1}
            max={500}
            step={0.5}
            value={state.payoutAmount}
            onChange={e => onChange({ payoutAmount: parseFloat(e.target.value) || 0 })}
            className="input pl-7"
          />
        </div>
        {errors.payoutAmount && <p className="text-[#ff6b9d] text-xs mt-1">{errors.payoutAmount}</p>}
      </Field>

      <button
        type="button"
        onClick={() => validate() && onNext()}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold hover:opacity-90 transition-opacity"
      >
        Continue →
      </button>
    </div>
  )
}

// ─── Step 3: Invite Team ─────────────────────────────────────────────────────

function Step3({
  state,
  onChange,
  onSubmit,
  loading,
}: {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  onSubmit: (sendInvites: boolean) => void
  loading: boolean
}) {
  const [emailInput, setEmailInput] = useState('')
  const [inputError, setInputError] = useState('')

  function addEmail() {
    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setInputError('Enter a valid email address')
      return
    }
    if (state.inviteEmails.includes(trimmed)) {
      setInputError('Already added')
      return
    }
    if (state.inviteEmails.length >= 5) {
      setInputError('Maximum 5 invites')
      return
    }
    onChange({ inviteEmails: [...state.inviteEmails, trimmed] })
    setEmailInput('')
    setInputError('')
  }

  function removeEmail(email: string) {
    onChange({ inviteEmails: state.inviteEmails.filter(e => e !== email) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white">Invite your team</h2>
        <p className="text-[#b0b0d0] text-sm mt-1">Add up to 5 teammates to your organization</p>
      </div>

      <Field label="Team member email">
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={e => { setEmailInput(e.target.value); setInputError('') }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
            placeholder="colleague@company.com"
            className="input flex-1"
            disabled={state.inviteEmails.length >= 5}
          />
          <button
            type="button"
            onClick={addEmail}
            disabled={state.inviteEmails.length >= 5}
            className="px-4 py-3 rounded-xl border border-[#7c6df5]/50 text-[#7c6df5] text-sm font-medium hover:bg-[#7c6df5]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {inputError && <p className="text-[#ff6b9d] text-xs mt-1">{inputError}</p>}
      </Field>

      {state.inviteEmails.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-[#030305] border border-[#222240] rounded-xl min-h-[48px]">
          {state.inviteEmails.map(email => (
            <EmailChip key={email} email={email} onRemove={() => removeEmail(email)} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={() => onSubmit(true)}
          disabled={loading || state.inviteEmails.length === 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Send Invites & Go to Dashboard →'}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(false)}
          disabled={loading}
          className="w-full py-3 rounded-xl border border-[#222240] text-[#b0b0d0] text-sm hover:text-white hover:border-[#7c6df5]/40 transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Skip for now — Go to Dashboard →'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function OnboardingWizard({ userId: _userId }: { userId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [state, setState] = useState<WizardState>({
    orgName: '',
    industry: '',
    country: '',
    campaignName: '',
    brief: '',
    payoutAmount: 12,
    inviteEmails: [],
  })

  function patch(update: Partial<WizardState>) {
    setState(s => ({ ...s, ...update }))
  }

  async function handleFinalSubmit(sendInvites: boolean) {
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: state.orgName,
          industry: state.industry,
          country: state.country,
          campaignName: state.campaignName,
          brief: state.brief,
          payoutAmount: state.payoutAmount,
          inviteEmails: sendInvites ? state.inviteEmails : [],
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setApiError(json.error ?? 'Something went wrong')
        setLoading(false)
        return
      }
      router.push('/dashboard')
    } catch {
      setApiError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030305] p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black tracking-tighter bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] bg-clip-text text-transparent mb-1">
            Mosaic
          </div>
          <p className="text-[#b0b0d0] text-sm">Physical World Intelligence</p>
        </div>

        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-8">
          <ProgressBar step={step} />

          {apiError && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {apiError}
            </div>
          )}

          {step === 0 && (
            <Step1 state={state} onChange={patch} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <Step2 state={state} onChange={patch} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step3
              state={state}
              onChange={patch}
              onSubmit={handleFinalSubmit}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
