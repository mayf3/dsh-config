// Host-side loader entry for the side panel. The UI itself is the browser
// bundle exported as `./client`; this half additionally serves session
// latency stats over a small JSON route and the bundled wallpaper assets
// (bg.png + chatgpt-*.png) over /ui-side-panel/assets/*. The BetterSidebar
// tab surface has no seat for the conversation node window, so the stats
// are derived here from the session event log (the same fold the client
// runtime uses for assistant step timing) and fetched by the tab.
//
// The inject list is PLUGIN-level (cordis): it governs this host apply only.
// The client bundle's own inject list lives in ./client.js and is consumed
// by the web client scan independently.

import { readFile } from 'node:fs/promises'

export const inject = ['webServer', 'sessions']

/** Package asset directory (../assets relative to this module). */
const ASSETS_ROOT = new URL('../assets/', import.meta.url)

/** Content types for the flat asset directory's suffixes. */
const ASSET_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

/** Lowercased filename suffix; '' when the name has no dot. */
function extensionOf(name) {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i).toLowerCase()
}

function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/ui-side-panel/stats',
    handler: (req, res) => {
      let sessionId = ''
      try {
        sessionId = new URL(req.url ?? '/', 'http://dsh.internal').searchParams.get('sessionId') ?? ''
      } catch {
        // unparsable URL: fall through to the empty check below
      }
      if (sessionId === '') {
        res.writeHead(400)
        res.end('missing sessionId')
        return
      }
      const session = ctx.sessions.get(sessionId)
      const events = session?.events
      const durations = events === undefined ? { llm: [], tool: [], ttft: [] } : collectDurations(events)
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(durations))
    },
  }), 'ui-side-panel: /ui-side-panel/stats route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/ui-side-panel/assets',
    handler: async (req, res) => {
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      const name = pathname.slice('/ui-side-panel/assets/'.length)
      // Flat asset directory: only bare file names, never subpaths or traversal.
      if (name === '' || name.includes('/') || name.includes('..')) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      const type = ASSET_TYPES[extensionOf(name)]
      if (type === undefined) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      try {
        const data = await readFile(new URL(name, ASSETS_ROOT))
        res.writeHead(200, {
          'content-type': type,
          'cache-control': 'public, max-age=86400',
        })
        res.end(data)
      } catch {
        // unknown asset: 404 (readFile rejects on missing files)
        res.writeHead(404)
        res.end('not found')
      }
    },
  }), 'ui-side-panel: /ui-side-panel/assets files')
}

/** Whether a stream chunk carries visible model output (mirror of dsh-llm's isTokenDelta). */
function isTokenDelta(chunk) {
  if (chunk === null || typeof chunk !== 'object') return false
  switch (chunk.type) {
    case 'text-delta':
    case 'reasoning-delta':
      return chunk.text !== ''
    case 'tool-call-delta':
      return chunk.argumentsDelta !== '' || chunk.name !== undefined
    default:
      return false
  }
}

/** Per-step timing index key (turn and step from the event payload). */
function stepKey(turn, step) {
  return `${turn}\u0000${step}`
}

/**
 * Fold a session's event log into latency samples, mirroring the client's
 * collectDurations: llm = assistant/message completion minus step/start,
 * ttft = first token delta minus step/start, tool = tool/result minus
 * tool/call (matched by callId).
 * @param events - the session's append-only event log snapshot.
 * @returns three sample arrays, newest last.
 */
function collectDurations(events) {
  const llm = []
  const tool = []
  const ttft = []
  const steps = new Map() // stepKey -> { start, firstToken }
  const toolCalls = new Map() // callId -> call time
  for (const ev of events) {
    const d = ev.data
    if (ev.type === 'step/start' && d !== undefined) {
      steps.set(stepKey(d.turn, d.step), { start: ev.time, firstToken: null })
    } else if (ev.type === 'assistant/chunk' && d !== undefined && isTokenDelta(d.chunk)) {
      const key = stepKey(d.turn, d.step)
      const current = steps.get(key) ?? { start: null, firstToken: null }
      if (current.firstToken === null) {
        steps.set(key, { ...current, firstToken: ev.time })
      }
    } else if (ev.type === 'assistant/message' && d !== undefined) {
      const t = steps.get(stepKey(d.turn, d.step)) ?? { start: null, firstToken: null }
      if (t.start !== null) llm.push(Math.max(0, ev.time - t.start))
      if (t.start !== null && t.firstToken !== null) ttft.push(Math.max(0, t.firstToken - t.start))
    } else if (ev.type === 'tool/call' && d !== undefined && typeof d.callId === 'string') {
      toolCalls.set(d.callId, ev.time)
    } else if (ev.type === 'tool/result' && d !== undefined) {
      const callId = d.message?.source?.kind === 'tool' ? d.message.source.callId : d.callId
      if (typeof callId === 'string') {
        const callTime = toolCalls.get(callId)
        if (callTime !== undefined) tool.push(Math.max(0, ev.time - callTime))
      }
    }
  }
  return { llm, tool, ttft }
}

export { apply }
