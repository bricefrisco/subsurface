import type { CapturedRequest } from '../shared/types'

chrome.devtools.panels.create('subsurface', '', '/src/panel/index.html')

function headersToRecord(headers: { name: string; value: string }[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const { name, value } of headers) {
    record[name.toLowerCase()] = value
  }
  return record
}

chrome.devtools.network.onRequestFinished.addListener((entry) => {
  entry.getContent((body, encoding) => {
    const req: CapturedRequest = {
      id: crypto.randomUUID(),
      url: entry.request.url,
      method: entry.request.method,
      requestHeaders: headersToRecord(entry.request.headers),
      requestBody: entry.request.postData?.text,
      responseStatus: entry.response.status,
      responseHeaders: headersToRecord(entry.response.headers),
      responseBody: body || undefined,
      responseBodyEncoding: encoding || undefined,
      timingMs: Math.round(entry.time),
      timestamp: new Date(entry.startedDateTime).getTime(),
    }
    chrome.runtime.sendMessage({ type: 'STORE_REQUEST', payload: req })
  })
})
