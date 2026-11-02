const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.addInitScript(() => { window.RUBLIKS_DEMO_MARKET = true; });
  await page.route(/https:\/\/fonts\./, route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('/');
  await page.locator('#btnOnboardingSkip').click();
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('home learning mission, six checkpoints, rewards once and progress persistence', async ({ page }) => {
  const lesson = page.locator('#homeLearningMission .learning-card');
  await expect(lesson).toBeVisible();
  expect(await lesson.evaluate(e => e.getBoundingClientRect().top)).toBeLessThan(900);
  await lesson.click();
  await expect(page.locator('#articleView h1')).toHaveText('Что на самом деле даёт акция?');
  await page.locator('[data-lesson-answer="0"]').click();
  await expect(page.locator('.lesson-feedback')).toContainText('Попробуй ещё раз');
  expect(await page.evaluate(() => learning.completed())).toBe(0);
  const original = await page.evaluate(() => ({ xp: getVictorinaXp(), wallet: getRublixBalance() }));
  for (let i = 0; i < 6; i++) {
    const correct = await page.evaluate(() => DATA.newsArticles.find(a => a.id === document.getElementById('articleView').dataset.lesson).question.correct);
    await page.locator('[data-lesson-answer="' + correct + '"]').click();
    await expect(page.locator('.lesson-feedback')).toContainText('+10 XP');
    await expect(page.locator('.lesson-answer:enabled')).toHaveCount(0);
    if (i < 5) await page.locator('[data-next-lesson]').click();
  }
  expect(await page.evaluate(() => learning.completed())).toBe(6);
  expect(await page.evaluate(() => getVictorinaXp())).toBe(original.xp + 60);
  expect(await page.evaluate(() => getRublixBalance())).toBe(original.wallet + 6);
  await page.locator('#btnBackArticle').click();
  await expect(page.locator('#screen-home')).toBeVisible();
  await page.reload();
  await page.locator('[data-tab=education]').click();
  await expect(page.locator('.learning-route progress')).toHaveAttribute('value', '6');
  await page.locator('#educationLessons .learning-card').first().click();
  await expect(page.locator('.lesson-answer:enabled')).toHaveCount(0);
  expect(await page.evaluate(() => getVictorinaXp())).toBe(original.xp + 60);
  const isolated = await page.evaluate(() => { setCurrentUser({ email: 'another-learner@example.test' }); return learning.completed(); });
  expect(isolated).toBe(0);
});

test('learning remains readable without guide and leads to actual practice', async ({ page }) => {
  await page.locator('[data-tab=profile]').click();
  await page.locator('[data-guide-mode=off]').click();
  await page.locator('[data-tab=education]').click();
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']) {
    await page.locator('#educationLessons [data-article-id="' + id + '"]').click();
    await expect(page.locator('.lesson-scenario')).toBeVisible();
    await expect(page.locator('.lesson-takeaway')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#btnBackArticle').click();
    await expect(page.locator('#screen-education')).toBeVisible();
  }
  await page.locator('#btnExpert').click();
  await expect(page.locator('#screen-choice')).toBeVisible();
  await expect(page.locator('.choice-option')).toHaveCount(3);
});
