/* Rubliks Web — работа с бэкендом: авторизация и друзья */

(function (global) {
  'use strict';

  var API_BASE_KEY = 'rubliks_api_base';

  function readApiBase() {
    try {
      var params = typeof global.location !== 'undefined' && global.location.search ? global.location.search : '';
      var match = /[?&]api=([^&]+)/.exec(params);
      if (match) {
        var fromQuery = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim().replace(/\/$/, '');
        if (fromQuery && typeof localStorage !== 'undefined') {
          localStorage.setItem(API_BASE_KEY, fromQuery);
        }
        return fromQuery;
      }
      if (typeof localStorage !== 'undefined') {
        var stored = localStorage.getItem(API_BASE_KEY);
        if (stored && stored.trim()) return stored.trim().replace(/\/$/, '');
      }
    } catch (e) {}
    if (typeof global.API_BASE_URL === 'string') {
      return global.API_BASE_URL.trim().replace(/\/$/, '');
    }
    return '';
  }

  var API_BASE = readApiBase();
  // '' = тот же хост (фронт и API с одного сервера)

  var TOKEN_KEY = 'rubliks_api_token';
  var cachedUser = null;

  function setApiBase(url) {
    var base = (url || '').trim().replace(/\/$/, '');
    if (typeof localStorage !== 'undefined') {
      if (base) localStorage.setItem(API_BASE_KEY, base);
      else localStorage.removeItem(API_BASE_KEY);
    }
    API_BASE = base;
  }

  function getToken() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    } catch (e) { return null; }
  }

  function setToken(token) {
    try {
      if (typeof localStorage !== 'undefined') {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {}
  }

  function clearUserCache() {
    cachedUser = null;
  }

  var NETWORK_ERR_MSG = 'Не удалось подключиться к серверу. Запустите сервер (в папке server: npm start) и обновите страницу.';

  function request(method, path, body, useAuth) {
    var base = API_BASE;
    if (base === undefined || (base === '' && (typeof location === 'undefined' || location.protocol === 'file:')))
      return Promise.reject(new Error('API_BASE_URL not set'));
    var url = base === '' ? path : base + path;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 10000);
    var opts = { method: method, headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
    if (useAuth !== false) {
      var t = getToken();
      if (t) opts.headers['Authorization'] = 'Bearer ' + t;
    }
    if (body != null && (method === 'POST' || method === 'PUT' || method === 'PATCH')) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function (r) {
      if (r.status === 401 && useAuth !== false) { setToken(null); cachedUser = null; }
      var contentType = r.headers.get('Content-Type') || '';
      if (contentType.indexOf('application/json') !== -1) return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
      return r.text().then(function (text) { return { ok: r.ok, status: r.status, data: { error: text || 'Ошибка' } }; });
    }).catch(function (err) {
      var msg = err && err.message ? String(err.message) : '';
      if (err.name === 'AbortError' || !msg || msg === 'Failed to fetch' || msg === 'Load failed' || msg.indexOf('NetworkError') !== -1 || msg.indexOf('Network request failed') !== -1) {
        throw new Error(NETWORK_ERR_MSG);
      }
      throw err;
    }).finally(function () { clearTimeout(timer); });
  }

  function register(email, password, displayName) {
    return request('POST', '/api/register', { email: email, password: password, displayName: displayName }, false).then(function (res) {
      if (!res.ok) throw new Error(res.data && res.data.error ? res.data.error : 'Ошибка регистрации');
      setToken(res.data.token);
      cachedUser = res.data.user;
      return res.data.user;
    });
  }

  function login(email, password) {
    return request('POST', '/api/login', { email: email, password: password }, false).then(function (res) {
      if (!res.ok) throw new Error(res.data && res.data.error ? res.data.error : 'Ошибка входа');
      setToken(res.data.token);
      cachedUser = res.data.user;
      return res.data.user;
    });
  }

  function logout() {
    var t = getToken();
    if (t) request('POST', '/api/logout', null).catch(function () {});
    setToken(null);
    cachedUser = null;
  }

  function getMe() {
    return request('GET', '/api/me').then(function (res) {
      if (!res.ok) return null;
      cachedUser = res.data;
      return res.data;
    });
  }

  function getCurrentUserSync() {
    return cachedUser;
  }

  function getFriends() {
    return request('GET', '/api/friends').then(function (res) {
      if (!res.ok) return [];
      return res.data;
    });
  }

  function syncMyStats(data) {
    var body = {
      balance: data.balanceRub != null ? data.balanceRub : data.balance,
      videosWatched: data.videosWatched,
      quizCorrectCount: data.quizCorrectCount
    };
    if (data.investorLevel != null) body.investorLevel = data.investorLevel;
    return request('PATCH', '/api/me', body).then(function (res) { return res.ok; }).catch(function () { return false; });
  }

  function patchMe(partial) {
    return request('PATCH', '/api/me', partial || {}).then(function (res) {
      return res.ok ? res.data : null;
    }).catch(function () { return null; });
  }

  function postQuizComplete(payload) {
    return request('POST', '/api/game/quiz/complete', payload || {}).then(function (res) {
      return { ok: res.ok, status: res.status, data: res.data };
    });
  }

  function fetchPortfolio() {
    return request('GET', '/api/portfolio').then(function (res) {
      if (!res.ok || !res.data || !res.data.portfolio) return null;
      return res.data.portfolio;
    });
  }

  function patchPortfolio(portfolio) {
    return request('PATCH', '/api/portfolio', { portfolio: portfolio || { stocks: [], crypto: [], futuresValueRub: 0 } }).then(function (res) {
      return res.ok ? res.data : null;
    });
  }

  function addFriend(email) {
    return request('POST', '/api/friends', { email: email }).then(function (res) {
      if (!res.ok) throw new Error(res.data && res.data.error ? res.data.error : 'Не удалось добавить');
      return res.data.friend;
    });
  }

  function isUsingBackend() {
    if (typeof global.RUBLIKS_LOCAL_ONLY !== 'undefined' && global.RUBLIKS_LOCAL_ONLY) return false;
    return API_BASE === '' ? (typeof location !== 'undefined' && location.protocol !== 'file:') : (API_BASE.length > 0);
  }

  global.authApi = {
    getToken: getToken,
    setToken: setToken,
    clearUserCache: clearUserCache,
    setApiBase: setApiBase,
    getApiBase: function () { return API_BASE; },
    register: register,
    login: login,
    logout: logout,
    getMe: getMe,
    getCurrentUserSync: getCurrentUserSync,
    getFriends: getFriends,
    syncMyStats: syncMyStats,
    patchMe: patchMe,
    postQuizComplete: postQuizComplete,
    fetchPortfolio: fetchPortfolio,
    patchPortfolio: patchPortfolio,
    addFriend: addFriend,
    isUsingBackend: isUsingBackend
  };
})(typeof window !== 'undefined' ? window : this);
