/**
 * RYO-CHAN read-only research client.
 * Docs: https://ryobuild.com/docs/MCP-Builder-Guide.md
 * Tools cannot trade or move assets. Practice plans stay on our side.
 */

const REST_PATHS = {
  market_overview: 'market_overview',
  scan_market: 'scan_market',
  analyze_token: 'analyze_token',
  deep_analysis: 'deep_analysis',
  compare_tokens: 'compare_tokens',
  monitor_market_sentiment_shift: 'monitor_market_sentiment_shift',
};

export function ryoConfig() {
  return {
    baseUrl: (process.env.RYO_MCP_URL || 'https://app-ryochan.com/api/mcp').replace(/\/$/, ''),
    key: process.env.RYO_MCP_KEY || '',
  };
}

async function httpJson(url, options = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    return {
      ok: res.ok,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractEnvelope(body) {
  if (!body) return { status: 'unavailable', data_mode: 'unknown', data: null, summary: null, warnings: ['empty response'] };
  if (body.result?.isError) {
    return { status: 'unavailable', data_mode: 'unknown', data: null, summary: null, warnings: [body.result.content?.[0]?.text || 'tool error'] };
  }
  if (body.result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(body.result.content[0].text);
      return parsed;
    } catch {
      return { status: 'partial', data_mode: 'unknown', data: null, summary: null, warnings: ['unparseable tool payload'] };
    }
  }
  // REST shape: { tool, result: { schema_version, status, data, summary, ... } }
  if (body.result && (body.result.status || body.result.data || body.result.summary)) {
    return body.result;
  }
  return body;
}

/** Read-only REST call: POST {base}/tools/{tool}/call */
export async function ryoCall(tool, args = {}) {
  const { baseUrl, key } = ryoConfig();
  if (!REST_PATHS[tool]) {
    return { status: 'unavailable', data_mode: 'unknown', data: null, summary: null, warnings: [`unknown tool ${tool}`] };
  }
  if (!key) {
    return {
      status: 'unavailable',
      data_mode: 'unknown',
      data: null,
      summary: { headline: 'RYO MCP key not configured yet', points: [] },
      warnings: ['Set RYO_MCP_KEY in .env after the organizer DMs it. Research continues with RealCryptoCap data only.'],
      missing_key: true,
    };
  }

  const attempt = async () => httpJson(`${baseUrl}/tools/${tool}/call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  let result;
  try {
    result = await attempt();
  } catch (e) {
    return { status: 'unavailable', data_mode: 'unknown', data: null, summary: null, warnings: [`network error: ${e.message}`] };
  }

  // Soft retry once on transient failures (rate limit / gateway).
  if (result.status === 429 || result.status === 503) {
    await new Promise((r) => setTimeout(r, 1500));
    try { result = await attempt(); } catch { /* keep first failure */ }
  }

  const retryAfter = result.headers?.['retry-after'];
  const envelope = extractEnvelope(result.body);
  return {
    ...envelope,
    http_status: result.status,
    tool,
    request: args,
    rate: {
      limit: result.headers?.['x-ratelimit-limit'] ?? null,
      remaining: result.headers?.['x-ratelimit-remaining'] ?? null,
      reset: result.headers?.['x-ratelimit-reset'] ?? null,
      retry_after: retryAfter ?? null,
    },
  };
}

export async function ryoHealth() {
  const { baseUrl } = ryoConfig();
  try {
    return await httpJson(`${baseUrl}/health`, { method: 'GET' }, 10000);
  } catch (e) {
    return { ok: false, status: 0, body: { error: e.message } };
  }
}

/** Recommended research funnel: overview → analyze → deep (optional compare/sentiment). */
export async function researchFunnel(symbol, { deep = true, compareWith = null } = {}) {
  const steps = [];
  const overview = await ryoCall('market_overview');
  steps.push({ step: 'market_overview', envelope: overview });

  const analyze = await ryoCall('analyze_token', { symbol });
  steps.push({ step: 'analyze_token', envelope: analyze });

  if (deep) {
    const deepPack = await ryoCall('deep_analysis', { symbol, include_perp: true });
    steps.push({ step: 'deep_analysis', envelope: deepPack });
  }

  if (compareWith?.length) {
    const cmp = await ryoCall('compare_tokens', {
      symbols: [symbol, ...compareWith].join(','),
      intent: 'swing',
    });
    steps.push({ step: 'compare_tokens', envelope: cmp });
  }

  const sentiment = await ryoCall('monitor_market_sentiment_shift', { time_window: '7d' });
  steps.push({ step: 'monitor_market_sentiment_shift', envelope: sentiment });

  return steps;
}
