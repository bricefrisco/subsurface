import type { CapturedRequest } from '../shared/types'

// In-memory store for captured requests (persisted to chrome.storage.local)
const requests: CapturedRequest[] = []

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'STORE_REQUEST') {
    requests.push(message.payload as CapturedRequest)
    sendResponse({ ok: true })
  }

  if (message.type === 'GET_REQUESTS') {
    sendResponse({ requests })
  }

  if (message.type === 'CLEAR_REQUESTS') {
    requests.length = 0
    sendResponse({ ok: true })
  }

  return true // keep channel open for async sendResponse
})
