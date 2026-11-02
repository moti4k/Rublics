/* Fixed-origin MOEX gateway. Quotes work independently of account/demo mode. */
const express = require('express');
const router = express.Router();
const cache = new Map();
const pending = new Map();
const base = 'https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/';

router.get('/:resource', async (req, res) => {
  const resource = req.params.resource;
  const ticker = String(req.query.ticker || '').toUpperCase();
  if (!['quotes', 'candles', 'orderbook'].includes(resource) ||
      (resource !== 'quotes' && !/^[A-Z0-9._-]{1,16}$/.test(ticker))) {
    return res.status(400).json({ error: 'Некорректный инструмент' });
  }
  const url = new URL(base + (resource === 'quotes' ? 'securities.json' :
    'securities/' + encodeURIComponent(ticker) + '/' + resource + '.json'));
  url.searchParams.set('iss.meta', 'off');
  if (resource === 'quotes') {
    const tickers = String(req.query.securities || '').split(',');
    if (!tickers.length || tickers.length > 100 || tickers.some(t => !/^[A-Z0-9._-]{1,16}$/.test(t))) {
      return res.status(400).json({ error: 'Некорректный список бумаг' });
    }
    url.searchParams.set('securities', [...new Set(tickers)].sort().join(','));
    url.searchParams.set('iss.only', 'securities,marketdata');
  } else if (resource === 'candles') {
    if (!['10', '60', '24'].includes(String(req.query.interval))) return res.status(400).json({ error: 'Некорректный период' });
    for (const key of ['from', 'till']) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(req.query[key]))) return res.status(400).json({ error: 'Некорректная дата' });
      url.searchParams.set(key, req.query[key]);
    }
    url.searchParams.set('interval', req.query.interval);
  } else url.searchParams.set('depth', '15');
  const key = url.href;
  let entry = cache.get(key);
  const ttl = resource === 'candles' ? 60000 : 25000;
  try {
    if (!entry || Date.now() - entry.time > ttl) {
      if (!pending.has(key)) pending.set(key, (async () => {
        const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (!response.ok) throw new Error('MOEX ' + response.status);
        if (resource === 'orderbook' && !String(response.headers.get('content-type')).includes('json')) {
          const error = new Error('Market data access required');
          error.accessRequired = true;
          throw error;
        }
        const json = await response.json();
        if (!json[resource === 'quotes' ? 'marketdata' : resource]?.data) throw new Error('MOEX shape');
        // ISS pages candles in blocks of 500; never mistake the first page for the latest bars.
        if (resource === 'candles') {
          let pageSize = json.candles.data.length;
          for (let start = 500; pageSize === 500 && start < 10000; start += 500) {
            const pageUrl = new URL(url);
            pageUrl.searchParams.set('start', String(start));
            const pageResponse = await fetch(pageUrl, { signal: AbortSignal.timeout(7000) });
            if (!pageResponse.ok) throw new Error('MOEX candles page');
            const page = await pageResponse.json();
            if (!Array.isArray(page.candles?.data)) throw new Error('MOEX candles shape');
            pageSize = page.candles.data.length;
            json.candles.data.push(...page.candles.data);
          }
        }
        const value = { time: Date.now(), json };
        if (cache.size >= 200) cache.delete(cache.keys().next().value);
        cache.set(key, value);
        return value;
      })().finally(() => pending.delete(key)));
      entry = await pending.get(key);
    }
    res.json({ ...entry.json, _market: { source: 'MOEX ISS', fetchedAt: entry.time, stale: false, delayMinutes: 15 } });
  } catch (error) {
    if (error.accessRequired) return res.status(403).json({ error: 'market_access_required' });
    if (entry && Date.now() - entry.time < 86400000) {
      return res.json({ ...entry.json, _market: { source: 'MOEX ISS', fetchedAt: entry.time, stale: true, delayMinutes: 15 } });
    }
    res.status(503).json({ error: 'Биржа временно недоступна. Попробуй обновить позже.' });
  }
});
module.exports = router;
