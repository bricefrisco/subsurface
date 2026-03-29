import type { CapturedRequest, WebSocketFrame } from '../shared/types'

const requests: CapturedRequest[] = []
const wsFrames: WebSocketFrame[] = []
const connectedPorts: chrome.runtime.Port[] = []

chrome.runtime.onConnect.addListener((port) => {
  connectedPorts.push(port)
  port.onDisconnect.addListener(() => {
    const idx = connectedPorts.indexOf(port)
    if (idx !== -1) connectedPorts.splice(idx, 1)
  })
})

function broadcast(message: unknown) {
  for (const port of connectedPorts) {
    port.postMessage(message)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'STORE_REQUEST') {
    const req = message.payload as CapturedRequest
    requests.push(req)
    broadcast({ type: 'NEW_REQUEST', payload: req })
    sendResponse({ ok: true })
  }

  if (message.type === 'GET_REQUESTS') {
    sendResponse({ requests })
  }

  if (message.type === 'CLEAR_REQUESTS') {
    requests.length = 0
    wsFrames.length = 0
    broadcast({ type: 'REQUESTS_CLEARED' })
    sendResponse({ ok: true })
  }

  if (message.type === 'WEBSOCKET_FRAME') {
    const frame: WebSocketFrame = { id: crypto.randomUUID(), ...message.payload }
    wsFrames.push(frame)
    broadcast({ type: 'NEW_WS_FRAME', payload: frame })
    sendResponse({ ok: true })
  }

  return true
})
