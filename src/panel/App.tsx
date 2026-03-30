import { useState, useEffect, useCallback } from 'react'
import type { CapturedRequest } from '../shared/types'
import CapturePane from './components/CapturePane'
import Placeholder from './components/Placeholder'

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
  const [sameOriginOnly, setSameOriginOnly] = useState(true)
  const [currentOrigin, setCurrentOrigin] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState('application/json')

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

  useEffect(() => {
    // For navigations, onNavigated supplies the URL directly — no eval needed.
    const onNavigated = (url: string) => {
      try { setCurrentOrigin(new URL(url).origin) }
      catch { setCurrentOrigin('') }
    }

    // Bootstrap from the current page via eval.
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
            sameOriginOnly={sameOriginOnly}
            onSameOriginOnlyChange={setSameOriginOnly}
            currentOrigin={currentOrigin}
            contentTypeFilter={contentTypeFilter}
            onContentTypeFilterChange={setContentTypeFilter}
          />
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
