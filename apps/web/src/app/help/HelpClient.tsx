'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ARTICLES, CATEGORIES, searchArticles, Article } from './articles';

export default function HelpClient() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    let results = searchArticles(query);
    if (selectedCategory) results = results.filter(a => a.category === selectedCategory);
    return results;
  }, [query, selectedCategory]);

  const card = { background: '#0c0c18', border: '1px solid #222240', borderRadius: 12, padding: '20px 24px' } as const;

  if (selectedArticle) {
    return (
      <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
        <button onClick={() => setSelectedArticle(null)} style={{ background: 'transparent', border: 'none', color: '#7c6df5', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Help Center
        </button>
        <div style={{ maxWidth: 720 }}>
          <div style={{ fontSize: 12, color: '#7c6df5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{selectedArticle.category}</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 32px', letterSpacing: '-0.5px' }}>{selectedArticle.title}</h1>
          <div style={{ ...card }}>
            <div style={{ color: '#e0e0f0', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {selectedArticle.content}
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedArticle.tags.map(t => (
              <span key={t} style={{ background: '#0a0a1a', border: '1px solid #222240', borderRadius: 100, padding: '3px 10px', fontSize: 12, color: '#b0b0d0' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: '#fff', margin: 0 }}>Help Center</h1>
        <p style={{ color: '#b0b0d0', margin: '8px 0 24px', fontSize: 16 }}>Find answers to your questions</p>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search articles..."
          style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 12, padding: '14px 20px', color: '#fff', fontSize: 16, width: '100%', maxWidth: 500, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => setSelectedCategory(null)} style={{ padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: !selectedCategory ? '#7c6df5' : 'transparent', color: !selectedCategory ? '#fff' : '#b0b0d0', border: `1px solid ${!selectedCategory ? '#7c6df5' : '#222240'}`, cursor: 'pointer' }}>
          All
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)} style={{ padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: selectedCategory === cat ? '#7c6df5' : 'transparent', color: selectedCategory === cat ? '#fff' : '#b0b0d0', border: `1px solid ${selectedCategory === cat ? '#7c6df5' : '#222240'}`, cursor: 'pointer' }}>
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#b0b0d0', padding: '60px 0' }}>
          No articles found for &quot;{query}&quot;
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
          {filtered.map(article => (
            <button
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              style={{ ...card, textAlign: 'left', cursor: 'pointer', border: '1px solid #222240', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c6df5')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#222240')}
            >
              <div style={{ fontSize: 11, color: '#7c6df5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{article.category}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{article.title}</div>
              <div style={{ fontSize: 13, color: '#b0b0d0', lineHeight: 1.5 }}>
                {article.content.replace(/#+\s/g, '').replace(/`{1,3}[^`]*`{1,3}/g, '').trim().slice(0, 100)}…
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
