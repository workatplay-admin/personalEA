# personalEA
My Attempt at Creating the Personal EA I've dreamed of
# Dialog Gateway 🛡️

*Production‑grade communication hub for your personal AI assistant stack*

---

## Why it exists

> “Route every thought, task, and schedule change through a single secure chokepoint—so my assistant can act instantly without leaking data.”

The **Dialog Gateway** is the only public‑facing service in the micro‑service map. It authenticates clients, streams conversational traffic, and fan‑outs commands to specialised back‑end services (chat, tasks, email, calendar, docs). Think of it as *nginx, a message broker, and an API firewall rolled into one minimal Node/TS service*.

---

## Feature Highlights

| Feature                    | Details                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| **JWT + mTLS auth**        | Short‑lived tokens + optional mutual TLS between Gateway and internal mesh                          |
| **Unified Message Schema** | One `Message` envelope (`id`, `role`, `content`, `context`, `timestamp`) for HTTP **and** WebSocket |
| **Sub‑second chat**        | First‑token latency target 500 ms  (local LLM)                                                      |
| **Idempotent & ordered**   | Per‑entity `seq` versioning and duplicate suppression                                               |
| **Pluggable routing**      | JSON config or Consul for service discovery; retries + back‑off out of the box                      |
| **Prometheus metrics**     | `/metrics` endpoint with latency histograms                                                         |
| **Health & readiness**     | `/health` returns per‑service pings and heartbeat stats                                             |

---

## Quick Start (Docker‑Compose)

```bash
# 1. Clone repo
$ git clone https://github.com/<you>/dialog-gateway.git && cd dialog-gateway

# 2. Copy environment sample and tweak secrets
$ cp .env.example .env

# 3. Fire it up
$ docker compose up --build -d

# 4. Send a test message (CLI)
$ ASSIST_JWT=$(./scripts/get-jwt.sh) \
  curl -X POST https://assistant.local:8080/messages \
       -H "Authorization: Bearer $ASSIST_JWT" \
       -H "Content-Type: application/json" \
       -d '{
            "role":"user",
            "content": {"type":"text","text":"Ping"}
          }'
```

> **Tip:** Add `assistant.local` to `/etc/hosts → 127.0.0.1` for hassle‑free HTTPS dev.

---

## High‑Level Architecture

```mermaid
flowchart LR
  subgraph Clients
    A[CLI] -- WS/HTTPS --> G
    B[Desktop Tray] -- WS/HTTPS --> G
    C[iOS (opt)] -- HTTPS --> G
  end
  G[Dialog Gateway]
  G -- HTTP/2 + mTLS --> Chat
  G -- HTTP/2 + mTLS --> Tasks
  G -- HTTP/2 + mTLS --> Planner
  G -- HTTP/2 + mTLS --> Email
  G -- HTTP/2 + mTLS --> Docs
  style G fill:#f7b32b,stroke:#333,stroke-width:2px
```

Full schema lives in [`/docs/dialog-gateway-spec-v0 3.yaml`](./docs/dialog-gateway-spec-v0_3.yaml).

---

## Configuration

All runtime config is **12‑factor**: environment variables override `config/*.json`.

Key knobs:

| Env                    | Default  | What it does                                  |
| ---------------------- | -------- | --------------------------------------------- |
| `PORT`                 | `8080`   | Gateway listener port                         |
| `JWT_SECRET`           | *(none)* | HMAC secret for dev; use rotating JWK in prod |
| `MAX_WS_CONN`          | `25`     | Per‑user WebSocket limit                      |
| `RATE_LIMIT_WINDOW_MS` | `60000`  | Sliding window size                           |
| `RATE_LIMIT_MAX`       | `100`    | Max requests per window                       |

---

## Development Workflow

```bash
# Install deps
$ pnpm install

# Lint & type‑check
$ pnpm run lint && pnpm run typecheck

# Unit tests
$ pnpm run test:unit

# Hot‑reload dev server
$ pnpm run dev
```

### Contract Tests

1. `make contract-test` spins up Gateway + stub micro‑services.
2. Runs Pact tests to ensure `/messages` & `/events/stream` stay stable.

---

## Testing Matrix

| Layer           | Tool                           | CI Job              |
| --------------- | ------------------------------ | ------------------- |
| **Unit**        | Vitest                         | `test:unit`         |
| **Integration** | Supertest + Nock               | `test:int`          |
| **E2E**         | Playwright (CLI & WS)          | `test:e2e`          |
| **Security**    | OWASP ZAP baseline             | `zap-scan`          |
| **Perf**        | k6 script (`/scripts/perf.js`) | optional manual run |

---

## Contributing

1. Fork → feature branch → PR.
2. Ensure `pnpm run all-checks` passes.
3. PR template asks for updated OpenAPI examples if you touched request/response bodies.

We use **Conventional Commits** (`feat:`, `fix:`) and auto‑release with semantic‑release.

---

## Roadmap Snapshot

| Milestone                                            | Status         |
| ---------------------------------------------------- | -------------- |
| v0.3 – Production‑ready spec & scaffolding           | ✅ done         |
| v0.4 – Redis durable queue, WS duplicate suppression | 🟡 in‑progress |
| v1.0 – Security audit + menu‑bar UI alpha            | 🔜             |

---

## License

MIT © 2025 Your Name

> *Built with 🤖 Roo Code & 🦀 Rust‑powered WebSocket server under the hood.*
