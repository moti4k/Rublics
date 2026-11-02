const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }, testInfo) => {
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
  // Explicit test fixtures keep interaction checks independent of the external exchange.
  if (!testInfo.title.startsWith('MOEX response')) await page.addInitScript(() => { window.RUBLIKS_DEMO_MARKET = true; });
  await page.route('**/api/market/**', route => route.abort());
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#screen-onboarding')).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(page.runtimeErrors).toEqual([]);
});

async function enter(page) {
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page.locator('#balanceAmount')).not.toHaveText('—');
}

async function avatarArtwork(locator) {
  return locator.evaluate(svg => Array.from(svg.querySelectorAll('path,ellipse,circle'))
    .filter(node => !node.closest('.char-mouth-talk,.char-mouth-rest'))
    .map(node => ['d', 'fill', 'stroke', 'cx', 'cy', 'rx', 'ry'].map(key => node.getAttribute(key))));
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
    await page.locator('#btnVictorinaNext').click();
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

test('flat colors and explicitly unavailable features', async ({ page }) => {
  await enter(page);
  const backgrounds = await page.locator('body, .news-card, .home-story-card, .btn-primary').evaluateAll(elements => elements.map(el => getComputedStyle(el).backgroundImage));
  expect(backgrounds.every(bg => !bg.includes('gradient'))).toBe(true);
  await expect(page.locator('[data-inst="bonds"]')).toHaveCount(0);
  await expect(page.locator('#btnHomeBuy')).toBeVisible();
  await page.locator('[data-tab="game"]').click();
  await expect(page.locator('.game-hub-title')).toBeVisible();
});

test('illustrated avatar presets and every appearance slot survive reload', async ({ page }) => {
  await enter(page);
  await page.locator('#btnHomeCharacter').click();
  const preview = page.locator('#characterAvatarPreview svg');
  await expect(preview).toHaveAttribute('role', 'img');
  const initial = await avatarArtwork(preview);
  await page.getByRole('button', { name: 'Худи и кудри', exact: true }).click();
  expect(await avatarArtwork(preview)).not.toEqual(initial);
  for (const key of ['skinTone', 'face', 'hair', 'top', 'bottom', 'shoes', 'accessory']) {
    const before = await avatarArtwork(preview);
    await page.locator('.character-option-row[data-key="' + key + '"]').click();
    expect(await avatarArtwork(preview)).not.toEqual(before);
  }
  await page.locator('#characterSave').click();
  const saved = await page.evaluate(() => getCharacterAppearance());
  const homeArt = await avatarArtwork(page.locator('#homeCharacterAvatar svg'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#homeCharacterAvatar svg')).toBeVisible();
  expect(await page.evaluate(() => getCharacterAppearance())).toEqual(saved);
  expect(await avatarArtwork(page.locator('#homeCharacterAvatar svg'))).toEqual(homeArt);
  await page.locator('#btnHomeCharacter').click();
  await page.getByRole('button', { name: 'Кэжуал', exact: true }).click();
  await page.locator('#characterCancel').click();
  expect(await page.evaluate(() => getCharacterAppearance())).toEqual(saved);
});

test('search, sort, favorites and parent report', async ({ page }) => {
  await enter(page);
  await page.locator('#linkAllStocks').click();
  await page.locator('#stocksSearchInput').fill('SBER');
  await expect(page.locator('#stocksFullList .stock-row')).toHaveCount(1);
  await page.locator('#btnStocksSortAlpha').click();
  await page.locator('#stocksFullList .stock-row').click();
  await page.locator('#btnSecurityFav').click();
  await page.locator('#btnBackChart').click();
  await page.locator('[data-tab="home"]').click();
  await page.locator('#homeSubFav').click();
  await expect(page.locator('#homeFavoritesList')).toContainText('SBER');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#homeSubFav').click();
  await expect(page.locator('#homeFavoritesList')).toContainText('SBER');
  await page.locator('#homeSubMain').click();
  await page.locator('#linkParentReport').click();
  await expect(page.locator('#parentReportBody')).not.toBeEmpty();
});

test('invalid and unaffordable trades do not change money', async ({ page }) => {
  await enter(page);
  const before = await page.evaluate(() => getBalance());
  await page.locator('.stock-chip').first().click();
  await page.locator('#btnBuyStock').click();
  for (const quantity of ['0', '-1', 'abc', '1e309', '999999999']) {
    await page.locator('#purchaseQty').fill(quantity);
    await page.locator('#btnPurchase').click();
    await expect(page.locator('#purchaseMessage')).toHaveClass(/error/);
    expect(await page.evaluate(() => getBalance())).toBe(before);
  }
  expect(await page.evaluate(() => getPortfolio().stocks)).toEqual([]);
});

test('runner collects coins, ends after collisions, and persists best score', async ({ page }) => {
  await enter(page);
  await page.clock.install();
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="runner"]').click();
  await page.locator('#runnerBtnStart').click();
  await page.evaluate(() => runnerEngine.items = [{ id: 1, x: .22, y: .78, type: 'coin' }]);
  await page.clock.runFor(40);
  expect(await page.evaluate(() => runnerEngine.score)).toBe(10);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => runnerEngine.items = [{ id: 2, x: .22, y: .78, type: 'rock' }]);
    await page.clock.runFor(40);
    await page.clock.runFor(900);
  }
  await expect(page.locator('#runnerContent')).toContainText('Стоп!');
  expect(await page.evaluate(() => getRunnerBestScore())).toBe(10);
  expect(await page.evaluate(() => getPracticeProgress().completed.runner)).toBe(true);
  expect(await page.evaluate(() => getRublixBalance())).toBe(1);
  await page.evaluate(() => renderRunner());
  expect(await page.evaluate(() => getRublixBalance())).toBe(1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => getRunnerBestScore())).toBe(10);
});

