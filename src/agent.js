/**
 * Decision Receipt agent loop.
 * 1) Gather evidence (RYO research + RealCryptoCap coin/chart)
 * 2) Bull / Bear argue from the same evidence
 * 3) Judge issues stance + practice plan
 * 4) Emit shareable Decision Receipt
 *
 * Advise-only. No trading, no asset movement.
 */

import { researchFunnel, ryoCall } from './ryoClient.js';
import { resolveRccAsset, rccMarketOverview, rccChart, notListedMessage } from './rccClient.js';
import { emptyReceipt, addEvidence, finalizeReceipt, renderReceiptText } from './receipt.js';

function summarizeEnvelope(env, label) {
  const status = env?.status || 'unavailable';
  const headline = env?.summary?.headline || '';
  const points = (env?.summary?.points || []).slice(0, 4);
  return { label, status, headline, points, data_mode: env?.data_mode || 'unknown', warnings: env?.warnings || [] };
}

function extractNumbers(env) {
  const d = env?.data || {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = k.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), d);
      if (v != null && Number.isFinite(Number(v))) return Number(v);
    }
    return null;
  };
  return {
    price: pick('market.price_usd', 'price', 'price_usd', 'market.price', 'market_data.current_price', 'current_price'),
    change24h: pick('performance.change_24h_pct', 'change_24h', 'price_change_percentage_24h', 'performance.change_24h'),
    change7d: pick('performance.change_7d_pct', 'change_7d', 'price_change_percentage_7d', 'performance.change_7d'),
    rsi: pick('technical_analysis.rsi_14', 'technicals.rsi', 'rsi', 'indicators.rsi_14'),
    atr: pick('technical_analysis.atr_14', 'technicals.atr', 'atr', 'indicators.atr_14'),
    verdict: d.verdict || d.summary?.headline || d.technical_analysis?.trend || null,
  };
}

/** Deterministic debate from structured evidence — repeatable without an LLM. */
function heuristicDebate(evidencePack) {
  const nums = evidencePack.numbers;
  const bull = { summary: '', points: [] };
  const bear = { summary: '', points: [] };

  const c24 = nums.change24h;
  const c7 = nums.change7d;
  const rsi = nums.rsi;

  if (c24 != null && c24 > 0) {
    bull.points.push(`Short-window momentum is positive (24h ${c24.toFixed(2)}%).`);
    bear.points.push(`A green 24h print alone is not a trend — fade risk if breadth is weak.`);
  } else if (c24 != null) {
    bear.points.push(`24h performance is soft (${c24.toFixed(2)}%), so sellers still have the tape.`);
    bull.points.push(`Weak 24h can be a reset if higher-timeframe structure holds.`);
  }

  if (c7 != null && c7 > 0) {
    bull.points.push(`7d performance is constructive (${c7.toFixed(2)}%).`);
  } else if (c7 != null) {
    bear.points.push(`7d performance is negative (${c7.toFixed(2)}%).`);
  }

  if (rsi != null) {
    if (rsi >= 70) bear.points.push(`RSI is hot (${rsi}) — chase risk is elevated.`);
    else if (rsi <= 30) bull.points.push(`RSI is washed out (${rsi}) — downside may be stretched.`);
    else bull.points.push(`RSI is mid-range (${rsi}) — room to expand either way.`);
  }

  for (const e of evidencePack.ryoSteps) {
    const s = summarizeEnvelope(e.envelope, e.step);
    if (s.status === 'ok' && s.headline) {
      bull.points.push(`${e.step}: ${s.headline}`);
      bear.points.push(`Counter-read on ${e.step}: check whether ${s.headline.toLowerCase()} is already priced.`);
    }
    if (s.status !== 'ok') {
      evidencePack.failures.push(`${e.step} status=${s.status}${s.warnings.length ? ` — ${s.warnings[0]}` : ''}`);
    }
  }

  if (!bull.points.length) bull.points.push('Evidence is thin — wait for cleaner confirmation.');
  if (!bear.points.length) bear.points.push('Upside story needs confirmation beyond a single source.');

  bull.summary = 'Case for a constructive practice bias.';
  bear.summary = 'Case for patience / risk control.';
  return { bull, bear };
}

function judgeFromDebate({ bull, bear, numbers }) {
  const score = bull.points.length - bear.points.length + (numbers.change7d > 0 ? 1 : 0) - (numbers.rsi >= 70 ? 1 : 0);
  let stance = 'neutral';
  if (score >= 2) stance = 'constructive';
  if (score <= -2) stance = 'defensive';
  const confidence = Math.max(3, Math.min(8, 5 + Math.abs(score)));
  return {
    stance,
    confidence,
    reasoning:
      `Judge scored bull points ${bull.points.length} vs bear points ${bear.points.length}. ` +
      `Stance is ${stance} for a practice plan only. Revisit if RYO evidence goes unavailable or RealCryptoCap coverage changes.`,
  };
}

function practicePlan({ stance, numbers }) {
  const price = numbers.price;
  return {
    bias: stance === 'constructive' ? 'look for pullback continuation' : stance === 'defensive' ? 'stand aside or reduce risk' : 'wait for confirmation',
    horizon: 'swing / multi-day watch',
    idea_entry: price != null ? `watch near ${price}` : 'define entry after confirmation',
    idea_invalid: 'thesis breaks if higher-timeframe structure fails',
    size_hint: 'practice only — smallest size if this were real',
    risk_notes: 'No execution. Not financial advice. ATR-based plan preview only.',
  };
}

