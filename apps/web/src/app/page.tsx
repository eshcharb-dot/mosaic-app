import Link from 'next/link';

export const metadata = {
  title: 'Mosaic — Real-Time Shelf Intelligence',
  description: 'Crowdsourced visual compliance at scale. Turn any smartphone into a store audit tool.',
};

export default function LandingPage() {
  return (
    <div style={{ background: '#030305', minHeight: '100vh', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 64px', borderBottom: '1px solid #222240', position: 'sticky', top: 0, background: '#030305cc', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #7c6df5, #00d4d4)', borderRadius: 7 }} />
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>Mosaic</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/roi" style={{ color: '#b0b0d0', textDecoration: 'none', fontSize: 14 }}>ROI Calculator</Link>
          <Link href="/api-docs" style={{ color: '#b0b0d0', textDecoration: 'none', fontSize: 14 }}>API Docs</Link>
          <Link href="/(auth)/login" style={{ color: '#b0b0d0', textDecoration: 'none', fontSize: 14 }}>Sign in</Link>
          <Link href="/(auth)/login" style={{ background: '#7c6df5', color: '#fff', textDecoration: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '120px 64px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: '#7c6df522', border: '1px solid #7c6df544', borderRadius: 100, padding: '6px 16px', fontSize: 13, color: '#7c6df5', fontWeight: 600, marginBottom: 32 }}>
          Physical World Intelligence Platform
        </div>
        <h1 style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', margin: '0 0 24px', background: 'linear-gradient(135deg, #fff 60%, #7c6df5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Every shelf.<br />Always visible.
        </h1>
        <p style={{ fontSize: 20, color: '#b0b0d0', lineHeight: 1.6, marginBottom: 48, maxWidth: 620, margin: '0 auto 48px' }}>
          Mosaic turns any smartphone into a real-time store audit tool. Crowdsourced photo intelligence with AI scoring — at 10x the coverage, 1/10th the cost.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link href="/(auth)/login" style={{ background: '#7c6df5', color: '#fff', textDecoration: 'none', padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700, display: 'inline-block' }}>
            Start Free Trial
          </Link>
          <Link href="/roi" style={{ background: 'transparent', color: '#fff', textDecoration: 'none', padding: '16px 36px', borderRadius: 12, fontSize: 16, fontWeight: 600, border: '1px solid #222240', display: 'inline-block' }}>
            Calculate ROI →
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ padding: '40px 64px', borderTop: '1px solid #222240', borderBottom: '1px solid #222240', display: 'flex', justifyContent: 'center', gap: 80 }}>
        {[
          { value: '10x', label: 'More coverage' },
          { value: '90%', label: 'Cost reduction' },
          { value: '<2h', label: 'Audit turnaround' },
          { value: '99.9%', label: 'Uptime SLA' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#7c6df5', letterSpacing: '-1px' }}>{s.value}</div>
            <div style={{ color: '#b0b0d0', fontSize: 14, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section style={{ padding: '100px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>How it works</h2>
          <p style={{ color: '#b0b0d0', fontSize: 18, marginTop: 16 }}>Three steps from brief to insight</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            { step: '01', title: 'Launch a Campaign', desc: 'Define stores, tasks, and compliance rules. Upload your store list and set payout rates for collectors.' },
            { step: '02', title: 'Collectors Capture', desc: 'Our network of vetted field agents visits stores, takes photos, and earns per verified submission.' },
            { step: '03', title: 'AI Scores Everything', desc: 'GPT-4o Vision analyses each photo against your rules, generating compliance scores and flagging issues instantly.' },
          ].map(item => (
            <div key={item.step} style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 16, padding: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7c6df5', marginBottom: 16, letterSpacing: 1 }}>{item.step}</div>
              <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>{item.title}</h3>
              <p style={{ color: '#b0b0d0', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '0 64px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Built for enterprise</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { icon: '🗺️', title: 'Live Store Map', desc: 'Heatmap of compliance across all your locations, updated in real-time.' },
            { icon: '🤖', title: 'AI Compliance Scoring', desc: 'GPT-4o Vision scores every photo against your brand guidelines.' },
            { icon: '⚡', title: 'Instant Alerts', desc: 'Get notified via Slack or email the moment a store drops below threshold.' },
            { icon: '📊', title: 'Analytics & Reports', desc: 'Trend charts, store comparisons, campaign ROI — all exportable to CSV/PDF.' },
            { icon: '🔗', title: 'Webhooks & API', desc: 'Integrate Mosaic data into your existing BI tools and workflows.' },
            { icon: '🌍', title: 'GDPR Compliant', desc: 'EU data residency, collector consent flows, full audit trail.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>{f.title}</h3>
              <p style={{ color: '#b0b0d0', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 64px', textAlign: 'center', background: '#0c0c18', borderTop: '1px solid #222240', borderBottom: '1px solid #222240' }}>
        <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px' }}>Ready to see everything?</h2>
        <p style={{ color: '#b0b0d0', fontSize: 18, marginBottom: 40 }}>Start your free trial — no credit card required.</p>
        <Link href="/(auth)/login" style={{ background: '#7c6df5', color: '#fff', textDecoration: 'none', padding: '18px 48px', borderRadius: 12, fontSize: 18, fontWeight: 700, display: 'inline-block' }}>
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#b0b0d0', fontSize: 13 }}>
        <div>© 2026 Mosaic. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/roi" style={{ color: '#b0b0d0', textDecoration: 'none' }}>ROI Calculator</Link>
          <Link href="/api-docs" style={{ color: '#b0b0d0', textDecoration: 'none' }}>API Docs</Link>
          <Link href="/(auth)/login" style={{ color: '#b0b0d0', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
