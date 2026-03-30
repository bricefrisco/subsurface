import { useState, useEffect } from 'react'
import type { CapturedRequest } from '../../shared/types'

const METHOD_COLORS: Record<string, string> = {
  GET: '#569cd6',
  POST: '#4ec9b0',
  PUT: '#ce9178',
  DELETE: '#f44747',
  PATCH: '#b267e6',
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

// Headers that browsers forbid setting via fetch
const FORBIDDEN_HEADERS = new Set([
  'accept-charset', 'accept-encoding', 'access-control-request-headers',
  'access-control-request-method', 'connection', 'content-length',
  'cookie', 'cookie2', 'date', 'dnt', 'expect', 'host', 'keep-alive',
  'origin', 'referer', 'te', 'trailer', 'transfer-encoding', 'upgrade',
  'via',
])

function statusColor(status: number): string {
  if (status >= 500) return '#f44747'
  if (status >= 400) return '#ce9178'
  if (status >= 300) return '#569cd6'
  if (status >= 200) return '#4ec9b0'
  return '#858585'
}

function prettyBody(body: string, contentType: string | undefined): string {
  const ct = contentType?.split(';')[0].trim().toLowerCase() ?? ''
  if (ct === 'application/json') {
    try { return JSON.stringify(JSON.parse(body), null, 2) }
    catch { /* fall through */ }
  }
  return body
}

interface HeaderRow {
  id: number
  key: string
  value: string
  enabled: boolean
}

interface ReplayResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  timingMs: number
}

// Valid HTTP token characters per RFC 7230
const VALID_HEADER_NAME = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/

function isAllowedHeader(key: string): boolean {
  const lower = key.toLowerCase()
  // Drop HTTP/2 pseudo-headers (:authority, :method, etc.)
  if (lower.startsWith(':')) return false
  if (FORBIDDEN_HEADERS.has(lower)) return false
  if (!VALID_HEADER_NAME.test(key)) return false
  return true
}

function requestToHeaderRows(headers: Record<string, string>): HeaderRow[] {
  return Object.entries(headers)
    .filter(([key]) => isAllowedHeader(key))
    .map(([key, value], i) => ({ id: i, key, value, enabled: true }))
}

let nextId = 1000

