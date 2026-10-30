# Decision Receipt

**RYO-CHAN Hackathon 2026 · Track 1: Autonomous Agents**  
**Team:** Jason Parser Security · **Project:** Decision Receipt

Advise-only research agent that turns market evidence into a **shareable Decision Receipt**:  
**evidence → Bull / Bear debate → judgment → practice plan.**

- No trading. No asset movement.  
- RYO read-only MCP research tools + RealCryptoCap native market data.  
- Built for Free / Pro / Ultra tiers of **realcryptocap.com** AI chat.

---

## Why this exists

Traders ask *“should I consider this asset?”* and get either a black-box model reply or a wall of charts.  
Decision Receipt makes the **reasoning path visible** and **shareable** (Agentic SocialFi).

## Architecture

```
User question
  ├─ RealCryptoCap universe check (native assets only)
  │    └─ positive “not listed / out of scope” when excluded
  ├─ RYO research funnel (read-only)
  │    market_overview → analyze_token → deep_analysis
  │    → compare_tokens (optional) → monitor_market_sentiment_shift
  ├─ Bull / Bear agents (same evidence pack)
  ├─ Judge (stance + confidence)
  └─ Decision Receipt (JSON + text) + practice plan
```

## RealCryptoCap product rules

RealCryptoCap tracks **native crypto only**. It does **not** track stablecoins, wrapped/staked receipts, tokenized stocks/funds/treasuries/RWA, or commodities.  
Out-of-universe assets get a **positive coverage note** (by design), not a fake analysis.

| Tier | Decision Receipt |
|------|------------------|
| **Free** | Limited — basic receipt / low quota |
| **Pro** | Full research funnel + receipts |
| **Ultra** | Highest limits + multi-receipt / deep_analysis |

## Setup

```bash
cp .env.example .env
# set RYO_MCP_URL / RYO_MCP_KEY (organizer credential)
npm test
node src/cli.js health
node src/cli.js demo SOL
```

### Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `RYO_MCP_URL` | yes | default `https://app-ryochan.com/api/mcp` |
| `RYO_MCP_KEY` | yes | `ryo_mcp_...` from organizer; expires 2026-12-17 for this batch |
| `RCC_BASE_URL` | no | default `https://realcryptocap.com` |
| `RCC_API_KEY` | no | Pro/Ultra RealCryptoCap API |
| `LLM_*` | no | optional richer debate prose |
| `DECISION_RECEIPT_OUT_DIR` | no | default `./out` |

**Never commit `.env`.** Only `.env.example`.

## Demo (2–3 min)

1. `node src/cli.js health` — MCP health + key status  
2. `node src/cli.js coverage USDT` — positive out-of-scope message  
3. `node src/cli.js receipt SOL "Is SOL a swing long this week?"` — full receipt  
4. Open `out/receipt-*.txt` — evidence → debate → practice plan  

Video: `demo/decision-receipt-demo.mp4`

## Judging alignment

| Rubric | How we hit it |
|--------|----------------|
| Combining sources (20%) | RYO tools + RealCryptoCap market/coin data |
| Coping with failure (20%) | `ok/partial/unavailable`, soft retry, visible failure notes |
| Real thinking (25%) | Bull/Bear from the **same** evidence pack |
| Cause and effect (20%) | Claims map to `evidence[].id` / sources |
| Repeatability (10%) | Deterministic debate + logged tool calls |
| Advanced execution (5%) | Coverage gate, rate-limit awareness, practice-plan fields |

## What does not score (and we avoid)

- API-call volume · wall of charts · short-term P&L · fabricated data as real

## Legal / product language

Research brief and **practice plan** only — not financial advice.  
RYO tools are read-only. Practice trades are never executed.

## Social Media Award

X post: https://x.com/JasonParserSec/status/2113558204852674616 (pinned)  
Tagged `@ryodigital` · Jason Parser Security · link to BUIDL / hackathon.
