import { useState, useEffect, useCallback } from 'react'
import type { CapturedRequest } from '../shared/types'

type Tab = 'capture' | 'analyze' | 'replay' | 'explore'

const TABS: { id: Tab; label: string }[] = [
  { id: 'capture', label: 'Capture' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'replay', label: 'Replay' },
  { id: 'explore', label: 'Explore' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('capture')
  const [requests, setRequests] = useState<CapturedRequest[]>([])

  const clearRequests = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' })
    setRequests([])
  }, [])

  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: 'GET_REQUESTS' },
      (res: { requests: CapturedRequest[] }) => {
        setRequests(res?.requests ?? [])
      },
    )

    const port = chrome.runtime.connect({ name: 'panel' })
    port.onMessage.addListener((msg: { type: string; payload: CapturedRequest }) => {
      if (msg.type === 'NEW_REQUEST') {
        setRequests((prev) => [...prev, msg.payload])
      }
      if (msg.type === 'REQUESTS_CLEARED') {
        setRequests([])
      }
    })

    return () => port.disconnect()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm">
      <div className="flex items-center border-b border-[#3c3c3c] px-2 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-xs tracking-wide transition-colors',
              activeTab === tab.id
                ? 'text-white border-b-2 border-[#569cd6] -mb-px'
                : 'text-[#858585] hover:text-[#d4d4d4]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'capture' && (
          <CapturePane requests={requests} onClear={clearRequests} />
        )}
        {activeTab === 'analyze' && (
          <Placeholder
            title="Analyze"
            description="Groups requests by endpoint and diffs them over time. Surfaces hidden parameters, pagination cursors, and undocumented patterns via local AI."
          />
        )}
        {activeTab === 'replay' && (
          <Placeholder
            title="Replay"
            description="Re-issue any captured request with modified parameters. Auth headers and cookies are forwarded automatically."
          />
        )}
        {activeTab === 'explore' && (
          <Placeholder
            title="Explore"
            description="Generates a purpose-built UI from the discovered data shape — a product catalog, a timeline, a filterable table."
          />
        )}
      </div>
    </div>
  )
}

// ── Capture ────────────────────────────────────────────────────────────────

function CapturePane({
  requests,
  onClear,
}: {
  requests: CapturedRequest[]
  onClear: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#3c3c3c] shrink-0">
        <span className="text-[#858585] text-xs">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClear}
          className="text-xs text-[#858585] hover:text-[#d4d4d4] transition-colors px-2 py-0.5 rounded hover:bg-[#2d2d2d]"
        >
          Clear
        </button>
      </div>

      {requests.length === 0 ? (
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
          {requests.map((req) => (
            <RequestRow key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  )
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

// ── Shared ─────────────────────────────────────────────────────────────────

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
      <span className="text-[#569cd6] text-base font-semibold">{title}</span>
      <p className="text-[#858585] text-xs max-w-sm leading-relaxed">{description}</p>
    </div>
  )
}
