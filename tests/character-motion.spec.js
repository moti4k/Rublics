const { test, expect } = require('@playwright/test');

test.use({ reducedMotion: 'no-preference' });
test.beforeEach(async ({ page }) => {
  page.motionErrors = [];
  page.on('pageerror', error => page.motionErrors.push(error.message));
  await page.route('https://iss.moex.com/**', route => route.abort());
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#btnOnboardingSkip').click();
  await expect(page.locator('.stock-chip').first()).toBeVisible();
});
test.afterEach(async ({ page }) => { expect(page.motionErrors).toEqual([]); });
function reaction(page, type) {
  return page.locator('.screen.active [data-buddy][data-reaction="' + type + '"]:visible, #characterReaction[data-reaction="' + type + '"]:visible');
}

test('character responds to trades without blocking controls or changing rewards', async ({ page }) => {
  await page.locator('.stock-chip').first().click();
  await page.locator('#btnBuyStock').click();
  await page.locator('#purchaseQty').fill('0');
  await page.locator('#btnPurchase').click();
  await expect(reaction(page, 'think')).toBeVisible();
  const cash = await page.evaluate(() => getBalance());
  await page.locator('#purchaseQty').fill('1');
  await page.locator('#btnPurchase').click();
  await expect(page.locator('#purchaseMessage')).toContainText('Успех');
  await expect(reaction(page, 'buy')).toBeVisible();
  expect(await page.evaluate(() => getPortfolio().stocks[0].quantity)).toBe(1);
  expect(await page.evaluate(() => getBalance())).toBeLessThan(cash);
  // Decorative feedback must not intercept taps on the purchase button.
  expect(await page.locator('#btnPurchase').evaluate(button => {
    const rect = button.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === button;
  })).toBe(true);
  await page.locator('#btnBackPurchase').click();
  await expect(page.locator('#characterReaction')).toBeHidden();
  await page.evaluate(() => showScreen('sell'));
  await page.locator('[data-sell-stock]').first().click();
  await page.locator('#sellSheetConfirm').click();
  await expect(reaction(page, 'sell')).toBeVisible();
  expect(await page.evaluate(() => getPortfolio().stocks.length)).toBe(0);
  await expect(page.locator('#sellMessage')).toContainText('Успех');
});

test('wardrobe and question answers use distinct gestures', async ({ page }) => {
  await page.locator('#btnHomeCharacter').click();
  for (const [key, gesture] of [['hair', 'hair'], ['top', 'pose'], ['shoes', 'shuffle'], ['accessory', 'hair'], ['accessory', 'groove'], ['accessory', 'careful'], ['accessory', 'watch']]) {
    await page.locator('.character-option-row[data-key="' + key + '"]').click();
    await expect(page.locator('#characterAvatarPreview')).toHaveAttribute('data-last-motion', gesture);
  }
  await page.locator('#characterCancel').click();
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="quiz"]').click();
  const correct = await page.evaluate(() => quizState.items[0].correctAnswerIndex);
  await page.locator('#quizContent .quiz-option').nth(correct).click();
  await expect(page.locator('#quizAvatarWrap')).toHaveAttribute('data-last-motion', 'correct');
  await expect(page.locator('#quizAvatarWrap svg')).toHaveCSS('overflow', 'visible');
  await page.locator('#quizNext').click();
  const wrong = await page.evaluate(() => (quizState.items[quizState.index].correctAnswerIndex + 1) % quizState.items[quizState.index].options.length);
  await page.locator('#quizContent .quiz-option').nth(wrong).click();
  await expect(page.locator('#quizAvatarWrap')).toHaveAttribute('data-last-motion', 'think');
});

test('reaction replaces stale timers, fits the viewport and cleans up', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => characterMotion.react('welcome', { anchor: '#btnHomeAnalytics', text: 'Привет!', duration: 1000, floating: true }));
  await page.clock.runFor(400);
  expect(await page.locator('#characterReaction .char-arm-right').getAttribute('transform')).not.toBe('rotate(0 171 172)');
  const bounds = await page.locator('#characterReaction').evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: innerWidth, height: innerHeight };
  });
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
  await page.evaluate(() => characterMotion.react('buy', { anchor: '#btnHomeAnalytics', text: 'Монетка в кармане.', duration: 3000, floating: true }));
  await page.clock.runFor(700);
  await expect(page.locator('#characterReaction')).toBeVisible();
  await expect(page.locator('#characterReaction')).toHaveAttribute('data-reaction', 'buy');
  await page.clock.runFor(2400);
  await expect(page.locator('#characterReaction')).toBeHidden();
  expect(await page.locator('[data-motion]').count()).toBe(0);
});

test('reduced motion keeps feedback readable and navigation cancels it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => characterMotion.react('victory', { anchor: '#btnHomeAnalytics', text: 'Раунд завершён.', floating: true }));
  await expect(page.locator('#characterReaction [role="status"]')).toHaveText('Раунд завершён.');
  await expect(page.locator('[data-motion]')).toHaveCount(0);
  await expect.poll(() => page.locator('#characterReaction').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await page.locator('[data-tab="game"]').click();
  await expect(page.locator('#characterReaction')).toBeHidden();
  await page.locator('[data-tab="game"]').focus();
  await page.evaluate(() => characterMotion.react('careful', { anchor: '#gameCards', text: 'Перерыв.', floating: true }));
  await page.getByRole('button', { name: 'Скрыть реакцию персонажа' }).focus();
  await page.getByRole('button', { name: 'Скрыть реакцию персонажа' }).press('Enter');
  await expect(page.locator('#characterReaction')).toBeHidden();
  await expect(page.locator('[data-tab="game"]')).toBeFocused();
});
