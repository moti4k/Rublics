/* Rubliks Web - fetch stocks/candles (MOEX ISS or mock) */

const MOEX_BASE = 'https://iss.moex.com/iss';

async function fetchMoex(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('MOEX unavailable');
    return await response.json();
  }
  finally { clearTimeout(timer); }
}

function normalizeCandles(candles) {
  const valid = (Array.isArray(candles) ? candles : []).filter(c => c && Number.isFinite(c.time) &&
    [c.open, c.high, c.low, c.close].every(p => Number.isFinite(p) && p > 0) &&
    c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close) && c.low <= c.high);
  return Array.from(new Map(valid.map(c => [c.time, {
    ...c, volume: Number.isFinite(c.volume) && c.volume >= 0 ? c.volume : 0
  }])).values()).sort((a, b) => a.time - b.time);
}

function moexCandleTime(begin, scale) {
  if (typeof begin !== 'string') return NaN;
  if (!['hours', 'minutes'].includes(scale) && /^\d{4}-\d{2}-\d{2}/.test(begin)) {
    return Date.parse(begin.slice(0, 10) + 'T12:00:00Z') / 1000;
  }
  let iso = begin.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(iso)) iso += '+03:00';
  return Math.floor(Date.parse(iso) / 1000);
}

function tickersForMoexRequest() {
  if (typeof getMoexTickerListForSubscription === 'function') {
    const owned = typeof getMergedStocksHoldingsAllAccounts === 'function'
      ? getMergedStocksHoldingsAllAccounts().map(h => h.ticker) : [];
    return Array.from(new Set(getMoexTickerListForSubscription().concat(owned)));
  }
  return ['SBER', 'GAZP', 'LKOH', 'YNDX', 'GMKN', 'NVTK', 'TATN', 'ROSN', 'PLZL', 'MTSS', 'ALRS', 'CHMF', 'VTBR', 'AFLT', 'MGNT'];
}

