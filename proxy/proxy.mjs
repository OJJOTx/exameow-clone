/**
 * AgentRouter.org Local Proxy for Exameow
 *
 * AgentRouter restricts access to Codex CLI user-agents. This lightweight
 * proxy sits between Exameow (or any OpenAI-compatible client) and
 * agentrouter.org, injecting the required Codex headers on every request.
 *
 * Usage:
 *   node proxy.mjs                          # defaults: port 9876
 *   PORT=4000 node proxy.mjs                # custom port
 *
 * Then point Exameow's "API Endpoint" to:
 *   http://localhost:9876/v1
 */

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

// ── Configuration ──────────────────────────────────────────────────────
const PROXY_PORT = Number(process.env.PORT) || 9876
const UPSTREAM = 'https://agentrouter.org'

/** Headers AgentRouter expects from a Codex CLI client */
const CODEX_HEADERS = {
  Originator: 'codex_cli_rs',
  'User-Agent': 'codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464',
  Version: '0.101.0',
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Forward the incoming request body + headers to agentrouter.org, injecting
 * the Codex spoof headers.
 */
function proxyRequest(req, res) {
  // Read incoming body
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)

    // Build upstream URL — preserve the full path
    const upstreamUrl = new URL(req.url, UPSTREAM)

    // Merge headers: keep original Content-Type & Authorization, override UA etc.
    const forwardHeaders = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      ...(req.headers['authorization']
        ? { Authorization: req.headers['authorization'] }
        : {}),
      ...CODEX_HEADERS,
    }

    if (body.length > 0) {
      forwardHeaders['Content-Length'] = body.length
    }

    const options = {
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || 443,
      path: upstreamUrl.pathname + upstreamUrl.search,
      method: req.method,
      headers: forwardHeaders,
    }

    const upstream = https.request(options, (upstreamRes) => {
      // Forward status + headers back to client
      res.writeHead(upstreamRes.statusCode, upstreamRes.headers)
      upstreamRes.pipe(res)
    })

    upstream.on('error', (err) => {
      console.error('[proxy] upstream error:', err.message)
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
      }
      res.end(JSON.stringify({ error: { message: `Proxy upstream error: ${err.message}` } }))
    })

    if (body.length > 0) {
      upstream.write(body)
    }
    upstream.end()
  })
}

// ── Server ─────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS — so the browser frontend can call this directly if needed
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health-check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', upstream: UPSTREAM, port: PROXY_PORT }))
    return
  }

  console.log(`[proxy] ${req.method} ${req.url}`)
  proxyRequest(req, res)
})

server.listen(PROXY_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  AgentRouter Proxy running on http://localhost:${PROXY_PORT}        ║
║                                                              ║
║  Point Exameow endpoint to:                                  ║
║    http://localhost:${PROXY_PORT}/v1                                 ║
║                                                              ║
║  Upstream: ${UPSTREAM}                             ║
║  Codex Originator: ${CODEX_HEADERS.Originator}                          ║
╚══════════════════════════════════════════════════════════════╝
`)
})
