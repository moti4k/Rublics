/* Rubliks — один сервер: API + раздача фронта (одна вкладка, один ngrok) */

const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const WEB_ROOT = path.join(__dirname, '..', 'web');

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
app.use(express.json({ limit: '128kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  if (['POST', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: 'Нужен JSON-объект' });
  }
  if (req.method === 'POST' && (req.path === '/api/register' || req.path === '/api/login' || req.path === '/api/friends')) {
    if (typeof req.body?.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim()) || req.body.email.length > 254) {
      return res.status(400).json({ error: 'Укажите корректный email' });
    }
  }
  if (req.method === 'POST' && (req.path === '/api/register' || req.path === '/api/login')) {
    if (typeof req.body.password !== 'string' || req.body.password.length > 72 ||
        (req.body.displayName != null && typeof req.body.displayName !== 'string') ||
        (req.body.display_name != null && typeof req.body.display_name !== 'string')) {
      return res.status(400).json({ error: 'Некорректные данные аккаунта' });
    }
  }
  if (req.path === '/api/me' && req.method === 'PATCH') {
    for (const key of ['balance', 'balanceRub', 'videosWatched', 'quizCorrectCount']) {
      if (req.body[key] != null && (typeof req.body[key] !== 'number' || !Number.isFinite(req.body[key]) || req.body[key] < 0)) {
        return res.status(400).json({ error: 'Некорректная статистика' });
      }
      if (['videosWatched', 'quizCorrectCount'].includes(key) && req.body[key] != null && !Number.isSafeInteger(req.body[key])) {
        return res.status(400).json({ error: 'Счётчик должен быть целым числом' });
      }
    }
    if (req.body.investorLevel != null && !['novice', 'explorer', 'pro'].includes(req.body.investorLevel)) {
      return res.status(400).json({ error: 'Некорректный уровень' });
    }
  }
  next();
});

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const userId = db.getUserIdByToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  req.userId = userId;
  next();
}

app.use('/api/market', require('./market'));

// POST /api/register — регистрация, возвращает user + token
app.post('/api/register', (req, res) => {
  const email = (req.body.email || '').trim();
  const password = req.body.password;
  const displayName = (req.body.displayName || req.body.display_name || '').trim();
  if (!email) return res.status(400).json({ error: 'Укажите email' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'Пароль не менее 4 символов' });
  if (db.getUserByEmail(email)) return res.status(409).json({ error: 'Такой email уже зарегистрирован' });
  const hash = bcrypt.hashSync(password, 10);
  const userId = db.createUser(email, hash, displayName || email);
  const token = db.createSession(userId);
  const user = db.getUserById(userId);
  res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at },
    token
  });
});

// POST /api/login — вход с любого устройства, возвращает user + token
app.post('/api/login', (req, res) => {
  const email = (req.body.email || '').trim();
  const password = req.body.password;
  if (!email || !password) return res.status(400).json({ error: 'Укажите email и пароль' });
  const user = db.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const token = db.createSession(user.id);
  res.json({
    user: { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at },
    token
  });
});

// POST /api/logout — выход с текущего устройства
app.post('/api/logout', authMiddleware, (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  db.deleteSession(token);
  res.json({ ok: true });
});

// GET /api/me — текущий пользователь по токену
app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
  const today = db.todayUtcYmd();
  const ymd = user.victorina_ymd || '';
  const plays = user.victorina_plays != null ? user.victorina_plays : 0;
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
    balanceRub: user.balance_rub,
    videosWatched: user.videos_watched,
    quizCorrectCount: user.quiz_correct,
    investorLevel: user.investor_level || 'novice',
    victorinaYmd: ymd,
    victorinaPlaysToday: ymd === today ? plays : 0
  });
});

// GET /api/portfolio — демо-портфель пользователя (JSON)
app.get('/api/portfolio', authMiddleware, (req, res) => {
  const p = db.getPortfolioObjectForUser(req.userId);
  res.json({ portfolio: p });
});

