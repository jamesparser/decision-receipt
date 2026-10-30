/**
 * RealCryptoCap market layer client.
 * Uses public JSON where possible. Respects product rules:
 * free tier limited, Pro higher limits, Ultra highest.
 * RealCryptoCap does not list stablecoins, wrapped/staked receipts,
 * tokenized stocks/funds/treasuries/RWAs, or commodities.
 */

const RCC_BASE = (process.env.RCC_BASE_URL || 'https://realcryptocap.com').replace(/\/$/, '');

const EXCLUDED_IDS = new Set([
  'tether', 'usd-coin', 'dai', 'binance-usd', 'frax', 'true-usd', 'paxos-standard', 'gemini-dollar',
  'wrapped-bitcoin', 'weth', 'wrapped-staked-ether', 'coinbase-wrapped-btc', 'staked-ether',
  'tether-gold', 'pax-gold', 'buidl', 'ousg', 'usdy', 'usyc', 'ondo-us-dollar-yield',
]);

const EXCLUDED_SYMBOL_RE = /(^U$|^USA$|USDT|USDC|USDE|DAI|FDUSD|TUSD|EUR|GBP|JPY|WBTC|WETH|STETH|WSTETH|PAXG|XAUT|TBILL|BOND|RWA|SSTN)/i;
const EXCLUDED_NAME_RE = /\b(stable|fiat|wrapped|staked|tokeni[sz]ed|real[- ]world asset|treasury|t[- ]?bill|bond|etf|stock|equity|fund|gold|silver|commodity)\b/i;

/**
 * Map an exclusion reason to a positive, product-true message.
 * Never frame RealCryptoCap's filter as a failure.
 */
export function notListedMessage(symbol, reason = 'out_of_scope') {
  const label = String(symbol || 'this asset').toUpperCase();
  const map = {
    stablecoins_and_fiat_pegs: 'looks like a stablecoin or fiat-pegged asset',
    wrapped_or_staked_assets: 'looks like a wrapped or staked receipt asset',
    tokenized_stocks_funds_treasuries_rwa: 'looks like a tokenized security or RWA product',
    tokenized_commodities: 'looks like a tokenized commodity',
    excluded_id: 'sits outside RealCryptoCap’s native-asset universe',
    excluded_symbol: 'sits outside RealCryptoCap’s native-asset universe',
    bad_symbol_pattern: 'sits outside RealCryptoCap’s native-asset universe',
    bad_name_pattern: 'sits outside RealCryptoCap’s native-asset universe',
    missing_or_too_small: 'isn’t in the tracked universe yet',
    not_found: 'isn’t listed on RealCryptoCap yet',
    out_of_scope: 'sits outside RealCryptoCap’s native-asset universe',
  };
  const why = map[reason] || map.out_of_scope;
  return {
    listed: false,
    symbol: label,
    reason,
    headline: `Good news on coverage: ${label} ${why}.`,
    message:
      `RealCryptoCap focuses on native crypto market cap and deliberately does not track stablecoins, ` +
      `tokenized stocks/funds/treasuries/RWAs, wrapped or staked receipt assets, or commodities. ` +
      `${label} ${why}. That’s by design — not a data gap. ` +
      `We can still research the broader market, or pick another native asset for a Decision Receipt.`,
    alternatives: 'Try BTC, ETH, SOL, or another native crypto asset.',
  };
}

export function classifyExclusion(asset = {}) {
  const id = String(asset.id || '').toLowerCase();
  const symbol = String(asset.symbol || '').toUpperCase();
  const name = String(asset.name || '');
  if (EXCLUDED_IDS.has(id)) return 'excluded_id';
  if (EXCLUDED_SYMBOL_RE.test(symbol)) return 'bad_symbol_pattern';
  if (EXCLUDED_NAME_RE.test(name)) return 'bad_name_pattern';
  return null;
}

