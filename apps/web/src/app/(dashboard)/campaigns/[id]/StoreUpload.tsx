'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface ParsedStore {
  name: string
  address: string
  city: string
  postcode: string
  retailer: string
}

interface Toast {
  type: 'success' | 'error'
  message: string
}

interface Props {
  campaignId: string
  organizationId: string
  onSuccess: () => void
}

const REQUIRED_COLS = ['name', 'address', 'city', 'postcode', 'retailer'] as const

function parseCSV(text: string): ParsedStore[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const colIndex = (col: string) => headers.indexOf(col)

  const idx = {
    name: colIndex('name'),
    address: colIndex('address'),
    city: colIndex('city'),
    postcode: colIndex('postcode'),
    retailer: colIndex('retailer'),
  }

  const missing = REQUIRED_COLS.filter(c => idx[c] === -1)
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`)

  return lines.slice(1).filter(l => l.trim()).map(line => {
    // Handle quoted CSV values
    const cols: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = '' }
      else { current += ch }
    }
    cols.push(current.trim())

    return {
      name: cols[idx.name] ?? '',
      address: cols[idx.address] ?? '',
      city: cols[idx.city] ?? '',
      postcode: cols[idx.postcode] ?? '',
      retailer: cols[idx.retailer] ?? '',
    }
  }).filter(s => s.name)
}

export default function StoreUpload({ campaignId, organizationId, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedStore[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsed(null)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target?.result as string)
        if (rows.length === 0) throw new Error('No valid rows found in CSV')
        setParsed(rows)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Failed to parse CSV')
      }
    }
    reader.readAsText(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  async function handleImport() {
    if (!parsed || parsed.length === 0) return
    setImporting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast({ type: 'error', message: 'Not authenticated' }); setImporting(false); return }

    try {
      // Upsert stores (match on name + city + organization)
      const storeInserts = parsed.map(s => ({
        name: s.name,
        address: s.address,
        city: s.city,
        postcode: s.postcode,
        retailer: s.retailer,
        organization_id: organizationId,
      }))

      const { data: insertedStores, error: storeError } = await supabase
        .from('stores')
        .upsert(storeInserts, { onConflict: 'name,city,organization_id', ignoreDuplicates: false })
        .select('id, name, city')

      if (storeError) throw new Error(storeError.message)
      if (!insertedStores || insertedStores.length === 0) throw new Error('No stores were inserted')

      // Create campaign_stores entries (skip duplicates)
      const campaignStoreInserts = insertedStores.map(s => ({
        campaign_id: campaignId,
        store_id: s.id,
        status: 'pending',
      }))

      const { error: csError } = await supabase
        .from('campaign_stores')
        .upsert(campaignStoreInserts, { onConflict: 'campaign_id,store_id', ignoreDuplicates: true })

      if (csError) throw new Error(csError.message)

      showToast({ type: 'success', message: `${insertedStores.length} stores imported successfully` })
      setParsed(null)
      onSuccess()
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm shadow-xl"
          style={{
            background: toast.type === 'success' ? 'rgba(0,224,150,0.12)' : 'rgba(255,107,157,0.12)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(0,224,150,0.3)' : 'rgba(255,107,157,0.3)'}`,
            color: toast.type === 'success' ? '#00e096' : '#ff6b9d',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />

      {/* Trigger button */}
      {!parsed && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium"
        >
          <Upload size={15} />
          Upload CSV
        </button>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-[#ff6b9d]/10 border border-[#ff6b9d]/25 rounded-xl text-sm text-[#ff6b9d]">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">CSV parse error</div>
            <div>{parseError}</div>
            <button onClick={() => { setParseError(null); fileRef.current?.click() }} className="mt-2 underline text-xs">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <div className="mt-4 bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#222240]">
            <div className="text-sm font-semibold text-white">
              Preview — {parsed.length} store{parsed.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setParsed(null); fileRef.current?.click() }}
                className="text-[#b0b0d0] hover:text-white transition-colors"
                title="Choose a different file"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider">
                  {['Name', 'Address', 'City', 'Postcode', 'Retailer'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-semibold border-b border-[#222240]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222240]">
                {parsed.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2 text-white font-medium">{row.name}</td>
                    <td className="px-4 py-2 text-[#b0b0d0]">{row.address}</td>
                    <td className="px-4 py-2 text-[#b0b0d0]">{row.city}</td>
                    <td className="px-4 py-2 text-[#b0b0d0]">{row.postcode}</td>
                    <td className="px-4 py-2 text-[#b0b0d0]">{row.retailer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 50 && (
              <div className="px-4 py-2 text-xs text-[#b0b0d0] border-t border-[#222240]">
                … and {parsed.length - 50} more rows (all will be imported)
              </div>
            )}
          </div>

          {/* Import button */}
          <div className="px-5 py-4 border-t border-[#222240] flex items-center justify-between gap-4">
            <button
              onClick={() => setParsed(null)}
              className="text-sm text-[#b0b0d0] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              <Upload size={14} />
              {importing ? 'Importing…' : `Import ${parsed.length} store${parsed.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
