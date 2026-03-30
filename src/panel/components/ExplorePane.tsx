import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { CapturedRequest } from '../../shared/types'

const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const MAX_BODY_LENGTH = 4000

function truncate(s: string | undefined): string {
  if (!s) return '(empty)'
  return s.length > MAX_BODY_LENGTH ? s.slice(0, MAX_BODY_LENGTH) + '\n… [truncated]' : s
}

function buildPrompt(req: CapturedRequest): string {
  return `You are analyzing an HTTP request/response pair captured from a live web application.

Request:
  Method: ${req.method}
  URL: ${req.url}
  Headers: ${JSON.stringify(req.requestHeaders, null, 2)}
  Body: ${truncate(req.requestBody)}

Response:
  Status: ${req.responseStatus}
  Headers: ${JSON.stringify(req.responseHeaders, null, 2)}
  Body: ${truncate(req.responseBody)}

Provide a concise summary of what this API endpoint does, what data it returns or accepts, and any notable patterns or observations.`
}

export default function ExplorePane({ request }: { request: CapturedRequest | null }) {
  const [urlDraft, setUrlDraft] = useState(DEFAULT_OLLAMA_URL)
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_OLLAMA_URL)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available models whenever the committed URL changes
  useEffect(() => {
    setModels([])
    setSelectedModel('')
    setError(null)

    fetch(`${ollamaUrl}/api/tags`)
      .then((res) => res.json())
      .then((data: { models: { name: string }[] }) => {
        const names = data.models.map((m) => m.name)
        setModels(names)
        if (names.length > 0) setSelectedModel(names[0])
      })
      .catch(() => setError('Could not connect to Ollama at ' + ollamaUrl + '. Is it running?'))
  }, [ollamaUrl])

  // Reset output when the selected request changes
  useEffect(() => {
    setSummary('')
    setError(null)
  }, [request?.id])

  const commitUrl = () => setOllamaUrl(urlDraft.trim() || DEFAULT_OLLAMA_URL)

  const analyze = async () => {
    if (!request || !selectedModel) return
    setSummary('')
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, prompt: buildPrompt(request), stream: true }),
      })

      if (!res.ok) throw new Error(`Ollama returned ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
          try {
            const chunk = JSON.parse(line) as { response: string }
            setSummary((prev) => prev + chunk.response)
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <span className="text-[#569cd6] text-base font-semibold">Explore</span>
        <p className="text-[#858585] text-xs max-w-sm leading-relaxed">
          Select a request from the Capture tab, then come back here to let Ollama analyze the
          endpoint — what it does, what it returns, and what patterns it reveals.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#3c3c3c] shrink-0 flex-wrap">
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={commitUrl}
          onKeyDown={(e) => e.key === 'Enter' && commitUrl()}
          className="bg-[#2d2d2d] text-[#d4d4d4] text-xs px-2 py-0.5 rounded border border-[#3c3c3c] focus:outline-none focus:border-[#569cd6] w-48"
        />
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={models.length === 0}
          className="bg-[#2d2d2d] text-[#d4d4d4] text-xs px-1.5 py-0.5 rounded border border-[#3c3c3c] focus:outline-none focus:border-[#569cd6] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {models.length === 0 && <option value="">No models found</option>}
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={analyze}
          disabled={loading || !selectedModel}
          className="text-xs px-3 py-0.5 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {error && (
          <p className="text-[#f44747] text-xs">{error}</p>
        )}
        {!error && !summary && !loading && (
          <p className="text-[#585858] text-xs">Click Analyze to generate a summary of this request.</p>
        )}
        {summary && (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="text-xs text-[#d4d4d4] leading-relaxed mb-2 last:mb-0">{children}</p>,
              h1: ({ children }) => <h1 className="text-sm font-semibold text-white mt-4 mb-1 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xs font-semibold text-white mt-3 mb-1 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xs font-semibold text-[#9cdcfe] mt-2 mb-0.5 first:mt-0">{children}</h3>,
              ul: ({ children }) => <ul className="text-xs text-[#d4d4d4] list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="text-xs text-[#d4d4d4] list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children, className }) => {
                const isBlock = className?.startsWith('language-')
                return isBlock
                  ? <code className="block bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-[#ce9178] whitespace-pre-wrap break-all my-2">{children}</code>
                  : <code className="bg-[#252526] text-[#ce9178] px-1 rounded text-xs">{children}</code>
              },
              pre: ({ children }) => <>{children}</>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-[#9cdcfe] not-italic">{children}</em>,
              hr: () => <hr className="border-[#3c3c3c] my-3" />,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-[#569cd6] pl-3 text-[#858585] my-2">{children}</blockquote>,
            }}
          >
            {summary}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
