const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  page.gameErrors = [];
  page.on('pageerror', error => page.gameErrors.push(error.message));
  await page.addInitScript(() => { window.RUBLIKS_DEMO_MARKET = true; });
  await page.route('**/api/market/**', route => route.abort());
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#btnOnboardingSkip').click();
  await expect(page.locator('.stock-chip').first()).toBeVisible();
  await page.locator('[data-tab="game"]').click();
});
test.afterEach(async ({ page }) => { expect(page.gameErrors).toEqual([]); });

test.describe('speaking character', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('speech is synchronized with bubble and card hint', async ({ page }) => {
    await page.locator('[data-game="quiz"]').click();
    await page.clock.install();
    await page.locator('#quizGuide .buddy-hint').click({ clickCount: 3 });
    await expect(page.locator('#quizQuestion')).toHaveClass(/buddy-target/);
    await expect(page.locator('#quizAvatarWrap')).toHaveAttribute('data-speaking', 'true');
    const shapes = [];
    for (let i = 0; i < 6; i++) {
      await page.clock.runFor(110);
      shapes.push(await page.locator('#quizAvatarWrap .char-mouth-opening').getAttribute('ry'));
    }
    expect(new Set(shapes).size).toBeGreaterThan(2);
    const words = await page.locator('#quizGuide .buddy-word').count();
    const shown = await page.locator('#quizGuide .is-spoken').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(words);
    await page.locator('#quizGuide .buddy-replay').click();
    await expect(page.locator('#quizAvatarWrap')).not.toHaveAttribute('data-speaking', 'true');
    await expect(page.locator('#quizGuide .is-spoken')).toHaveCount(words);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#quizGuide .buddy-hint').click();
    await expect(page.locator('#quizAvatarWrap')).not.toHaveAttribute('data-speaking', 'true');
    await expect(page.locator('#quizGuide .buddy-word:not(.is-spoken)')).toHaveCount(0);
  });
});

test('rugpull amount presets, comma, cashout and restore', async ({ page }) => {
  await page.locator('[data-game="rugpull"]').click();
  await page.evaluate(() => { Math.random = () => .5; });
  await page.locator('[data-rug-percent="25"]').click();
  await expect(page.locator('#rugpullBet')).toHaveValue('2500');
  await expect(page.locator('.rugpull-presets .active')).toHaveCount(1);
  await page.locator('[data-rug-amount="500"]').click();
  await expect(page.locator('#rugpullBet')).toHaveValue('500');
  await page.locator('#rugpullBet').fill('125,50');
  const main = await page.evaluate(() => getBalance());
  await page.locator('#rugpullInvest').click();
  expect(await page.evaluate(() => getRugpullBalance())).toBe(9874.5);
  await expect(page.locator('#rugpullSell')).toBeInViewport();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { Math.random = () => .5; });
  await page.locator('[data-tab="game"]').click();
  await page.locator('[data-game="rugpull"]').click();
  expect(await page.evaluate(() => rugpullInvested)).toBe(125.5);
  await expect(page.locator('#rugpullPumping')).toBeVisible();
  await page.locator('#rugpullSell').click();
  await expect(page.locator('#rugpullResult')).toContainText('Выведено');
  const after = await page.evaluate(() => getRugpullBalance());
  expect(after).toBeGreaterThanOrEqual(10000);
  await page.evaluate(() => rugpullSell());
  expect(await page.evaluate(() => getRugpullBalance())).toBe(after);
  expect(await page.evaluate(() => getBalance())).toBe(main);
});

test('rugpull invalid amount, crash and fresh training bank', async ({ page }) => {
  await page.locator('[data-game="rugpull"]').click();
  for (const value of ['abc', '0', '-5', '10001']) {
    await page.locator('#rugpullBet').fill(value);
    await page.locator('#rugpullInvest').click();
    await expect(page.locator('#rugpullError')).not.toBeEmpty();
    expect(await page.evaluate(() => getRugpullBalance())).toBe(10000);
  }
  await page.evaluate(() => { Math.random = () => 0; });
  await page.locator('#rugpullBet').fill('10 000');
  await page.locator('#rugpullInvest').click();
  await expect(page.locator('#rugpullCrashed')).toBeVisible();
  await page.locator('#rugpullPlayAgain').click();
  await expect(page.locator('#rugpullInvest')).toBeDisabled();
  await page.locator('#rugpullResetBank').click();
  expect(await page.evaluate(() => getRugpullBalance())).toBe(10000);
  await expect(page.locator('#rugpullBet')).toBeEnabled();
  await expect(page.locator('#rugpullInvest')).toBeEnabled();
});