test('leaving games cancels timers through any navigation path', async ({ page }) => {
  await enter(page);
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="runner"]').click();
  await page.locator('#runnerBtnStart').click();
  await page.evaluate(() => showScreen('home'));
  expect(await page.evaluate(() => ({ phase: runnerEngine.phase, timer: runnerEngine.spawnTimer }))).toEqual({ phase: 'start', timer: null });
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="rugpull"]').click();
  await page.evaluate(() => { Math.random = () => .5; });
  await page.locator('#rugpullInvest').click();
  await page.evaluate(() => showScreen('home'));
  expect(await page.evaluate(() => rugpullTimer)).toBeNull();
});

test('rugpull crash and invalid bets preserve the correct balance', async ({ page }) => {
  await enter(page);
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="rugpull"]').click();
  const before = await page.evaluate(() => getRugpullBalance());
  for (const bet of ['-1', '0', 'Infinity', '999999999']) {
    await page.locator('#rugpullBet').fill(bet);
    await page.locator('#rugpullInvest').click();
    expect(await page.evaluate(() => getRugpullBalance())).toBe(before);
  }
  await page.evaluate(() => { Math.random = () => 0; });
  await page.locator('#rugpullBet').fill('1000');
  await page.locator('#rugpullInvest').click();
  await expect(page.locator('#rugpullCrashed')).toBeVisible();
  expect(await page.evaluate(() => getRugpullBalance())).toBe(before - 1000);
  const crashedChart = await page.locator('#rugpullChart').evaluate(canvas => canvas.toDataURL());
  await page.locator('#rugpullPlayAgain').click();
  expect(await page.evaluate(() => getRugpullBalance())).toBe(before - 1000);
  expect(await page.locator('#rugpullChart').evaluate(canvas => canvas.toDataURL())).not.toBe(crashedChart);
});

test('help, purchase shortcut and share without clipboard work', async ({ page }) => {
  await enter(page);
  await page.locator('#btnHeaderHelp').click();
  await expect(page.locator('#headerHelpModal')).toBeVisible();
  await page.locator('#headerHelpModalDone').click();
  await page.locator('#pillPortfolioAll').click();
  await expect(page.locator('#pillPortfolioAll')).toHaveClass(/active/);
  await page.locator('#pillPortfolioDay').click();
  await expect(page.locator('#pillPortfolioDay')).toHaveClass(/active/);
  await page.locator('#btnHomeBuy').click();
  await expect(page.locator('#screen-stocks')).toBeVisible();
  await page.locator('#btnBackStocks').click();
  await page.locator('.stock-chip').first().click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  const dialogPromise = page.waitForEvent('dialog').then(async dialog => {
    expect(dialog.defaultValue()).toContain('127.0.0.1');
    await dialog.dismiss();
  });
  await Promise.all([dialogPromise, page.locator('#btnSecurityShare').click()]);
});

test('quiz timeout and daily limit are visible', async ({ page }) => {
  await enter(page);
  await page.clock.install();
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="victorina"]').click();
  await page.locator('#btnVictorinaStart').click();
  await page.clock.runFor(20001);
  await expect(page.locator('#victorinaExplain')).toContainText('Время вышло');
  await page.evaluate(() => { setVictorinaPlaysTodayCount(5); showScreen('victorina-entry'); });
  await expect(page.locator('#btnVictorinaStart')).toBeDisabled();
  await expect(page.locator('#victorinaPlaysLeft')).toHaveText('0');
});

