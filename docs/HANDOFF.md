# Handoff — what’s left before submit

You (or I) only need these after the organizer delivers the key/repo.

## 1. Wait for organizer
- [ ] Email: GitHub private repo invite (check spam)
- [ ] Discord DM: `RYO_MCP_KEY`

## 2. When key arrives (5 minutes)
```bash
cd decision-receipt
cp .env.example .env
# paste RYO_MCP_KEY into .env
node src/cli.js health
node src/cli.js receipt SOL "Is SOL a swing long this week?"
node src/cli.js demo BTC
```
Optional polish: set `LLM_*` for richer Bull/Bear prose (defaults work without it).

## 3. Record demo video (2–3 min)
1. `node src/cli.js coverage USDT` → show positive out-of-scope message
2. `node src/cli.js receipt SOL "..."` → walk evidence → debate → practice plan
3. Show `out/receipt-*.txt` and say “advise-only, no trading”
4. Mention RealCryptoCap coin data/charts + RYO research tools

## 4. X post from @JasonParserSec
Use `docs/x-posts.md` Draft A or B. Must include:
- tag **@ryodigital**
- what we built + why it matters
- demo/BUIDL link
Then paste the **post URL** into the web Submission form (`X post URL`).

## 5. Push to organizer private repo
- Source only + `.env.example` + `docs/RYOCHAN-Hackathon-Project-Submission-Form.pdf` + README
- **Never** commit `.env` or real keys
- Optional: redacted `jamesparser` public snapshot (no proprietary RealCryptoCap internals)

## 6. Web form (app-ryochan.com)
Already drafted: team, description, track (Autonomous Agents).  
Fill when ready: Demo video URL, Repository URL, X post URL → Submit.

## Status now
| Item | Status |
|------|--------|
| Agent scaffold | Done (`decision-receipt/`) |
| Unit tests | 3/3 pass |
| RYO health | ok (no key yet) |
| Coverage positive message | Works (USDT/WBTC) |
| Demo receipt | Works (noted missing key) |
| Filled submission PDF | `docs/RYOCHAN-Hackathon-Project-Submission-Form.pdf` |
| X drafts | `docs/x-posts.md` |
| RYO_MCP_KEY | Waiting on DM |
| Private GitHub repo | Waiting on email invite |
| Demo video | After key |
| Public X post | After demo link |

## MCP key received (2026-10-29)
- Label: hackathon_key_batch_3-092
- Key ID: 703c9ce0
- Expires: 2026-12-17T02:33:00Z
- Rate: 60/min
- Credential stored in `decision-receipt/.env` (gitignored) — do not commit or post publicly.

## Live demo verified (2026-10-29)
- `whoami` OK · Key ID 703c9ce0 · expires 2026-12-17 · 60 rpm
- Full receipt `demo SOL` uses live RYO: market_overview, analyze_token, deep_analysis, monitor_market_sentiment_shift
- Saved under `decision-receipt/out/`
- Remaining: private GitHub repo (push code) + demo video + web form submit
