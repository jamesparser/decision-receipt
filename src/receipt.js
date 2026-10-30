/**
 * Decision Receipt schema + renderer.
 * Shareable social artifact: evidence → claim → confidence → practice plan.
 * Never presents output as executed trades or guaranteed financial advice.
 */

import { randomUUID } from 'node:crypto';

export function emptyReceipt(input = {}) {
  return {
    schema: 'decision-receipt/1',
    id: randomUUID(),
    created_at: new Date().toISOString(),
    mode: 'advise_only',
    disclaimer:
      'Research brief and practice plan only. Not financial advice. No assets were bought, sold, or moved.',
    question: input.question || '',
    symbol: String(input.symbol || '').toUpperCase(),
    tier: input.tier || 'standard',
    evidence: [],
    arguments: { bull: null, bear: null },
    judgment: null,
    practice_plan: null,
    sources_used: [],
    failure_notes: [],
    coverage: null,
  };
}

export function addEvidence(receipt, item) {
  receipt.evidence.push({
    id: `e${receipt.evidence.length + 1}`,
    source: item.source,
    claim: item.claim,
    data_mode: item.data_mode || 'unknown',
    status: item.status || 'ok',
    fields: item.fields || {},
  });
  return receipt;
}

export function finalizeReceipt(receipt, { bull, bear, judgment, practicePlan, failureNotes = [] }) {
  receipt.arguments = { bull, bear };
  receipt.judgment = judgment;
  receipt.practice_plan = practicePlan;
  receipt.failure_notes = failureNotes;
  return receipt;
}

export function renderReceiptText(receipt) {
  const lines = [];
  lines.push('=== DECISION RECEIPT ===');
  lines.push(`ID: ${receipt.id}`);
  lines.push(`When: ${receipt.created_at}`);
  lines.push(`Q: ${receipt.question}`);
  lines.push(`Asset: ${receipt.symbol} · Mode: ${receipt.mode}`);
  lines.push('');
  lines.push('--- EVIDENCE ---');
  for (const e of receipt.evidence) {
    lines.push(`[${e.id}] ${e.source} (${e.status}/${e.data_mode})`);
    lines.push(`    ${e.claim}`);
  }
  lines.push('');
  lines.push('--- BULL CASE ---');
  lines.push(receipt.arguments.bull?.summary || 'n/a');
  for (const p of receipt.arguments.bull?.points || []) lines.push(`  + ${p}`);
  lines.push('');
  lines.push('--- BEAR CASE ---');
  lines.push(receipt.arguments.bear?.summary || 'n/a');
  for (const p of receipt.arguments.bear?.points || []) lines.push(`  − ${p}`);
  lines.push('');
  lines.push('--- JUDGMENT ---');
  lines.push(`${receipt.judgment?.stance || 'neutral'} · confidence ${receipt.judgment?.confidence ?? 'n/a'}/10`);
  lines.push(receipt.judgment?.reasoning || '');
  lines.push('');
  lines.push('--- PRACTICE PLAN (NOT AN ORDER) ---');
  const plan = receipt.practice_plan || {};
  lines.push(`Bias: ${plan.bias || 'n/a'} · Horizon: ${plan.horizon || 'n/a'}`);
  lines.push(`Idea entry: ${plan.idea_entry ?? 'n/a'} · Invalid: ${plan.idea_invalid ?? 'n/a'}`);
  lines.push(`Size hint: ${plan.size_hint || 'n/a'} · Risk: ${plan.risk_notes || 'n/a'}`);
  lines.push('');
  if (receipt.failure_notes?.length) {
    lines.push('--- COVERAGE / FAILURE NOTES ---');
    for (const n of receipt.failure_notes) lines.push(`  ! ${n}`);
  }
  lines.push('');
  lines.push(receipt.disclaimer);
  return lines.join('\n');
}