test('server rejection does not grant rewards or repeat the round', async ({ page }) => {
  await enter(page);
  const result = await page.evaluate(async () => {
    const user = getCurrentUser();
    authApi.isUsingBackend = () => true;
    authApi.getCurrentUserSync = () => user;
    authApi.postQuizComplete = () => Promise.resolve({ ok: false, status: 429, data: { playsToday: 25 } });
    victorinaCorrect = 10;
    victorinaTimeMs = 10000;
    victorinaRoundFinished = false;
    const before = getVictorinaXp();
    finishVictorinaRound();
    await Promise.resolve();
    finishVictorinaRound();
    return { before, after: getVictorinaXp() };
  });
  expect(result.after).toBe(result.before);
  await expect(page.locator('#victorinaResultRewards')).toContainText('Награды не начислены');
});

test('MOEX response with duplicate candles still draws a chart', async ({ page }) => {
  await page.route('**/api/market/quotes?*', route => route.fulfill({ json: { securities: { columns: ['SECID', 'SHORTNAME', 'PREVPRICE'], data: [['SBER', 'Сбербанк', 250]] }, marketdata: { columns: ['SECID', 'LAST', 'OPEN'], data: [['SBER', 258, 250]] } } }));
  await enter(page);
  await expect(page.locator('.stock-chip')).toHaveCount(1);
  await page.route('**/api/market/candles?*', route => route.fulfill({ json: {
    candles: { columns: ['begin', 'open', 'high', 'low', 'close', 'volume'], data: [
      ['2026-10-29T12:00:00Z', 250, 255, 245, 252, 1000],
      ['2026-10-30T12:00:00Z', 252, 259, 250, 257, 1200],
      ['2026-10-30T12:00:00Z', 252, 260, 250, 258, 1300],
      ['2026-10-28T12:00:00Z', 0, 255, 245, 252, 1000],
      ['2026-10-27T12:00:00Z', 250, 240, 245, 252, 1000]
    ] }
  } }));
  await page.locator('.stock-chip').first().click();
  await expect(page.locator('#candlestickChart canvas').first()).toBeVisible();
  expect(await page.evaluate(() => chartCandles.length)).toBe(2);
  await expect(page.locator('#chartDataStatus')).toContainText('MOEX');
  await page.locator('#btnLoadOlder').click();
  await expect(page.locator('#btnLoadOlder')).toBeEnabled();
});

test('all chart periods, synchronized zoom, resize and older history', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => setSubscriptionId('pro'));
  await page.locator('.stock-chip').first().click();
  await expect(page.locator('#chartDataStatus')).toContainText('Учебный график');
  for (const scale of ['allTime', 'months', 'days', 'hours', 'minutes']) {
    await page.locator('[data-scale="' + scale + '"]').click();
    await expect.poll(() => page.evaluate(() => document.getElementById('chartLoading').classList.contains('hidden'))).toBe(true);
    const result = await page.evaluate(() => ({
      times: chartCandles.map(c => c.time),
      close: chartCandles[chartCandles.length - 1].close,
      price: stocks.find(s => s.ticker === currentChartSecid).price,
      intraday: candleChart.options().timeScale.timeVisible
    }));
    expect(result.close).toBeCloseTo(result.price, 6);
    expect(result.times[1] - result.times[0]).toBe(scale === 'minutes' ? 600 : scale === 'hours' ? 3600 : 86400);
    expect(result.intraday).toBe(['hours', 'minutes'].includes(scale));
  }
  await page.evaluate(() => candleChart.timeScale().setVisibleLogicalRange({ from: 10, to: 25 }));
  await expect.poll(() => page.evaluate(() => Math.round(volumeChart.timeScale().getVisibleLogicalRange().from))).toBe(10);
  await page.evaluate(() => volumeChart.timeScale().setVisibleLogicalRange({ from: 15, to: 30 }));
  await expect.poll(() => page.evaluate(() => Math.round(candleChart.timeScale().getVisibleLogicalRange().from))).toBe(15);
  const before = await page.evaluate(() => candleChart.timeScale().getVisibleRange());
  await page.locator('#btnLoadOlder').click();
  await expect(page.locator('#btnLoadOlder')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => candleChart.timeScale().getVisibleRange())).toEqual(before);
  // Graph must recover after being hidden while its container changes size.
  await page.locator('[data-sec-tab="news"]').click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('[data-sec-tab="overview"]').click();
  await expect.poll(() => page.evaluate(() => Math.abs(candleChart.options().width - document.getElementById('candlestickChart').clientWidth))).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty chart has a clear state and recovers on reload', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => { fetchCandles = async () => []; });
  await page.locator('.stock-chip').first().click();
  await expect(page.locator('#chartDataStatus')).toContainText('Обновить график');
  await expect(page.locator('#btnLoadOlder')).toBeHidden();
  await expect(page.locator('#candlestickChart canvas')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.stock-chip').first().click();
  await expect(page.locator('#candlestickChart canvas').first()).toBeVisible();
});