test('runner keyboard, pointer cancellation and pause', async ({ page }) => {
  await page.clock.install();
  await page.locator('[data-game="runner"]').click();
  await page.locator('#runnerBtnStart').click();
  await page.evaluate(() => { clearInterval(runnerEngine.spawnTimer); runnerEngine.spawnTimer = null; runnerEngine.items = []; });
  await page.keyboard.down('ArrowDown');
  expect(await page.evaluate(() => runnerEngine.isCrouching)).toBe(true);
  await page.keyboard.up('ArrowDown');
  expect(await page.evaluate(() => runnerEngine.isCrouching)).toBe(false);
  await page.keyboard.press('Space');
  await page.clock.runFor(120);
  expect(await page.evaluate(() => runnerEngine.characterY < runnerEngine.groundY)).toBe(true);
  await page.locator('#runnerCrouchBtn').dispatchEvent('pointerdown', { pointerId: 7, button: 0 });
  expect(await page.evaluate(() => runnerEngine.isCrouching)).toBe(true);
  await page.locator('#runnerCrouchBtn').dispatchEvent('pointercancel', { pointerId: 7 });
  expect(await page.evaluate(() => runnerEngine.isCrouching)).toBe(false);
  await page.locator('#runnerCrouchBtn').focus();
  await page.keyboard.down('Enter');
  expect(await page.evaluate(() => runnerEngine.isCrouching)).toBe(true);
  await page.keyboard.up('Enter');
  expect(await page.evaluate(() => runnerEngine.isCrouching)).toBe(false);
  await page.locator('#runnerPauseBtn').focus();
  await page.keyboard.press('Space');
  const paused = await page.evaluate(() => runnerEngine.characterY);
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => runnerEngine.characterY)).toBe(paused);
  expect(await page.evaluate(() => runnerEngine.spawnTimer)).toBeNull();
  await page.locator('#runnerResume').click();
  expect(await page.evaluate(() => runnerEngine.phase)).toBe('playing');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => runnerEngine.phase)).toBe('paused');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#runnerPauseLayer')).toBeVisible();
});

test('runner hitboxes, ducking and one-hit grace period', async ({ page }) => {
  await page.clock.install();
  await page.locator('[data-game="runner"]').click();
  await page.locator('#runnerBtnStart').click();
  await page.evaluate(() => { clearInterval(runnerEngine.spawnTimer); runnerEngine.spawnTimer = null; runnerEngine.items = [{ id: 1, x: .22, y: .78, type: 'coin' }]; });
  await page.clock.runFor(40);
  expect(await page.evaluate(() => runnerEngine.score)).toBe(10);
  await page.keyboard.down('ArrowDown');
  await page.evaluate(() => { runnerEngine.items = [{ id: 2, x: .22, y: runnerEngine.groundY - 57 / runnerEngine.sceneHeight, type: 'minus' }]; });
  await page.clock.runFor(40);
  expect(await page.evaluate(() => runnerEngine.score)).toBe(10);
  await page.keyboard.up('ArrowDown');
  await page.evaluate(() => { runnerEngine.items = [{ id: 3, x: .22, y: runnerEngine.groundY - 57 / runnerEngine.sceneHeight, type: 'minus' }]; });
  await page.clock.runFor(40);
  expect(await page.evaluate(() => runnerEngine.score)).toBe(0);
  await page.evaluate(() => { runnerEngine.items = [1,2,3].map(id => ({ id, x: .22, y: .78, type: 'rock' })); });
  await page.clock.runFor(40);
  expect(await page.evaluate(() => runnerEngine.lives)).toBe(2);
  await page.clock.runFor(900);
  await page.evaluate(() => { runnerEngine.items = [{ id: 4, x: .22, y: .78, type: 'rock' }]; });
  await page.clock.runFor(40);
  expect(await page.evaluate(() => runnerEngine.lives)).toBe(1);
});

