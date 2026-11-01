const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Network failure exercises the built-in demo fallback, without depending on MOEX uptime.
  await page.route('https://iss.moex.com/**', route => route.abort());
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#screen-onboarding')).toBeVisible();
});

async function enter(page) {
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.locator('#balanceAmount')).not.toHaveText('—');
}

test('navigation, materials, games, and layouts', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await enter(page);
  for (const name of ['Игры', 'Обучение', 'Друзья', 'Профиль', 'Главная']) {
    await page.locator('.tab-bar').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.screen.active')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('link', { name: 'Все материалы', exact: true }).click();
  await page.locator('#newsArticleList [data-article-id]').first().click();
  await expect(page.locator('#articleView h1')).not.toBeEmpty();
  await page.locator('#btnBackArticle').click();
  await page.locator('#btnBackNews').click();
  await page.locator('[data-tab="game"]').click();
  for (const id of ['quiz', 'choice', 'runner', 'rugpull', 'victorina']) {
    await page.locator('[data-game="' + id + '"]').click();
    await expect(page.locator('.screen.active')).toBeVisible();
    const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('.screen.active *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({ cls: e.className, width: e.getBoundingClientRect().width })) }));
    expect(layout.scroll, JSON.stringify({ id, ...layout })).toBeLessThanOrEqual(layout.width);
    await page.locator('.screen.active .btn-back').click();
  }
  expect(errors).toEqual([]);
});

test('buy, persist, sell, and reject invalid quantity', async ({ page }) => {
  await enter(page);
  await page.locator('.stock-chip').first().click();
  await expect(page.locator('#candlestickChart canvas').first()).toBeVisible();
  await page.locator('#btnBuyStock').click();
  await page.locator('#purchaseQty').fill('Infinity');
  await page.locator('#btnPurchase').click();
  await expect(page.locator('#purchaseMessage')).toContainText('корректное');
  await page.locator('#purchaseQty').fill('1,5');
  await page.locator('#btnPurchase').click();
  await expect(page.locator('#purchaseMessage')).toContainText('Успех');
  const bought = await page.evaluate(() => ({ cash: getBalance(), portfolio: getPortfolio() }));
  expect(bought.portfolio.stocks[0].quantity).toBe(1.5);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#screen-home')).toBeVisible();
  expect(await page.evaluate(() => getBalance())).toBe(bought.cash);
  // Reach the sell screen with the same navigation action used by the home shortcut.
  await page.locator('#btnHomeOperations').click();
  await page.locator('#btnBackOperations').click();
  await page.evaluate(() => showScreen('sell'));
  await page.locator('[data-sell-stock]').first().click();
  await page.locator('#sellSheetConfirm').click();
  await expect(page.locator('#sellMessage')).toContainText('Успех');
  expect(await page.evaluate(() => getPortfolio().stocks.length)).toBe(0);
});

test('all security tabs and older chart data', async ({ page }) => {
  await enter(page);
  await page.locator('.stock-chip').first().click();
  await expect(page.locator('#candlestickChart canvas').first()).toBeVisible();
  for (const tab of ['orderbook', 'dividends', 'news', 'events', 'overview']) {
    await page.locator('[data-sec-tab="' + tab + '"]').click();
    await expect(page.locator('.sec-tab-panel:not(.hidden)')).toBeVisible();
  }
  await page.locator('#btnLoadOlder').click();
  await expect(page.locator('#btnLoadOlder')).toBeEnabled();
  expect(await page.evaluate(() => chartCandles.length)).toBeGreaterThan(45);
});

test('user data is isolated and trade submits once', async ({ page }) => {
  await enter(page);
  const result = await page.evaluate(async () => {
    const originalUser = getCurrentUser();
    setCurrentUser({ email: 'one@example.test', displayName: 'One' });
    invalidatePortfolioBundleCache();
    setBalance(12345);
    setCurrentUser({ email: 'two@example.test', displayName: 'Two' });
    invalidatePortfolioBundleCache();
    const otherBalance = getBalance();
    setCurrentUser(originalUser);
    invalidatePortfolioBundleCache();
    await loadStocks();
    renderPurchase();
    document.getElementById('purchaseQty').value = '1';
    await Promise.all([doPurchase(), doPurchase()]);
    return { otherBalance, trades: getOperationLog().length };
  });
  expect(result.otherBalance).toBe(133081.30);
  expect(result.trades).toBe(1);
});

test('quiz and financial choice can be completed', async ({ page }) => {
  await enter(page);
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="quiz"]').click();
  const count = await page.evaluate(() => quizState.items.length);
  for (let i = 0; i < count; i++) {
    await page.locator('#quizContent .quiz-option').first().click();
    await expect(page.locator('#quizContent .quiz-explanation-block')).toBeVisible();
    await page.locator('#quizNext').click();
  }
  await expect(page.locator('#quizContent')).toContainText('верных');
  await page.locator('#quizClose').click();
  await page.locator('[data-game="choice"]').click();
  const choices = await page.evaluate(() => DATA.choiceItems.length);
  for (let i = 0; i < choices; i++) {
    await page.locator('.choice-option').first().click();
    await page.locator('#choiceNext').click();
  }
  await expect(page.locator('#choiceContent')).toContainText('Ситуации пройдены');
});

