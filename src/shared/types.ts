export interface CapturedRequest {
  id: string
  url: string
  method: string
  requestHeaders: Record<string, string>
  requestBody?: string
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody?: string
  timingMs: number
  timestamp: number
}
