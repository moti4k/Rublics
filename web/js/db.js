/* Rubliks Web - SQLite (sql.js) с сохранением в IndexedDB */

(function (global) {
  'use strict';

  var db = null;
  var SQL = null;
  var initPromise = null;
  var IDB_NAME = 'RubliksSqlite';
  var IDB_STORE = 'database';
  var IDB_VERSION = 1;

  function ensureDb() {
    return !!db;
  }

  function createTables() {
    db.run('CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, display_name TEXT, created_at TEXT)');
    db.run('CREATE TABLE IF NOT EXISTS friends (id TEXT PRIMARY KEY, name TEXT NOT NULL, balance_rub REAL DEFAULT 0, videos_watched INTEGER DEFAULT 0, quiz_correct INTEGER DEFAULT 0)');
    db.run('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
  }

  function migrateFromLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      var v = localStorage.getItem('rubliks_accounts');
      if (v) {
        var accounts = JSON.parse(v);
        for (var i = 0; i < accounts.length; i++) {
          var a = accounts[i];
          db.run('INSERT OR REPLACE INTO accounts (email, password, display_name, created_at) VALUES (?, ?, ?, ?)',
            [a.email, a.password, a.displayName || a.display_name || '', a.createdAt || a.created_at || '']);
        }
      }
      var keys = ['rubliks_current_user', 'rubliks_character_appearance', 'rubliks_subscription_id', 'rubliks_balance', 'rubliks_portfolio', 'rubliks_rugpull_balance', 'rubliks_friends', 'rubliks_user_videos_watched', 'rubliks_user_quiz_correct'];
      var kvKeys = ['currentUser', 'characterAppearance', 'subscriptionId', 'balance', 'portfolio', 'rugpullBalance', 'userVideosWatched', 'userQuizCorrectCount'];
      if (localStorage.getItem('rubliks_current_user')) setKv('currentUser', localStorage.getItem('rubliks_current_user'));
      if (localStorage.getItem('rubliks_character_appearance')) setKv('characterAppearance', localStorage.getItem('rubliks_character_appearance'));
      if (localStorage.getItem('rubliks_subscription_id')) setKv('subscriptionId', localStorage.getItem('rubliks_subscription_id'));
      if (localStorage.getItem('rubliks_balance')) setKv('balance', localStorage.getItem('rubliks_balance'));
      if (localStorage.getItem('rubliks_portfolio')) setKv('portfolio', localStorage.getItem('rubliks_portfolio'));
      if (localStorage.getItem('rubliks_rugpull_balance')) setKv('rugpullBalance', localStorage.getItem('rubliks_rugpull_balance'));
      var vw = localStorage.getItem('rubliks_user_videos_watched');
      var qc = localStorage.getItem('rubliks_user_quiz_correct');
      if (vw != null || qc != null) setKv('userStats', JSON.stringify({ videosWatched: parseInt(vw || '0', 10) || 0, quizCorrectCount: parseInt(qc || '0', 10) || 0 }));
      var friendsStr = localStorage.getItem('rubliks_friends');
      if (friendsStr) {
        var list = JSON.parse(friendsStr);
        for (var j = 0; j < list.length; j++) {
          var f = list[j];
          db.run('INSERT OR REPLACE INTO friends (id, name, balance_rub, videos_watched, quiz_correct) VALUES (?, ?, ?, ?, ?)',
            [f.id || '', f.name || '', f.balanceRub || 0, f.videosWatched || 0, f.quizCorrectCount || 0]);
        }
      }
      if (localStorage.getItem('runnerInvestorBest')) setKv('runnerBest', localStorage.getItem('runnerInvestorBest'));
    } catch (e) { /* ignore */ }
  }

  function loadFromIndexedDB() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = function (e) {
          if (!e.target.result.objectStoreNames.contains(IDB_STORE)) {
            e.target.result.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = function (e) {
          var idb = e.target.result;
          var tx = idb.transaction(IDB_STORE, 'readonly');
          var store = tx.objectStore(IDB_STORE);
          var getReq = store.get('sqlite');
          getReq.onsuccess = function () {
            idb.close();
            resolve(getReq.result || null);
          };
          getReq.onerror = function () {
            idb.close();
            reject(getReq.error);
          };
        };
        req.onerror = function () { reject(req.error); };
      } catch (err) {
        reject(err);
      }
    });
  }

  function saveToIndexedDB(buffer) {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onsuccess = function (e) {
          var idb = e.target.result;
          var tx = idb.transaction(IDB_STORE, 'readwrite');
          var store = tx.objectStore(IDB_STORE);
          store.put(buffer, 'sqlite');
          tx.oncomplete = function () {
            idb.close();
            resolve();
          };
          tx.onerror = function () {
            idb.close();
            reject(tx.error);
          };
        };
        req.onerror = function () { reject(req.error); };
      } catch (err) {
        reject(err);
      }
    });
  }

  function persist() {
    if (!db) return Promise.resolve();
    try {
      var data = db.export();
      return saveToIndexedDB(data);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = (async function () {
      try {
        if (typeof initSqlJs === 'undefined') return;
        SQL = await initSqlJs({
          locateFile: function (file) {
            return 'vendor/' + file;
          }
        });
        var buffer = await loadFromIndexedDB();
        if (buffer && buffer.byteLength > 0) {
          db = new SQL.Database(new Uint8Array(buffer));
        } else {
          db = new SQL.Database();
          createTables();
          migrateFromLocalStorage();
          await persist();
        }
      } catch (e) {
        console.warn('SQLite init failed, using fallback:', e);
        db = null;
      }
      return undefined;
    })();
    return initPromise;
  }

  function getKv(key) {
    if (!ensureDb()) return null;
    try {
      var stmt = db.prepare('SELECT value FROM kv WHERE key = ?');
      stmt.bind([key]);
      var value = null;
      if (stmt.step()) value = stmt.get()[0];
      stmt.free();
      return value;
    } catch (e) { return null; }
  }

  function setKv(key, value) {
    if (!ensureDb()) return;
    try {
      db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value != null ? String(value) : null]);
      persist();
    } catch (e) { /* ignore */ }
  }

  // ——— Accounts ———
  function getAccounts() {
    if (!ensureDb()) return [];
    try {
    var result = [];
    var stmt = db.prepare('SELECT email, password, display_name, created_at FROM accounts');
    while (stmt.step()) {
      var row = stmt.getAsObject();
      result.push({
        email: row.email,
        password: row.password,
        displayName: row.display_name,
        createdAt: row.created_at
      });
    }
    stmt.free();
    return result;
    } catch (e) { return []; }
  }

  function saveAccounts(accounts) {
    if (!ensureDb()) return;
    try {
    db.run('DELETE FROM accounts');
    var stmt = db.prepare('INSERT INTO accounts (email, password, display_name, created_at) VALUES (?, ?, ?, ?)');
    for (var i = 0; i < accounts.length; i++) {
      var a = accounts[i];
      stmt.run([a.email, a.password, a.displayName || a.display_name || '', a.createdAt || a.created_at || '']);
    }
    stmt.free();
    persist();
    } catch (e) { /* ignore */ }
  }

  // ——— Current user ———
  function getCurrentUser() {
    var v = getKv('currentUser');
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(profile) {
    setKv('currentUser', profile ? JSON.stringify(profile) : null);
  }

  // ——— Character appearance ———
  function getCharacterAppearanceJson() {
    return getKv('characterAppearance');
  }

  function setCharacterAppearanceJson(json) {
    setKv('characterAppearance', json);
  }

  // ——— Subscription ———
  function getSubscriptionId() {
    return getKv('subscriptionId') || 'free';
  }

  function setSubscriptionId(id) {
    setKv('subscriptionId', id || 'free');
  }

  // ——— User stats ———
  function getUserStatsJson() {
    var v = getKv('userStats');
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch (e) {
      return null;
    }
  }

  function setUserStatsJson(json) {
    setKv('userStats', json ? JSON.stringify(json) : null);
  }

  // ——— Friends ———
  function getFriendsList() {
    if (!ensureDb()) return [];
    try {
    var result = [];
    var stmt = db.prepare('SELECT id, name, balance_rub, videos_watched, quiz_correct FROM friends');
    while (stmt.step()) {
      var row = stmt.getAsObject();
      result.push({
        id: row.id,
        name: row.name,
        balanceRub: row.balance_rub,
        videosWatched: row.videos_watched,
        quizCorrectCount: row.quiz_correct
      });
    }
    stmt.free();
    return result;
    } catch (e) { return []; }
  }

  function setFriendsList(list) {
    if (!ensureDb()) return;
    try {
    db.run('DELETE FROM friends');
    var stmt = db.prepare('INSERT INTO friends (id, name, balance_rub, videos_watched, quiz_correct) VALUES (?, ?, ?, ?, ?)');
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      stmt.run([
        f.id || '',
        f.name || '',
        f.balanceRub != null ? f.balanceRub : 0,
        f.videosWatched != null ? f.videosWatched : 0,
        f.quizCorrectCount != null ? f.quizCorrectCount : 0
      ]);
    }
    stmt.free();
    persist();
    } catch (e) { /* ignore */ }
  }

  // ——— Balance, portfolio, rugpull, runner best ———
  function getBalance() {
    var v = getKv('balance');
    return v != null ? parseFloat(v) : null;
  }

  function setBalance(value) {
    setKv('balance', value != null ? String(value) : null);
  }

  function getPortfolioJson() {
    return getKv('portfolio');
  }

  function setPortfolioJson(json) {
    setKv('portfolio', json);
  }

  function getRugpullBalance() {
    var v = getKv('rugpullBalance');
    return v != null ? parseFloat(v) : null;
  }

  function setRugpullBalance(value) {
    setKv('rugpullBalance', value != null ? String(value) : null);
  }

  function getRunnerBest() {
    var v = getKv('runnerBest');
    return v != null ? parseInt(v, 10) : null;
  }

  function setRunnerBest(value) {
    setKv('runnerBest', value != null ? String(value) : null);
  }

  global.db = {
    init: init,
    getAccounts: getAccounts,
    saveAccounts: saveAccounts,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    getCharacterAppearanceJson: getCharacterAppearanceJson,
    setCharacterAppearanceJson: setCharacterAppearanceJson,
    getSubscriptionId: getSubscriptionId,
    setSubscriptionId: setSubscriptionId,
    getUserStatsJson: getUserStatsJson,
    setUserStatsJson: setUserStatsJson,
    getFriendsList: getFriendsList,
    setFriendsList: setFriendsList,
    getBalance: getBalance,
    setBalance: setBalance,
    getPortfolioJson: getPortfolioJson,
    setPortfolioJson: setPortfolioJson,
    getRugpullBalance: getRugpullBalance,
    setRugpullBalance: setRugpullBalance,
    getRunnerBest: getRunnerBest,
    setRunnerBest: setRunnerBest
  };
})(typeof window !== 'undefined' ? window : this);