export default function ReplayPane({ request }: { request: CapturedRequest | null }) {
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [headers, setHeaders] = useState<HeaderRow[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<ReplayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Populate form when request changes
  useEffect(() => {
    if (!request) return
    setUrl(request.url)
    setMethod(request.method)
    setHeaders(requestToHeaderRows(request.requestHeaders))
    setBody(request.requestBody ?? '')
    setResponse(null)
    setError(null)
  }, [request])

  function addHeader() {
    setHeaders((prev) => [...prev, { id: nextId++, key: '', value: '', enabled: true }])
  }

  function removeHeader(id: number) {
    setHeaders((prev) => prev.filter((h) => h.id !== id))
  }

  function updateHeader(id: number, field: 'key' | 'value' | 'enabled', val: string | boolean) {
    setHeaders((prev) => prev.map((h) => h.id === id ? { ...h, [field]: val } : h))
  }

  async function send() {
    setSending(true)
    setError(null)
    setResponse(null)

    const fetchHeaders: Record<string, string> = {}
    for (const h of headers) {
      const name = h.key.trim()
      if (h.enabled && name && VALID_HEADER_NAME.test(name)) {
        fetchHeaders[name] = h.value
      }
    }

    const hasBody = !['GET', 'HEAD'].includes(method) && body.trim()

    const start = performance.now()
    try {
      const res = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: hasBody ? body : undefined,
      })

      const timingMs = Math.round(performance.now() - start)
      const responseBody = await res.text()

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => { responseHeaders[key] = value })

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        timingMs,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <span className="text-[#569cd6] text-base font-semibold">Replay</span>
        <p className="text-[#858585] text-xs max-w-sm leading-relaxed">
          Select a request from the Capture tab to load it here, then resend with modifications.
        </p>
      </div>
    )
  }

  const responseContentType = response?.headers['content-type']

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* URL + Method row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3c3c3c] shrink-0">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-[#252526] border border-[#3c3c3c] rounded px-2 py-1 text-xs outline-none focus:border-[#569cd6]"
          style={{ color: METHOD_COLORS[method] ?? '#d4d4d4' }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m} style={{ color: METHOD_COLORS[m] ?? '#d4d4d4' }}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-[#252526] border border-[#3c3c3c] rounded px-2 py-1 text-xs text-[#d4d4d4] outline-none focus:border-[#569cd6] font-mono"
          placeholder="https://..."
        />
        <button
          onClick={send}
          disabled={sending || !url.trim()}
          className="px-4 py-1 rounded text-xs font-semibold bg-[#0e639c] text-white hover:bg-[#1177bb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* Request Headers */}
      <div className="border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs text-[#858585]">Request Headers</span>
          <button
            onClick={addHeader}
            className="text-xs text-[#569cd6] hover:text-[#9cdcfe] transition-colors"
          >
            + Add
          </button>
        </div>
        <div className="px-3 pb-2 flex flex-col gap-1">
          {headers.length === 0 && (
            <span className="text-[#585858] text-xs">no headers</span>
          )}
          {headers.map((h) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={h.enabled}
                onChange={(e) => updateHeader(h.id, 'enabled', e.target.checked)}
                className="accent-[#569cd6] shrink-0"
              />
              <input
                type="text"
                value={h.key}
                onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                placeholder="Header-Name"
                className="w-40 bg-[#252526] border border-[#3c3c3c] rounded px-2 py-0.5 text-xs text-[#9cdcfe] outline-none focus:border-[#569cd6] font-mono"
              />
              <span className="text-[#585858] text-xs">:</span>
              <input
                type="text"
                value={h.value}
                onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 bg-[#252526] border border-[#3c3c3c] rounded px-2 py-0.5 text-xs text-[#ce9178] outline-none focus:border-[#569cd6] font-mono"
              />
              <button
                onClick={() => removeHeader(h.id)}
                className="text-[#585858] hover:text-[#f44747] transition-colors text-xs px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Request Body */}
      {!['GET', 'HEAD'].includes(method) && (
        <div className="border-b border-[#2a2a2a]">
          <div className="px-3 py-1.5">
            <span className="text-xs text-[#858585]">Request Body</span>
          </div>
          <div className="px-3 pb-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Request body…"
              className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-2 py-1.5 text-xs text-[#d4d4d4] outline-none focus:border-[#569cd6] font-mono resize-y"
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 mt-3 px-3 py-2 rounded bg-[#3a1a1a] border border-[#f44747] text-xs text-[#f44747]">
          {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="flex flex-col mt-1">
          {/* Response summary */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-[#3c3c3c] shrink-0">
            <span className="text-xs font-semibold" style={{ color: statusColor(response.status) }}>
              {response.status} {response.statusText}
            </span>
            <span className="text-xs text-[#858585]">{response.timingMs}ms</span>
          </div>

          {/* Response Headers */}
          <div className="border-b border-[#2a2a2a]">
            <div className="px-3 py-1.5">
              <span className="text-xs text-[#858585]">Response Headers</span>
            </div>
            <div className="px-3 pb-3">
              {Object.keys(response.headers).length === 0 ? (
                <span className="text-[#585858] text-xs">none</span>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {Object.entries(response.headers).map(([key, value]) => (
                      <tr key={key} className="align-top">
                        <td className="pr-4 py-0.5 text-[#9cdcfe] whitespace-nowrap w-0">{key}</td>
                        <td className="py-0.5 text-[#ce9178] break-all">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Response Body */}
          <div className="border-b border-[#2a2a2a]">
            <div className="px-3 py-1.5">
              <span className="text-xs text-[#858585]">Response Body</span>
            </div>
            <div className="px-3 pb-3">
              {response.body ? (
                <pre className="text-xs text-[#d4d4d4] whitespace-pre-wrap break-all leading-relaxed max-h-80 overflow-y-auto">
                  {prettyBody(response.body, responseContentType)}
                </pre>
              ) : (
                <span className="text-[#585858] text-xs">empty</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
