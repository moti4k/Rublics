const { test, expect } = require('@playwright/test');
test('API validates input and saves an isolated portfolio', async ({ request }) => {
  const email = 'api-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '@example.test';
  expect((await request.post('/api/register', { data: { email: {}, password: [] } })).status()).toBe(400);
  const created = await request.post('/api/register', { data: { email, password: 'test-password', displayName: 'API Test' } });
  expect(created.status()).toBe(201);
  const { token } = await created.json();
  const headers = { Authorization: 'Bearer ' + token };
  expect((await request.get('/api/me', { headers })).status()).toBe(200);
  expect((await request.get('/api/friends', { headers })).status()).toBe(200);
  const portfolio = { v: 2, activeId: 'main', accounts: [{ id: 'main', name: 'Test', balanceRub: 1234, holdings: { stocks: [], crypto: [], futuresValueRub: 0 } }] };
  expect((await request.patch('/api/portfolio', { headers, data: { portfolio } })).status()).toBe(200);
  expect((await (await request.get('/api/portfolio', { headers })).json()).portfolio).toEqual(portfolio);
  expect((await request.patch('/api/portfolio', { headers, data: { portfolio: { v: 2, accounts: [null] } } })).status()).toBe(400);
  expect((await request.post('/api/game/quiz/complete', { headers, data: { correctCount: 100000 } })).status()).toBe(400);
  expect((await request.post('/api/logout', { headers })).status()).toBe(200);
  expect((await request.get('/api/me', { headers })).status()).toBe(401);
});

test('API rejects corrupt positions, isolates users and enforces quiz limit', async ({ request }) => {
  async function account(suffix) {
    const email = 'case-' + Date.now() + Math.random().toString(36).slice(2) + suffix + '@example.test';
    const response = await request.post('/api/register', { data: { email, password: 'test-password' } });
    expect(response.status()).toBe(201);
    const data = await response.json();
    return { email, headers: { Authorization: 'Bearer ' + data.token } };
  }
  const one = await account('a');
  const two = await account('b');
  for (const portfolio of [
    { stocks: [{ ticker: 'SBER', quantity: -1 }] },
    { stocks: [null] },
    { crypto: [{ symbol: 'BTC', amount: 'oops' }] },
    { v: 2, accounts: [{ id: 'x', balanceRub: 0, holdings: {} }], activeId: 'missing' },
    { v: 2, accounts: [{ id: 'x', balanceRub: 0, holdings: {} }, { id: 'x', balanceRub: 0, holdings: {} }] }
  ]) {
    expect((await request.patch('/api/portfolio', { headers: one.headers, data: { portfolio } })).status()).toBe(400);
  }
  expect((await request.patch('/api/me', { headers: one.headers, data: { videosWatched: .5 } })).status()).toBe(400);
  await request.patch('/api/me', { headers: one.headers, data: { balance: 500 } });
  expect((await (await request.get('/api/me', { headers: two.headers })).json()).balanceRub).toBe(133081.3);
  expect((await request.post('/api/friends', { headers: one.headers, data: { email: two.email } })).status()).toBe(200);
  expect((await (await request.get('/api/friends', { headers: two.headers })).json())).toHaveLength(1);
  expect((await request.post('/api/friends', { headers: one.headers, data: { email: one.email } })).status()).toBe(400);
  for (let i = 0; i < 25; i++) {
    expect((await request.post('/api/game/quiz/complete', { headers: one.headers, data: { correctCount: 1 } })).status()).toBe(200);
  }
  expect((await request.post('/api/game/quiz/complete', { headers: one.headers, data: { correctCount: 1 } })).status()).toBe(429);
  expect((await (await request.get('/api/me', { headers: one.headers })).json()).quizCorrectCount).toBe(25);
});
