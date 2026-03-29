export interface CapturedRequest {
  id: string
  url: string
  method: string
  requestHeaders: Record<string, string>
  requestBody?: string
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody?: string
  responseBodyEncoding?: string
  timingMs: number
  timestamp: number
}

export interface WebSocketFrame {
  id: string
  url: string
  direction: 'inbound' | 'outbound'
  data: string
  timestamp: number
}