async function fetchStocks() {
  const list = tickersForMoexRequest().join(',');
  const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&securities=${encodeURIComponent(list)}`;
  try {
    const json = await fetchMoex(url);
    const sec = json.securities?.data || [];
    const mkt = json.marketdata?.data || [];
    const cols = (json.securities?.columns || []).map(c => c?.toLowerCase?.() || c);
    const mktCols = (json.marketdata?.columns || []).map(c => c?.toLowerCase?.() || c);
    const idxId = cols.indexOf('secid');
    const idxName = cols.indexOf('shortname');
    const mktIdxId = mktCols.indexOf('secid');
    const mktIdxLast = mktCols.indexOf('last');
    const mktIdxOpen = mktCols.indexOf('open');
    const nameById = {};
    sec.forEach(row => {
      if (row[idxId] && row[idxName]) nameById[row[idxId]] = row[idxName];
    });
    const result = [];
    mkt.forEach(row => {
      const secid = row[mktIdxId];
      const last = parseFloat(row[mktIdxLast]);
      const open = parseFloat(row[mktIdxOpen]) || last;
      if (!secid || !Number.isFinite(last) || last <= 0) return;
      const change = open !== 0 ? ((last - open) / open) * 100 : 0;
      result.push({
        ticker: secid,
        name: nameById[secid] || secid,
        price: last,
        changePercent: change
      });
    });
    if (result.length > 0) {
      const missing = tickersForMoexRequest().filter(t => !result.some(s => s.ticker === t));
      return result.concat(mockStocksForTickers(missing));
    }
  } catch (_) {}
  const tickers = tickersForMoexRequest();
  if (typeof mockStocksForTickers === 'function') return mockStocksForTickers(tickers);
  return DATA.defaultStocks.map(s => ({
    ...s,
    price: s.price * (0.98 + Math.random() * 0.04),
    changePercent: (Math.random() - 0.5) * 4
  }));
}

async function fetchCurrentPrice(ticker) {
  const stocks = await fetchStocks();
  const s = stocks.find(x => x.ticker === ticker);
  return s ? s.price : null;
}

function mockCandles(secid, count = 45, interval = 'day') {
  const now = Date.now();
  const ms = interval === 'day' ? 864e5 : interval === 'hour' ? 36e5 : 6e5;
  const candles = [];
  const stock = (typeof stocks !== 'undefined' ? stocks : DATA.defaultStocks).find(s => s.ticker === secid);
  const price = stock && Number.isFinite(stock.price) && stock.price > 0 ? stock.price : 250;
  let open = price;
  for (let i = count - 1; i >= 0; i--) {
    const time = Math.floor((now - i * ms) / 1000);
    const change = (Math.random() - 0.48) * price * 0.02;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * price * 0.006;
    const low = Math.min(open, close) - Math.random() * price * 0.006;
    const vol = Math.random() * 5e6 + 1e6;
    candles.push({ time, open, high, low, close, volume: vol });
    open = close;
  }
  // Keep the last demo candle consistent with the price used in the order form.
  const factor = price / candles[candles.length - 1].close;
  candles.forEach(c => ['open', 'high', 'low', 'close'].forEach(key => { c[key] *= factor; }));
  candles.isDemo = true;
  return candles;
}

function toMoexDate(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function fetchCandles(secid, scale = 'days') {
  const limits = { allTime: 100, months: 90, days: 45, hours: 24, minutes: 36 };
  const limit = limits[scale] || 45;
  const interval = scale === 'hours' ? 'hour' : scale === 'minutes' ? 'minute' : 'day';
  const now = Date.now();
  const dayMs = 864e5;
  const till = toMoexDate(now);
  const stepMs = scale === 'hours' ? 36e5 : scale === 'minutes' ? 6e5 : dayMs;
  const from = toMoexDate(now - limit * stepMs);
  const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(secid)}/candles.json?interval=${scale === 'hours' ? 60 : scale === 'minutes' ? 10 : 24}&from=${from}&till=${till}&limit=${limit}`;
  try {
    const json = await fetchMoex(url);
    const data = json.candles?.data || [];
    const cols = (json.candles?.columns || []).map(c => c?.toLowerCase?.() || c);
    const idxOpen = cols.indexOf('open');
    const idxClose = cols.indexOf('close');
    const idxHigh = cols.indexOf('high');
    const idxLow = cols.indexOf('low');
    const idxBegin = cols.indexOf('begin');
    const idxVol = cols.indexOf('volume');
    if ([idxOpen, idxClose, idxHigh, idxLow, idxBegin].some(i => i < 0)) throw new Error('cols');
    const parsed = normalizeCandles(data.map(row => {
      const begin = row[idxBegin];
      const time = moexCandleTime(begin, scale);
      return {
        time: Math.floor(time),
        open: parseFloat(row[idxOpen]),
        high: parseFloat(row[idxHigh]),
        low: parseFloat(row[idxLow]),
        close: parseFloat(row[idxClose]),
        volume: parseFloat(row[idxVol]) || 0
      };
    }));
    if (parsed.length) return parsed.slice(-limit);
  } catch (_) {}
  return mockCandles(secid, limit, scale === 'hours' ? 'hour' : scale === 'minutes' ? 'minute' : 'day');
}

