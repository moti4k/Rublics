const { test, expect } = require('@playwright/test');

const quote = {
  securities: { columns: ['SECID', 'SHORTNAME', 'PREVPRICE', 'LOTSIZE'], data: [['SBER', 'Сбербанк', 290, 10]] },
  marketdata: { columns: ['SECID', 'LAST', 'OPEN', 'LASTTOPREVPRICE', 'SYSTIME'], data: [['SBER', 296.7, 294, 2.31, '2026-11-01 19:00:19']] },
  _market: { fetchedAt: 1793550000000, stale: false }
};
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.route(/https:\/\/fonts\./, route => route.fulfill({ body: '', contentType: 'text/css' }));
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });
async function start(page) {
  await page.goto('/');
  await page.locator('#btnOnboardingSkip').click();
}

test('unavailable market does not invent prices; retry recovers real quotes', async ({ page }) => {
  await page.route('**/api/market/**', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await start(page);
  await expect(page.locator('#quotesRefreshLabel')).toContainText('недоступна');
  await expect(page.locator('.stock-chip')).toHaveCount(0);
  expect(await page.evaluate(() => stocks.length)).toBe(0);
  await page.route('**/api/market/quotes?**', route => route.fulfill({ json: quote }));
  await page.locator('#btnRefreshQuotes').click();
  await expect(page.locator('#quotesRefreshLabel')).toContainText('15 мин');
  await expect(page.locator('.stock-chip')).toHaveCount(1);
  const values = await page.evaluate(() => ({ price: stocks[0].price, previousClose: stocks[0].previousClose, mock: stocks.some(s => s.mock) }));
  expect(values).toEqual({ price: 296.7, previousClose: 290, mock: false });
  // A partial exchange response must not be padded with synthetic missing tickers.
  await page.locator('.stock-chip').click();
  await expect(page.locator('#chartDataStatus')).toContainText('недоступен');
  await expect(page.locator('#btnRetryChart')).toBeVisible();
  await page.locator('[data-sec-tab=orderbook]').click();
  await expect(page.locator('#secOrderbookHint')).toContainText('недоступен');
  expect(await page.locator('.orderbook-table tbody tr').count()).toBe(0);
});

test('stale quotes cannot execute a trade or erase the portfolio', async ({ page }) => {
  await page.route('**/api/market/**', route => route.fulfill({ json: quote }));
  await start(page);
  await expect(page.locator('.stock-chip')).toHaveCount(1);
  await page.evaluate(() => { setPortfolio({ stocks: [{ ticker: 'SBER', quantity: 2 }], crypto: [], futuresValueRub: 0 }); });
  await page.route('**/api/market/**', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.locator('#btnRefreshQuotes').click();
  await expect(page.locator('#quotesRefreshLabel')).toContainText('сохранённые');
  const before = await page.evaluate(() => getBalance());
  await page.evaluate(async () => { renderPurchase(); document.getElementById('purchaseQty').value = '1'; await doPurchase(); });
  expect(await page.evaluate(() => getBalance())).toBe(before);
  expect(await page.evaluate(() => getPortfolio().stocks[0].quantity)).toBe(2);
  await expect(page.locator('#purchaseMessage')).toContainText('цену');
  expect(await page.evaluate(() => stocks[0].stale)).toBe(true);
});

test('profile guide settings preserve explanations and offer help on request', async ({ page }) => {
  await page.addInitScript(() => { window.RUBLIKS_DEMO_MARKET = true; });
  await start(page);
  await page.locator('[data-tab=profile]').click();
  await page.locator('[data-guide-mode=off]').click();
  await page.locator('[data-tab=game]').click();
  await page.locator('[data-game=quiz]').click();
  await page.locator('.quiz-option').first().click();
  await expect(page.locator('#quizGuide')).toBeHidden();
  await expect(page.locator('.buddy-hidden-explanation')).toBeVisible();
  await page.locator('#quizNext').click();
  await expect(page.locator('#quizGuide')).toBeHidden();
  await page.locator('#btnBackQuiz').click();
  await page.locator('[data-tab=profile]').click();
  await page.locator('[data-guide-mode=quiet]').click();
  await page.locator('[data-tab=game]').click();
  await page.locator('[data-game=quiz]').click();
  await expect(page.locator('#quizGuide .speech-bubble')).toBeHidden();
  await page.locator('#quizGuide .buddy-hint').click();
  await expect(page.locator('#quizGuide .speech-bubble')).toBeVisible();
  await page.locator('.quiz-option').first().click();
  await expect(page.locator('#quizGuide .speech-bubble')).toBeVisible();
  await page.reload();
  await page.locator('[data-tab=profile]').click();
  await expect(page.locator('[data-guide-mode=quiet]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-guide-mode=full]').click();
  await page.locator('[data-tab=home]').click();
  await expect(page.locator('.home-intro .speech-bubble')).toBeVisible();
  expect(await page.evaluate(() => [...document.querySelectorAll('.screen')].every(e => e.parentElement.matches('main.main')))).toBe(true);
});

test('quote gateway rejects arbitrary upstreams, symbols and periods', async ({ request }) => {
  for (const url of ['/api/market/quotes?securities=../../etc', '/api/market/candles?ticker=SBER&interval=1&from=2026-10-01&till=2026-11-01', '/api/market/orderbook?ticker=https://example.com', '/api/market/unknown']) {
    expect((await request.get(url)).status()).toBe(400);
  }
});

test('changed price requires confirmation and fractional round-trip keeps exact cash', async ({ page }) => {
  let price = 296.7;
  await page.route('**/api/market/**', route => route.fulfill({ json: {
    ...quote, marketdata: { ...quote.marketdata, data: [['SBER', price, 294, 2.31, '2026-11-01 19:00:19']] }
  } }));
  await start(page);
  await page.locator('.stock-chip').click();
  await page.locator('#btnBuyStock').click();
  const initial = await page.evaluate(() => getBalance());
  await page.locator('#purchaseQty').fill('0,1');
  price = 300;
  await page.locator('#btnPurchase').click();
  await expect(page.locator('#purchaseMessage')).toContainText('Цена обновилась');
  expect(await page.evaluate(() => getBalance())).toBe(initial);
  await page.locator('#btnPurchase').click();
  await expect(page.locator('#purchaseMessage')).toContainText('Успех');
  await page.locator('#purchaseQty').fill('0,2');
  await page.locator('#btnPurchase').click();
  await expect.poll(() => page.evaluate(() => getPortfolio().stocks[0].quantity)).toBe(.3);
  await page.locator('#btnBackPurchase').click();
  await page.locator('#btnSellFromChart').click();
  await page.locator('[data-sell-stock]').click();
  await page.locator('#sellSheetQty').fill('0,3');
  await page.locator('#sellSheetConfirm').click();
  await expect(page.locator('#sellMessage')).toContainText('0,3');
  expect(await page.evaluate(() => getPortfolio().stocks)).toEqual([]);
  expect(await page.evaluate(() => getBalance())).toBe(initial);
});
