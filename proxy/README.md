# AgentRouter.org Local Proxy

Lightweight zero-dependency proxy that lets Exameow use **AgentRouter.org** as an AI provider.

AgentRouter restricts usage to Codex CLI. This proxy injects the required Codex headers on every request:

| Header | Value |
|--------|-------|
| `Originator` | `codex_cli_rs` |
| `User-Agent` | `codex_cli_rs/0.101.0 (Mac OS 26.0.1; arm64) Apple_Terminal/464` |
| `Version` | `0.101.0` |

## Quick Start

```bash
cd proxy
node proxy.mjs
```

The proxy starts on **`http://localhost:9876`** by default.

## Configure in Exameow

In Exameow's Settings → AI Configuration:

| Field | Value |
|-------|-------|
| **Endpoint** | `http://localhost:9876/v1` |
| **API Key** | Your AgentRouter API key |
| **Model** | e.g. `deepseek-v4-flash` |

## Test

With the proxy running in one terminal:

```bash
node test.mjs
```

## Custom Port

```bash
PORT=4000 node proxy.mjs
```

Then use `http://localhost:4000/v1` as endpoint.

## How It Works

```
Exameow  →  localhost:9876  →  agentrouter.org
              (adds Codex       (sees a Codex CLI
               headers)          client, allows)
```

All OpenAI-compatible routes (`/v1/chat/completions`, `/v1/models`, etc.) are transparently proxied. CORS is enabled for browser-direct usage.

## Notes

- **No dependencies** — uses Node.js built-in `http`/`https` modules
- DeepSeek models have their own content filter that may reject certain prompts with "sensitive words detected" — this is **not** a proxy issue
