/**
 * Quick test: sends a chat completion request through the local proxy
 * to AgentRouter using deepseek-v4-flash.
 *
 * Usage:
 *   1. Start the proxy:  node proxy.mjs
 *   2. Run this test:    node test.mjs
 */

import http from 'node:http'

const PROXY_URL = 'http://localhost:9876/v1/chat/completions'
const API_KEY = 'sk-IV1nMorqtWnJik9AMNRx06BYQ8pkuvOR3yVv2gmL9u7ciQi5'
const MODEL = 'deepseek-v4-flash'

const body = JSON.stringify({
  model: MODEL,
  messages: [
    { role: 'user', content: 'What is the capital of France? Answer in one sentence.' },
  ],
  max_tokens: 128,
})

console.log(`\n🧪 Testing proxy → AgentRouter with model: ${MODEL}\n`)

const url = new URL(PROXY_URL)

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    'Content-Length': Buffer.byteLength(body),
  },
}

const req = http.request(options, (res) => {
  const chunks = []
  res.on('data', (chunk) => chunks.push(chunk))
  res.on('end', () => {
    const raw = Buffer.concat(chunks).toString()
    console.log(`Status: ${res.statusCode}`)

    try {
      const data = JSON.parse(raw)
      if (data.choices?.[0]?.message?.content) {
        console.log(`\n✅ Model response:\n${data.choices[0].message.content}\n`)
        console.log(`Tokens used: prompt=${data.usage?.prompt_tokens}, completion=${data.usage?.completion_tokens}, total=${data.usage?.total_tokens}`)
      } else if (data.error) {
        console.error(`\n❌ API Error: ${data.error.message || JSON.stringify(data.error)}\n`)
      } else {
        console.log(`\nRaw response:\n${JSON.stringify(data, null, 2)}\n`)
      }
    } catch {
      console.log(`\nRaw response:\n${raw}\n`)
    }
  })
})

req.on('error', (err) => {
  console.error(`\n❌ Connection error: ${err.message}`)
  console.error('   Make sure the proxy is running: node proxy.mjs\n')
})

req.write(body)
req.end()
