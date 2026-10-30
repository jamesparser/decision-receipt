import test from 'node:test';
import assert from 'node:assert/strict';
import { notListedMessage, classifyExclusion } from '../src/rccClient.js';
import { emptyReceipt, addEvidence, finalizeReceipt, renderReceiptText } from '../src/receipt.js';

test('stablecoin gets positive coverage message', () => {
  const m = notListedMessage('USDT', 'stablecoins_and_fiat_pegs');
  assert.equal(m.listed, false);
  assert.match(m.headline, /Good news on coverage/);
  assert.match(m.message, /by design/);
});

test('classifyExclusion flags wrapped assets', () => {
  assert.equal(classifyExclusion({ symbol: 'WBTC', name: 'Wrapped Bitcoin', id: 'wrapped-bitcoin' }), 'excluded_id');
});

test('receipt renders evidence and disclaimer', () => {
  const r = emptyReceipt({ question: 'demo', symbol: 'SOL' });
  addEvidence(r, { source: 'test', claim: 'line', status: 'ok', data_mode: 'live' });
  finalizeReceipt(r, {
    bull: { summary: 'up', points: ['a'] },
    bear: { summary: 'down', points: ['b'] },
    judgment: { stance: 'neutral', confidence: 5, reasoning: 'balance' },
    practicePlan: { bias: 'wait', horizon: 'swing' },
  });
  const text = renderReceiptText(r);
  assert.match(text, /DECISION RECEIPT/);
  assert.match(text, /Not financial advice/);
});