export async function runDecisionReceipt({ symbol, question, tier = 'standard', compareWith = [] }) {
  const receipt = emptyReceipt({ question, symbol, tier });
  const failures = [];

  // --- RealCryptoCap coverage first (product-true listing rules) ---
  const coverage = await resolveRccAsset(symbol);
  receipt.coverage = coverage.listed
    ? { listed: true, source: coverage.source, symbol: String(symbol).toUpperCase() }
    : { listed: false, ...coverage.notListed };

  if (!coverage.listed && coverage.notListed?.reason && coverage.notListed.reason !== 'not_found') {
    addEvidence(receipt, {
      source: 'RealCryptoCap universe',
      claim: coverage.notListed.message,
      status: 'ok',
      data_mode: 'live',
      fields: { reason: coverage.notListed.reason },
    });
    const debate = {
      bull: {
        summary: 'Coverage note, not a trade idea.',
        points: ['We can research market regime and native assets instead.'],
      },
      bear: {
        summary: 'No receipt on this symbol.',
        points: ['Without listed native market data, a per-asset practice plan would be low quality.'],
      },
    };
    finalizeReceipt(receipt, {
      ...debate,
      judgment: {
        stance: 'coverage_limited',
        confidence: 10,
        reasoning: coverage.notListed.message + ' ' + coverage.notListed.alternatives,
      },
      practicePlan: {
        bias: 'research alternatives',
        horizon: 'n/a',
        idea_entry: 'n/a',
        idea_invalid: 'n/a',
        size_hint: 'none',
        risk_notes: receipt.disclaimer,
      },
      failureNotes: [coverage.notListed.headline],
    });
    return receipt;
  }

  if (!coverage.listed) {
    addEvidence(receipt, {
      source: 'RealCryptoCap universe',
      claim: coverage.notListed?.message || 'Coverage uncertain; continuing with research tools.',
      status: 'partial',
      data_mode: 'live',
    });
  }

  // --- Market context ---
  const market = await rccMarketOverview();
  if (market.ok && market.data) {
    addEvidence(receipt, {
      source: 'RealCryptoCap market-data',
      claim: market.data.summary?.headline || 'Market context loaded from RealCryptoCap.',
      status: 'ok',
      data_mode: 'live',
      fields: { keys: Object.keys(market.data).slice(0, 12) },
    });
  } else {
    failures.push('RealCryptoCap market-data unavailable — continuing with token evidence.');
    addEvidence(receipt, {
      source: 'RealCryptoCap market-data',
      claim: 'Market context unavailable at this moment.',
      status: 'unavailable',
      data_mode: 'unknown',
    });
  }

  // --- RealCryptoCap coin page / chart (product data + charts) ---
  const assetId = coverage.asset?.id || coverage.asset?.symbol || symbol;
  const chart = await rccChart(assetId, 7);
  const chartNums = { price: null, change7d: null };
  if (chart.ok && Array.isArray(chart.data?.chart) && chart.data.chart.length > 1) {
    const pts = chart.data.chart;
    const first = Number(pts[0].price);
    const last = Number(pts[pts.length - 1].price);
    const chg = first ? ((last - first) / first) * 100 : null;
    chartNums.price = last;
    chartNums.change7d = chg;
    addEvidence(receipt, {
      source: 'RealCryptoCap coin chart',
      claim: `7d price path from RealCryptoCap coin data: ${first} → ${last}${chg != null ? ` (${chg.toFixed(2)}%)` : ''}.`,
      status: 'ok',
      data_mode: 'live',
      fields: { points: pts.length, first, last, change_pct: chg },
    });
  } else if (coverage.asset) {
    addEvidence(receipt, {
      source: 'RealCryptoCap coin data',
      claim: `Coin page context loaded for ${String(symbol).toUpperCase()} (chart series limited right now).`,
      status: 'partial',
      data_mode: 'live',
      fields: { id: coverage.asset.id, symbol: coverage.asset.symbol, name: coverage.asset.name },
    });
    failures.push('RealCryptoCap chart series limited — receipt still uses available coin/market fields.');
  }

  // --- RYO research funnel ---
  const ryoSteps = await researchFunnel(symbol, { deep: true, compareWith });
  for (const step of ryoSteps) {
    const env = step.envelope;
    const s = summarizeEnvelope(env, step.step);
    addEvidence(receipt, {
      source: `RYO ${step.step}`,
      claim: s.headline || `${step.step} completed with status ${s.status}`,
      status: s.status,
      data_mode: s.data_mode,
      fields: extractNumbers(env),
    });
    if (env?.missing_key) {
      failures.push('RYO MCP key not set — fill RYO_MCP_KEY after organizer DM. Debate uses RealCryptoCap only.');
    } else if (s.status !== 'ok') {
      failures.push(`${step.step}: ${s.status}`);
    }
  }

  const numbers = extractNumbers(ryoSteps.find((s) => s.step === 'analyze_token')?.envelope);
  if (numbers.price == null && chartNums.price != null) numbers.price = chartNums.price;
  if (numbers.change7d == null && chartNums.change7d != null) numbers.change7d = chartNums.change7d;
  const debate = heuristicDebate({ ryoSteps, numbers, failures });
  const judgment = judgeFromDebate({ ...debate, numbers });
  const plan = practicePlan({ stance: judgment.stance, numbers });

  finalizeReceipt(receipt, {
    ...debate,
    judgment,
    practicePlan: plan,
    failureNotes: [...new Set(failures)],
    sources: receipt.evidence.map((e) => e.source),
  });

  return receipt;
}

export function formatReceipt(receipt) {
  return renderReceiptText(receipt);
}

export async function runCoverageCheck(symbol) {
  return resolveRccAsset(symbol);
}

export { notListedMessage, ryoCall };