// PATCH /api/portfolio — сохранить портфель
app.patch('/api/portfolio', authMiddleware, (req, res) => {
  const body = req.body || {};
  const portfolio = body.portfolio;
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) {
    return res.status(400).json({ error: 'Нужен объект portfolio' });
  }
  function validHoldings(h) {
    if (!h || typeof h !== 'object' || Array.isArray(h)) return false;
    const finitePositive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
    for (const [key, symbol, amount] of [['stocks', 'ticker', 'quantity'], ['crypto', 'symbol', 'amount']]) {
      if (h[key] == null) continue;
      if (!Array.isArray(h[key]) || h[key].length > 200) return false;
      const seen = new Set();
      for (const row of h[key]) {
        if (!row || typeof row[symbol] !== 'string' || !/^[A-Z0-9._-]{1,32}$/.test(row[symbol]) || !finitePositive(row[amount]) || seen.has(row[symbol])) return false;
        seen.add(row[symbol]);
      }
    }
    return h.futuresValueRub == null || (typeof h.futuresValueRub === 'number' && Number.isFinite(h.futuresValueRub) && h.futuresValueRub >= 0);
  }
  if (portfolio.v === 2 && Array.isArray(portfolio.accounts)) {
    if (!portfolio.accounts.length || portfolio.accounts.length > 5 || portfolio.accounts.some(a => !a || typeof a !== 'object' || typeof a.id !== 'string' || !Number.isFinite(a.balanceRub) || a.balanceRub < 0 || !a.holdings || typeof a.holdings !== 'object')) {
      return res.status(400).json({ error: 'Некорректные счета портфеля' });
    }
    const ids = portfolio.accounts.map(a => a.id);
    if (new Set(ids).size !== ids.length || ids.some(id => !id || id.length > 100) ||
        (portfolio.activeId != null && !ids.includes(portfolio.activeId)) ||
        portfolio.accounts.some(a => !validHoldings(a.holdings) || (a.name != null && (typeof a.name !== 'string' || a.name.length > 100)))) {
      return res.status(400).json({ error: 'Некорректные позиции или идентификаторы счетов' });
    }
    portfolio.accounts.forEach((a) => {
      if (!a.holdings) a.holdings = { stocks: [], crypto: [], futuresValueRub: 0 };
      if (!Array.isArray(a.holdings.stocks)) a.holdings.stocks = [];
      if (!Array.isArray(a.holdings.crypto)) a.holdings.crypto = [];
      if (a.holdings.futuresValueRub == null) a.holdings.futuresValueRub = 0;
    });
    if (!portfolio.activeId && portfolio.accounts[0]) portfolio.activeId = portfolio.accounts[0].id;
    db.updateUserStats(req.userId, { portfolioJson: portfolio });
    return res.json({ ok: true, portfolio });
  }
  if (portfolio.v === 2 || !validHoldings(portfolio)) return res.status(400).json({ error: 'Некорректный портфель' });
  if (!Array.isArray(portfolio.stocks)) portfolio.stocks = [];
  if (!Array.isArray(portfolio.crypto)) portfolio.crypto = [];
  if (portfolio.futuresValueRub == null) portfolio.futuresValueRub = 0;
  db.updateUserStats(req.userId, { portfolioJson: portfolio });
  res.json({ ok: true, portfolio });
});

// PATCH /api/me — обновить баланс и статистику (для рейтинга друзей)
app.patch('/api/me', authMiddleware, (req, res) => {
  const body = req.body || {};
  const patch = {
    balanceRub: body.balance != null ? body.balance : body.balanceRub,
    videosWatched: body.videosWatched,
    quizCorrectCount: body.quizCorrectCount
  };
  if (body.investorLevel != null) patch.investorLevel = body.investorLevel;
  db.updateUserStats(req.userId, patch);
  res.json({ ok: true });
});

// POST /api/game/quiz/complete — завершение раунда викторины (лимит на сервере см. db.VICTORINA_DAILY_LIMIT_SERVER)
app.post('/api/game/quiz/complete', authMiddleware, (req, res) => {
  const body = req.body || {};
  const correctCount = parseInt(body.correctCount, 10);
  if (!Number.isInteger(body.correctCount) || correctCount < 0 || correctCount > 10) {
    return res.status(400).json({ error: 'Результат должен быть от 0 до 10' });
  }
  const won = body.won === true || body.won === 'true';
  const rec = db.tryRecordVictorinaPlay(req.userId);
  if (!rec.ok) {
    const lim = rec.limit != null ? rec.limit : 25;
    return res.status(429).json({
      error: `Дневной лимит викторины на сервере (${lim} игр) исчерпан`,
      playsToday: rec.playsToday,
      limit: lim
    });
  }
  if (!isNaN(correctCount) && correctCount > 0) db.addQuizCorrect(req.userId, correctCount);
  res.json({
    ok: true,
    playsToday: rec.playsToday,
    limit: rec.limit != null ? rec.limit : 25,
    won,
    correctCount: isNaN(correctCount) ? 0 : correctCount
  });
});

// GET /api/friends — список друзей
app.get('/api/friends', authMiddleware, (req, res) => {
  const list = db.getFriends(req.userId);
  res.json(list);
});

// POST /api/friends — добавить друга по email (взаимная дружба)
app.post('/api/friends', authMiddleware, (req, res) => {
  const email = (req.body.email || '').trim();
  const result = db.addFriend(req.userId, email);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true, friend: result.friend });
});

// Фронт с того же сервера (одна вкладка, один ngrok)
app.use(express.static(WEB_ROOT));
app.get('*', (req, res, next) => {
  if (req.path.indexOf('/api') === 0) return next();
  res.sendFile(path.join(WEB_ROOT, 'index.html'));
});
app.use('/api', (req, res) => res.status(404).json({ error: 'API не найден' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status && err.status < 500 ? err.status : 500).json({ error: err.status === 400 ? 'Некорректный JSON' : 'Не удалось выполнить запрос' });
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log('Rubliks: http://localhost:' + PORT + ' (фронт + API)');
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
