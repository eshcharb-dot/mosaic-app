'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Step {
  id: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Welcome to Mosaic', description: 'Let\'s get your account set up in 3 quick steps.' },
  { id: 2, title: 'Your Organization', description: 'Tell us about your company.' },
  { id: 3, title: 'First Campaign', description: 'Set up your first compliance campaign.' },
  { id: 4, title: 'You\'re ready!', description: 'Your workspace is configured and ready to go.' },
];

interface OnboardingWizardProps {
  userId: string;
  orgId: string;
  orgName: string;
}

export default function OnboardingWizard({ userId, orgId, orgName }: OnboardingWizardProps) {
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orgDisplayName, setOrgDisplayName] = useState(orgName);
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSteps = STEPS.length;
  const current = STEPS[step - 1];

  const handleNext = async () => {
    if (step === 2 && orgDisplayName) {
      await supabase.from('organizations').update({ name: orgDisplayName }).eq('id', orgId);
    }
    if (step === 3 && campaignName) {
      await supabase.from('campaigns').insert({
        name: campaignName,
        organization_id: orgId,
        status: 'draft',
        price_per_task_cents: 1200,
      });
    }
    if (step < totalSteps) {
      setStep(s => s + 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    await supabase.from('profiles').update({ onboarding_completed: true, onboarding_step: totalSteps }).eq('id', userId);
    await supabase.from('organizations').update({ setup_completed: true }).eq('id', orgId);
    router.push('/dashboard');
    router.refresh();
  };

  const overlay = { position: 'fixed' as const, inset: 0, background: '#030305cc', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const modal = { background: '#0c0c18', border: '1px solid #222240', borderRadius: 20, padding: '40px 48px', width: 520, position: 'relative' as const };

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: s.id <= step ? '#7c6df5' : '#222240', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div style={{ fontSize: 13, color: '#7c6df5', fontWeight: 600, marginBottom: 8 }}>Step {step} of {totalSteps}</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>{current.title}</h2>
        <p style={{ color: '#b0b0d0', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>{current.description}</p>

        {step === 1 && (
          <div style={{ background: '#030305', border: '1px solid #222240', borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Set up your organization profile', 'Create your first campaign', 'Explore the dashboard'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontSize: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#7c6df522', border: '1px solid #7c6df5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#7c6df5', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6 }}>Organization name</label>
              <input value={orgDisplayName} onChange={e => setOrgDisplayName(e.target.value)} style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6 }}>Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: industry ? '#fff' : '#b0b0d0', fontSize: 14, width: '100%' }}>
                <option value="">Select industry...</option>
                <option value="fmcg">FMCG / Consumer Goods</option>
                <option value="retail">Retail</option>
                <option value="pharma">Pharma / Healthcare</option>
                <option value="beverage">Beverage</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6 }}>Team size</label>
              <select value={teamSize} onChange={e => setTeamSize(e.target.value)} style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: teamSize ? '#fff' : '#b0b0d0', fontSize: 14, width: '100%' }}>
                <option value="">Select size...</option>
                <option value="1-10">1–10</option>
                <option value="11-50">11–50</option>
                <option value="51-200">51–200</option>
                <option value="200+">200+</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6 }}>Campaign name</label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Summer 2026 Shelf Audit" style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              <div style={{ color: '#b0b0d0', fontSize: 12, marginTop: 4 }}>You can configure stores and tasks after setup</div>
            </div>
            <div style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: 16 }}>
              <div style={{ color: '#b0b0d0', fontSize: 13 }}>Default payout per task: <span style={{ color: '#00e096', fontWeight: 600 }}>£12.00</span></div>
              <div style={{ color: '#b0b0d0', fontSize: 12, marginTop: 4 }}>Adjustable per campaign in settings</div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ background: '#030305', border: '1px solid #00e09644', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ color: '#00e096', fontSize: 18, fontWeight: 700 }}>You&apos;re all set!</div>
              <div style={{ color: '#b0b0d0', fontSize: 14, marginTop: 8 }}>Your workspace is ready. Head to the dashboard to explore.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'transparent', border: '1px solid #222240', borderRadius: 8, padding: '10px 20px', color: '#b0b0d0', cursor: 'pointer', fontSize: 14 }}>
              Back
            </button>
          ) : <div />}
          {step < totalSteps ? (
            <button onClick={handleNext} style={{ background: '#7c6df5', border: 'none', borderRadius: 8, padding: '10px 28px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleComplete} disabled={saving} style={{ background: '#00e096', border: 'none', borderRadius: 8, padding: '10px 28px', color: '#030305', fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Setting up...' : 'Go to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