test('chart dates are independent of the device timezone', async ({ page }) => {
  const result = await page.evaluate(() => ({
    day: moexCandleTime('2026-10-30 00:00:00', 'days'),
    intraday: moexCandleTime('2026-10-30 10:20:00', 'minutes'),
    invalid: Number.isNaN(moexCandleTime('broken', 'hours'))
  }));
  expect(result.day).toBe(Date.parse('2026-10-30T12:00:00Z') / 1000);
  expect(result.intraday).toBe(Date.parse('2026-10-30T07:20:00Z') / 1000);
  expect(result.invalid).toBe(true);
});

test('accounts keep independent positions and analytics totals match', async ({ page }) => {
  await enter(page);
  const original = await page.evaluate(() => {
    setSubscriptionId('pro');
    return { id: getPortfolioAccounts()[0].id, cash: getBalance() };
  });
  await page.locator('#portfolioAccountChip').click();
  page.once('dialog', dialog => dialog.accept('Практика'));
  await page.locator('#btnCreatePortfolioAccount').click();
  await page.locator('#portfolioAccountsModalDone').click();
  await page.locator('.stock-chip').first().click();
  await page.locator('#btnBuyStock').click();
  await page.locator('#purchaseQty').fill('1');
  await page.locator('#btnPurchase').click();
  await expect(page.locator('#purchaseMessage')).toContainText('Успех');
  await page.evaluate(() => showScreen('analytics'));
  await expect(page.locator('.analytics-pie-legend li')).toHaveCount(2);
  const total = await page.evaluate(() => getAggregatedWealthRub(stocks, CRYPTO_PRICES));
  expect(total).toBeCloseTo(original.cash + 100000, 2);
  await page.locator('[data-analytics-scope="active"]').click();
  await expect(page.locator('#analyticsRoot')).toContainText('100 000,00');
  const positions = await page.evaluate(id => { setActivePortfolioAccount(id); return { cash: getBalance(), stocks: getPortfolio().stocks }; }, original.id);
  expect(positions.cash).toBe(original.cash);
  expect(positions.stocks).toEqual([]);
});

test('every article, topic and question has usable content', async ({ page }) => {
  await enter(page);
  const result = await page.evaluate(() => {
    const errors = [];
    for (const q of [...DATA.quizItems, ...DATA.choiceItems]) {
      if (!q.question || !q.explanation || !q.options[q.correctAnswerIndex]) errors.push(q.question || 'Empty question');
    }
    for (const q of DATA.victorinaQuestions) {
      if (!q.explanation || ![0, 1, 2].includes(q.correct)) errors.push('Market quiz: ' + q.id);
    }
    for (const article of DATA.newsArticles) {
      renderArticle(article.id);
      if (!document.querySelector('#articleView h1') || !article.paragraphs.length) errors.push(article.id);
    }
    for (const topic of DATA.topics) {
      renderTopicDetail(topic.id);
      if (!DATA.topicDetails[topic.id].paragraphs.length) errors.push(topic.id);
    }
    return errors;
  });
  expect(result).toEqual([]);
});

test('failed login preserves an existing server session', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const email = 'session-' + Date.now() + Math.random().toString(36).slice(2) + '@example.test';
    await authApi.register(email, 'test-password', 'Session test');
    const token = localStorage.getItem('rubliks_api_token');
    let rejected = false;
    try { await authApi.login(email, 'wrong-password'); } catch (_) { rejected = true; }
    return { rejected, sameToken: token === localStorage.getItem('rubliks_api_token'), email: (await authApi.getMe()).email, expected: email };
  });
  expect(result.rejected).toBe(true);
  expect(result.sameToken).toBe(true);
  expect(result.email).toBe(result.expected);
});

test('damaged local portfolio does not break startup', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => lsSetScoped('rubliks_portfolio', JSON.stringify({ v: 2, accounts: [null, { id: 'broken', balanceRub: 'NaN', holdings: { stocks: [null] } }] })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#screen-home')).toBeVisible();
  expect(await page.evaluate(() => getBalance())).toBe(0);
  expect(await page.evaluate(() => getPortfolio().stocks)).toEqual([]);
});
