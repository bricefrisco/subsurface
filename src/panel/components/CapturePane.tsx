import psl from 'psl'
import type { CapturedRequest } from '../../shared/types'

// Returns the registrable domain (eTLD+1) for a URL string, e.g.
// "https://api.example.com/foo" → "example.com"
// "https://api.example.co.uk/foo" → "example.co.uk"
function getSite(url: string): string {
  try {
    const parsed = psl.parse(new URL(url).hostname)
    return parsed.error ? '' : (parsed.domain ?? '')
  } catch {
    return ''
  }
}

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

function RequestRow({ request }: { request: CapturedRequest }) {
  let host = ''
  let path = request.url
  try {
    const u = new URL(request.url)
    host = u.host
    path = u.pathname + u.search
  } catch {
    // keep raw url as path
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-[#2a2a2a] hover:bg-[#2d2d2d] cursor-default text-xs">
      <span
        className="w-16 shrink-0 font-semibold"
        style={{ color: METHOD_COLORS[request.method] ?? '#858585' }}
      >
        {request.method}
      </span>
      <span className="w-10 shrink-0" style={{ color: statusColor(request.responseStatus) }}>
        {request.responseStatus || '—'}
      </span>
      <span className="flex-1 min-w-0 truncate" title={request.url}>
        <span className="text-[#585858]">{host}</span>
        <span>{path}</span>
      </span>
      <span className="w-16 text-right text-[#585858] shrink-0">
        {request.timingMs > 0 ? `${request.timingMs}ms` : '—'}
      </span>
    </div>
  )
}

export default function CapturePane({
  requests,
  onClear,
  sameOriginOnly,
  onSameOriginOnlyChange,
  currentOrigin,
  contentTypeFilter,
  onContentTypeFilterChange,
  bodySearch,
  onBodySearchChange,
}: {
  requests: CapturedRequest[]
  onClear: () => void
  sameOriginOnly: boolean
  onSameOriginOnlyChange: (v: boolean) => void
  currentOrigin: string
  contentTypeFilter: string
  onContentTypeFilterChange: (v: string) => void
  bodySearch: string
  onBodySearchChange: (v: string) => void
}) {
  const currentSite = getSite(currentOrigin)

  // Derive unique base content types (strip params like "; charset=utf-8")
  const contentTypes = Array.from(
    new Set(
      requests
        .map((req) => req.responseHeaders['content-type']?.split(';')[0].trim().toLowerCase())
        .filter((ct): ct is string => Boolean(ct)),
    ),
  ).sort()

  const filtered = requests
    .filter((req) => !sameOriginOnly || getSite(req.url) === currentSite)
    .filter((req) => {
      if (!contentTypeFilter) return true
      const ct = req.responseHeaders['content-type']?.split(';')[0].trim().toLowerCase() ?? ''
      return ct === contentTypeFilter
    })
    .filter((req) => {
      if (!bodySearch) return true
      const term = bodySearch.toLowerCase()
      return (
        req.url.toLowerCase().includes(term) ||
        req.method.toLowerCase().includes(term) ||
        String(req.responseStatus).includes(term) ||
        Object.entries(req.requestHeaders).some(
          ([k, v]) => k.toLowerCase().includes(term) || v.toLowerCase().includes(term),
        ) ||
        req.requestBody?.toLowerCase().includes(term) ||
        req.responseBody?.toLowerCase().includes(term)
      )
    })

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-[#3c3c3c] shrink-0">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[#858585] text-xs">
            {filtered.length} request{filtered.length !== 1 ? 's' : ''}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none" title={currentSite || 'site unknown'}>
            <input
              type="checkbox"
              checked={sameOriginOnly}
              onChange={(e) => onSameOriginOnlyChange(e.target.checked)}
              className="accent-[#569cd6] cursor-pointer"
            />
            <span className="text-[#858585] text-xs">Same site only</span>
          </label>
          <select
            value={contentTypes.includes(contentTypeFilter) ? contentTypeFilter : ''}
            onChange={(e) => onContentTypeFilterChange(e.target.value)}
            className="bg-[#2d2d2d] text-[#d4d4d4] text-xs px-1.5 py-0.5 rounded border border-[#3c3c3c] focus:outline-none focus:border-[#569cd6] cursor-pointer"
          >
            <option value="">All types</option>
            {contentTypes.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-[#858585] hover:text-[#d4d4d4] transition-colors px-2 py-0.5 rounded hover:bg-[#2d2d2d]"
        >
          Clear
        </button>
      </div>
      {/* Row 2: body search */}
      <div className="flex items-center gap-2 px-3 pb-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={bodySearch}
            onChange={(e) => onBodySearchChange(e.target.value)}
            placeholder="Search URL, method, status, headers, bodies..."
            className="w-full bg-[#2d2d2d] text-[#d4d4d4] text-xs px-2 py-0.5 rounded border border-[#3c3c3c] focus:outline-none focus:border-[#569cd6] placeholder-[#585858] pr-6"
          />
          {bodySearch && (
            <button
              onClick={() => onBodySearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#585858] hover:text-[#d4d4d4] text-xs leading-none"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[#585858] text-xs">
          Waiting for requests...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-1 border-b border-[#3c3c3c] text-[#585858] text-xs sticky top-0 bg-[#1e1e1e] select-none">
            <span className="w-16 shrink-0">Method</span>
            <span className="w-10 shrink-0">Status</span>
            <span className="flex-1 min-w-0">URL</span>
            <span className="w-16 text-right shrink-0">Time</span>
          </div>
          {filtered.map((req) => (
            <RequestRow key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  )
}