async function getJson(path) {
  const url = path.startsWith('http') ? path : `${RCC_BASE}${path}`;
  const headers = { accept: 'application/json', 'user-agent': 'DecisionReceipt/0.1 (+hackathon)' };
  if (process.env.RCC_API_KEY) headers.Authorization = `Bearer ${process.env.RCC_API_KEY}`;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e.message } };
  }
}

/** Public market overview — free Web/public JSON. */
export async function rccMarketOverview() {
  return getJson('/api/market-data');
}

/** Coin page payload used by realcryptocap.com coin routes + charts. */
export async function rccCoin(symbolOrId) {
  const key = String(symbolOrId || '').trim();
  if (!key) return { ok: false, status: 400, data: { error: 'symbol required' } };
  const attempts = [
    `/api/coin?symbol=${encodeURIComponent(key)}`,
    `/api/coin?id=${encodeURIComponent(key.toLowerCase())}`,
  ];
  for (const path of attempts) {
    const r = await getJson(path);
    if (r.ok && r.data && !r.data.error) return r;
    if (r.status === 404 || r.data?.not_found || r.data?.error === 'not_found') {
      return r;
    }
  }
  return { ok: false, status: 404, data: { error: 'not_found', symbol: key } };
}

/** Chart series used by RealCryptoCap coin pages (price points). */
export async function rccChart(id, days = 7) {
  return getJson(`/api/coin?chart=1&id=${encodeURIComponent(id)}&days=${encodeURIComponent(days)}`);
}

/**
 * Resolve a user symbol into either RealCryptoCap coin context
 * or a positive not-listed message.
 */
const SYMBOL_TO_ID = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
  LINK: 'chainlink', DOT: 'polkadot', LTC: 'litecoin', TRX: 'tron', SUI: 'sui',
};

export async function resolveRccAsset(symbol) {
  const raw = String(symbol || '').trim();
  const sym = raw.toUpperCase();
  const quickExclude = classifyExclusion({ symbol: raw, name: raw, id: raw.toLowerCase() });
  if (quickExclude && EXCLUDED_SYMBOL_RE.test(sym)) {
    return { listed: false, notListed: notListedMessage(raw, quickExclude) };
  }

  // Majors on the native index: never fail-open to "not listed" on a network blip.
  const knownNative = SYMBOL_TO_ID[sym] || (['BTC','ETH','SOL'].includes(sym) ? sym.toLowerCase() : null);

  const coin = await rccCoin(SYMBOL_TO_ID[sym] ? SYMBOL_TO_ID[sym] : raw);
  if ((!coin.ok || coin.data?.error === 'not_found' || coin.data?.not_found) && knownNative && !coin.ok) {
    return {
      listed: true,
      source: 'native-major',
      asset: { id: knownNative, symbol: sym, name: sym },
      coverageNote: 'Native major; live coin payload briefly unavailable.',
    };
  }
  if (!coin.ok || coin.data?.error === 'not_found' || coin.data?.not_found) {
    // Soft signal: try public cg proxy listing (native-filtered by RealCryptoCap).
    const cg = await getJson(`/api/cg?path=/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1`);
    const rows = Array.isArray(cg.data) ? cg.data : (cg.data?.coins || cg.data?.raw || []);
    const match = rows.find((c) => {
      const sym = String(c.symbol || '').toUpperCase();
      return sym === raw.toUpperCase();
    });
    if (!match) {
      if (knownNative) {
        return {
          listed: true,
          source: 'native-major',
          asset: { id: knownNative, symbol: sym, name: sym },
          coverageNote: 'Native major; live coin payload briefly unavailable.',
        };
      }
      return { listed: false, notListed: notListedMessage(raw, 'not_found') };
    }
    const reason = classifyExclusion(match);
    if (reason) {
      return { listed: false, notListed: notListedMessage(raw, reason), asset: match };
    }
    return { listed: true, asset: match, source: 'cg' };
  }

  const reason = classifyExclusion(coin.data);
  if (reason) {
    return { listed: false, notListed: notListedMessage(raw, reason), asset: coin.data };
  }
  return { listed: true, asset: coin.data, source: 'coin' };
}