test('market quiz records result and rugpull can resume', async ({ page }) => {
  await enter(page);
  await page.clock.install();
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="victorina"]').click();
  await page.locator('#btnVictorinaStart').click();
  for (let i = 0; i < 10; i++) {
    const answer = await page.evaluate(() => victorinaDeck[victorinaIdx].correct);
    await page.locator('#btnVictorina' + answer).click();
    await page.clock.runFor(2000);
  }
  await expect(page.locator('#victorinaResultTitle')).toHaveText('Победа в раунде!');
  expect(await page.evaluate(() => getVictorinaPlaysToday())).toBe(1);
  await page.locator('#btnVictorinaToGames').click();
  await page.evaluate(() => { Math.random = () => 0.5; });
  await page.locator('[data-game="rugpull"]').click();
  await page.locator('#rugpullInvest').click();
  await page.clock.runFor(1000);
  await page.locator('#btnBackRugpull').click();
  await page.locator('[data-game="rugpull"]').click();
  expect(await page.evaluate(() => !!rugpullTimer)).toBe(true);
  await page.locator('#rugpullSell').click();
  await expect(page.locator('#rugpullIdle')).toBeVisible();
});

test('server login survives refresh with portfolio', async ({ page }) => {
  await page.route('**/index.html', route => route.continue());
  await page.route('http://127.0.0.1:31339/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('RUBLIKS_LOCAL_ONLY = true', 'RUBLIKS_LOCAL_ONLY = false').replace('RUBLIKS_GUEST_ONLY = true', 'RUBLIKS_GUEST_ONLY = false');
    await route.fulfill({ response, body });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const email = 'browser-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '@example.test';
  await page.locator('#authEmail').fill(email);
  await page.locator('#authPassword').fill('test-password');
  await page.locator('#authConfirmPassword').fill('test-password');
  await page.locator('#authFormRegister button').click();
  await expect(page.locator('#screen-onboarding')).toBeVisible();
  await enter(page);
  await page.evaluate(async () => {
    setBalance(54321);
    await authApi.patchPortfolio(loadBundleFromStorage());
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#screen-home')).toBeVisible();
  expect(await page.evaluate(() => getBalance())).toBe(54321);
});

test('profile name, subscription and keyboard dialogs', async ({ page }) => {
  await enter(page);
  await page.locator('[data-tab="profile"]').click();
  await page.locator('#profileCard').click();
  await expect(page.locator('#characterModal')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#characterName').fill('Новый инвестор');
  await page.locator('#characterSave').click();
  await expect(page.locator('#profileName')).toHaveText('Новый инвестор');
  await page.locator('#btnSubscription').click();
  await page.locator('.subscription-plan-item[data-id="pro"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#subscriptionModal')).toBeHidden();
  await expect(page.locator('#profileSubscription')).toHaveText('Про');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab="profile"]').click();
  await expect(page.locator('#profileName')).toHaveText('Новый инвестор');
  await expect(page.locator('#profileSubscription')).toHaveText('Про');
  await page.locator('[data-tab="home"]').click();
  await page.locator('#portfolioAccountChip').click();
  page.once('dialog', dialog => dialog.accept('Второй счёт'));
  await page.locator('#btnCreatePortfolioAccount').click();
  await expect(page.locator('#portfolioAccountsModalList')).toContainText('Второй счёт');
  await page.locator('#portfolioAccountsModalDone').click();
  await expect(page.locator('#portfolioChipLabel')).toHaveText('Второй счёт');
  await page.locator('#btnHomeAnalytics').click();
  await expect(page.locator('#analyticsRoot')).not.toBeEmpty();
});

test('entrance test and runner start and exit', async ({ page }) => {
  await page.locator('#btnOnboardingTest').click();
  const count = await page.evaluate(() => DATA.entranceTestV2.length);
  for (let i = 0; i < count; i++) await page.locator('.entrance-opt').first().click();
  await expect(page.locator('#screen-entrance-result')).toBeVisible();
  await page.locator('#btnEntranceDone').click();
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="runner"]').click();
  await page.locator('#runnerBtnStart').click();
  await expect(page.locator('#runnerGameArea')).toBeVisible();
  await page.locator('#runnerGameArea').click();
  await page.locator('#btnBackRunner').click();
  await expect(page.locator('#screen-game')).toBeVisible();
  expect(await page.evaluate(() => runnerEngine.spawnTimer)).toBeNull();
});