test('market quiz allows reading explanations and pauses time', async ({ page }) => {
  await page.clock.install();
  await page.locator('[data-game="victorina"]').click();
  await page.locator('#btnVictorinaStart').click();
  await page.locator('#btnVictorinaPause').click();
  await page.clock.runFor(25000);
  await expect(page.locator('#victorinaTimer')).toHaveText('20');
  await expect(page.locator('#btnVictorina0')).toBeDisabled();
  await page.locator('#btnVictorinaPause').click();
  const answer = await page.evaluate(() => victorinaDeck[0].correct);
  await page.locator('#btnVictorina' + answer).click();
  await page.clock.runFor(6000);
  expect(await page.evaluate(() => victorinaIdx)).toBe(0);
  await expect(page.locator('#victorinaExplain')).toContainText('Верно');
  await page.locator('#btnVictorinaNext').click();
  expect(await page.evaluate(() => victorinaIdx)).toBe(1);
  await expect(page.locator('#victorinaTimer')).toHaveText('20');
  await page.locator('#btnBackVictorinaGame').click();
  expect(await page.evaluate(() => victorinaTimer)).toBeNull();
});

test('question games show results and award statistics once', async ({ page }) => {
  await page.locator('[data-game="quiz"]').click();
  const total = await page.evaluate(() => quizState.items.length);
  const before = await page.evaluate(() => getUserStats().quizCorrectCount);
  const xpBefore = await page.evaluate(() => getVictorinaXp());
  const coinsBefore = await page.evaluate(() => getRublixBalance());
  for (let i = 0; i < total; i++) {
    const correct = await page.evaluate(() => quizState.items[quizState.index].correctAnswerIndex);
    await page.locator('#quizContent .quiz-option').nth(correct).click();
    await expect(page.locator('#quizContent .quiz-option:not(:disabled)')).toHaveCount(0);
    await page.locator('#quizNext').press('Enter');
  }
  await expect(page.locator('#quizContent .quiz-result')).toContainText(total + ' из ' + total);
  await page.evaluate(() => renderQuizStep());
  expect(await page.evaluate(() => getUserStats().quizCorrectCount)).toBe(before + total);
  expect(await page.evaluate(() => getVictorinaXp())).toBe(xpBefore + 20);
  expect(await page.evaluate(() => getRublixBalance())).toBe(coinsBefore + 3);
  expect(await page.evaluate(() => awardPracticeRound('quiz').awarded)).toBe(false);
  await page.locator('#quizAgain').click();
  expect(await page.evaluate(() => quizState.correct)).toBe(0);
  await page.locator('#btnBackQuiz').click();
  await page.locator('[data-game="choice"]').click();
  const count = await page.evaluate(() => DATA.choiceItems.length);
  for (let i = 0; i < count; i++) {
    const correct = await page.evaluate(() => DATA.choiceItems[choiceState.index].correctAnswerIndex);
    await page.locator('#choiceContent .quiz-option').nth(correct).click();
    await page.locator('#choiceNext').click();
  }
  await expect(page.locator('#choiceContent .quiz-result')).toContainText(count + ' из ' + count);
  await page.locator('#choiceClose').click();
  await expect(page.locator('#playWallet')).toContainText('Практика: 2/3');
  expect(await page.evaluate(() => getVictorinaXp())).toBe(xpBefore + 35);
  expect(await page.evaluate(() => getRublixBalance())).toBe(coinsBefore + 5);
});

test('all game views keep the guide and fit the screen', async ({ page }) => {
  for (const game of ['quiz', 'choice', 'runner', 'rugpull', 'victorina']) {
    await page.locator('[data-game="' + game + '"]').click();
    await expect(page.locator('.screen.active [data-buddy]')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (game === 'victorina') {
      await page.locator('#btnVictorinaStart').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await expect(page.locator('#btnVictorinaPause')).toBeInViewport();
    }
    await page.locator('.screen.active .btn-back').first().click();
  }
});
