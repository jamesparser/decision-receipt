#!/usr/bin/env node
/**
 * Decision Receipt CLI — demo entrypoint for RYO-CHAN Hackathon 2026.
 *
 *   node src/cli.js health
 *   node src/cli.js receipt SOL "Is SOL a swing long this week?"
 *   node src/cli.js coverage USDT
 *   node src/cli.js demo
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { runDecisionReceipt, formatReceipt, runCoverageCheck } from './agent.js';
import { ryoHealth } from './ryoClient.js';

const OUT = process.env.DECISION_RECEIPT_OUT_DIR || './out';

async function saveReceipt(receipt) {
  await mkdir(OUT, { recursive: true });
  const base = join(OUT, `receipt-${receipt.symbol || 'NA'}-${receipt.id.slice(0, 8)}`);
  await writeFile(`${base}.json`, JSON.stringify(receipt, null, 2));
  await writeFile(`${base}.txt`, formatReceipt(receipt));
  return base;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'health') {
    const h = await ryoHealth();
    console.log(JSON.stringify({ ryo: h.body || h, ryo_key_set: Boolean(process.env.RYO_MCP_KEY) }, null, 2));
    return;
  }

  if (cmd === 'coverage') {
    const symbol = rest[0] || 'USDT';
    const c = await runCoverageCheck(symbol);
    console.log(JSON.stringify(c.listed ? { listed: true, asset: c.asset, source: c.source } : c.notListed, null, 2));
    return;
  }

  if (cmd === 'receipt' || cmd === 'demo') {
    const symbol = (rest[0] || 'SOL').toUpperCase();
    const question = rest.slice(1).join(' ') || `Is ${symbol} a swing long this week?`;
    const receipt = await runDecisionReceipt({ symbol, question, tier: 'demo' });
    const path = await saveReceipt(receipt);
    console.log(formatReceipt(receipt));
    console.log(`\nSaved: ${path}.json / ${path}.txt`);
    return;
  }

  console.log(`Usage:
  node src/cli.js health
  node src/cli.js coverage SYMBOL
  node src/cli.js receipt SYMBOL "question"
  node src/cli.js demo [SYMBOL]`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
