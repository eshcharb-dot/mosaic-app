import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Reference — Mosaic',
  description: 'Mosaic REST API documentation for programmatic access to campaign, store, and compliance data.',
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  PATCH: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border border-red-500/30',
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${METHOD_COLORS[method] ?? 'bg-white/10 text-white'}`}>
      {method}
    </span>
  )
}

function ParamRow({ name, type, required, description }: { name: string; type: string; required?: boolean; description: string }) {
  return (
    <tr className="border-t border-[#222240]">
      <td className="py-2.5 pr-4 font-mono text-xs text-[#a89cf7] whitespace-nowrap">
        {name}
        {required && <span className="ml-1.5 text-[10px] text-red-400 font-sans">required</span>}
      </td>
      <td className="py-2.5 pr-4 text-xs text-[#888] font-mono whitespace-nowrap">{type}</td>
      <td className="py-2.5 text-xs text-[#b0b0d0]">{description}</td>
    </tr>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-[#080814] border border-[#222240] rounded-xl p-4 overflow-x-auto text-xs leading-relaxed text-[#c8c8e8] font-mono whitespace-pre">
      <code>{code}</code>
    </pre>
  )
}

const CAMPAIGNS_EXAMPLE = JSON.stringify({
  data: [
    { id: "uuid", name: "Q1 Promo", status: "active", start_date: "2026-01-01", end_date: "2026-03-31", created_at: "2026-01-01T00:00:00Z" }
  ],
  meta: { total: 1, page: 1, per_page: 20 }
}, null, 2)

const CAMPAIGN_SINGLE_EXAMPLE = JSON.stringify({
  data: {
    id: "uuid",
    name: "Q1 Promo",
    status: "active",
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    stats: { total_submissions: 142, avg_compliance_score: 87 }
  },
  meta: {}
}, null, 2)

const STORES_EXAMPLE = JSON.stringify({
  data: [
    { id: "uuid", name: "Amsterdam Central", city: "Amsterdam", country: "NL", latest_compliance_score: 91 }
  ],
  meta: { total: 34, page: 1, per_page: 20 }
}, null, 2)

const SUBMISSIONS_EXAMPLE = JSON.stringify({
  data: [
    { id: "uuid", campaign_id: "uuid", store_id: "uuid", compliance_score: 88, status: "approved", submitted_at: "2026-03-15T10:23:00Z" }
  ],
  meta: { total: 210, page: 1, per_page: 20 }
}, null, 2)

const COMPLIANCE_EXAMPLE = JSON.stringify({
  data: {
    total_submissions: 210,
    scored_submissions: 198,
    avg_compliance_score: 84,
    passing_count: 167,
    failing_count: 31,
    pass_rate: 84,
    by_status: { approved: 167, pending: 12, rejected: 31 }
  },
  meta: { from: null, to: null }
}, null, 2)

const CURL_EXAMPLE = `curl https://app.mosaic.ai/api/v1/campaigns \\
  -H "Authorization: Bearer mk_live_your_key_here"`

const ERROR_EXAMPLE = JSON.stringify({ error: "Invalid API key" }, null, 2)

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#080814] text-[#e0e0f0]">
      {/* Top bar */}
      <header className="border-b border-[#222240] sticky top-0 z-10 bg-[#080814]/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c6df5] to-[#00d4d4] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <span className="font-black text-white text-lg tracking-tight">Mosaic</span>
            <span className="text-[#555570] text-sm">/</span>
            <span className="text-[#b0b0d0] text-sm">API Reference</span>
          </div>
          <Link
            href="/settings/api"
            className="px-4 py-2 bg-[#7c6df5] hover:bg-[#6b5de4] text-white text-sm font-medium rounded-xl transition-colors"
          >
            Get your API key
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Hero */}
        <section>
          <h1 className="text-4xl font-black text-white mb-3">API Reference</h1>
          <p className="text-[#b0b0d0] text-lg max-w-2xl">
            Programmatic access to your Mosaic campaigns, store compliance data, and submissions.
            All endpoints return JSON and follow REST conventions.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-[#12122a] border border-[#222240] rounded-xl px-4 py-2 text-sm text-[#b0b0d0]">
            Base URL:
            <span className="font-mono text-[#a89cf7]">https://app.mosaic.ai/api/v1</span>
          </div>
        </section>

        {/* Authentication */}
        <section id="authentication">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
          <p className="text-[#b0b0d0] mb-4">
            Mosaic uses API key authentication. Include your key as a Bearer token in the{' '}
            <code className="text-[#a89cf7] bg-[#12122a] px-1.5 py-0.5 rounded text-sm font-mono">Authorization</code> header.
          </p>
          <CodeBlock code={CURL_EXAMPLE} />
          <p className="text-[#b0b0d0] text-sm mt-4">
            Keys are prefixed <code className="text-[#a89cf7] font-mono">mk_live_</code> and scoped to your organization.
            Manage your keys at{' '}
            <Link href="/settings/api" className="text-[#7c6df5] hover:underline">Settings → API Keys</Link>.
          </p>
        </section>

        {/* Rate limits */}
        <section id="rate-limits">
          <h2 className="text-2xl font-bold text-white mb-4">Rate Limits</h2>
          <div className="bg-[#12122a] border border-[#222240] rounded-2xl p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#555570] uppercase tracking-wide">
                  <th className="pb-3 pr-6 font-medium">Plan</th>
                  <th className="pb-3 pr-6 font-medium">Limit</th>
                  <th className="pb-3 font-medium">Window</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#222240]">
                  <td className="py-2.5 pr-6 text-white">All plans</td>
                  <td className="py-2.5 pr-6 text-[#b0b0d0]">100 requests</td>
                  <td className="py-2.5 text-[#b0b0d0]">per minute</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[#555570] text-xs mt-4">
              Rate limit headers (<code className="font-mono">X-RateLimit-Limit</code>, <code className="font-mono">X-RateLimit-Remaining</code>) coming soon.
              Exceeding limits returns <code className="font-mono">429 Too Many Requests</code>.
            </p>
          </div>
        </section>

        {/* Errors */}
        <section id="errors">
          <h2 className="text-2xl font-bold text-white mb-4">Errors</h2>
          <p className="text-[#b0b0d0] mb-4">
            All errors return a JSON body with an <code className="text-[#a89cf7] font-mono text-sm">error</code> field and a standard HTTP status code.
          </p>
          <CodeBlock code={ERROR_EXAMPLE} />
          <div className="mt-4 bg-[#12122a] border border-[#222240] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#555570] uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['401', 'Missing or invalid API key'],
                  ['403', 'Key valid but lacks permission'],
                  ['404', 'Resource not found'],
                  ['429', 'Rate limit exceeded'],
                  ['500', 'Internal server error'],
                ].map(([code, desc]) => (
                  <tr key={code} className="border-t border-[#222240]">
                    <td className="px-5 py-2.5 font-mono text-[#a89cf7]">{code}</td>
                    <td className="px-5 py-2.5 text-[#b0b0d0]">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pagination */}
        <section id="pagination">
          <h2 className="text-2xl font-bold text-white mb-4">Pagination</h2>
          <p className="text-[#b0b0d0] mb-4">
            All list endpoints support cursor-free offset pagination via query parameters.
          </p>
          <div className="bg-[#12122a] border border-[#222240] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#555570] uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Parameter</th>
                  <th className="px-5 py-3 font-medium">Default</th>
                  <th className="px-5 py-3 font-medium">Max</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#222240]">
                  <td className="px-5 py-2.5 font-mono text-[#a89cf7] text-xs">page</td>
                  <td className="px-5 py-2.5 text-[#b0b0d0]">1</td>
                  <td className="px-5 py-2.5 text-[#b0b0d0]">—</td>
                  <td className="px-5 py-2.5 text-[#b0b0d0]">Page number (1-indexed)</td>
                </tr>
                <tr className="border-t border-[#222240]">
                  <td className="px-5 py-2.5 font-mono text-[#a89cf7] text-xs">per_page</td>
                  <td className="px-5 py-2.5 text-[#b0b0d0]">20</td>
                  <td className="px-5 py-2.5 text-[#b0b0d0]">100</td>
                  <td className="px-5 py-2.5 text-[#b0b0d0]">Results per page</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[#555570] text-xs mt-3">
            Responses include a <code className="font-mono">meta</code> object with <code className="font-mono">total</code>, <code className="font-mono">page</code>, and <code className="font-mono">per_page</code>.
          </p>
        </section>

        {/* Endpoints */}
        <section id="endpoints">
          <h2 className="text-2xl font-bold text-white mb-8">Endpoints</h2>

          {/* Campaigns list */}
          <div className="space-y-10">
            <EndpointSection
              method="GET"
              path="/campaigns"
              description="Returns a paginated list of all campaigns for your organization."
              params={[
                { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
                { name: 'per_page', type: 'integer', description: 'Results per page (default: 20, max: 100)' },
                { name: 'from', type: 'ISO 8601', description: 'Filter campaigns created on or after this date' },
                { name: 'to', type: 'ISO 8601', description: 'Filter campaigns created on or before this date' },
              ]}
              example={CAMPAIGNS_EXAMPLE}
            />

            <EndpointSection
              method="GET"
              path="/campaigns/:id"
              description="Returns a single campaign with submission statistics."
              params={[
                { name: 'id', type: 'uuid', required: true, description: 'Campaign UUID' },
              ]}
              example={CAMPAIGN_SINGLE_EXAMPLE}
            />

            <EndpointSection
              method="GET"
              path="/stores"
              description="Returns a paginated list of stores in your organization, each with their latest compliance score."
              params={[
                { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
                { name: 'per_page', type: 'integer', description: 'Results per page (default: 20, max: 100)' },
              ]}
              example={STORES_EXAMPLE}
            />

            <EndpointSection
              method="GET"
              path="/submissions"
              description="Returns recent submissions. Supports filtering by campaign and date range."
              params={[
                { name: 'campaign_id', type: 'uuid', description: 'Filter by campaign ID' },
                { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
                { name: 'per_page', type: 'integer', description: 'Results per page (default: 20, max: 100)' },
                { name: 'from', type: 'ISO 8601', description: 'Filter submissions on or after this date' },
                { name: 'to', type: 'ISO 8601', description: 'Filter submissions on or before this date' },
              ]}
              example={SUBMISSIONS_EXAMPLE}
            />

            <EndpointSection
              method="GET"
              path="/compliance"
              description="Returns an aggregated compliance summary for your organization — pass rates, average scores, and status breakdown."
              params={[
                { name: 'from', type: 'ISO 8601', description: 'Aggregate submissions on or after this date' },
                { name: 'to', type: 'ISO 8601', description: 'Aggregate submissions on or before this date' },
              ]}
              example={COMPLIANCE_EXAMPLE}
            />
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-[#222240] pt-12">
          <div className="bg-gradient-to-br from-[#7c6df5]/10 to-[#00d4d4]/10 border border-[#7c6df5]/20 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Ready to integrate?</h3>
            <p className="text-[#b0b0d0] text-sm mb-6">
              Generate an API key from your settings and start pulling data in minutes.
            </p>
            <Link
              href="/settings/api"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7c6df5] hover:bg-[#6b5de4] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Get your API key
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#222240] mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-[#555570]">
          <span>Mosaic API v1</span>
          <span>© {new Date().getFullYear()} Mosaic</span>
        </div>
      </footer>
    </div>
  )
}

function EndpointSection({
  method,
  path,
  description,
  params,
  example,
}: {
  method: string
  path: string
  description: string
  params: { name: string; type: string; required?: boolean; description: string }[]
  example: string
}) {
  return (
    <div className="bg-[#12122a] border border-[#222240] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[#222240]">
        <div className="flex items-center gap-3 mb-2">
          <MethodBadge method={method} />
          <code className="text-white font-mono text-sm">/api/v1{path}</code>
        </div>
        <p className="text-[#b0b0d0] text-sm">{description}</p>
      </div>
      {params.length > 0 && (
        <div className="px-6 py-4 border-b border-[#222240]">
          <div className="text-xs font-semibold text-[#555570] uppercase tracking-wide mb-3">Parameters</div>
          <table className="w-full">
            <tbody>
              {params.map(p => (
                <ParamRow key={p.name} {...p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-6 py-4">
        <div className="text-xs font-semibold text-[#555570] uppercase tracking-wide mb-3">Response</div>
        <CodeBlock code={example} />
      </div>
    </div>
  )
}
