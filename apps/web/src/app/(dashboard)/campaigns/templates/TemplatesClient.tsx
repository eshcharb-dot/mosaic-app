'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  description: string | null;
  brief: string | null;
  price_per_task_cents: number | null;
  compliance_rules: string[];
  category: string | null;
  icon: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Retail: '#7c6df5',
  Launch: '#00d4d4',
  Promotions: '#ffaa00',
  Chilled: '#00e096',
  Research: '#b0b0d0',
};

export default function TemplatesClient() {
  const supabase = createClient();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    supabase
      .from('campaign_templates')
      .select('id, name, description, brief, price_per_task_cents, compliance_rules, category, icon')
      .is('org_id', null)
      .order('category')
      .then(({ data }) => setTemplates(data ?? []));
  }, [supabase]);

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean) as string[]))];
  const filtered = activeCategory === 'All' ? templates : templates.filter(t => t.category === activeCategory);

  const handleCreate = async (template: Template) => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    if (!profile?.organization_id) { setCreating(false); return; }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: template.name,
        description: template.description,
        brief: template.brief,
        price_per_task_cents: template.price_per_task_cents,
        organization_id: profile.organization_id,
        status: 'draft',
      })
      .select()
      .single();

    setCreating(false);
    if (!error && campaign) router.push(`/campaigns/${campaign.id}`);
  };

  const cardBase: React.CSSProperties = {
    background: '#0c0c18',
    borderRadius: 16,
    padding: 24,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    textAlign: 'left',
    width: '100%',
  };

  return (
    <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Campaign Templates</h1>
          <p style={{ color: '#b0b0d0', margin: '4px 0 0', fontSize: 14 }}>
            Start from a pre-built template — customize as needed
          </p>
        </div>
        <button
          onClick={() => router.push('/campaigns/new')}
          style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #222240', borderRadius: 8, color: '#b0b0d0', cursor: 'pointer', fontSize: 14 }}
        >
          Blank Campaign
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 16px',
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              background: activeCategory === cat ? '#7c6df5' : 'transparent',
              color: activeCategory === cat ? '#fff' : '#b0b0d0',
              border: `1px solid ${activeCategory === cat ? '#7c6df5' : '#222240'}`,
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 40 }}>
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => setSelected(template)}
            style={{ ...cardBase, border: `1px solid ${selected?.id === template.id ? '#7c6df5' : '#222240'}` }}
            onMouseEnter={e => { if (selected?.id !== template.id) e.currentTarget.style.borderColor = '#444460'; }}
            onMouseLeave={e => { if (selected?.id !== template.id) e.currentTarget.style.borderColor = '#222240'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>{template.icon || '📋'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{template.name}</span>
                  {template.category && (
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 100,
                      background: `${CATEGORY_COLORS[template.category] ?? '#7c6df5'}22`,
                      color: CATEGORY_COLORS[template.category] ?? '#7c6df5',
                      fontWeight: 600,
                    }}>
                      {template.category}
                    </span>
                  )}
                </div>
                <p style={{ color: '#b0b0d0', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{template.description}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#b0b0d0' }}>
                Payout:{' '}
                <span style={{ color: '#00e096', fontWeight: 600 }}>
                  £{((template.price_per_task_cents ?? 0) / 100).toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#b0b0d0' }}>
                {(template.compliance_rules ?? []).length} rules
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
          background: '#0c0c18', borderLeft: '1px solid #222240',
          padding: 32, overflowY: 'auto', zIndex: 50,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'transparent', border: 'none', color: '#b0b0d0', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0 }}
          >
            ✕ Close
          </button>

          <div style={{ fontSize: 40, marginBottom: 16 }}>{selected.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{selected.name}</h2>
          <p style={{ color: '#b0b0d0', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{selected.description}</p>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#b0b0d0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Default Brief
            </div>
            <div style={{ background: '#030305', borderRadius: 8, padding: 16, fontSize: 13, color: '#e0e0f0', lineHeight: 1.7 }}>
              {selected.brief}
            </div>
          </div>

          {(selected.compliance_rules ?? []).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#b0b0d0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Compliance Rules
              </div>
              {selected.compliance_rules.map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#7c6df5', fontSize: 14, marginTop: 1 }}>✓</span>
                  <span style={{ color: '#e0e0f0', fontSize: 13, lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 24, padding: 16, background: '#030305', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: '#b0b0d0' }}>Default payout per task</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#00e096' }}>
              £{((selected.price_per_task_cents ?? 0) / 100).toFixed(2)}
            </div>
          </div>

          <button
            onClick={() => handleCreate(selected)}
            disabled={creating}
            style={{
              width: '100%', padding: '14px',
              background: '#7c6df5', color: '#fff',
              border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 15,
              cursor: 'pointer', opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating...' : 'Create Campaign from Template →'}
          </button>
        </div>
      )}
    </div>
  );
}
