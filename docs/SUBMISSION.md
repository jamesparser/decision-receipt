# RYO-CHAN submission checklist (Jason Parser Security)

Deadline: **2026-11-11 23:59 JST**

## Complete submission (their rules)

| # | Item | Status | Where |
|---|------|--------|--------|
| 1 | Source on `main` of **their private repo** | ⏳ waiting invite | push this package |
| 2 | `.env.example` (no real keys) | ✅ | `decision-receipt/.env.example` |
| 3 | Project Submission Form (PDF) | ✅ draft filled | `docs/RYOCHAN-Hackathon-Project-Submission-Form.pdf` |
| 4 | Demo video | ✅ | `demo/decision-receipt-demo.mp4` |
| 5 | X post URL in web form | ✅ posted + pinned | https://x.com/JasonParserSec/status/2113558204852674616 |

## Credentials (keep private)

- MCP Key ID: `703c9ce0` · expires **2026-12-17** · 60 rpm  
- Credential lives only in `decision-receipt/.env` (mode 600). **Do not commit.**

## What to push when repo arrives

```
README.md
package.json
.env.example
src/
test/
docs/RYOCHAN-Hackathon-Project-Submission-Form.pdf
docs/x-posts.md
demo/decision-receipt-demo.mp4
out/receipt-SOL-412ee864.txt   # sample live receipt (no secrets)
```

Do **not** push: `.env`, node_modules, RealCryptoCap proprietary internals.

## Web form fields (app-ryochan.com)

| Field | Value |
|-------|--------|
| Team name | Jason Parser Security |
| Your name | casey_blanche |
| Email | node0datasystems@gmail.com |
| Discord / Telegram | Node0 (node0_68581) |
| GitHub username | jamesparser |
| Project name | Decision Receipt |
| Tracks | **Autonomous Agents** |
| Repository URL | *fill after invite* |
| Demo video URL | *upload or link* |
| X post URL | https://x.com/JasonParserSec/status/2113558204852674616 |

## Video script (for re-record if needed)

1. Title: Decision Receipt · Track 1 · Jason Parser Security (3s)  
2. `node src/cli.js health` — key OK, tools=6 (5s)  
3. `node src/cli.js coverage USDT` — positive out-of-scope copy (8s)  
4. `node src/cli.js demo SOL` — scroll evidence → Bull/Bear → judgment → practice plan (25s)  
5. Close: “Advise-only. Not financial advice. @ryodigital RYO-CHAN Hackathon 2026” (5s)

## Open blockers

- [ ] Private GitHub repo invite (polling every 10 min)
- [ ] `Request repository` on app-ryochan.com (site was down)
- [ ] Paste X URL + demo URL into web form → Submit

## Social Media Award (done)

Pinned post tagged `@ryodigital` with BUIDL story + link.  
One award per team; post URL must be in the submission before judging.
