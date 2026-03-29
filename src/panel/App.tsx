import { useState } from 'react'

type Tab = 'capture' | 'analyze' | 'replay' | 'explore'

const TABS: { id: Tab; label: string }[] = [
  { id: 'capture', label: 'Capture' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'replay', label: 'Replay' },
  { id: 'explore', label: 'Explore' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('capture')

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm">
      {/* Tab bar */}
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

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'capture' && <CapturePane />}
        {activeTab === 'analyze' && <AnalyzePane />}
        {activeTab === 'replay' && <ReplayPane />}
        {activeTab === 'explore' && <ExplorePane />}
      </div>
    </div>
  )
}

function CapturePane() {
  return (
    <Placeholder
      title="Capture"
      description="Intercepts XHR, fetch, and WebSocket traffic as you browse. Full request/response pairs including headers, bodies, and timing."
    />
  )
}

function AnalyzePane() {
  return (
    <Placeholder
      title="Analyze"
      description="Groups requests by endpoint and diffs them over time. Surfaces hidden parameters, pagination cursors, and undocumented patterns via local AI."
    />
  )
}

function ReplayPane() {
  return (
    <Placeholder
      title="Replay"
      description="Re-issue any captured request with modified parameters. Auth headers and cookies are forwarded automatically."
    />
  )
}

function ExplorePane() {
  return (
    <Placeholder
      title="Explore"
      description="Generates a purpose-built UI from the discovered data shape — a product catalog, a timeline, a filterable table."
    />
  )
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
      <span className="text-[#569cd6] text-base font-semibold">{title}</span>
      <p className="text-[#858585] text-xs max-w-sm leading-relaxed">{description}</p>
    </div>
  )
}
