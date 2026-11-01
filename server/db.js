/* Rubliks backend - SQLite via sql.js (no native bindings, works on Windows) */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let db = null;
let SQL = null;
const dbPath = process.env.RUBLIKS_DB_PATH || path.join(__dirname, 'rubliks.db');

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath + '.tmp', Buffer.from(data), { mode: 0o600 });
    fs.renameSync(dbPath + '.tmp', dbPath);
  } catch (e) {
    throw new Error('Не удалось сохранить базу: ' + e.message);
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id INTEGER NOT NULL REFERENCES users(id),
      friend_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (user_id, friend_id),
      CHECK (user_id != friend_id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)`);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      balance_rub REAL DEFAULT 133081.30,
      videos_watched INTEGER DEFAULT 0,
      quiz_correct INTEGER DEFAULT 0
    )
  `);
}

function ensureUserStatsTable() {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        balance_rub REAL DEFAULT 133081.30,
        videos_watched INTEGER DEFAULT 0,
        quiz_correct INTEGER DEFAULT 0
      )
    `);
    saveDb();
  } catch (e) { /* already exists */ }
}

function migrateUserStatsColumns() {
  if (!db) return;
  const info = db.exec('PRAGMA table_info(user_stats)');
  const cols = (info[0] && info[0].values) ? info[0].values.map(function (r) { return r[1]; }) : [];
  function addCol(sql) {
    try {
      db.run(sql);
      saveDb();
    } catch (e) { /* ignore */ }
  }
  if (cols.indexOf('investor_level') === -1) addCol("ALTER TABLE user_stats ADD COLUMN investor_level TEXT DEFAULT 'novice'");
  if (cols.indexOf('victorina_ymd') === -1) addCol("ALTER TABLE user_stats ADD COLUMN victorina_ymd TEXT DEFAULT ''");
  if (cols.indexOf('victorina_plays') === -1) addCol('ALTER TABLE user_stats ADD COLUMN victorina_plays INTEGER DEFAULT 0');
  if (cols.indexOf('portfolio_json') === -1) addCol('ALTER TABLE user_stats ADD COLUMN portfolio_json TEXT');
}

async function init() {
  if (db) return;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  SQL = await initSqlJs();
  let buffer = null;
  try {
    buffer = fs.readFileSync(dbPath);
  } catch (e) {
    /* file not found */
  }
  if (buffer && buffer.length > 0) {
    db = new SQL.Database(new Uint8Array(buffer));
    ensureUserStatsTable();
    migrateUserStatsColumns();
  } else {
    db = new SQL.Database();
    createTables();
    migrateUserStatsColumns();
    saveDb();
  }
}

function getUserByEmail(email) {
  const norm = String(email).trim().toLowerCase();
  const stmt = db.prepare('SELECT id, email, password_hash, display_name, created_at FROM users WHERE email = ?');
  stmt.bind([norm]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

const DEFAULT_PORTFOLIO_JSON = '{"stocks":[],"crypto":[],"futuresValueRub":0}';

function getUserById(id) {
  const stmt = db.prepare(`
    SELECT u.id, u.email, u.display_name, u.created_at,
           COALESCE(s.balance_rub, 133081.30) as balance_rub,
           COALESCE(s.videos_watched, 0) as videos_watched,
           COALESCE(s.quiz_correct, 0) as quiz_correct,
           COALESCE(s.investor_level, 'novice') as investor_level,
           COALESCE(s.victorina_ymd, '') as victorina_ymd,
           COALESCE(s.victorina_plays, 0) as victorina_plays,
           COALESCE(s.portfolio_json, '') as portfolio_json
    FROM users u
    LEFT JOIN user_stats s ON s.user_id = u.id
    WHERE u.id = ?
  `);
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function updateUserStats(userId, stats) {
  const sel = db.prepare('SELECT balance_rub, videos_watched, quiz_correct, investor_level, victorina_ymd, victorina_plays, portfolio_json FROM user_stats WHERE user_id = ?');
  sel.bind([userId]);
  const row = sel.step() ? sel.getAsObject() : null;
  sel.free();
  let balance = row ? row.balance_rub : 133081.30;
  let vw = row ? row.videos_watched : 0;
  let qc = row ? row.quiz_correct : 0;
  let inv = row && row.investor_level ? row.investor_level : 'novice';
  let vYmd = row && row.victorina_ymd != null ? row.victorina_ymd : '';
  let vPlays = row && row.victorina_plays != null ? row.victorina_plays : 0;
  let portJ = row && row.portfolio_json && String(row.portfolio_json).trim() ? String(row.portfolio_json) : DEFAULT_PORTFOLIO_JSON;
  if (stats.balanceRub != null || stats.balance != null) balance = stats.balanceRub != null ? stats.balanceRub : stats.balance;
  if (stats.videosWatched != null) vw = stats.videosWatched;
  if (stats.quizCorrectCount != null) qc = stats.quizCorrectCount;
  if (stats.investorLevel != null) inv = String(stats.investorLevel);
  if (stats.victorinaYmd != null) vYmd = String(stats.victorinaYmd);
  if (stats.victorinaPlays != null) vPlays = stats.victorinaPlays;
  if (stats.portfolioJson != null) {
    portJ = typeof stats.portfolioJson === 'string' ? stats.portfolioJson : JSON.stringify(stats.portfolioJson);
  }
  db.run(
    'INSERT OR REPLACE INTO user_stats (user_id, balance_rub, videos_watched, quiz_correct, investor_level, victorina_ymd, victorina_plays, portfolio_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, balance, vw, qc, inv, vYmd, vPlays, portJ]
  );
  saveDb();
}

function getPortfolioObjectForUser(userId) {
  const user = getUserById(userId);
  if (!user) return null;
  const raw = user.portfolio_json && String(user.portfolio_json).trim() ? String(user.portfolio_json) : DEFAULT_PORTFOLIO_JSON;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return JSON.parse(DEFAULT_PORTFOLIO_JSON);
    if (o.v === 2 && Array.isArray(o.accounts)) {
      o.accounts.forEach((a) => {
        if (!a.holdings) a.holdings = { stocks: [], crypto: [], futuresValueRub: 0 };
        if (!Array.isArray(a.holdings.stocks)) a.holdings.stocks = [];
        if (!Array.isArray(a.holdings.crypto)) a.holdings.crypto = [];
        if (a.holdings.futuresValueRub == null) a.holdings.futuresValueRub = 0;
      });
      if (!o.activeId && o.accounts[0]) o.activeId = o.accounts[0].id;
      return o;
    }
    if (!Array.isArray(o.stocks)) o.stocks = [];
    if (!Array.isArray(o.crypto)) o.crypto = [];
    if (o.futuresValueRub == null) o.futuresValueRub = 0;
    return o;
  } catch (e) {
    return JSON.parse(DEFAULT_PORTFOLIO_JSON);
  }
}

function todayUtcYmd() {
  return new Date().toISOString().slice(0, 10);
}

/** Учёт лимита викторины / день (демо: 25 для Базового/Про на сервере; бесплатный режим ограничивается в клиенте). */
const VICTORINA_DAILY_LIMIT_SERVER = 25;
function tryRecordVictorinaPlay(userId) {
  const user = getUserById(userId);
  if (!user) return { ok: false, error: 'user' };
  let ymd = user.victorina_ymd || '';
  let plays = user.victorina_plays != null ? user.victorina_plays : 0;
  const today = todayUtcYmd();
  if (ymd !== today) {
    ymd = today;
    plays = 0;
  }
  if (plays >= VICTORINA_DAILY_LIMIT_SERVER) {
    return { ok: false, error: 'limit', playsToday: plays, limit: VICTORINA_DAILY_LIMIT_SERVER };
  }
  plays += 1;
  updateUserStats(userId, { victorinaYmd: ymd, victorinaPlays: plays });
  return { ok: true, playsToday: plays, limit: VICTORINA_DAILY_LIMIT_SERVER };
}

function addQuizCorrect(userId, delta) {
  const user = getUserById(userId);
  if (!user) return;
  const qc = (user.quiz_correct != null ? user.quiz_correct : 0) + (delta || 0);
  updateUserStats(userId, { quizCorrectCount: qc });
}

function createUser(email, passwordHash, displayName) {
  const norm = String(email).trim().toLowerCase();
  const name = String(displayName || norm).trim() || norm;
  db.run('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)', [norm, passwordHash, name]);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const id = stmt.getAsObject().id;
  stmt.free();
  saveDb();
  return id;
}

function createSession(userId) {
  const token = require('crypto').randomBytes(32).toString('hex');
  db.run('INSERT INTO sessions (user_id, token) VALUES (?, ?)', [userId, token]);
  saveDb();
  return token;
}

function deleteSession(token) {
  db.run('DELETE FROM sessions WHERE token = ?', [token]);
  saveDb();
}

function getUserIdByToken(token) {
  if (!token) return null;
  const stmt = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND created_at >= datetime('now', '-30 days')");
  stmt.bind([token]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? row.user_id : null;
}

function getFriends(userId) {
  const stmt = db.prepare(`
    SELECT u.id, u.email, u.display_name,
           COALESCE(s.balance_rub, 133081.30) as balance_rub,
           COALESCE(s.videos_watched, 0) as videos_watched,
           COALESCE(s.quiz_correct, 0) as quiz_correct
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    LEFT JOIN user_stats s ON s.user_id = u.id
    WHERE f.user_id = ?
    ORDER BY u.display_name
  `);
  stmt.bind([userId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows.map(r => ({
    id: String(r.email),
    name: r.display_name || r.email,
    balanceRub: r.balance_rub != null ? r.balance_rub : 0,
    videosWatched: r.videos_watched != null ? r.videos_watched : 0,
    quizCorrectCount: r.quiz_correct != null ? r.quiz_correct : 0
  }));
}

function addFriend(userId, friendEmail) {
  const norm = String(friendEmail).trim().toLowerCase();
  if (!norm) return { ok: false, error: 'Email не указан' };
  const friend = getUserByEmail(norm);
  if (!friend) return { ok: false, error: 'Пользователь с таким email не найден' };
  if (friend.id === userId) return { ok: false, error: 'Нельзя добавить себя' };
  try {
    db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [userId, friend.id]);
    db.run('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)', [friend.id, userId]);
    saveDb();
  } catch (e) {
    if (e.message && e.message.indexOf('UNIQUE') !== -1) return { ok: false, error: 'Уже в друзьях' };
    throw e;
  }
  const stmt = db.prepare('SELECT balance_rub, videos_watched, quiz_correct FROM user_stats WHERE user_id = ?');
  stmt.bind([friend.id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return {
    ok: true,
    friend: {
      id: String(friend.email),
      name: friend.display_name || friend.email,
      balanceRub: row ? row.balance_rub : 133081.30,
      videosWatched: row ? row.videos_watched : 0,
      quizCorrectCount: row ? row.quiz_correct : 0
    }
  };
}

module.exports = {
  init,
  getUserByEmail,
  getUserById,
  createUser,
  createSession,
  deleteSession,
  getUserIdByToken,
  getFriends,
  addFriend,
  updateUserStats,
  tryRecordVictorinaPlay,
  addQuizCorrect,
  todayUtcYmd,
  getPortfolioObjectForUser,
  DEFAULT_PORTFOLIO_JSON
};
