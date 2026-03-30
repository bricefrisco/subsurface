import { useState } from 'react'
import type { CapturedRequest } from '../../shared/types'

const METHOD_COLORS: Record<string, string> = {
  GET: '#569cd6',
  POST: '#4ec9b0',
  PUT: '#ce9178',
  DELETE: '#f44747',
  PATCH: '#b267e6',
}

function statusColor(status: number): string {
  if (status >= 500) return '#f44747'
  if (status >= 400) return '#ce9178'
  if (status >= 300) return '#569cd6'
  if (status >= 200) return '#4ec9b0'
  return '#858585'
}

function prettyBody(body: string | undefined, contentType: string | undefined): string {
  if (!body) return ''
  const ct = contentType?.split(';')[0].trim().toLowerCase() ?? ''
  if (ct === 'application/json') {
    try { return JSON.stringify(JSON.parse(body), null, 2) }
    catch { /* fall through to raw */ }
  }
  return body
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[#2a2a2a]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-[#858585] hover:text-[#d4d4d4] hover:bg-[#252525] transition-colors select-none"
      >
        <span className="text-[#569cd6]">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function HeaderTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers)
  if (entries.length === 0) return <span className="text-[#585858] text-xs">none</span>

  return (
    <table className="w-full text-xs border-collapse">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="align-top">
            <td className="pr-4 py-0.5 text-[#9cdcfe] whitespace-nowrap w-0">{key}</td>
            <td className="py-0.5 text-[#ce9178] break-all">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BodyBlock({ body, contentType }: { body: string | undefined; contentType: string | undefined }) {
  if (!body) return <span className="text-[#585858] text-xs">empty</span>

  return (
    <pre className="text-xs text-[#d4d4d4] whitespace-pre-wrap break-all leading-relaxed max-h-80 overflow-y-auto">
      {prettyBody(body, contentType)}
    </pre>
  )
}

export default function AnalyzePane({ request }: { request: CapturedRequest | null }) {
  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <span className="text-[#569cd6] text-base font-semibold">Analyze</span>
        <p className="text-[#858585] text-xs max-w-sm leading-relaxed">
          Select a request from the Capture tab to inspect its details.
        </p>
      </div>
    )
  }

  const responseContentType = request.responseHeaders['content-type']
  const requestContentType = request.requestHeaders['content-type']

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#3c3c3c] shrink-0 flex-wrap">
        <span className="font-semibold text-xs" style={{ color: METHOD_COLORS[request.method] ?? '#858585' }}>
          {request.method}
        </span>
        <span className="text-xs" style={{ color: statusColor(request.responseStatus) }}>
          {request.responseStatus || '—'}
        </span>
        <span className="text-xs text-[#858585]">
          {request.timingMs > 0 ? `${request.timingMs}ms` : '—'}
        </span>
        <span className="text-xs text-[#d4d4d4] break-all">{request.url}</span>
      </div>

      {/* Sections */}
      <Section title="Request Headers">
        <HeaderTable headers={request.requestHeaders} />
      </Section>

      <Section title="Request Body" defaultOpen={Boolean(request.requestBody)}>
        <BodyBlock body={request.requestBody} contentType={requestContentType} />
      </Section>

      <Section title="Response Headers">
        <HeaderTable headers={request.responseHeaders} />
      </Section>

      <Section title="Response Body" defaultOpen={Boolean(request.responseBody)}>
        <BodyBlock body={request.responseBody} contentType={responseContentType} />
      </Section>
    </div>
  )
}
