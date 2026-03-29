// Patch WebSocket before the page script runs so we capture all frames.
const OriginalWebSocket = window.WebSocket

class PatchedWebSocket extends OriginalWebSocket {
  constructor(url: string | URL, protocols?: string | string[]) {
    super(url, protocols)

    this.addEventListener('message', (event) => {
      chrome.runtime.sendMessage({
        type: 'WEBSOCKET_FRAME',
        payload: {
          url: typeof url === 'string' ? url : url.toString(),
          data: event.data,
          direction: 'inbound',
          timestamp: Date.now(),
        },
      })
    })
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    chrome.runtime.sendMessage({
      type: 'WEBSOCKET_FRAME',
      payload: {
        url: this.url,
        data: typeof data === 'string' ? data : '[binary]',
        direction: 'outbound',
        timestamp: Date.now(),
      },
    })
    super.send(data)
  }
}

window.WebSocket = PatchedWebSocket as unknown as typeof WebSocket
