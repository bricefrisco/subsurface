import { useState, useEffect, useCallback } from 'react'
import type { CapturedRequest } from '../shared/types'
import CapturePane from './components/CapturePane'
import AnalyzePane from './components/AnalyzePane'
import ExplorePane from './components/ExplorePane'
import ReplayPane from './components/ReplayPane'

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
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null)
  const [sameOriginOnly, setSameOriginOnly] = useState(true)
  const [currentOrigin, setCurrentOrigin] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState('application/json')
  const [bodySearch, setBodySearch] = useState('')

  const clearRequests = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' })
    setRequests([])
    setSelectedRequest(null)
  }, [])

  const handleSelectRequest = useCallback((req: CapturedRequest) => {
    setSelectedRequest(req)
    setActiveTab('analyze')
  }, [])

  useEffect(() => {
    let active = true
    let currentPort: chrome.runtime.Port | null = null

    function sync() {
      chrome.runtime.sendMessage(
        { type: 'GET_REQUESTS' },
        (res: { requests: CapturedRequest[] }) => {
          if (res?.requests) setRequests(res.requests)
        },
      )
    }

    function connect() {
      if (!active) return
      currentPort = chrome.runtime.connect({ name: 'panel' })
      currentPort.onMessage.addListener((msg: { type: string; payload: CapturedRequest }) => {
        if (msg.type === 'NEW_REQUEST') {
          setRequests((prev) => [...prev, msg.payload])
        }
        if (msg.type === 'REQUESTS_CLEARED') {
          setRequests([])
          setSelectedRequest(null)
        }
      })
      currentPort.onDisconnect.addListener(() => {
        // Background service worker was killed — reconnect and re-sync
        sync()
        connect()
      })
    }

    sync()
    connect()

    return () => {
      active = false
      currentPort?.disconnect()
    }
  }, [])

  useEffect(() => {
    const onNavigated = (url: string) => {
      try { setCurrentOrigin(new URL(url).origin) }
      catch { setCurrentOrigin('') }
      setContentTypeFilter('')
    }

    chrome.devtools.inspectedWindow.eval(
      'window.location.origin',
      (result, exceptionInfo) => {
        if (exceptionInfo) return
        setCurrentOrigin((result as string) ?? '')
      },
    )

    chrome.devtools.network.onNavigated.addListener(onNavigated)
    return () => chrome.devtools.network.onNavigated.removeListener(onNavigated)
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
          <CapturePane
            requests={requests}
            onClear={clearRequests}
            selectedRequestId={selectedRequest?.id ?? null}
            onSelectRequest={handleSelectRequest}
            sameOriginOnly={sameOriginOnly}
            onSameOriginOnlyChange={setSameOriginOnly}
            currentOrigin={currentOrigin}
            contentTypeFilter={contentTypeFilter}
            onContentTypeFilterChange={setContentTypeFilter}
            bodySearch={bodySearch}
            onBodySearchChange={setBodySearch}
          />
        )}
        {activeTab === 'analyze' && (
          <AnalyzePane request={selectedRequest} />
        )}
        {activeTab === 'replay' && (
          <ReplayPane request={selectedRequest} />
        )}
        {activeTab === 'explore' && (
          <ExplorePane request={selectedRequest} />
        )}
      </div>
    </div>
  )
}
