/* Rubliks Web - fetch stocks/candles (MOEX ISS or mock) */

const MOEX_BASE = 'https://iss.moex.com/iss';

async function fetchMoex(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try { return await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
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
    const r = await fetchMoex(url);
    if (!r.ok) throw new Error('Network');
    const json = await r.json();
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
      if (!secid || isNaN(last)) return;
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
  let open = 240 + Math.random() * 80;
  for (let i = count - 1; i >= 0; i--) {
    const time = Math.floor((now - i * ms) / 1000);
    const change = (Math.random() - 0.48) * 6;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const vol = Math.random() * 5e6 + 1e6;
    candles.push({ time, open, high, low, close, volume: vol });
    open = close;
  }
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
  const from = toMoexDate(now - (limit * dayMs));
  const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(secid)}/candles.json?interval=${scale === 'hours' ? 60 : scale === 'minutes' ? 10 : 24}&from=${from}&till=${till}&limit=${limit}`;
  try {
    const r = await fetchMoex(url);
    if (!r.ok) throw new Error('Network');
    const json = await r.json();
    const data = json.candles?.data || [];
    const cols = (json.candles?.columns || []).map(c => c?.toLowerCase?.() || c);
    const idxOpen = cols.indexOf('open');
    const idxClose = cols.indexOf('close');
    const idxHigh = cols.indexOf('high');
    const idxLow = cols.indexOf('low');
    const idxBegin = cols.indexOf('begin');
    const idxVol = cols.indexOf('volume');
    if (idxOpen < 0 || idxClose < 0) throw new Error('cols');
    const parsed = data.map(row => {
      const begin = row[idxBegin];
      let time = typeof begin === 'string' ? new Date(begin).getTime() / 1000 : Math.floor(Date.now() / 1000);
      if (typeof begin === 'string' && begin.length === 10) time = new Date(begin + 'T12:00:00Z').getTime() / 1000;
      return {
        time: Math.floor(time),
        open: parseFloat(row[idxOpen]),
        high: parseFloat(row[idxHigh]) || parseFloat(row[idxOpen]),
        low: parseFloat(row[idxLow]) || parseFloat(row[idxOpen]),
        close: parseFloat(row[idxClose]),
        volume: parseFloat(row[idxVol]) || 0
      };
    })
      .filter(c => c.time && [c.open, c.close, c.high, c.low].every(Number.isFinite))
      .sort((a, b) => a.time - b.time);
    if (parsed.length) return parsed;
  } catch (_) {}
  return mockCandles(secid, limit, scale === 'hours' ? 'hour' : scale === 'minutes' ? 'minute' : 'day');
}

async function fetchOlderCandles(secid, scale, beforeTime) {
  const limits = { allTime: 100, months: 90, days: 45, hours: 24, minutes: 36 };
  const limit = limits[scale] || 45;
  const till = toMoexDate(beforeTime * 1000 - 864e5);
  const from = toMoexDate(beforeTime * 1000 - (limit * 2 + 1) * 864e5);
  const url = `${MOEX_BASE}/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(secid)}/candles.json?interval=${scale === 'hours' ? 60 : scale === 'minutes' ? 10 : 24}&limit=${limit}&from=${from}&till=${till}`;
  try {
    const r = await fetchMoex(url);
    if (!r.ok) throw new Error('Network');
    const json = await r.json();
    const data = json.candles?.data || [];
    const cols = (json.candles?.columns || []).map(c => c?.toLowerCase?.() || c);
    const idxOpen = cols.indexOf('open');
    const idxClose = cols.indexOf('close');
    const idxHigh = cols.indexOf('high');
    const idxLow = cols.indexOf('low');
    const idxBegin = cols.indexOf('begin');
    const idxVol = cols.indexOf('volume');
    if (idxOpen < 0 || idxClose < 0) return [];
    return data.map(row => {
      const begin = row[idxBegin];
      let time = typeof begin === 'string' ? new Date(begin).getTime() / 1000 : 0;
      if (typeof begin === 'string' && begin.length === 10) time = new Date(begin + 'T12:00:00Z').getTime() / 1000;
      return {
        time: Math.floor(time),
        open: parseFloat(row[idxOpen]),
        high: parseFloat(row[idxHigh]) || parseFloat(row[idxOpen]),
        low: parseFloat(row[idxLow]) || parseFloat(row[idxOpen]),
        close: parseFloat(row[idxClose]),
        volume: parseFloat(row[idxVol]) || 0
      };
    }).filter(c => c.time && c.time < beforeTime && !isNaN(c.open)).sort((a, b) => a.time - b.time);
  } catch (_) {}
  const interval = scale === 'hours' ? 'hour' : scale === 'minutes' ? 'minute' : 'day';
  const ms = interval === 'day' ? 864e5 : interval === 'hour' ? 36e5 : 6e5;
  const beforeMs = beforeTime * 1000;
  const candles = [];
  let open = 240 + Math.random() * 80;
  for (let i = limit - 1; i >= 0; i--) {
    const t = Math.floor((beforeMs - (i + 1) * ms) / 1000);
    if (t >= beforeTime) continue;
    const change = (Math.random() - 0.48) * 6;
    const close = open + change;
    candles.push({
      time: t,
      open,
      high: Math.max(open, close) + Math.random() * 2,
      low: Math.min(open, close) - Math.random() * 2,
      close,
      volume: Math.random() * 5e6 + 1e6
    });
    open = close;
  }
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
    const r = await fetchMoex(url);
    if (!r.ok) throw new Error('http');
    const json = await r.json();
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
