'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutTemplate, Plus, Trash2, ArrowRight, Tag, Clock } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  brief: string | null
  price_per_task_cents: number | null
  category: string | null
  created_at: string
  used_count: number
}

interface Props {
  templates: Template[]
  isAdmin: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  'shelf-audit': '#7c6df5',
  'price-check': '#00d4d4',
  'compliance': '#00e096',
  'promotion': '#ffc947',
  'availability': '#ff6b9d',
}

function categoryColor(cat: string | null) {
  if (!cat) return '#7c6df5'
  return CATEGORY_COLORS[cat.toLowerCase()] ?? '#7c6df5'
}

export default function TemplatesClient({ templates: initial, isAdmin }: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/campaigns/templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates(t => t.filter(x => x.id !== id))
    }
    setDeleting(null)
    setConfirmId(null)
  }

  function handleUse(id: string) {
    router.push(`/campaigns/new?template=${id}`)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Campaign Templates</h1>
          <p className="text-[#b0b0d0] mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/campaigns/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium"
          >
            <Plus size={15} />
            Create from scratch
          </a>
        </div>
      </div>

      {/* Empty state */}
      {templates.length === 0 ? (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#7c6df5]/10 border border-[#7c6df5]/20 flex items-center justify-center mb-5">
            <LayoutTemplate size={28} className="text-[#7c6df5]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No templates yet</h2>
          <p className="text-[#b0b0d0] text-sm max-w-xs mb-6">
            Save a campaign as a template to reuse it. Open any campaign and use the &ldquo;Save as Template&rdquo; option.
          </p>
          <a
            href="/campaigns/new"
            className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Plus size={16} />
            Create from scratch
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {templates.map((t) => {
            const color = categoryColor(t.category)
            const created = new Date(t.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })
            const briefPreview = t.brief ? t.brief.slice(0, 100) + (t.brief.length > 100 ? '…' : '') : null

            return (
              <div
                key={t.id}
                className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#7c6df5]/30 transition-colors"
              >
                {/* Top: category badge + name */}
                <div className="space-y-2">
                  {t.category && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                    >
                      <Tag size={10} />
                      {t.category}
                    </span>
                  )}
                  <h3 className="font-bold text-white text-base leading-snug">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-[#b0b0d0]">{t.description}</p>
                  )}
                </div>

                {/* Brief preview */}
                {briefPreview && (
                  <p className="text-sm text-[#b0b0d0] leading-relaxed flex-1 line-clamp-3">
                    {briefPreview}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-[#b0b0d0]">
                  <span className="flex items-center gap-1">
                    <LayoutTemplate size={11} />
                    Used {t.used_count} time{t.used_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[#222240]">·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {created}
                  </span>
                  {t.price_per_task_cents && (
                    <>
                      <span className="text-[#222240]">·</span>
                      <span>£{(t.price_per_task_cents / 100).toFixed(2)}/store</span>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#222240]">
                  <button
                    onClick={() => handleUse(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Use Template
                    <ArrowRight size={13} />
                  </button>
                  {isAdmin && (
                    confirmId === t.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-3 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          className="px-3 py-2.5 rounded-xl bg-[#ff4d6d]/15 border border-[#ff4d6d]/30 text-[#ff4d6d] hover:bg-[#ff4d6d]/25 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {deleting === t.id ? 'Deleting…' : 'Confirm'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(t.id)}
                        className="p-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-[#ff4d6d] hover:border-[#ff4d6d]/30 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