async function fetchOlderCandles(secid, scale, beforeTime, demoAnchor) {
  const limits = { allTime: 100, months: 90, days: 45, hours: 24, minutes: 36 };
  const limit = limits[scale] || 45;
  const till = toMoexDate(beforeTime * 1000 - 864e5);
  const from = toMoexDate(beforeTime * 1000 - (limit * 2 + 1) * 864e5);
  const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(secid)}/candles.json?interval=${scale === 'hours' ? 60 : scale === 'minutes' ? 10 : 24}&limit=${limit}&from=${from}&till=${till}`;
  const isDemo = Number.isFinite(demoAnchor) && demoAnchor > 0;
  try {
    if (isDemo) throw new Error('Demo history');
    const json = await fetchMoex(url);
    const data = json.candles?.data || [];
    const cols = (json.candles?.columns || []).map(c => c?.toLowerCase?.() || c);
    const idxOpen = cols.indexOf('open');
    const idxClose = cols.indexOf('close');
    const idxHigh = cols.indexOf('high');
    const idxLow = cols.indexOf('low');
    const idxBegin = cols.indexOf('begin');
    const idxVol = cols.indexOf('volume');
    if ([idxOpen, idxClose, idxHigh, idxLow, idxBegin].some(i => i < 0)) return [];
    return normalizeCandles(data.map(row => {
      const begin = row[idxBegin];
      const time = moexCandleTime(begin, scale);
      return {
        time: Math.floor(time),
        open: parseFloat(row[idxOpen]),
        high: parseFloat(row[idxHigh]),
        low: parseFloat(row[idxLow]),
        close: parseFloat(row[idxClose]),
        volume: parseFloat(row[idxVol]) || 0
      };
    })).filter(c => c.time < beforeTime).slice(-limit);
  } catch (_) {}
  // Never append invented prices to genuine exchange history.
  if (!isDemo) return [];
  const interval = scale === 'hours' ? 'hour' : scale === 'minutes' ? 'minute' : 'day';
  const ms = interval === 'day' ? 864e5 : interval === 'hour' ? 36e5 : 6e5;
  const beforeMs = beforeTime * 1000;
  const candles = [];
  let open = demoAnchor;
  for (let i = limit - 1; i >= 0; i--) {
    const t = Math.floor((beforeMs - (i + 1) * ms) / 1000);
    if (t >= beforeTime) continue;
    const change = (Math.random() - 0.48) * demoAnchor * 0.02;
    const close = open + change;
    candles.push({
      time: t,
      open,
      high: Math.max(open, close) + Math.random() * demoAnchor * 0.006,
      low: Math.min(open, close) - Math.random() * demoAnchor * 0.006,
      close,
      volume: Math.random() * 5e6 + 1e6
    });
    open = close;
  }
  const factor = demoAnchor / candles[candles.length - 1].close;
  candles.forEach(c => ['open', 'high', 'low', 'close'].forEach(key => { c[key] *= factor; }));
  candles.isDemo = true;
  return candles;
}

/** Стакан TQBR (MOEX ISS). При ошибке сети — учебный мок вокруг lastPriceFallback. */
async function fetchOrderBook(secid, depth, lastPriceFallback) {
  const d = depth || 15;
  const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(secid)}/orderbook.json?iss.meta=off&depth=${d}`;
  function mock(mid) {
    const m = typeof mid === 'number' && !isNaN(mid) && mid > 0 ? mid : 250;
    const step = m > 500 ? 2 : m > 50 ? 0.5 : 0.02;
    const bids = [];
    const asks = [];
    for (let i = 0; i < 10; i++) {
      bids.push({ price: +(m - (i + 1) * step).toFixed(4), quantity: Math.floor(Math.random() * 800 + 20) });
      asks.push({ price: +(m + (i + 1) * step).toFixed(4), quantity: Math.floor(Math.random() * 800 + 20) });
    }
    return { bids, asks, mock: true };
  }
  try {
    const json = await fetchMoex(url);
    const ob = json.orderbook;
    if (!ob || !Array.isArray(ob.columns) || !Array.isArray(ob.data)) throw new Error('shape');
    const cols = ob.columns.map(c => String(c).toLowerCase());
    const iSide = cols.indexOf('buysell');
    const iPrice = cols.indexOf('price');
    const iQty = cols.indexOf('quantity');
    if (iSide < 0 || iPrice < 0 || iQty < 0) throw new Error('cols');
    const bids = [];
    const asks = [];
    ob.data.forEach(row => {
      const side = row[iSide];
      const price = parseFloat(row[iPrice]);
      const quantity = parseFloat(row[iQty]);
      if (isNaN(price) || isNaN(quantity)) return;
      const s = String(side || '').toUpperCase();
      if (s === 'B') bids.push({ price, quantity });
      else if (s === 'S') asks.push({ price, quantity });
    });
    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);
    if (bids.length || asks.length) return { bids, asks, mock: false };
    throw new Error('empty');
  } catch (_) {
    return mock(lastPriceFallback);
  }
}
