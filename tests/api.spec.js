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
