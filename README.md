# subsurface
 
> What your web app shows you is just the beginning. subsurface reverse-engineers the API beneath, then builds you a better interface to explore it.
 
Most web apps expose a fraction of what their backend can actually do. subsurface sits in your DevTools and watches the full conversation between browser and server — surfacing hidden pagination, undocumented parameters, and unexplored endpoints that the UI never touches. Then it goes a step further: it generates a purpose-built interface so you can actually explore what it finds.
 
## What it does
 
**Capture** — Intercepts all outbound XHR, fetch, and WebSocket traffic as you use a site normally. Stores full request/response pairs including headers, bodies, and timing.
 
**Analyze** — Groups requests by endpoint and diffs them over time. Spots patterns: parameters that increment, cursors that paginate, filters that appear once and never again. A local AI model (via Ollama) generates hypotheses about what the undocumented surface looks like.
 
**Experiment** — Replay any captured request with modified parameters, directly from the DevTools panel. Auth headers and cookies are carried forward automatically. See what the API actually returns when you ask it something the UI never does.
 
**Explore** — subsurface doesn't just show you raw JSON. Based on the data shape and available parameters it discovers, it generates a purpose-built UI to browse the data — a product catalog, a timeline, a filterable table — whatever fits what the API actually returns. The interface the frontend should have built.
 
## How it works
 
subsurface is a Chrome extension with three main parts:
 
- A **DevTools panel** where you interact with captured traffic
- A **background service worker** that stores requests and communicates with Ollama
- A **content script** that captures WebSocket frames before the page can intercept them
 
AI inference runs entirely locally via [Ollama](https://ollama.com). No traffic leaves your machine.
 
## Status
 
Early development. The current focus is:
 
- [x] Architecture design
- [ ] Request capture pipeline (`chrome.devtools.network`)
- [ ] WebSocket capture (content script)
- [ ] Request grouping and diff view
- [ ] Replay with auth forwarding
- [ ] Ollama integration for pattern inference
- [ ] Generated UI explorer
 
## Getting started
 
> Prerequisites: Chrome, [Ollama](https://ollama.com) running locally
 
```bash
git clone https://github.com/yourusername/subsurface
cd subsurface
npm install
npm run build
```
 
Then load the unpacked extension in Chrome:
 
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder
4. Open DevTools on any page → find the **subsurface** panel
 
## Design principles
 
**Local-first.** Your traffic is sensitive. Ollama runs on your machine; nothing is sent to an external AI service.
 
**Hypothesis, not oracle.** The AI surfaces patterns and suggests experiments. You decide what to probe. subsurface won't confidently assert what an undocumented API does — it helps you find out empirically.
 
**Minimal footprint.** The extension captures what you ask it to and stays out of the way otherwise.
 
## Contributing
 
This project is in early scaffolding. If you want to contribute, opening an issue to discuss before submitting a PR is appreciated — the architecture is still being established.
 
## License
 
MIT
