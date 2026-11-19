# CODE CLASH — Deployment Guide

> **Vercel is NOT supported.** See the "Why Not Vercel?" section below.

This app requires a **persistent long-running Node.js process**. Use Railway, Render, or Fly.io.

---

## Why Not Vercel?

| Requirement | This App | Vercel |
|---|---|---|
| Persistent in-memory state | ✅ Required | ❌ Each request may be a new process |
| `setInterval` sweepers (auto-submit, round close) | ✅ Required | ❌ Not supported serverless |
| Server-Sent Events (SSE) | ✅ Required (live updates) | ❌ ~25s connection limit |
| Writable filesystem (`state.json`) | ✅ Required | ❌ Read-only outside `/tmp` |
| Single persistent process | ✅ Required | ❌ Serverless = ephemeral, stateless |

---

## Railway (Recommended)

1. Push repo to GitHub (`.env` must be in `.gitignore` — it already is)
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Railway auto-detects Node.js; runs `npm install` + `npm start`
4. **Add a Volume**: mount path `/data` — this persists `state.json` across restarts
5. Set **Environment Variables** in Railway dashboard:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | A strong random secret |
| `DATA_DIR` | `/data` |
| `TRUST_PROXY` | `1` |
| `FINALISTS` | `12` |
| `REHEARSAL_MODE` | `0` |

6. Deploy and verify at `https://<app>.railway.app/health`

---

## Render (Alternative)

- **Build command:** `npm install`
- **Start command:** `node server.js`
- Add a **Persistent Disk** mounted at `/data`
- Set the same environment variables as above
- **Use Starter plan on event day** — free tier suspends after 15 min inactivity

---

## Fly.io (Alternative)

```bash
flyctl launch --name code-clash --no-deploy
flyctl volumes create code_clash_data --size 1
flyctl secrets set ADMIN_PASSWORD="your-secret" DATA_DIR="/data" TRUST_PROXY="1"
flyctl deploy
```

---

## Pre-Event Checklist

- [ ] Strong `ADMIN_PASSWORD` set in platform secrets
- [ ] `REHEARSAL_MODE=0` confirmed
- [ ] Volume mounted and writable (`/health` → `ok: true`)
- [ ] Full rehearsal completed on the hosted URL
- [ ] Only **one running replica** (app is single-instance)
- [ ] `state.json` backed up via admin console after each stage
