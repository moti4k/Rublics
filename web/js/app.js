/* Rubliks Web - navigation, screens, rug pull game, auth, profile, friends */

let stocks = [];
let currentChartSecid = 'SBER';
let chartScale = 'days';
var stocksFullSortMode = 'movers';
var stocksPollTimer = null;
var stocksPollStarted = false;
var STOCKS_POLL_MS = 25000;
var homeViewMode = 'main';
var portfolioPillMode = 'day';
var currentSecTab = 'overview';
var stocksSearchQuery = '';
var analyticsPortfolioScope = 'all';
var operationsAccountFilter = 'all';
var articleBackScreen = 'home';
var quoteMotionTimer = null;
var orderbookRequestId = 0;

const CRYPTO_PRICES = { BTC: 95000, ETH: 3500 };
var MAIN_TAB_IDS = { home: true, game: true, education: true, friends: true, profile: true };

function ensureChartScaleAllowed() {
  var allowed = typeof subscriptionChartScaleIds === 'function' ? subscriptionChartScaleIds() : ['days'];
  if (allowed.indexOf(chartScale) < 0) chartScale = 'days';
}

function refreshAfterSubscriptionChange() {
  loadStocks().then(function () {
    renderHome();
    var active = document.querySelector('.screen.active');
    if (active && active.id === 'screen-stocks') {
      updateStocksSearchHint();
      renderStocksFull();
    }
    if (active && active.id === 'screen-chart') {
      ensureChartScaleAllowed();
      renderScaleBar();
      loadChart(false);
    }
    if (active && active.id === 'screen-analytics') renderAnalytics();
    if (active && active.id === 'screen-operations') renderOperations();
    if (active && active.id === 'screen-victorina-entry') renderVictorinaEntry();
    renderProfile();
  }).catch(function () {
    renderHome();
    renderProfile();
  });
}

function updateStocksSearchHint() {
  var el = document.getElementById('stocksSearchHint');
  if (!el) return;
  var list = stocks;
  var n = list.length;
  var sub = getCurrentSubscriptionId();
  var subName = sub === 'free' ? 'Бесплатный' : sub === 'basic' ? 'Базовый' : 'Про';
  var q = (stocksSearchQuery || '').trim();
  var base = n ? ('По тарифу «' + subName + '» в ленте ' + n + ' бумаг.') : '';
  el.textContent = base + (q ? ' Фильтр по вводу — список ниже.' : ' Введи тикер или название для поиска.');
}

function showAuth(show) {
  var authEl = document.getElementById('auth-screen');
  var appEl = document.getElementById('app');
  var hint = document.getElementById('authLocalHint');
  if (show) {
    authEl.classList.remove('hidden');
    appEl.classList.add('hidden');
    if (hint) hint.classList.toggle('hidden', typeof RUBLIKS_LOCAL_ONLY === 'undefined' || !RUBLIKS_LOCAL_ONLY);
  } else {
    authEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    if (hint) hint.classList.add('hidden');
  }
}

function showScreen(id) {
  if (!document.getElementById('screen-' + id)) return;
  characterMotion.clear();
  companion.leave();
  if (id !== 'runner' && typeof runnerEngine !== 'undefined' && ['playing', 'paused'].includes(runnerEngine.phase)) {
    runnerStopLoop();
    runnerEngine.phase = 'start';
  }
  if (id !== 'rugpull' && typeof stopRugpullTimer === 'function') stopRugpullTimer();
  if (id !== 'victorina-game' && typeof clearVictorinaTimers === 'function') clearVictorinaTimers();
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  var appEl = document.getElementById('app');
  if (MAIN_TAB_IDS[id]) {
    if (appEl) appEl.classList.remove('hide-tab-bar');
    document.querySelectorAll('.tab-item').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === id);
      if (t.getAttribute('data-tab') === id) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
  } else {
    if (appEl) appEl.classList.add('hide-tab-bar');
    document.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); t.removeAttribute('aria-current'); });
  }
  if (id === 'home') companion.enter(id);
  if (id === 'home') { loadStocks().then(function () { renderHome(); }); }
  else if (id === 'stocks') {
    renderStocksFull();
    loadStocks().then(function () {
      updateStocksSearchHint();
      renderStocksFull();
    });
  }
  else if (id === 'game') renderGameList();
  else if (id === 'education') renderEducation();
  else if (id === 'friends') {
    renderFriends();
    if (typeof authApi !== 'undefined' && authApi.isUsingBackend()) {
      loadStocks().then(function () {
        var totalBalance = typeof getAggregatedWealthRub === 'function'
          ? getAggregatedWealthRub(stocks, CRYPTO_PRICES)
          : (function () {
            var portfolio = getPortfolio();
            var prices = {};
            stocks.forEach(function (s) { prices[s.ticker] = s.price; });
            return getBalance() + totalStocksValue(portfolio, prices) + totalCryptoValue(portfolio, CRYPTO_PRICES);
          })();
        var stats = getUserStats();
        return authApi.syncMyStats({ balanceRub: totalBalance, videosWatched: stats.videosWatched, quizCorrectCount: stats.quizCorrectCount });
      }).then(function () { return authApi.getFriends(); }).then(function (list) { setFriendsCache(list); renderFriends(); }).catch(function () { renderFriends(); });
    } else { loadStocks().then(function () { renderFriends(); }); }
  }
  else if (id === 'analytics') { renderAnalytics(); loadStocks().then(function () { renderAnalytics(); }); }
  else if (id === 'operations') renderOperations();
  else if (id === 'profile') renderProfile();
  else if (id === 'sell') { renderSell(); loadStocks().then(function () { renderSell(); }); }
  else if (id === 'victorina-entry') renderVictorinaEntry();
  else if (id === 'news') renderNewsList();
  else if (id === 'parent') renderParentReport();
  else if (id === 'chart') {
    ensureChartScaleAllowed();
    renderScaleBar();
    updateSecurityChrome();
    setTimeout(function () { loadChart(false); }, 40);
  }
  if (id !== 'home') companion.enter(id);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{ opacity: .65, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
}

function openSecurityScreen(ticker) {
  currentChartSecid = String(ticker || 'SBER').toUpperCase();
  showSecurityTab('overview');
  updateSecurityChrome();
  showScreen('chart');
}

function showSecurityTab(tab) {
  currentSecTab = tab || 'overview';
  document.querySelectorAll('.sec-tab').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-sec-tab') === currentSecTab);
    btn.setAttribute('aria-selected', String(btn.getAttribute('data-sec-tab') === currentSecTab));
    btn.setAttribute('role', 'tab');
  });
  var map = { overview: 'secPanelOverview', orderbook: 'secPanelOrderbook', dividends: 'secPanelDividends', news: 'secPanelNews', events: 'secPanelEvents' };
  Object.keys(map).forEach(function (key) {
    var panel = document.getElementById(map[key]);
    if (panel) panel.classList.toggle('hidden', key !== currentSecTab);
  });
  if (currentSecTab === 'orderbook') refreshSecurityOrderbook();
  else if (currentSecTab === 'dividends') refreshSecurityDividends();
  else if (currentSecTab === 'news') refreshSecurityNews();
  else if (currentSecTab === 'events') refreshSecurityEvents();
}

async function refreshSecurityOrderbook() {
  const requestId = ++orderbookRequestId;
  const ticker = currentChartSecid;
  var wrap = document.getElementById('secOrderbookTable');
  var hint = document.getElementById('secOrderbookHint');
  if (!wrap) return;
  if (hint) hint.textContent = 'Загрузка стакана…';
  wrap.innerHTML = '';
  var list = stocks;
  var s = list.find(function (x) { return x.ticker === currentChartSecid; });
  var last = s ? s.price : null;
  var ob = typeof fetchOrderBook === 'function' ? await fetchOrderBook(currentChartSecid, 15, last) : { bids: [], asks: [], mock: true };
  if (requestId !== orderbookRequestId || ticker !== currentChartSecid) return;
  if (ob.accessRequired) {
    hint.textContent = 'MOEX ограничивает доступ к полному стакану.';
    wrap.innerHTML = '<section class="report-block"><h3>Что показывает стакан?</h3><p class="flow-text">Это ещё не исполненные заявки: покупатели называют свою цену, продавцы — свою. Лучшая цена покупки обычно ниже лучшей цены продажи. Разницу называют спредом.</p><p class="flow-text">В MVP доступны настоящие цены и свечи. Для живого стакана нужен отдельный доступ MOEX; вымышленных заявок здесь нет.</p></section>';
    return;
  }
  if (hint) {
    hint.textContent = ob.mock
      ? 'Тестовый стакан · вымышленные заявки.'
      : ob.unavailable ? 'Стакан временно недоступен. Повтори загрузку вкладки.' : ob.stale ? 'Сохранённый стакан MOEX · данные устарели.' : !ob.bids.length && !ob.asks.length ? 'Сейчас нет открытых заявок. Торговая сессия может быть закрыта.' : 'Заявки MOEX · TQBR · задержка 15 минут. Количество в лотах.';
  }
  function rows(side, arr, cls) {
    var h = '<div class="orderbook-col ' + cls + '"><h4>' + (side === 'bid' ? 'Покупка' : 'Продажа') + '</h4><table class="orderbook-table"><thead><tr><th>Цена</th><th>Лоты</th></tr></thead><tbody>';
    (arr || []).slice(0, 12).forEach(function (r) {
      h += '<tr><td class="price">' + formatMoney(r.price) + '</td><td>' + (r.quantity >= 1000 ? (r.quantity / 1000).toFixed(1) + 'k' : String(Math.round(r.quantity))) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  wrap.innerHTML = '<div class="orderbook-grid">' + rows('bid', ob.bids, 'orderbook-bid') + rows('ask', ob.asks, 'orderbook-ask') + '</div>';
}

function refreshSecurityDividends() {
  var root = document.getElementById('secDividendsRoot');
  if (!root) return;
  root.innerHTML = '<section class="report-block"><h3>Часть прибыли акционерам</h3><p class="flow-text">Компания может направить часть прибыли на дивиденды. Размер и даты утверждаются отдельно; прошлые выплаты не гарантируют будущие.</p><p class="flow-text">В Рубликсе дивиденды пока не начисляются. Актуальный календарь проверяй в раскрытии информации эмитента.</p></section>';

}

function refreshSecurityNews() {
  var root = document.getElementById('secNewsRoot');
  if (!root) return;
  var arts = (DATA.newsArticles || []).filter(function (a) {
    var t = a.tickers;
    if (!t || !t.length) return true;
    return t.indexOf(currentChartSecid) >= 0;
  });
  if (!arts.length) {
    root.innerHTML = '<p class="flow-text">Для ' + escapeHtml(currentChartSecid) + ' пока нет привязанных материалов — открой раздел «Новости» в обучении.</p>';
    return;
  }
  root.innerHTML = '<p class="sec-panel-hint">Материалы с тегом тикера + общие статьи без тегов.</p><div class="sec-news-list">' +
    arts.map(function (a) {
      return '<a href="#" class="article-list-item" data-article-id="' + escapeHtml(a.id) + '"><strong>' + escapeHtml(a.title) + '</strong><p class="meta">' + escapeHtml(a.date) + '</p></a>';
    }).join('') + '</div>';
}

function refreshSecurityEvents() {
  var root = document.getElementById('secEventsRoot');
  if (!root) return;
  var log = typeof getOperationLog === 'function' ? getOperationLog() : [];
  var filtered = log.filter(function (e) {
    if (!e || !e.ticker) return false;
    return String(e.ticker).toUpperCase() === currentChartSecid;
  });
  if (!filtered.length) {
    root.innerHTML = '<p class="flow-text">Пока нет сделок по ' + escapeHtml(currentChartSecid) + '. Купи или продай бумагу — событие появится здесь.</p>';
    return;
  }
  root.innerHTML = '<p class="sec-panel-hint">Журнал сделок (игровой портфель). При нескольких счетах указан счёт сделки.</p><div class="sec-events-list">' +
    filtered.map(function (e) {
      var kind = e.kind === 'sell' ? 'Продажа' : 'Покупка';
      var dt = (e.ts || '').replace('T', ' ').slice(0, 19);
      var line = kind + ' ' + escapeHtml(e.ticker) + (e.quantity != null ? ' · ' + escapeHtml(String(e.quantity)) + ' шт.' : '');
      if (e.price != null) line += ' по ' + formatMoney(e.price) + ' ₽';
      var accLine = '';
      if (e.portfolioId && typeof getPortfolioAccountNameById === 'function') {
        var an = getPortfolioAccountNameById(e.portfolioId);
        if (an) accLine = '<span class="op-portfolio-tag">' + escapeHtml(an) + '</span>';
      }
      return '<div class="op-row"><span>' + escapeHtml(dt) + '</span> ' + accLine + '<br><strong>' + line + '</strong></div>';
    }).join('') + '</div>';
}

function renderAnalytics() {
  var el = document.getElementById('analyticsRoot');
  if (!el) return;
  var list = stocks;
  var prices = {};
  list.forEach(function (s) { prices[s.ticker] = s.price; });
  var portfolio = getPortfolio();
  var bal = getBalance();
  var assets = totalStocksValue(portfolio, prices) + totalCryptoValue(portfolio, CRYPTO_PRICES) + (portfolio.futuresValueRub || 0);
  var totalActive = bal + assets;
  var agg = typeof getAggregatedWealthRub === 'function' ? getAggregatedWealthRub(list, CRYPTO_PRICES) : totalActive;
  var snaps = typeof getPortfolioSnapshots === 'function' ? getPortfolioSnapshots() : [];
  var useAll = analyticsPortfolioScope === 'all';
  var stockCols = ['#3E5B4B', '#D74632', '#E3B640', '#55959A', '#92AC6D', '#C48155'];
  var stockIdx = 0;
  var pieSlices = [];
  var stockRows;
  if (useAll && typeof getMergedStocksHoldingsAllAccounts === 'function') {
    stockRows = getMergedStocksHoldingsAllAccounts();
  } else {
    stockRows = (portfolio.stocks || []).map(function (h) { return { ticker: h.ticker, quantity: h.quantity }; });
  }
  stockRows.forEach(function (h) {
    var v = (h.quantity || 0) * (prices[h.ticker] || 0);
    if (v > 0.005) {
      pieSlices.push({
        label: h.ticker,
        v: v,
        color: stockCols[stockIdx % stockCols.length]
      });
      stockIdx += 1;
    }
  });
  const missing = stockRows.filter(h => !(prices[h.ticker] > 0));
  if (missing.length) {
    el.innerHTML = '<section class="report-block"><h3>Ждём котировки для оценки</h3><p class="flow-text">Акции на месте, но без цены нельзя честно посчитать доли и стоимость.</p><p class="flow-text">Не хватает цен: ' + missing.map(h => escapeHtml(h.ticker)).join(', ') + '.</p><p class="flow-text">Свободно на активном счёте: ' + formatMoney(bal) + ' ₽. Обнови котировки, чтобы продолжить.</p><button type="button" class="btn-secondary" data-refresh-market>Обновить котировки</button></section>';
    return;
  }
  var cashV;
  var cryptoV;
  var futV;
  if (useAll) {
    cashV = typeof getTotalCashAllAccounts === 'function' ? getTotalCashAllAccounts() : bal;
    cryptoV = typeof getAggregatedCryptoValueRub === 'function' ? getAggregatedCryptoValueRub(CRYPTO_PRICES) : 0;
    futV = typeof getAggregatedFuturesValueRub === 'function' ? getAggregatedFuturesValueRub() : 0;
  } else {
    cashV = bal;
    cryptoV = totalCryptoValue(portfolio, CRYPTO_PRICES);
    futV = portfolio.futuresValueRub || 0;
  }
  if (cashV > 0.005) {
    pieSlices.push({ label: 'Свободные средства (рубли)', v: cashV, color: '#94A3B8' });
  }
  if (cryptoV > 0.005) {
    pieSlices.push({ label: 'Криптовалюта', v: cryptoV, color: '#F59E0B' });
  }
  if (futV > 0.005) {
    pieSlices.push({ label: 'Фьючерсы (оценка)', v: futV, color: '#55959A' });
  }
  var totalPie = pieSlices.reduce(function (s, p) { return s + p.v; }, 0);
  let consumed = 0;
  const sectors = pieSlices.map(p => {
    const percentage = totalPie > 0 ? p.v / totalPie * 100 : 0;
    const segment = '<circle cx="50" cy="50" r="40" fill="none" stroke="' + p.color + '" stroke-width="20" pathLength="100" stroke-dasharray="' + percentage + ' ' + (100 - percentage) + '" stroke-dashoffset="' + (-consumed) + '" transform="rotate(-90 50 50)"/>';
    consumed += percentage;
    return segment;
  }).join('');
  const pie = '<svg viewBox="0 0 100 100" role="img" aria-label="Структура портфеля. Суммы и доли перечислены под диаграммой."><circle cx="50" cy="50" r="40" fill="none" stroke="#E3EADF" stroke-width="20"/>' + sectors + '</svg>';
  var snapHtml = snaps.slice(0, 7).map(function (s) {
    return '<li>' + escapeHtml(s.day) + ': ' + formatMoney(s.value) + ' ₽</li>';
  }).join('');
  var freeBanner = getCurrentSubscriptionId() === 'free'
    ? '<div class="analytics-free-banner" role="status"><strong>Тариф «Бесплатный».</strong> Полный журнал операций и расширенные отчёты — на Базовом и Про. Смени план в профиле (демо, без оплаты).</div>'
    : '';
  var scopeBar = '<div class="analytics-scope-bar" role="group" aria-label="Портфель для аналитики">' +
    '<button type="button" class="analytics-scope-btn' + (!useAll ? ' active' : '') + '" data-analytics-scope="active">Активный счёт</button>' +
    '<button type="button" class="analytics-scope-btn' + (useAll ? ' active' : '') + '" data-analytics-scope="all">Все счета</button></div>';
  var summaryActive = '<p class="flow-text">Активный счёт: <strong>' + escapeHtml(typeof getActivePortfolioAccountName === 'function' ? getActivePortfolioAccountName() : '') + '</strong>. Оценка: <strong>' + formatMoney(totalActive) + ' ₽</strong> (деньги + активы).</p>';
  var summaryAll = '<p class="flow-text">На всех счетах: <strong>' + formatMoney(agg) + ' ₽</strong>. Ниже — сколько денег свободно и сколько вложено.</p>';
  var pieTitle = useAll ? 'Структура капитала (все счета)' : 'Структура капитала (активный счёт)';
  var roadmap = '<p class="flow-text subtle" style="margin-top:22px">Здесь показана учебная оценка по доступным котировкам. Реальные дивиденды и купоны не начисляются.</p>';
  el.innerHTML = freeBanner + scopeBar + (useAll ? summaryAll : summaryActive) +
    (!useAll ? '<p class="flow-text subtle">Всего по счетам: <strong>' + formatMoney(agg) + ' ₽</strong> (для друзей и рейтинга).</p>' : '') +
    '<h3 class="subsection-title">' + pieTitle + '</h3>' +
    '<div class="analytics-pie">' + pie + '</div>' +
    (pieSlices.length
      ? '<ul class="flow-text analytics-pie-legend" style="font-size:13px">' + pieSlices.map(function (p) {
        var pct = totalPie > 0 ? Math.round((p.v / totalPie) * 1000) / 10 : 0;
        return '<li><span class="analytics-pie-swatch" style="background:' + p.color + '"></span><span>' + escapeHtml(p.label) + ': ' + formatMoney(p.v) + ' ₽ (' + pct + '%)</span></li>';
      }).join('') + '</ul>'
      : '<p class="flow-text subtle">Нет позиций и остатка на счёте для диаграммы.</p>') +
    '<h3 class="subsection-title">Снимки оценки (раз в день)</h3>' +
    (snapHtml ? '<ul class="analytics-snap-list">' + snapHtml + '</ul>' : '<p class="flow-text subtle">Появятся после посещений главной.</p>') +
    roadmap +
    '';
  el.querySelectorAll('.analytics-scope-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      analyticsPortfolioScope = btn.getAttribute('data-analytics-scope') === 'all' ? 'all' : 'active';
      renderAnalytics();
    });
  });
}

function renderOperations() {
  var el = document.getElementById('operationsRoot');
  if (!el) return;
  var log = typeof getOperationLog === 'function' ? getOperationLog() : [];
  var accounts = typeof getPortfolioAccounts === 'function' ? getPortfolioAccounts() : [];
  var accOpts = '<option value="all">Все счета</option>' + accounts.map(function (a) {
    return '<option value="' + escapeHtml(a.id) + '">' + escapeHtml(a.name) + '</option>';
  }).join('');
  var filtered = log.filter(function (e) {
    if (operationsAccountFilter === 'all') return true;
    return e.portfolioId === operationsAccountFilter;
  });
  var lim = typeof subscriptionOperationsLogLimit === 'function' ? subscriptionOperationsLogLimit() : 200;
  var block = filtered.length
    ? '<div class="sec-events-list">' + filtered.slice(0, lim).map(function (e) {
      var dt = (e.ts || '').replace('T', ' ').slice(0, 19);
      var kind = e.kind === 'sell' ? 'Продажа' : (e.kind === 'buy' ? 'Покупка' : (e.kind || 'Событие'));
      var t = e.ticker ? ' · ' + escapeHtml(e.ticker) : '';
      var extra = e.quantity != null ? ' ' + escapeHtml(String(e.quantity)) + ' шт.' : '';
      var accTag = '';
      if (e.portfolioId && typeof getPortfolioAccountNameById === 'function') {
        var an = getPortfolioAccountNameById(e.portfolioId);
        if (an) accTag = ' <span class="op-portfolio-tag">' + escapeHtml(an) + '</span>';
      }
      return '<div class="op-row"><span style="color:#757575;font-size:12px">' + escapeHtml(dt) + '</span>' + accTag + '<br><strong>' + escapeHtml(kind) + t + extra + '</strong></div>';
    }).join('') + '</div>'
    : '<p class="flow-text">Нет событий для выбранного фильтра или журнал пуст.</p>';
  var subNote = getCurrentSubscriptionId() === 'free' && filtered.length > lim && lim > 0
    ? '<p class="flow-text subtle">На бесплатном тарифе показаны последние ' + lim + ' записей. На Базовом/Про — больше (смени тариф в профиле, демо).</p>'
    : '';
  el.innerHTML =
    '<h3 class="subsection-title">События</h3>' +
    '<p class="flow-text subtle">Твои учебные покупки и продажи по счетам.</p>' +
    '<label class="label" for="operationsAccountFilter">Счёт</label>' +
    '<select id="operationsAccountFilter" class="input operations-account-filter">' + accOpts + '</select>' +
    block + subNote +
    '<p class="flow-text subtle">Сделки исполняются сразу по доступной котировке MOEX. Отложенных заявок нет.</p>';
  var sel = document.getElementById('operationsAccountFilter');
  if (sel) {
    sel.value = operationsAccountFilter;
    sel.addEventListener('change', function () {
      operationsAccountFilter = sel.value || 'all';
      renderOperations();
    });
  }
}

function updateSecurityChrome() {
  var t = currentChartSecid;
  var list = stocks;
  var s = list.find(function (x) { return x.ticker === t; });
  var nameEl = document.getElementById('chartSecurityName');
  var tickEl = document.getElementById('chartSecurityTicker');
  if (nameEl) nameEl.textContent = s ? s.name : t;
  if (tickEl) tickEl.textContent = t;
  var p = s ? stockDayChangePercent(s) : 0;
  var chEl = document.getElementById('chartDayChange');
  if (chEl) {
    chEl.textContent = s ? ('Изменение за день: ' + (p >= 0 ? '+' : '') + p.toFixed(2) + '% к прошлому закрытию') : '—';
    chEl.classList.remove('up', 'down');
    if (p > 0.001) chEl.classList.add('up');
    else if (p < -0.001) chEl.classList.add('down');
  }
  var about = document.getElementById('securityAboutBody');
  if (about) about.textContent = typeof getSecurityAboutText === 'function' ? getSecurityAboutText(t) : '';
  var favB = document.getElementById('btnSecurityFav');
  if (favB) {
    var on = typeof isFavoriteTicker === 'function' && isFavoriteTicker(t);
    favB.classList.toggle('is-fav', on);
    favB.textContent = on ? '★' : '☆';
    favB.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  var metList = document.getElementById('securityMetricsList');
  if (metList) {
    const rows = s ? [ ['Режим торгов', 'MOEX · TQBR'], ['Акций в биржевом лоте', String(s.lotSize || 1)], ['Цена', formatMoney(s.price) + ' ₽'], ['Время биржи', (s.quotedAt || 'Нет метки времени') + (s.quotedAt ? ' МСК' : '')] ] : [['Котировки', 'Временно недоступны']];
    metList.innerHTML = rows.map(row => '<li><span class="security-metric-label">' + escapeHtml(row[0]) + '</span><span class="security-metric-value">' + escapeHtml(row[1]) + '</span></li>').join('');
  }
}

// ——— Онбординг и входной тест ———
var entranceStep = 0;
var entranceScore = 0;

function startEntranceTest() {
  entranceStep = 0;
  entranceScore = 0;
  renderEntranceStep();
  showScreen('entrance');
}

function renderEntranceStep() {
  var qs = DATA.entranceTestV2 || [];
  var q = qs[entranceStep];
  if (!q) return;
  var progText = document.getElementById('entranceProgress');
  if (progText) progText.textContent = (entranceStep + 1) + '/' + qs.length;
  var fill = document.getElementById('entranceProgressFill');
  if (fill) fill.style.width = ((entranceStep + 1) / qs.length * 100) + '%';
  var opts = q.options.map(function (o) {
    return '<button type="button" class="btn-option entrance-opt entrance-opt-card" data-score="' + o.score + '">' + escapeHtml(o.label) + '</button>';
  }).join('');
  document.getElementById('entranceBody').innerHTML = '<h3 class="entrance-q">' + escapeHtml(q.text) + '</h3><div class="entrance-options entrance-options-cards">' + opts + '</div>';
}

function finishEntranceTest() {
  var level = entranceScoreToLevel(entranceScore);
  setInvestorLevel(level);
  var msg = DATA.entranceLevelMessages[level] || DATA.entranceLevelMessages.novice;
  document.getElementById('entranceResultBadge').textContent = 'Твой уровень';
  document.getElementById('entranceResultTitle').textContent = msg.title;
  document.getElementById('entranceResultBody').textContent = msg.body;
  setOnboardingDone();
  showScreen('entrance-result');
}

function renderVictorinaEntry() {
  var sub = getCurrentSubscriptionId();
  var limit = typeof getVictorinaDailyLimitForSubscription === 'function' ? getVictorinaDailyLimitForSubscription() : 5;
  var plays = getVictorinaPlaysToday();
  var left = Math.max(0, limit - plays);
  var playsEl = document.getElementById('victorinaPlaysLeft');
  var limitEl = document.getElementById('victorinaDailyLimit');
  if (limit >= 500) {
    if (playsEl) playsEl.textContent = '∞';
    if (limitEl) limitEl.textContent = '∞';
  } else {
    if (playsEl) playsEl.textContent = String(left);
    if (limitEl) limitEl.textContent = String(limit);
  }
  var hint = document.getElementById('victorinaSubHint');
  if (hint) {
    if (sub === 'free') {
      hint.textContent = 'На бесплатном тарифе — до ' + limit + ' игр в день. Смени тариф в профиле (демо, без оплаты).';
      hint.classList.remove('hidden');
    } else if (sub === 'basic') {
      hint.textContent = 'На базовом тарифе — до ' + limit + ' игр в день.';
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
  }
  var btn = document.getElementById('btnVictorinaStart');
  if (btn) btn.disabled = plays >= limit;
}

// ——— Викторина рынка ———
var victorinaDeck = [];
var victorinaIdx = 0;
var victorinaCorrect = 0;
var victorinaTimer = null;
var victorinaSecsLeft = 20;
var victorinaTimeMs = 0;
var victorinaQStart = 0;
var victorinaLocked = false;
var victorinaExplainTimer = null;
var victorinaRoundFinished = false;
var victorinaPaused = false;
var victorinaPauseStart = 0;
var victorinaRunId = 0;

function clearVictorinaTimers() {
  if (victorinaTimer) {
    clearInterval(victorinaTimer);
    victorinaTimer = null;
  }
  if (victorinaExplainTimer) {
    clearTimeout(victorinaExplainTimer);
    victorinaExplainTimer = null;
  }
}

function startVictorinaGame() {
  var limit = typeof getVictorinaDailyLimitForSubscription === 'function' ? getVictorinaDailyLimitForSubscription() : 5;
  if (getVictorinaPlaysToday() >= limit) return;
  victorinaDeck = pickVictorinaDeck(10);
  victorinaRunId++;
  victorinaIdx = 0;
  victorinaCorrect = 0;
  victorinaTimeMs = 0;
  victorinaLocked = false;
  victorinaRoundFinished = false;
  victorinaPaused = false;
  clearVictorinaTimers();
  showScreen('victorina-game');
  showVictorinaQuestion();
}

function showVictorinaQuestion() {
  clearVictorinaTimers();
  victorinaLocked = false;
  victorinaPaused = false;
  document.getElementById('btnVictorinaNext').classList.add('hidden');
  document.getElementById('victorinaPausedNote').classList.add('hidden');
  document.getElementById('btnVictorinaPause').disabled = false;
  document.getElementById('btnVictorinaPause').textContent = 'Пауза';
  document.getElementById('btnVictorinaPause').setAttribute('aria-pressed', 'false');
  var ex = document.getElementById('victorinaExplain');
  if (ex) {
    ex.classList.add('hidden');
    ex.textContent = '';
  }
  if (victorinaIdx >= 10) {
    finishVictorinaRound();
    return;
  }
  var q = victorinaDeck[victorinaIdx];
  var labels = DATA.victorinaLabels || ['Вырастет', 'Упадёт', 'Без сильных изменений'];
  document.getElementById('victorinaProgress').textContent = (victorinaIdx + 1) + '/10';
  document.getElementById('victorinaText').textContent = q.text;
  document.getElementById('victorinaScore').textContent = 'Верно: ' + victorinaCorrect + ' · цель: 7 из 10';
  companion.say(document.getElementById('buddy-victorina-game'), 'Прочитай новость на плашке. Кому она поможет, а кому добавит проблем?', 'point', '#victorinaText');
  document.getElementById('btnVictorina0').textContent = '↗ ' + labels[0];
  document.getElementById('btnVictorina1').textContent = '↘ ' + labels[1];
  document.getElementById('btnVictorina2').textContent = '→ ' + labels[2];
  [0, 1, 2].forEach(function (i) {
    var b = document.getElementById('btnVictorina' + i);
    if (b) {
      b.disabled = false;
      b.classList.remove('victorina-correct', 'victorina-wrong', 'victorina-neutral');
    }
  });
  victorinaSecsLeft = 20;
  document.getElementById('victorinaTimer').textContent = String(victorinaSecsLeft);
  victorinaQStart = Date.now();
  victorinaTimer = setInterval(function () {
    if (victorinaPaused || document.hidden) return;
    victorinaSecsLeft -= 1;
    document.getElementById('victorinaTimer').textContent = String(Math.max(0, victorinaSecsLeft));
    if (victorinaSecsLeft <= 0) {
      clearVictorinaTimers();
      onVictorinaAnswer(-1, true);
    }
  }, 1000);
}

function onVictorinaAnswer(choiceIndex, fromTimeout) {
  if (victorinaLocked || victorinaPaused) return;
  victorinaLocked = true;
  clearVictorinaTimers();
  victorinaTimeMs += Date.now() - victorinaQStart;
  var q = victorinaDeck[victorinaIdx];
  var correct = q.correct;
  var ok = !fromTimeout && choiceIndex === correct;
  if (ok) victorinaCorrect += 1;
  [0, 1, 2].forEach(function (i) {
    var b = document.getElementById('btnVictorina' + i);
    if (b) {
      b.disabled = true;
      b.classList.remove('victorina-correct', 'victorina-wrong', 'victorina-neutral');
      if (i === correct) b.classList.add('victorina-correct');
      else if (!fromTimeout && choiceIndex === i) b.classList.add('victorina-wrong');
      else b.classList.add('victorina-neutral');
    }
  });
  var ex = document.getElementById('victorinaExplain');
  if (ex && q.explanation) {
    var prefix = ok ? 'Верно. ' : (fromTimeout ? 'Время вышло. ' : 'Не угадал. ');
    ex.textContent = prefix + 'Правильный ответ: ' + ['Рост', 'Падение', 'Без изменений'][correct] + '.';
    ex.dataset.explanation = q.explanation;
    const fallback = document.createElement('p');
    fallback.className = 'buddy-hidden-explanation';
    fallback.textContent = q.explanation;
    ex.append(fallback);
    ex.classList.remove('hidden');
  }
  document.getElementById('btnVictorinaPause').disabled = true;
  document.getElementById('btnVictorinaNext').classList.remove('hidden');
  document.getElementById('btnVictorinaNext').textContent = victorinaIdx === 9 ? 'Результат →' : 'Дальше →';
  document.getElementById('victorinaScore').textContent = 'Верно: ' + victorinaCorrect + ' · цель: 7 из 10';
  companion.say(document.getElementById('buddy-victorina-game'),
    q.explanation,
    ok ? 'correct' : 'explain', '#victorinaText');
  document.getElementById('btnVictorinaNext').focus({ preventScroll: true });
}

function pauseVictorina(force) {
  if (victorinaLocked || !document.getElementById('screen-victorina-game').classList.contains('active')) return;
  var paused = typeof force === 'boolean' ? force : !victorinaPaused;
  if (paused === victorinaPaused) return;
  victorinaPaused = paused;
  if (paused) victorinaPauseStart = Date.now();
  else victorinaQStart += Date.now() - victorinaPauseStart;
  document.getElementById('btnVictorinaPause').textContent = paused ? 'Продолжить' : 'Пауза';
  document.getElementById('btnVictorinaPause').setAttribute('aria-pressed', String(paused));
  document.getElementById('victorinaPausedNote').classList.toggle('hidden', !paused);
  [0, 1, 2].forEach(i => { document.getElementById('btnVictorina' + i).disabled = paused; });
  companion.say(document.getElementById('buddy-victorina-game'), paused ? 'Стоп-кадр. Таймер подождёт — подумай спокойно или сделай перерыв.' : 'Продолжаем с того же места. Смотри на новость, а не только на таймер.', paused ? 'careful' : 'point', '#victorinaText');
}

function finishVictorinaRound() {
  if (victorinaRoundFinished) return;
  victorinaRoundFinished = true;
  var roundCorrect = victorinaCorrect;
  var roundId = victorinaRunId;
  clearVictorinaTimers();
  var won = victorinaCorrect >= 7;
  var timeSec = Math.max(1, Math.round(victorinaTimeMs / 1000));
  var xpGain = won ? 60 + victorinaCorrect * 4 : victorinaCorrect * 3;
  if (victorinaCorrect === 10) xpGain += 25;
  if (won && timeSec < 150) xpGain += 15;
  var rublixGain = won ? 12 : 0;
  if (victorinaCorrect === 10) rublixGain += 8;
  function applyRewardsAndShow(note, accepted) {
    if (roundId !== victorinaRunId) return;
    if (accepted !== false) {
      addVictorinaXp(xpGain);
      if (rublixGain) addRublix(rublixGain);
      var userStats = getUserStats();
      userStats.quizCorrectCount += roundCorrect;
      setUserStats(userStats);
    }
    document.getElementById('victorinaResultTitle').textContent = won ? 'Победа в раунде!' : 'Раунд завершён';
    var stats = 'Верно: ' + roundCorrect + ' из 10. Время: ~' + timeSec + ' с.';
    if (!won) stats += ' Для победы нужно ≥7 верных.';
    document.getElementById('victorinaResultStats').textContent = stats;
    var rw = accepted === false ? 'Награды не начислены.' : '+' + xpGain + ' XP';
    if (accepted !== false && rublixGain) rw += ', +' + rublixGain + ' «Рубликсов»';
    document.getElementById('victorinaResultRewards').textContent = rw + (note ? ' ' + note : '');
    var currentScreen = document.querySelector('.screen.active');
    if (!currentScreen || !['screen-victorina-game', 'screen-victorina-result'].includes(currentScreen.id)) return;
    showScreen('victorina-result');
    characterMotion.react(won && accepted !== false ? 'victory' : 'careful', {
      anchor: '#victorinaResultRewards',
      text: accepted === false ? 'Сегодня лимит. Мозгу тоже нужен перерыв.' : (won ? 'Мозг сделал левел-ап. Танец заслужен!' : 'Опыт забрали. Рекорд ещё впереди.')
    });
  }
  if (typeof authApi !== 'undefined' && authApi.isUsingBackend && authApi.isUsingBackend()) {
    authApi.postQuizComplete({ correctCount: victorinaCorrect, totalTimeSec: timeSec, won: won }).then(function (res) {
      if (res.ok && res.data && typeof res.data.playsToday === 'number') {
        setVictorinaPlaysTodayCount(res.data.playsToday);
        applyRewardsAndShow('');
      } else if (res.status === 429) {
        if (res.data && typeof res.data.playsToday === 'number') setVictorinaPlaysTodayCount(res.data.playsToday);
        applyRewardsAndShow('(Сервер не засчитал игру: дневной лимит. Счётчик синхронизирован.)', false);
      } else {
        incrementVictorinaPlay();
        applyRewardsAndShow('');
      }
    }).catch(function () {
      incrementVictorinaPlay();
      applyRewardsAndShow('(Оффлайн: результат только локально.)');
    });
  } else {
    incrementVictorinaPlay();
    applyRewardsAndShow('');
  }
}

function renderNewsList() {
  document.getElementById('newsArticleList').innerHTML = DATA.newsArticles.map((a, i) => learning.card(a, i)).join('');
}

function renderArticle(articleId) {
  const current = document.querySelector('.screen.active')?.id.replace('screen-', '');
  if (current && current !== 'article') articleBackScreen = current;
  if (learning.article(articleId)) return;
  var list = DATA.newsArticles || [];
  var a = list.find(function (x) { return x.id === articleId; });
  var el = document.getElementById('articleView');
  if (!a) {
    el.innerHTML = '<p>Материал не найден.</p>';
    return;
  }
  var paras = (a.paragraphs || []).map(function (p) { return '<p>' + escapeHtml(p) + '</p>'; }).join('');
  el.innerHTML = '<h1>' + escapeHtml(a.title) + '</h1><p class="subtitle">' + escapeHtml(a.subtitle || '') + '</p><p class="meta">' + escapeHtml(a.date) + ' · чтение ~' + (a.readMin || 3) + ' мин</p>' + paras + '<p class="sources">Источник: ' + escapeHtml(a.sources || '') + '</p>';
}

function renderParentReport() {
  var stats = getUserStats();
  var qc = stats.quizCorrectCount || 0;
  var vw = stats.videosWatched || 0;
  var lvl = getInvestorLevel();
  var lvlRu = lvl === 'pro' ? 'Юный профи' : (lvl === 'explorer' ? 'Исследователь' : 'Новичок');
  var list = stocks;
  var portfolio = getPortfolio();
  var prices = Object.fromEntries(list.map(s => [s.ticker, s.price]));
  var assets = totalStocksValue(portfolio, prices) + totalCryptoValue(portfolio, CRYPTO_PRICES) + (portfolio.futuresValueRub || 0);
  var total = getBalance() + assets;
  var html = '<div class="report-block"><h3>Обучение</h3><div class="report-row"><span>Пройдено миссий</span><span>' + vw + '</span></div>' +
    '<div class="report-row"><span>Верных ответов в квизах (всего)</span><span>' + qc + '</span></div>' +
    '<div class="report-row"><span>Стиль инвестора</span><span>' + escapeHtml(lvlRu) + '</span></div>' +
    '<div class="report-row"><span>Опыт (локально)</span><span>' + getVictorinaXp() + '</span></div>' +
    '<div class="report-row"><span>«Рубликсы»</span><span>' + getRublixBalance() + '</span></div></div>' +
    '<div class="report-block"><h3>Портфель (демо)</h3><div class="report-row"><span>Оценка всего</span><span>' + formatMoney(total) + ' ₽</span></div>' +
    '<div class="report-row"><span>В активах</span><span>' + formatMoney(assets) + ' ₽</span></div></div>' +
    '<p class="flow-text" style="font-size:12px">Демо-отчёт по локальным данным. Это не инвестиционная рекомендация.</p>';
  document.getElementById('parentReportBody').innerHTML = html;
}

function enterAppAfterAuth() {
  if (typeof authApi !== 'undefined' && authApi.isUsingBackend && authApi.isUsingBackend()) {
    authApi.getMe().then(function (u) {
      if (u) applyServerUserProfile(u);
      return typeof syncPortfolioFromServerIfBackend === 'function' ? syncPortfolioFromServerIfBackend() : Promise.resolve();
    }).then(function () { finishEnterApp(); }).catch(function () { finishEnterApp(); });
    return;
  }
  finishEnterApp();
}

function finishEnterApp() {
  var lo = document.getElementById('btnLogout');
  if (lo) lo.classList.toggle('hidden', typeof isGuestOnlyMode === 'function' && isGuestOnlyMode());
  if (!getOnboardingDone()) {
    showScreen('onboarding');
    return;
  }
  showScreen('home');
}

function renderHomeStories() {
  var strip = document.getElementById('homeStoriesStrip');
  if (!strip) return;
  var stories = DATA.homeStories || [];
  strip.innerHTML = stories.map(function (s) {
    return '<button type="button" class="home-story-card" data-story="' + escapeHtml(s.id) + '" style="--story-tone:' + escapeHtml(s.tone) + '"><span class="home-story-title">' + escapeHtml(s.title) + '</span><span class="home-story-hint">' + escapeHtml(s.hint) + '</span></button>';
  }).join('');
}

function renderHomeFavorites() {
  var el = document.getElementById('homeFavoritesList');
  if (!el) return;
  var fav = typeof getFavoriteTickers === 'function' ? getFavoriteTickers() : [];
  var list = stocks;
  var cntEl = document.getElementById('favCountStocks');
  if (cntEl) cntEl.textContent = String(fav.length);
  if (!fav.length) {
    el.innerHTML = '<p class="placeholder">Нажми ☆ на экране бумаги — тикеры появятся здесь.</p>';
    return;
  }
  el.innerHTML = fav.map(function (t) {
    var s = list.find(function (x) { return x.ticker === t; });
    var p = s ? stockDayChangePercent(s) : 0;
    var cl = p >= 0 ? 'up' : 'down';
    var name = s ? s.name : t;
    var priceStr = s ? formatMarketPrice(s.price) : '—';
    return '<a href="#" class="home-fav-row" data-ticker="' + escapeHtml(t) + '"><span class="home-fav-letter" aria-hidden="true">' + escapeHtml(t.charAt(0)) + '</span><span class="home-fav-info"><strong>' + escapeHtml(t) + '</strong><span>' + escapeHtml(name) + '</span></span><span class="home-fav-meta"><span class="home-fav-price">' + priceStr + ' ₽</span><span class="home-fav-chg chg ' + cl + '">' + (p >= 0 ? '+' : '') + p.toFixed(2) + '%</span></span></a>';
  }).join('');
}

function renderHome() {
  learning.home();
  const homeAvatar = document.getElementById('homeCharacterAvatar');
  const appearance = getCharacterAppearance();
  const signature = JSON.stringify(appearance);
  if (homeAvatar.dataset.appearance !== signature || !homeAvatar.querySelector('svg')) {
    renderCharacterAvatar(homeAvatar, appearance, 104, { fullBody: true });
    homeAvatar.dataset.appearance = signature;
  }
  if (!companion.isHidden()) characterMotion.greet(document.getElementById('homeCharacterAvatar'));
  companion.home();
  var subMain = document.getElementById('homeSubMain');
  var subFav = document.getElementById('homeSubFav');
  if (subMain) {
    subMain.classList.toggle('active', homeViewMode === 'main');
    subMain.setAttribute('aria-selected', homeViewMode === 'main' ? 'true' : 'false');
  }
  if (subFav) {
    subFav.classList.toggle('active', homeViewMode === 'fav');
    subFav.setAttribute('aria-selected', homeViewMode === 'fav' ? 'true' : 'false');
  }

  if (homeViewMode === 'fav') {
    var mainP = document.getElementById('homeMainPanels');
    var favP = document.getElementById('homeFavPanel');
    if (mainP) mainP.classList.add('hidden');
    if (favP) favP.classList.remove('hidden');
    renderHomeFavorites();
    return;
  }
  var mainP2 = document.getElementById('homeMainPanels');
  var favP2 = document.getElementById('homeFavPanel');
  if (mainP2) mainP2.classList.remove('hidden');
  if (favP2) favP2.classList.add('hidden');

  renderHomeStories();

  const balance = getBalance();
  var balEl = document.getElementById('balanceAmount');
  if (balEl) balEl.textContent = formatMoney(balance);

  const list = stocks;
  const portfolio = getPortfolio();
  const prices = Object.fromEntries(list.map(s => [s.ticker, s.price]));
  const totalStocks = totalStocksValue(portfolio, prices);
  const totalCrypto = totalCryptoValue(portfolio, CRYPTO_PRICES);
  const assetsTotal = totalStocks + totalCrypto + (portfolio.futuresValueRub || 0);
  const portfolioTotalRub = balance + assetsTotal;
  const valuationComplete = portfolio.stocks.every(h => prices[h.ticker] > 0);
  if (valuationComplete && marketState.status !== 'stale' && typeof recordPortfolioSnapshot === 'function') recordPortfolioSnapshot(portfolioTotalRub);
  const dayCh = portfolioDayChangeRub(portfolio, list);
  var homeTotal = document.getElementById('homePortfolioTotal');
  var homeDay = document.getElementById('homePortfolioDay');
  var chipLab = document.getElementById('portfolioChipLabel');
  if (chipLab && typeof getActivePortfolioAccountName === 'function') chipLab.textContent = getActivePortfolioAccountName();
  if (homeTotal) homeTotal.textContent = valuationComplete ? formatMoney(portfolioTotalRub) + ' ₽' : 'Нет оценки';

  var pillDay = document.getElementById('pillPortfolioDay');
  var pillAll = document.getElementById('pillPortfolioAll');
  if (pillDay) pillDay.classList.toggle('active', portfolioPillMode === 'day');
  if (pillAll) pillAll.classList.toggle('active', portfolioPillMode === 'all');

  if (homeDay) {
    homeDay.classList.remove('up', 'down');
    if (portfolioPillMode === 'day') {
      var chStr = (dayCh >= 0 ? '+' : '') + formatMoney(dayCh) + ' ₽ за сессию';
      homeDay.textContent = chStr;
      if (dayCh > 0.01) homeDay.classList.add('up');
      else if (dayCh < -0.01) homeDay.classList.add('down');
    } else {
      var snaps = typeof getPortfolioSnapshots === 'function' ? getPortfolioSnapshots() : [];
      if (snaps.length >= 2) {
        var lastV = snaps[0].value;
        var oldV = snaps[snaps.length - 1].value;
        var diff = lastV - oldV;
        homeDay.textContent = 'По дневным снимкам: ' + (diff >= 0 ? '+' : '') + formatMoney(diff) + ' ₽ (от первого к последнему сохранённому дню).';
        if (diff > 0.01) homeDay.classList.add('up');
        else if (diff < -0.01) homeDay.classList.add('down');
      } else {
        homeDay.textContent = 'История начнётся с сегодняшнего дня.';
      }
    }
  }

  if (!valuationComplete && homeDay) homeDay.textContent = 'Часть цен недоступна. Количество акций сохранено.';

  const topEl = document.getElementById('homeTopMovers');
  if (topEl) {
    const sorted = sortTopMoversList(list).slice(0, 5);
    topEl.innerHTML = sorted.map(function (s, i) {
      const p = stockDayChangePercent(s);
      const cl = p >= 0 ? 'up' : 'down';
      return '<a href="#" class="top-mover-row" data-ticker="' + escapeHtml(s.ticker) + '" style="animation-delay:' + (0.04 * i) + 's">' +
        '<span class="top-mover-rank">' + (i + 1) + '</span>' +
        '<span class="top-mover-info"><strong>' + escapeHtml(s.ticker) + '</strong><span class="top-mover-name">' + escapeHtml(s.name || '') + '</span></span>' +
        '<span class="top-mover-chg chg ' + cl + '">' + (p >= 0 ? '+' : '') + p.toFixed(2) + '%</span></a>';
    }).join('') || '<p class="placeholder">Нет данных по бумагам</p>';
  }

  const newsEl = document.getElementById('newsCarousel');
  if (newsEl) newsEl.innerHTML = DATA.newsArticles.filter(a => a.id !== learning.next().id).slice(0, 2).map(a => learning.card(a, DATA.newsArticles.indexOf(a))).join('');

  const listEl = document.getElementById('stocksList');
  if (listEl) {
    listEl.innerHTML = list.slice(0, 6).map(s => {
      const ch = stockDayChangePercent(s);
      const changeClass = ch >= 0 ? 'up' : 'down';
      const priceStr = formatMarketPrice(s.price);
      return `<a href="#" class="stock-chip" data-ticker="${escapeHtml(s.ticker)}">
      <span class="stock-identity"><span class="ticker">${escapeHtml(s.ticker)}</span><span class="stock-company">${escapeHtml(s.name || s.ticker)}</span></span>
      <span class="price">${priceStr} ₽</span>
      <span class="change ${changeClass}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span>
    </a>`;
    }).join('') || '<p class="placeholder">' + (marketState.status === 'loading' ? 'Напарник собирает цены с биржи…' : 'Цены пока недоступны. Игры и обучение работают — Нажми стрелку рядом с источником цен.') + '</p>';
  }

  var topicsEl = document.getElementById('topicsGrid');
  if (topicsEl) {
    topicsEl.innerHTML = DATA.topics.map(function (t) {
      return '<a href="#" class="topic-card" data-id="' + escapeHtml(t.id) + '" style="--topic-color:' + t.color + '"><h3>' + escapeHtml(t.title) + '</h3><p>' + escapeHtml(t.description) + '</p></a>';
    }).join('');
  }

  const total = assetsTotal;

  var favForCount = typeof getFavoriteTickers === 'function' ? getFavoriteTickers() : [];
  var cntSt = document.getElementById('favCountStocks');
  if (cntSt) cntSt.textContent = String(favForCount.length);

  const holdSection = document.getElementById('holdingsSection');
  const holdList = document.getElementById('holdingsList');
  if (!holdSection || !holdList) return;
  if (total <= 0 && !portfolio.stocks.length) {
    holdSection.classList.add('hidden');
  } else {
    holdSection.classList.remove('hidden');
    let html = '';
    portfolio.stocks.forEach(h => {
      const val = (h.quantity || 0) * (prices[h.ticker] || 0);
      if (val <= 0) html += '<div class="holdings-row"><strong>' + escapeHtml(h.ticker) + '</strong><span>' + h.quantity + ' шт. · цена недоступна</span></div>';
      if (val > 0) {
        const st = list.find(function (x) { return x.ticker === h.ticker; });
        const dp = st ? stockDayChangePercent(st) : 0;
        const dcl = dp >= 0 ? 'up' : 'down';
        html += `<a href="#" class="holdings-row holdings-row-link" data-ticker="${escapeHtml(h.ticker)}"><span class="hold-logo" aria-hidden="true">${escapeHtml(h.ticker.charAt(0))}</span><span class="hold-main"><span class="hold-tick">${escapeHtml(h.ticker)}</span><span class="hold-sub">${escapeHtml(st && st.name ? st.name : '')}</span></span><span class="hold-values"><span class="hold-val">${formatMoney(val)} ₽</span><span class="hold-chg chg ${dcl}">${dp >= 0 ? '+' : ''}${dp.toFixed(2)}% день</span></span></a>`;
      }
    });
    if (portfolio.crypto?.length) {
      portfolio.crypto.forEach(h => {
        const val = (h.amount || 0) * (CRYPTO_PRICES[h.symbol] || 0);
        if (val > 0) html += `<div class="holdings-row"><span>${escapeHtml(h.symbol)}</span><span>${formatMoney(val)} ₽</span></div>`;
      });
    }
    if (portfolio.futuresValueRub > 0) {
      html += `<div class="holdings-row"><span>Фьючерсы</span><span>${formatMoney(portfolio.futuresValueRub)} ₽</span></div>`;
    }
    html += `<div class="holdings-total"><span>Итого в активах</span><span class="sum">${formatMoney(total)} ₽</span></div>`;
    holdList.innerHTML = html;
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** Надёжное число для сортировки и отображения (API/MOCK могут дать строку). */
function stockDayChangePercent(s) {
  if (!s) return 0;
  var v = s.changePercent;
  if (typeof v === 'number' && !isNaN(v) && isFinite(v)) return v;
  var n = parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
  return isNaN(n) || !isFinite(n) ? 0 : n;
}

/** Топ движений: убывание |Δ%|, затем знаковый %, затем тикер (устойчиво к строкам из API). */
function sortTopMoversList(arr) {
  var copy = arr.slice();
  copy.sort(function (a, b) {
    var pa = Number(stockDayChangePercent(a));
    var pb = Number(stockDayChangePercent(b));
    if (!isFinite(pa)) pa = 0;
    if (!isFinite(pb)) pb = 0;
    var da = Math.abs(pa);
    var db = Math.abs(pb);
    if (Math.abs(db - da) > 1e-12) return db - da;
    if (Math.abs(pb - pa) > 1e-12) return pb - pa;
    return String(a.ticker || '').localeCompare(String(b.ticker || ''), 'ru');
  });
  return copy;
}

function updateQuotesRefreshLabel() {
  var el = document.getElementById('quotesRefreshLabel');
  if (!el) return;
  const labels = { loading: 'Загружаем котировки…', unavailable: 'MOEX недоступна · повторить',
    stale: 'MOEX · сохранённые цены · повторить', demo: 'Тестовые котировки' };
  const time = marketState.quotedAt ? marketState.quotedAt.slice(8, 10) + '.' + marketState.quotedAt.slice(5, 7) + ' · ' + marketState.quotedAt.slice(11, 16) : '';
  el.textContent = labels[marketState.status] || 'MOEX · 15 мин';
  el.title = time ? 'Время биржи: ' + time + ' МСК. Бесплатные данные с задержкой 15 минут.' : el.textContent;
  document.querySelectorAll('.market-source-summary').forEach(label => { label.textContent = el.textContent; label.title = el.title; });
  el.dataset.status = marketState.status;
  const wasLoading = document.body.classList.contains('market-loading');
  document.body.classList.toggle('market-loading', marketState.status === 'loading');
  if (marketState.status === 'loading' && !wasLoading) {
    clearTimeout(quoteMotionTimer);
    quoteMotionTimer = setTimeout(() => {
      if (!companion.isHidden() && marketState.status === 'loading') characterMotion.play(document.getElementById('homeCharacterAvatar'), 'pull');
    }, 300);
  } else if (marketState.status !== 'loading') clearTimeout(quoteMotionTimer);
  const retry = document.getElementById('btnRefreshQuotes');
  if (retry) retry.disabled = marketState.status === 'loading';
}

function stopStocksPolling() {
  if (stocksPollTimer) {
    clearInterval(stocksPollTimer);
    stocksPollTimer = null;
  }
}

function startStocksPolling() {
  stopStocksPolling();
  stocksPollTimer = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    fetchStocks().then(function (list) {
      stocks = list;
      updateQuotesRefreshLabel();
      var active = document.querySelector('.screen.active');
      var sid = active ? active.id : '';
      if (sid === 'screen-home') renderHome();
      if (sid === 'screen-stocks') renderStocksFull();
      if (sid === 'screen-sell') renderSell();
      if (sid === 'screen-chart') {
        var s = stocks.find(function (x) { return x.ticker === currentChartSecid; });
        if (s) document.getElementById('chartPrice').textContent = formatMarketPrice(s.price);
        updateSecurityChrome();
      }
    }).catch(function () {});
  }, STOCKS_POLL_MS);
}

async function loadStocks() {
  if (!stocks.length) {
    renderHome();
    updateQuotesRefreshLabel();
  }
  stocks = await fetchStocks();
  updateQuotesRefreshLabel();
  renderHome();
  if (!stocksPollStarted) {
    stocksPollStarted = true;
    startStocksPolling();
  }
}

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible') return;
  fetchStocks().then(function (list) {
    stocks = list;
    updateQuotesRefreshLabel();
    var active = document.querySelector('.screen.active');
    if (active && active.id === 'screen-home') renderHome();
    if (active && active.id === 'screen-stocks') renderStocksFull();
    if (active && active.id === 'screen-chart') {
      var s = stocks.find(function (x) { return x.ticker === currentChartSecid; });
      if (s) document.getElementById('chartPrice').textContent = formatMarketPrice(s.price);
      updateSecurityChrome();
    }
  }).catch(function () {});
});

function renderScaleBar() {
  const allScales = [
    { id: 'allTime', label: 'История' },
    { id: 'months', label: 'Месяцы' },
    { id: 'days', label: 'Дни' },
    { id: 'hours', label: 'Часы' },
    { id: 'minutes', label: 'Минуты' }
  ];
  const allowed = typeof subscriptionChartScaleIds === 'function' ? subscriptionChartScaleIds() : ['days'];
  const scales = allScales.filter(function (s) { return allowed.indexOf(s.id) >= 0; });
  const el = document.getElementById('chartScaleBar');
  if (!el) return;
  el.innerHTML = scales.map(s =>
    `<button type="button" class="chart-scale-btn ${chartScale === s.id ? 'active' : ''}" data-scale="${s.id}">${s.label}</button>`
  ).join('');
}

let chartCandles = [];
let chartRequestId = 0;

async function loadChart(appendOlder) {
  const requestId = ++chartRequestId;
  const loadingEl = document.getElementById('chartLoading');
  const container = document.getElementById('chartContainer');
  if (!appendOlder) {
    if (loadingEl) loadingEl.classList.remove('hidden');
    chartCandles = [];
  }
  const previousRange = appendOlder && candleChart ? candleChart.timeScale().getVisibleLogicalRange() : null;
  const previousLength = chartCandles.length;
  const wasDemo = !!chartCandles.isDemo;
  const fetched = appendOlder && chartCandles.length
    ? await fetchOlderCandles(currentChartSecid, chartScale, chartCandles[0].time, wasDemo ? chartCandles[0].open : undefined)
    : await fetchCandles(currentChartSecid, chartScale);
  if (requestId !== chartRequestId) return;
  chartCandles = normalizeCandles(appendOlder ? fetched.concat(chartCandles) : fetched);
  chartCandles.isDemo = appendOlder ? wasDemo : !!fetched.isDemo;
  chartCandles.stale = !!fetched.stale;
  if (loadingEl) loadingEl.classList.add('hidden');
  const added = chartCandles.length - previousLength;
  const restoredRange = previousRange ? { from: previousRange.from + added, to: previousRange.to + added } : null;
  const quote = stocks.find(s => s.ticker === currentChartSecid);
  const lastPrice = buildCharts('candlestickChart', 'volumeChart', chartCandles, chartScale, restoredRange, quote?.decimals ?? 2);
  const status = document.getElementById('chartDataStatus');
  if (status) status.textContent = !chartCandles.length ? 'График пока недоступен. Выбери другой период или нажми «Обновить график».' :
    (chartCandles.isDemo ? 'Учебный график · тестовые данные' : 'Свечи MOEX · исторические данные' + (chartCandles.stale ? ' · сохранённая копия' : '')) +
    (appendOlder && !fetched.length ? '. Более ранних данных нет или сеть недоступна.' : '');
  document.getElementById('chartPrice').textContent = quote ? formatMarketPrice(quote.price) : lastPrice != null ? formatMarketPrice(lastPrice) : '—';
  document.getElementById('btnBuyTicker').textContent = currentChartSecid;
  document.getElementById('btnBuyStock').disabled = !stocks.some(s => s.ticker === currentChartSecid && !s.stale);
  const loadOlderBtn = document.getElementById('btnLoadOlder');
  if (loadOlderBtn) loadOlderBtn.classList.toggle('hidden', !chartCandles.length);
  updateSecurityChrome();
}

function renderStocksFull() {
  const list = stocks;
  var q = (stocksSearchQuery || '').trim().toLowerCase();
  var filtered = q
    ? list.filter(function (s) {
      var t = String(s.ticker || '').toLowerCase();
      var n = String(s.name || '').toLowerCase();
      return t.indexOf(q) >= 0 || n.indexOf(q) >= 0;
    })
    : list;
  const sorted = stocksFullSortMode === 'alpha'
    ? filtered.slice().sort(function (a, b) { return String(a.ticker || '').localeCompare(String(b.ticker || '')); })
    : sortTopMoversList(filtered);
  const el = document.getElementById('stocksFullList');
  if (!el) return;
  updateStocksSearchHint();
  if (!sorted.length) {
    el.innerHTML = '<p class="placeholder">Нет совпадений. Измени запрос или смени тариф — на бесплатном плане в ленте меньше бумаг.</p>';
    return;
  }
  el.innerHTML = sorted.map(s => {
    const priceStr = formatMarketPrice(s.price);
    const ch = stockDayChangePercent(s);
    return `<a href="#" class="stock-row" data-ticker="${escapeHtml(s.ticker)}">
      <span><strong>${escapeHtml(s.ticker)}</strong> ${escapeHtml(s.name)}</span>
      <span>${priceStr} ₽ ${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span>
    </a>`;
  }).join('');
}

function renderPurchase() {
  const balance = getBalance();
  document.getElementById('purchaseBalance').textContent = formatMoney(balance) + ' ₽';
  const accRow = document.getElementById('purchaseAccountRow');
  const accSel = document.getElementById('purchaseAccount');
  if (accRow && accSel && typeof getPortfolioAccounts === 'function') {
    const accounts = getPortfolioAccounts();
    accRow.classList.toggle('hidden', accounts.length <= 1);
    const activeId = (function () {
      try {
        var b = loadBundleFromStorage();
        return b.activeId;
      } catch (e) { return null; }
    })();
    accSel.innerHTML = accounts.map(function (a) {
      return '<option value="' + escapeHtml(a.id) + '"' + (a.id === activeId ? ' selected' : '') + '>' + escapeHtml(a.name) + ' (' + formatMoney(a.balanceRub) + ' ₽)</option>';
    }).join('');
  }
  const select = document.getElementById('purchaseTicker');
  select.innerHTML = stocks.map(s =>
    `<option value="${escapeHtml(s.ticker)}" ${s.ticker === currentChartSecid ? 'selected' : ''}>${escapeHtml(s.ticker)} — ${formatMarketPrice(s.price)} ₽</option>`
  ).join('');
  updatePurchaseTotal();
}

function updatePurchaseTotal() {
  const ticker = document.getElementById('purchaseTicker').value;
  const qty = Number(document.getElementById('purchaseQty').value.replace(',', '.')) || 0;
  const s = stocks.find(x => x.ticker === ticker);
  const total = s ? s.price * qty : 0;
  document.getElementById('purchaseTotal').textContent = 'Итого: ' + formatMoney(total) + ' ₽';
}

let purchasePending = false;
async function doPurchase() {
  if (purchasePending) return;
  purchasePending = true;
  const purchaseButton = document.getElementById('btnPurchase');
  purchaseButton.disabled = true;
  try {
  const accSel = document.getElementById('purchaseAccount');
  if (accSel && accSel.value && typeof setActivePortfolioAccount === 'function') {
    setActivePortfolioAccount(accSel.value);
  }
  const ticker = document.getElementById('purchaseTicker').value;
  const qty = Number((document.getElementById('purchaseQty').value || '0').replace(',', '.'));
  const msgEl = document.getElementById('purchaseMessage');
  if (!Number.isFinite(qty) || qty <= 0) {
    msgEl.textContent = 'Введите корректное количество'; msgEl.className = 'message error';
    characterMotion.react('think', { anchor: '#purchaseQty', text: 'Так, тут нужно число больше нуля.' });
    return;
  }
  const accountId = loadBundleFromStorage().activeId;
  msgEl.textContent = 'Проверяем котировку…'; msgEl.className = 'message';
  const displayedPrice = stocks.find(s => s.ticker === ticker)?.price;
  const price = await fetchCurrentPrice(ticker) || 0;
  if (price <= 0) { msgEl.textContent = 'Не удалось получить цену'; msgEl.className = 'message error'; return; }
  if (displayedPrice && Math.abs(displayedPrice - price) > .005) {
    renderPurchase();
    msgEl.textContent = 'Цена обновилась. Проверь новую сумму и подтверди покупку ещё раз.';
    msgEl.className = 'message';
    return;
  }
  const cost = Math.round(price * qty * 100) / 100;
  if (!Number.isFinite(cost) || loadBundleFromStorage().activeId !== accountId) return;
  if (cost < 0.01) { msgEl.textContent = 'Минимальная сумма сделки — 0,01 ₽'; msgEl.className = 'message error'; return; }
  const balance = getBalance();
  if (cost > balance) {
    msgEl.textContent = 'Недостаточно средств на выбранном счёте'; msgEl.className = 'message error';
    characterMotion.react('careful', { anchor: '#purchaseQty', text: 'Карман проверил. На столько пока не хватит.' });
    return;
  }
  setBalance(balance - cost);
  const portfolio = getPortfolio();
  const i = portfolio.stocks.findIndex(h => h.ticker === ticker);
  if (i >= 0) portfolio.stocks[i].quantity = Math.round(((portfolio.stocks[i].quantity || 0) + qty) * 1e8) / 1e8;
  else portfolio.stocks.push({ ticker, quantity: qty });
  setPortfolio(portfolio);
  if (typeof appendOperationLog === 'function') {
    appendOperationLog({ kind: 'buy', ticker: ticker, quantity: qty, price: price, totalRub: cost });
  }
  if (typeof pushPortfolioToServerIfBackend === 'function') pushPortfolioToServerIfBackend();
  if (typeof authApi !== 'undefined' && authApi.isUsingBackend && authApi.isUsingBackend() && authApi.syncMyStats) {
    var st = getUserStats();
    var totalW = typeof getAggregatedWealthRub === 'function'
      ? getAggregatedWealthRub(stocks, CRYPTO_PRICES)
      : getBalance() + totalStocksValue(getPortfolio(), Object.fromEntries(stocks.map(function (s) { return [s.ticker, s.price]; }))) + totalCryptoValue(getPortfolio(), CRYPTO_PRICES);
    authApi.syncMyStats({ balanceRub: totalW, videosWatched: st.videosWatched, quizCorrectCount: st.quizCorrectCount });
  }
  msgEl.textContent = 'Успех! Куплено ' + qty + ' шт. ' + ticker + ' по ' + formatMoney(price) + ' ₽.';
  msgEl.className = 'message success';
  renderHome();
  renderPurchase();
  characterMotion.react('buy', { anchor: '#purchaseMessage', text: 'Бумага в портфеле! Место в кармане нашлось.' });

  } finally {
    purchasePending = false;
    purchaseButton.disabled = false;
  }
}

function gameIconSvg(iconId) {
  var id = iconId || 'puzzle';
  var common = ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"';
  var svgs = {
    chart: '<svg' + common + ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26V6M4 26h22M8 20l5-8 5 6 7-12"/></svg>',
    quiz: '<svg' + common + ' fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="16" cy="16" r="11"/><path d="M12 18c1 2 3 3 4 3s3-1 4-3M13 11h.01M19 11h.01"/></svg>',
    idea: '<svg' + common + ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M16 4a6 6 0 0 0-3 11.2V18h6v-2.8A6 6 0 0 0 16 4z"/><path d="M13 22h6M14 26h4"/></svg>',
    runner: '<svg' + common + ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="2"/><path d="M10 11v5l-3 8M10 16l4 3 4-2M22 8l3 4"/></svg>',
    rug: '<svg' + common + ' fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 24L10 8l6 10 4-14 8 20"/><path d="M6 26h20"/></svg>',
    puzzle: '<svg' + common + ' fill="none" stroke="currentColor" stroke-width="1.75"><rect x="5" y="5" width="9" height="9" rx="1"/><rect x="18" y="5" width="9" height="9" rx="1"/><rect x="5" y="18" width="9" height="9" rx="1"/><path d="M18 18h5a2 2 0 0 1 2 2v5"/></svg>'
  };
  return svgs[id] || svgs.puzzle;
}

function renderGameList() {
  var accentById = { victorina: 'accent-red', quiz: 'accent-red', choice: 'accent-gold', runner: 'accent-mix', rugpull: 'accent-red' };
  var tags = { victorina: 'Реакция на новости', quiz: 'Логика рынка', choice: 'Жизненные ситуации', runner: 'Аркада', rugpull: 'Лаборатория риска' };
  var practice = getPracticeProgress();
  var rewardLabels = { quiz: 'Первая практика: +20 XP', choice: 'Первая практика: +15 XP', runner: '10 очков за пробежку: +10 XP' };
  document.getElementById('gameCards').innerHTML = DATA.games.map(g => {
    var iconHtml = g.iconId ? gameIconSvg(g.iconId) : ('<span class="icon-fallback">' + escapeHtml(g.icon || '') + '</span>');
    var ac = accentById[g.id] || 'accent-violet';
    return `<a href="#" class="game-card ` + ac + `" data-game="${escapeHtml(g.id)}">
      <span class="game-card-icon">${iconHtml}</span>
      <div class="game-card-body">
        <span class="game-mode-tag">${tags[g.id] || 'Практика'}</span>
        <h3>${escapeHtml(g.title)}</h3>
        <p>${escapeHtml(g.subtitle)}</p>
        ${rewardLabels[g.id] ? '<span class="game-practice-note">' + (practice.completed[g.id] ? '✓ Практика сегодня пройдена' : rewardLabels[g.id]) + '</span>' : ''}
      </div>
      <span class="game-card-chevron" aria-hidden="true">›</span>
    </a>`;
  }).join('');
  var wallet = document.getElementById('playWallet');
  if (!wallet) { wallet = document.createElement('div'); wallet.id = 'playWallet'; wallet.className = 'play-wallet'; document.getElementById('gameCards').before(wallet); }
  wallet.innerHTML = '<span>Опыт: <strong>' + getVictorinaXp() + ' XP</strong></span><span>Кошелёк: <strong>' + getRublixBalance() + ' рубликсов</strong></span><span>Практика: <strong>' + practice.count + '/3</strong></span>';
}

// ——— Rug pull game ———
let rugpullBalance = getRugpullBalance();
let rugpullInvested = 0;
let rugpullMultiplier = 1;
let rugpullPhase = 'idle';
let rugpullHistory = [1];
let rugpullTimer = null;
let rugpullOwner = null;
let rugpullLastStake = 0;
let rugpullLastResult = '';
let rugpullPreset = null;
const RUGPULL_TICK_MS = 220;
const RUGPULL_GROWTH = [1.02, 1.10];
const RUGPULL_INSTANT_RUG = 0.05;

function syncRugpullOwner() {
  var owner = getStorageUserSuffix();
  if (rugpullOwner === owner) return;
  stopRugpullTimer();
  rugpullOwner = owner;
  rugpullPhase = 'idle'; rugpullInvested = 0; rugpullMultiplier = 1; rugpullHistory = [1]; rugpullLastResult = '';
  try {
    var saved = JSON.parse(lsGetScoped('rubliks_rugpull_round') || 'null');
    if (saved && saved.phase === 'pumping' && Number.isFinite(saved.invested) && saved.invested > 0 && Number.isFinite(saved.multiplier) && saved.multiplier >= 1 && Array.isArray(saved.history) && saved.history.length <= 80 && saved.history.every(n => Number.isFinite(n) && n > 0)) {
      rugpullPhase = 'pumping'; rugpullInvested = saved.invested; rugpullLastStake = saved.invested; rugpullMultiplier = saved.multiplier; rugpullHistory = saved.history.length ? saved.history : [1];
    }
  } catch (_) {}
}
function persistRugpullRound() {
  lsSetScoped('rubliks_rugpull_round', JSON.stringify({ phase: rugpullPhase, invested: rugpullInvested, multiplier: rugpullMultiplier, history: rugpullHistory }));
}
function rugpullAmount() {
  var value = document.getElementById('rugpullBet').value.replace(/[\s\u00a0\u202f]/g, '');
  return /^\d+(?:[.,]\d{0,2})?$/.test(value) ? Number(value.replace(',', '.')) : NaN;
}
function updateRugpullBet() {
  var amount = rugpullAmount();
  var balance = getRugpullBalance();
  document.getElementById('rugpullBetHint').textContent = Number.isFinite(amount) && amount > 0
    ? 'Под риском: ' + formatMoney(amount) + ' ₽' + (balance > 0 ? ' · ' + Math.round(amount / balance * 100) + '% учебного банка' : '') : 'Выбери плашку или введи сумму больше нуля.';
  document.querySelectorAll('[data-rug-amount], [data-rug-percent]').forEach(function (button) {
    var n = button.dataset.rugAmount ? Number(button.dataset.rugAmount) : Math.floor(balance * Number(button.dataset.rugPercent)) / 100;
    button.disabled = n <= 0 || n > balance || rugpullPhase !== 'idle';
    var selected = n === amount && (rugpullPreset ? button === rugpullPreset : !!button.dataset.rugAmount);
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function rugProbability() {
  return Math.min(0.78, 0.015 + (rugpullMultiplier - 1) * 0.065);
}

function rugpullTick() {
  if (rugpullPhase !== 'pumping') return;
  if (Math.random() < rugProbability()) {
    rugpullPhase = 'crashed';
    rugpullInvested = 0;
    rugpullHistory.push(0);
    rugpullLastResult = 'Потеряно: ' + formatMoney(rugpullLastStake) + ' ₽. Это и есть риск обнуления.';
    persistRugpullRound();
    setRugpullBalance(rugpullBalance);
    renderRugpull();
    stopRugpullTimer();
    characterMotion.react('bump', { anchor: '#rugpullChart', text: 'Вот и риск. Хорошо, что деньги учебные.' });
    return;
  }
  rugpullMultiplier *= (RUGPULL_GROWTH[0] + Math.random() * (RUGPULL_GROWTH[1] - RUGPULL_GROWTH[0]));
  rugpullHistory.push(rugpullMultiplier);
  if (rugpullHistory.length > 80) rugpullHistory.shift();
  persistRugpullRound();
  drawRugpullChart();
  document.getElementById('rugpullMultiplier').textContent = rugpullMultiplier.toFixed(2);
  document.getElementById('rugpullCurrent').textContent = 'Сейчас: ' + formatMoney(rugpullInvested * rugpullMultiplier) + ' ₽';
}

function startRugpullTimer() {
  stopRugpullTimer();
  rugpullTimer = setInterval(rugpullTick, RUGPULL_TICK_MS);
}

function stopRugpullTimer() {
  if (rugpullTimer) clearInterval(rugpullTimer);
  rugpullTimer = null;
}

function drawRugpullChart() {
  const canvas = document.getElementById('rugpullChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 140;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (rugpullHistory.length < 2) {
    ctx.strokeStyle = '#B9A8C9';
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    return;
  }
  const lastCrashed = rugpullHistory[rugpullHistory.length - 1] === 0;
  const min = lastCrashed ? 0 : Math.min(...rugpullHistory) * 0.98;
  const max = Math.max(...rugpullHistory) * 1.02;
  const range = max - min || 1;
  ctx.strokeStyle = lastCrashed ? '#AE3E35' : '#26704F';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const stepX = w / (rugpullHistory.length - 1);
  for (let i = 0; i < rugpullHistory.length; i++) {
    const v = rugpullHistory[i];
    const x = i * stepX;
    const y = h - 8 - ((v - min) / range) * (h - 16);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function rugpullInvest() {
  syncRugpullOwner();
  if (rugpullPhase !== 'idle') return;
  rugpullBalance = getRugpullBalance();
  const amount = rugpullAmount();
  if (!Number.isFinite(amount) || amount <= 0 || amount > rugpullBalance) {
    document.getElementById('rugpullError').textContent = !Number.isFinite(amount) || amount <= 0 ? 'Введи сумму больше нуля, до двух знаков после запятой.' : 'В учебном банке не хватает денег на эту сумму.';
    document.getElementById('rugpullBet').setAttribute('aria-invalid', 'true');
    characterMotion.react('point', { anchor: '#rugpullBet', text: 'Выбери готовую сумму или введи свою. Она должна помещаться в твой учебный банк.' });
    companion.highlight('#rugpullBet');
    return;
  }
  document.getElementById('rugpullError').textContent = '';
  document.getElementById('rugpullBet').removeAttribute('aria-invalid');
  rugpullLastStake = amount;
  rugpullLastResult = '';
  rugpullBalance = Math.round((rugpullBalance - amount) * 100) / 100;
  rugpullInvested = amount;
  rugpullMultiplier = 1;
  rugpullHistory = [1];
  setRugpullBalance(rugpullBalance);
  if (Math.random() < RUGPULL_INSTANT_RUG) {
    rugpullPhase = 'crashed';
    rugpullInvested = 0;
    rugpullHistory.push(0);
    rugpullLastResult = 'Потеряно: ' + formatMoney(amount) + ' ₽. Падение бывает и сразу после входа.';
  } else {
    rugpullPhase = 'pumping';
    startRugpullTimer();
  }
  persistRugpullRound();
  renderRugpull();
  document.getElementById('rugpullBet').blur();
  if (rugpullPhase === 'pumping') document.getElementById('rugpullSell').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  characterMotion.react(rugpullPhase === 'crashed' ? 'bump' : 'careful', {
    anchor: '#rugpullChart', text: rugpullPhase === 'crashed' ? 'Вот и риск. Хорошо, что деньги учебные.' : 'Выглядит бодро. Но пол может исчезнуть.'
  });
}

function rugpullSell() {
  if (rugpullPhase !== 'pumping' || rugpullInvested <= 0) return;
  stopRugpullTimer();
  var payout = Math.round(rugpullInvested * rugpullMultiplier * 100) / 100;
  rugpullBalance = Math.round((getRugpullBalance() + payout) * 100) / 100;
  rugpullLastResult = 'Выведено: ' + formatMoney(payout) + ' ₽ · результат раунда: +' + formatMoney(payout - rugpullLastStake) + ' ₽.';
  rugpullInvested = 0;
  rugpullPhase = 'idle';
  setRugpullBalance(rugpullBalance);
  persistRugpullRound();
  renderRugpull();
  characterMotion.react('relief', { anchor: '#rugpullChart', text: 'Фух, вышли. От риска это всё равно не лечит.' });
}

function renderRugpull() {
  syncRugpullOwner();
  document.getElementById('screen-rugpull').classList.toggle('rugpull-live', rugpullPhase === 'pumping');
  rugpullBalance = getRugpullBalance();
  document.getElementById('rugpullBalance').textContent = formatMoney(rugpullBalance) + ' ₽';
  document.getElementById('rugpullIdle').classList.toggle('hidden', rugpullPhase !== 'idle');
  document.getElementById('rugpullPumping').classList.toggle('hidden', rugpullPhase !== 'pumping');
  document.getElementById('rugpullCrashed').classList.toggle('hidden', rugpullPhase !== 'crashed');
  document.getElementById('rugpullResetBank').classList.toggle('hidden', rugpullBalance > 0 || rugpullPhase !== 'idle');
  document.getElementById('rugpullInvest').disabled = rugpullBalance <= 0;
  document.getElementById('rugpullBet').disabled = rugpullBalance <= 0;
  document.getElementById('rugpullResult').textContent = rugpullLastResult;
  document.getElementById('rugpullResult').classList.toggle('hidden', !rugpullLastResult || rugpullPhase !== 'idle');
  updateRugpullBet();
  if (rugpullPhase === 'pumping') {
    if (!rugpullTimer) startRugpullTimer();
    document.getElementById('rugpullMultiplier').textContent = rugpullMultiplier.toFixed(2);
    document.getElementById('rugpullCurrent').textContent = 'Сейчас: ' + formatMoney(rugpullInvested * rugpullMultiplier) + ' ₽';
  }
  drawRugpullChart();
}

function rugpullPlayAgain() {
  rugpullPhase = 'idle';
  rugpullInvested = 0;
  rugpullMultiplier = 1;
  rugpullHistory = [1];
  rugpullLastResult = '';
  persistRugpullRound();
  renderRugpull();
}

// ——— Init & events ———
document.querySelectorAll('.tab-item').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.getAttribute('data-tab')));
});

document.getElementById('linkAllStocks').addEventListener('click', e => {
  e.preventDefault();
  loadStocks().then(function () {
    updateStocksSearchHint();
    renderStocksFull();
    showScreen('stocks');
  });
});

var linkSearchStocks = document.getElementById('linkSearchStocks');
if (linkSearchStocks) {
  linkSearchStocks.addEventListener('click', function (e) {
    e.preventDefault();
    loadStocks().then(function () {
      stocksSearchQuery = '';
      var inp = document.getElementById('stocksSearchInput');
      if (inp) inp.value = '';
      updateStocksSearchHint();
      renderStocksFull();
      showScreen('stocks');
      setTimeout(function () {
        var i2 = document.getElementById('stocksSearchInput');
        if (i2) { i2.focus(); }
      }, 80);
    });
  });
}

document.getElementById('btnBackStocks').addEventListener('click', () => {
  showScreen('home');
  renderHome();
});

document.getElementById('btnStocksSortMovers').addEventListener('click', function () {
  stocksFullSortMode = 'movers';
  document.getElementById('btnStocksSortMovers').classList.add('active');
  document.getElementById('btnStocksSortAlpha').classList.remove('active');
  renderStocksFull();
});
document.getElementById('btnStocksSortAlpha').addEventListener('click', function () {
  stocksFullSortMode = 'alpha';
  document.getElementById('btnStocksSortAlpha').classList.add('active');
  document.getElementById('btnStocksSortMovers').classList.remove('active');
  renderStocksFull();
});

document.getElementById('btnBackChart').addEventListener('click', () => {
  destroyCharts();
  showScreen('home');
  renderHome();
});

var secTabsEl = document.querySelector('.security-tabs');
if (secTabsEl) {
  secTabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.sec-tab');
    if (!b) return;
    showSecurityTab(b.getAttribute('data-sec-tab'));
  });
}

var btnFav = document.getElementById('btnSecurityFav');
if (btnFav) {
  btnFav.addEventListener('click', function () {
    if (typeof toggleFavoriteTicker === 'function') toggleFavoriteTicker(currentChartSecid);
    updateSecurityChrome();
    if (homeViewMode === 'fav') renderHomeFavorites();
  });
}

var btnShr = document.getElementById('btnSecurityShare');
if (btnShr) {
  btnShr.addEventListener('click', function () {
    var title = 'Рубликс — ' + currentChartSecid;
    var url = typeof location !== 'undefined' ? location.href : '';
    if (navigator.share) {
      navigator.share({ title: title, text: 'Смотрю бумагу ' + currentChartSecid + ' в Рубликс', url: url }).catch(function () {});
    } else if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).then(function () { alert('Ссылка на страницу скопирована'); }).catch(function () { alert('Не удалось скопировать ссылку'); });
    } else if (url) prompt('Скопируй ссылку на Рубликс:', url);
  });
}

var btnSellChart = document.getElementById('btnSellFromChart');
if (btnSellChart) {
  btnSellChart.addEventListener('click', function () {
    loadStocks().then(function () { renderSell(); showScreen('sell'); });
  });
}

var btnIss = document.getElementById('btnIssuerMedia');
if (btnIss) {
  btnIss.addEventListener('click', function () {
    alert('Видео и карточки эмитента подключим, когда появится контент и права на материалы.');
  });
}

var hsm = document.getElementById('homeSubMain');
if (hsm) {
  hsm.addEventListener('click', function () {
    homeViewMode = 'main';
    renderHome();
  });
}
var hsf = document.getElementById('homeSubFav');
if (hsf) {
  hsf.addEventListener('click', function () {
    homeViewMode = 'fav';
    renderHome();
  });
}

var ppd = document.getElementById('pillPortfolioDay');
if (ppd) {
  ppd.addEventListener('click', function () {
    portfolioPillMode = 'day';
    renderHome();
  });
}
var ppa = document.getElementById('pillPortfolioAll');
if (ppa) {
  ppa.addEventListener('click', function () {
    portfolioPillMode = 'all';
    renderHome();
  });
}

var bOp = document.getElementById('btnHomeOperations');
if (bOp) bOp.addEventListener('click', function () { showScreen('operations'); });
var bAn = document.getElementById('btnHomeAnalytics');
if (bAn) bAn.addEventListener('click', function () { showScreen('analytics'); });
var bBuy = document.getElementById('btnHomeBuy');
if (bBuy) bBuy.addEventListener('click', function () { showScreen('stocks'); });

function openPortfolioAccountsModal() {
  var modal = document.getElementById('portfolioAccountsModal');
  var listEl = document.getElementById('portfolioAccountsModalList');
  if (!modal || !listEl) return;
  var btnNew = document.getElementById('btnCreatePortfolioAccount');
  var accounts = typeof getPortfolioAccounts === 'function' ? getPortfolioAccounts() : [];
  if (btnNew) {
    var max = typeof subscriptionMaxPortfolioAccounts === 'function' ? subscriptionMaxPortfolioAccounts() : 5;
    var atLimit = accounts.length >= max;
    btnNew.disabled = atLimit;
    btnNew.title = atLimit ? ('По тарифу не больше ' + max + ' счетов. Смени план в профиле (демо).') : '';
  }
  var activeId = null;
  try {
    var b = loadBundleFromStorage();
    activeId = b.activeId;
  } catch (e) {}
  listEl.innerHTML = accounts.map(function (a) {
    var active = a.id === activeId ? ' is-active' : '';
    return '<li><button type="button" class="portfolio-acc-item' + active + '" data-portfolio-id="' + escapeHtml(a.id) + '"><strong>' + escapeHtml(a.name) + '</strong><br><span style="font-size:13px;color:#757575">' + formatMoney(a.balanceRub) + ' ₽ на счёте</span></button></li>';
  }).join('');
  listEl.querySelectorAll('.portfolio-acc-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pid = btn.getAttribute('data-portfolio-id');
      if (pid && typeof setActivePortfolioAccount === 'function') setActivePortfolioAccount(pid);
      if (typeof pushPortfolioToServerIfBackend === 'function') pushPortfolioToServerIfBackend();
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      renderHome();
    });
  });
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

var pac = document.getElementById('portfolioAccountChip');
if (pac) {
  pac.addEventListener('click', function () { openPortfolioAccountsModal(); });
}

(function () {
  var modal = document.getElementById('portfolioAccountsModal');
  var back = document.getElementById('portfolioAccountsModalBackdrop');
  var done = document.getElementById('portfolioAccountsModalDone');
  var btnNew = document.getElementById('btnCreatePortfolioAccount');
  function closeM() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (back) back.addEventListener('click', closeM);
  if (done) done.addEventListener('click', closeM);
  if (btnNew) {
    btnNew.addEventListener('click', function () {
      var name = typeof prompt === 'function' ? prompt('Название счёта', 'Игровой счёт') : '';
      if (name === null) return;
      var created = typeof createPortfolioAccount === 'function' ? createPortfolioAccount(name || 'Новый счёт') : null;
      if (created === null) {
        alert('Достигнут лимит счетов для текущего тарифа. Открой «Тариф» в профиле и выбери другой план (в демо оплаты нет).');
        return;
      }
      renderHome();
      openPortfolioAccountsModal();
    });
  }
})();

document.querySelectorAll('.inst-chip').forEach(function (chip) {
  chip.addEventListener('click', function () {
    var kind = chip.getAttribute('data-inst');
    if (kind === 'stocks') {
      document.querySelectorAll('.inst-chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      return;
    }
    alert('Сейчас в демо доступны только акции TQBR. Остальные инструменты — в следующих версиях.');
  });
});

var bBackAn = document.getElementById('btnBackAnalytics');
if (bBackAn) bBackAn.addEventListener('click', function () { showScreen('home'); });
var bBackOp = document.getElementById('btnBackOperations');
if (bBackOp) bBackOp.addEventListener('click', function () { showScreen('home'); });

var stocksSearchInp = document.getElementById('stocksSearchInput');
if (stocksSearchInp) {
  stocksSearchInp.addEventListener('input', function () {
    stocksSearchQuery = stocksSearchInp.value || '';
    renderStocksFull();
  });
}

(function () {
  var hm = document.getElementById('headerHelpModal');
  var hb = document.getElementById('headerHelpModalBackdrop');
  var hd = document.getElementById('headerHelpModalDone');
  function closeHeaderHelp() {
    if (!hm) return;
    hm.classList.add('hidden');
    hm.setAttribute('aria-hidden', 'true');
  }
  if (hb) hb.addEventListener('click', closeHeaderHelp);
  if (hd) hd.addEventListener('click', closeHeaderHelp);
})();

var btnHdrHelp = document.getElementById('btnHeaderHelp');
if (btnHdrHelp) {
  btnHdrHelp.addEventListener('click', function () {
    var m = document.getElementById('headerHelpModal');
    if (m) {
      m.classList.remove('hidden');
      m.setAttribute('aria-hidden', 'false');
    }
  });
}

document.getElementById('btnBuyStock').addEventListener('click', async () => {
  renderPurchase();
  showScreen('purchase');
});

document.getElementById('btnBackPurchase').addEventListener('click', () => showScreen('chart'));

document.getElementById('purchaseTicker').addEventListener('change', updatePurchaseTotal);
document.getElementById('purchaseQty').addEventListener('input', updatePurchaseTotal);
document.getElementById('btnPurchase').addEventListener('click', doPurchase);

document.getElementById('btnBackRugpull').addEventListener('click', function () {
  stopRugpullTimer();
  showScreen('game');
});

// ——— Quiz ———
var quizState = { index: 0, correct: 0, selected: null, showExplanation: false, items: [] };

function startQuiz() {
  quizState.index = 0;
  quizState.correct = 0;
  quizState.selected = null;
  quizState.showExplanation = false;
  quizState.finished = false;
  quizState.items = typeof getQuizDeck === 'function' ? getQuizDeck() : (DATA.quizItems || []);
  if (!quizState.items.length) quizState.items = DATA.quizItems || [];
  var tag = document.getElementById('quizNavTagline');
  if (tag) {
    tag.textContent = quizState.items.length + ' вопросов · объяснения после каждого ответа';
    tag.classList.remove('hidden');
  }
  var navTitle = document.querySelector('#screen-quiz .nav-title');
  if (navTitle) navTitle.textContent = 'Дневной квиз';
  renderQuizStep();
}

function renderQuizStep() { renderQuestionGame('quiz'); }

var choiceState = { index: 0, correct: 0, selected: null, showExplanation: false, finished: false };
function renderChoice() {
  choiceState = { index: 0, correct: 0, selected: null, showExplanation: false, finished: false };
  renderChoiceStep();
}
function renderChoiceStep() { renderQuestionGame('choice'); }

function renderQuestionGame(mode) {
  var isQuiz = mode === 'quiz';
  var state = isQuiz ? quizState : choiceState;
  var items = isQuiz ? quizState.items : DATA.choiceItems;
  var container = document.getElementById(mode + 'Content');
  if (!container) return;
  var done = state.index >= items.length;
  var guideId = mode + 'Guide';
  if (done) {
    if (!state.finished) state.reward = awardPracticeRound(mode);
    if (!state.finished && isQuiz) {
      var stats = getUserStats();
      stats.quizCorrectCount = (stats.quizCorrectCount || 0) + state.correct;
      setUserStats(stats);
    }
    state.finished = true;
    container.innerHTML = '<div class="quiz-play-area"><section class="quiz-hero" id="' + guideId + '"></section>' +
      '<div class="quiz-done quiz-done-card"><p class="quiz-done-eyebrow">Раунд пройден</p><h3 class="quiz-done-title">' + (isQuiz ? 'Результат' : 'Ситуации пройдены') +
      '</h3><p class="quiz-result">' + state.correct + ' из ' + items.length + ' верных</p><p class="practice-reward" role="status">' + practiceRewardText(state.reward) + '</p><button type="button" class="btn-primary" id="' + mode + 'Again">Ещё раунд</button>' +
      '<button type="button" class="btn-text" id="' + mode + 'Close">Закрыть</button></div></div>';
    companion.attach(document.getElementById(guideId), {
      avatarId: mode + 'AvatarWrap', mood: 'victory', essential: true,
      text: state.correct === items.length ? 'Чистый раунд! А теперь попробуй объяснить один из ответов своими словами.' : 'Раунд в кармане. Ошибки показали, какие темы можно подтянуть — это тоже прогресс.',
      target: '.quiz-result'
    });
    document.getElementById(mode + 'Close').addEventListener('click', function () { showScreen('game'); });
    document.getElementById(mode + 'Again').addEventListener('click', function () { if (isQuiz) startQuiz(); else renderChoice(); });
    return;
  }
  var item = items[state.index];
  var correct = state.selected === item.correctAnswerIndex;
  var options = item.options.map(function (option, i) {
    var cls = 'quiz-option' + (isQuiz ? '' : ' choice-option');
    if (state.showExplanation) {
      if (i === item.correctAnswerIndex) cls += ' correct';
      else if (i === state.selected) cls += ' wrong';
    }
    return '<button type="button" class="' + cls + '" data-idx="' + i + '" data-letter="' + ['А', 'Б', 'В', 'Г'][i] + '"' +
      (state.showExplanation ? ' disabled' : '') + '>' + escapeHtml(option) + '</button>';
  }).join('');
  var explanation = state.showExplanation
    ? '<div class="quiz-explanation-block"><p class="quiz-feedback ' + (correct ? 'correct' : 'wrong') + '">' +
      (correct ? 'Верно! Связь найдена.' : 'Правильный ответ: ' + escapeHtml(item.options[item.correctAnswerIndex])) + '</p><p class="buddy-hidden-explanation">' + escapeHtml(item.explanation) + '</p></div>' : '';
  container.innerHTML = '<div class="quiz-play-area"><p class="quiz-progress"><span class="quiz-progress-track"><span class="quiz-progress-fill" style="width:' +
    Math.round(state.index / items.length * 100) + '%"></span></span>' + (isQuiz ? 'Вопрос ' : 'Ситуация ') + (state.index + 1) + ' / ' + items.length +
    ' · Верно: ' + state.correct + '</p><section class="quiz-hero" id="' + guideId + '"></section>' +
    '<div class="quiz-question-card" id="' + mode + 'Question" tabindex="-1">' + escapeHtml(item.question) + '</div>' +
    explanation + '<div class="quiz-options">' + options + '</div>' +
    (state.showExplanation ? '<button type="button" class="btn-primary" id="' + mode + 'Next">' + (state.index + 1 >= items.length ? 'Результат' : 'Дальше') + ' →</button>' : '') + '</div>';
  companion.attach(document.getElementById(guideId), {
    essential: state.showExplanation,
    avatarId: mode + 'AvatarWrap',
    mood: state.showExplanation ? (correct ? 'correct' : 'think') : 'point',
    text: state.showExplanation ? item.explanation :
      'Выбери вариант. Потом разберём логику вместе.',
    target: '#' + mode + 'Question',
    tips: isQuiz ? ['Спроси себя: что изменилось для компании или инвестора? Цена не растёт просто потому, что новость звучит громко.'] :
      ['Сначала оцени риск и свои цели. Обещание быстрой прибыли само по себе не делает решение хорошим.']
  });
  if (!state.showExplanation) {
    container.querySelectorAll('.quiz-option').forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.selected != null) return;
        state.selected = Number(button.dataset.idx);
        if (state.selected === item.correctAnswerIndex) state.correct++;
        state.showExplanation = true;
        renderQuestionGame(mode);
        document.getElementById(mode + 'Next').focus({ preventScroll: true });
      });
    });
  } else {
    document.getElementById(mode + 'Next').addEventListener('click', function () {
      state.index++;
      state.selected = null;
      state.showExplanation = false;
      renderQuestionGame(mode);
      var question = document.getElementById(mode + 'Question');
      if (question) question.focus({ preventScroll: true });
    });
  }
}
document.getElementById('btnBackQuiz').addEventListener('click', function () { showScreen('game'); });
document.getElementById('btnBackChoice').addEventListener('click', function () { showScreen('game'); });

function practiceRewardText(reward) {
  return reward && reward.awarded ? '+' + reward.xp + ' XP и +' + reward.rublix + (reward.rublix === 1 ? ' рубликс' : ' рубликса') + ' за первую практику дня.' : 'Сегодня эта награда уже получена. Можно повторять ради практики.';
}

// ——— Runner: one input model and pixel-aligned visual/collision geometry ———
var runnerEngine = {
  phase: 'start', score: 0, lives: 3, characterY: .85, characterVelocity: 0,
  isCrouching: false, items: [], groundOffset: 0, bestScore: 0, gamePlayTime: 0,
  gravity: .0026, jumpForce: -.044, groundY: .85, baseSpeed: .0095,
  spawnInterval: 1050, speedGrowthPerSecond: .008, maxSpeedMultiplier: 2,
  crouchDropBoost: .018, charCenterX: .22, minusPenalty: 10,
  sceneWidth: 300, sceneHeight: 300, invulnerableUntil: 0, isNewBest: false,
  rafId: null, spawnTimer: null
};
function runnerStart() {
  runnerStopLoop();
  Object.assign(runnerEngine, { phase: 'playing', score: 0, lives: 3, characterY: runnerEngine.groundY,
    characterVelocity: 0, isCrouching: false, items: [], groundOffset: 0, gamePlayTime: 0,
    bestScore: getRunnerBestScore(), invulnerableUntil: 0, isNewBest: false });
  runnerEngine.reward = null;
  runnerEngine.items = [{ id: 'warmup-1', x: .72, y: .68, type: 'coin' }, { id: 'warmup-2', x: 1.05, y: .57, type: 'coin' }];
  renderRunner();
}
function runnerResize() {
  var area = document.getElementById('runnerGameArea');
  if (area && area.clientWidth) { runnerEngine.sceneWidth = area.clientWidth; runnerEngine.sceneHeight = area.clientHeight; }
  var speech = document.getElementById('runnerSpeech');
  if (speech && !speech.hidden) { speech._speechWidth = speech.offsetWidth; speech._speechHeight = speech.offsetHeight; }
  if (runnerEngine.phase === 'playing' || runnerEngine.phase === 'paused') runnerRenderGame();
}
function runnerBox() {
  var w = runnerEngine.sceneWidth, h = runnerEngine.sceneHeight;
  var x = runnerEngine.charCenterX * w, feet = runnerEngine.characterY * h;
  return { left: x - 15, right: x + 15, top: feet - (runnerEngine.isCrouching ? 36 : 66), bottom: feet - 2 };
}
function runnerItemBox(item) {
  var x = item.x * runnerEngine.sceneWidth, y = item.y * runnerEngine.sceneHeight;
  var halfW = item.type === 'coin' ? 16 : item.type === 'rock' ? 22 : 26;
  var halfH = item.type === 'coin' ? 16 : item.type === 'rock' ? 18 : 14;
  return { left: x - halfW, right: x + halfW, top: y - halfH, bottom: y + halfH };
}
function runnerStartLoop() {
  if (runnerEngine.rafId != null) cancelAnimationFrame(runnerEngine.rafId);
  var last = performance.now();
  function tick(now) {
    if (runnerEngine.phase !== 'playing') return;
    var dt = Math.min((now - last) / 1000, .05); last = now;
    runnerEngine.gamePlayTime += dt;
    var speed = runnerEngine.baseSpeed * (1 + Math.min(runnerEngine.gamePlayTime * runnerEngine.speedGrowthPerSecond, runnerEngine.maxSpeedMultiplier - 1));
    runnerEngine.groundOffset = (runnerEngine.groundOffset + speed * 60 * dt) % .4;
    runnerEngine.characterVelocity += runnerEngine.gravity * 60 * dt;
    if (runnerEngine.isCrouching && runnerEngine.characterY < runnerEngine.groundY) runnerEngine.characterVelocity += runnerEngine.crouchDropBoost * 60 * dt;
    runnerEngine.characterY = Math.max(.2, runnerEngine.characterY + runnerEngine.characterVelocity * 60 * dt);
    if (runnerEngine.characterY >= runnerEngine.groundY) { runnerEngine.characterY = runnerEngine.groundY; runnerEngine.characterVelocity = 0; }
    var character = runnerBox(), remaining = [];
    for (var item of runnerEngine.items) {
      item.x -= speed * 60 * dt;
      if (item.x * runnerEngine.sceneWidth < -50) continue;
      var box = runnerItemBox(item);
      var hit = character.left < box.right && character.right > box.left && character.top < box.bottom && character.bottom > box.top;
      if (!hit) { remaining.push(item); continue; }
      if (item.type === 'coin') {
        runnerEngine.score += 10;
        characterMotion.play(document.querySelector('.runner-character-inner'), 'coin');
      } else if (item.type === 'minus') {
        runnerEngine.score = Math.max(0, runnerEngine.score - runnerEngine.minusPenalty);
        companion.runner('−10 очков. Под плашками можно присесть.', 'think');
      } else if (runnerEngine.gamePlayTime >= runnerEngine.invulnerableUntil) {
        runnerEngine.lives--;
        runnerEngine.invulnerableUntil = runnerEngine.gamePlayTime + .85;
        companion.runner('Камень! Есть секунда передышки. Прыгай заранее.', 'bump');
        if (runnerEngine.lives <= 0) {
          runnerEngine.isNewBest = runnerEngine.score > runnerEngine.bestScore;
          if (runnerEngine.isNewBest) { runnerEngine.bestScore = runnerEngine.score; setRunnerBestScore(runnerEngine.score); }
          runnerEngine.reward = runnerEngine.score >= 10 ? awardPracticeRound('runner') : null;
          runnerEngine.phase = 'over'; runnerStopLoop(); renderRunner(); return;
        }
      }
    }
    runnerEngine.items = remaining;
    runnerRenderGame();
    runnerEngine.rafId = requestAnimationFrame(tick);
  }
  runnerEngine.rafId = requestAnimationFrame(tick);
}
function runnerSpawn() {
  if (runnerEngine.phase !== 'playing') return;
  var roll = Math.random(), type = roll < .5 ? 'coin' : roll < .75 ? 'rock' : 'minus';
  var y = type === 'coin' ? .57 + Math.random() * .1 : type === 'rock'
    ? runnerEngine.groundY - 18 / runnerEngine.sceneHeight
    : runnerEngine.groundY - 57 / runnerEngine.sceneHeight;
  runnerEngine.items.push({ id: Math.random(), x: 1.12, y, type });
}
function runnerStopLoop() {
  if (runnerEngine.rafId != null) cancelAnimationFrame(runnerEngine.rafId);
  if (runnerEngine.spawnTimer != null) clearInterval(runnerEngine.spawnTimer);
  runnerEngine.rafId = null; runnerEngine.spawnTimer = null;
}
function runnerJump() {
  if (runnerEngine.phase !== 'playing' || runnerEngine.isCrouching || runnerEngine.characterVelocity < 0 || runnerEngine.characterY < runnerEngine.groundY - .01) return;
  runnerEngine.characterVelocity = runnerEngine.jumpForce;
  characterMotion.play(document.querySelector('.runner-character-inner'), 'jump');
}
function runnerSetCrouch(value) {
  runnerEngine.isCrouching = value && runnerEngine.phase === 'playing';
  if (value) characterMotion.stop(document.querySelector('.runner-character-inner'));
  if (document.getElementById('runnerCrouchBtn')) document.getElementById('runnerCrouchBtn').setAttribute('aria-pressed', String(runnerEngine.isCrouching));
}
function runnerPause() {
  if (runnerEngine.phase !== 'playing') return;
  runnerEngine.phase = 'paused'; runnerStopLoop(); runnerSetCrouch(false);
  document.getElementById('runnerPauseLayer').hidden = false;
  document.getElementById('runnerPauseBtn').textContent = 'Продолжить';
  document.getElementById('runnerJumpBtn').disabled = true;
  document.getElementById('runnerCrouchBtn').disabled = true;
  document.getElementById('runnerResume').focus({ preventScroll: true });
}
function runnerResume() {
  if (runnerEngine.phase !== 'paused') return;
  runnerEngine.phase = 'playing';
  document.getElementById('runnerPauseLayer').hidden = true;
  document.getElementById('runnerPauseBtn').textContent = 'Пауза';
  document.getElementById('runnerJumpBtn').disabled = false;
  document.getElementById('runnerCrouchBtn').disabled = false;
  runnerEngine.spawnTimer = setInterval(runnerSpawn, runnerEngine.spawnInterval);
  runnerStartLoop();
  document.getElementById('runnerGameArea').focus({ preventScroll: true });
}
function runnerRenderGame() {
  var area = document.getElementById('runnerGameArea');
  if (!area) return;
  var w = runnerEngine.sceneWidth, h = runnerEngine.sceneHeight;
  var character = document.getElementById('runnerCharacter');
  character.style.width = '72px'; character.style.height = '72px';
  character.style.left = runnerEngine.charCenterX * w - 36 + 'px';
  character.style.top = runnerEngine.characterY * h - 72 + 'px';
  character.style.transform = runnerEngine.isCrouching ? 'scaleY(.56)' : 'none';
  character.style.transformOrigin = 'center bottom';
  character.classList.toggle('is-invulnerable', runnerEngine.gamePlayTime < runnerEngine.invulnerableUntil);
  var speech = document.getElementById('runnerSpeech');
  if (!speech.hidden) {
    var speechX = Math.max(12, Math.min(runnerEngine.charCenterX * w - 28, w - (speech._speechWidth || 220) - 12));
    var speechY = Math.max(8, runnerEngine.characterY * h - 82 - (speech._speechHeight || 54));
    speech.style.transform = 'translate(' + (speechX - 16) + 'px,' + (speechY - 12) + 'px)';
  }
  characterMotion.runStep(character.querySelector('.runner-character-inner'), runnerEngine.gamePlayTime, runnerEngine.isCrouching, runnerEngine.characterY < runnerEngine.groundY - .01);
  document.getElementById('runnerItems').innerHTML = runnerEngine.items.map(function (item) {
    var cls = item.type === 'coin' ? 'runner-coin' : item.type === 'rock' ? 'runner-rock' : 'runner-minus';
    return '<div class="' + cls + '" style="left:' + item.x * w + 'px;top:' + item.y * h + 'px">' + (item.type === 'coin' ? '₽' : item.type === 'minus' ? '−10' : '') + '</div>';
  }).join('');
  document.getElementById('runnerScore').textContent = runnerEngine.score;
  document.getElementById('runnerLives').innerHTML = [1,2,3].map(i => '<span class="runner-heart">' + (i <= runnerEngine.lives ? '♥' : '♡') + '</span>').join('');
  document.getElementById('runnerGround').style.backgroundPosition = runnerEngine.groundOffset * w + 'px 0';
}
function renderRunner() {
  var container = document.getElementById('runnerContent');
  if (!container) return;
  runnerStopLoop();
  if (runnerEngine.phase === 'start' || runnerEngine.phase === 'over') {
    var over = runnerEngine.phase === 'over';
    runnerEngine.bestScore = getRunnerBestScore();
    container.innerHTML = '<div class="runner-start"><section id="runnerGuide"><div class="runner-start-avatar buddy-avatar" id="runnerStartAvatar"></div></section>' +
      '<h3 class="runner-start-title">' + (over ? 'Стоп! Отличная пробежка.' : 'Вперёд, инвестор!') + '</h3>' +
      '<p class="runner-start-desc">Собирай монеты. Перепрыгивай камни. Под плашками «−10» приседай.</p>' +
      '<div class="runner-badges"><div class="runner-badge"><span class="runner-badge-coin">₽</span>+10 очков</div><div class="runner-badge">Камень −1 жизнь</div></div>' +
      (over ? '<p class="runner-over-score">Очки: ' + runnerEngine.score + '</p>' + (runnerEngine.isNewBest ? '<p class="runner-new-record">Новый рекорд!</p>' : '') + '<p class="practice-reward" role="status">' + (runnerEngine.reward ? practiceRewardText(runnerEngine.reward) : 'Собери хотя бы одну монету за пробежку, чтобы получить награду за практику.') + '</p>' : '') +
      '<p class="runner-record">Личный рекорд: ' + runnerEngine.bestScore + '</p><button type="button" class="btn-primary runner-btn-start" id="runnerBtnStart">' + (over ? 'Ещё раз' : 'Бежать!') + '</button></div>';
    companion.attach(document.getElementById('runnerGuide'), {
      avatar: document.getElementById('runnerStartAvatar'), mood: over ? (runnerEngine.isNewBest ? 'victory' : 'proud') : 'welcome',
      text: over ? 'Результат — ' + runnerEngine.score + ' очков. Смотри на препятствие заранее: прыжок и приседание решают разные задачи.' :
        'Я бегу, ты рулишь! Пробел или ↑ — прыжок. Удерживай ↓ для приседания. На телефоне есть две большие кнопки.',
      target: '#runnerBtnStart', tips: ['Под плашкой −10 приседай, а через камень прыгай. При столкновении есть короткая передышка.', 'Нажми «Пауза» или P, если нужно отдохнуть. В другой вкладке игра тоже остановится.']
    });
    document.getElementById('runnerBtnStart').addEventListener('click', runnerStart);
    return;
  }
  var paused = runnerEngine.phase === 'paused';
  container.innerHTML = '<div class="runner-game-wrap"><div class="runner-hud"><span><strong id="runnerScore">0</strong> очков</span><span id="runnerLives" class="runner-lives"></span><button type="button" id="runnerPauseBtn" class="play-small-btn">' + (paused ? 'Продолжить' : 'Пауза') + '</button></div>' +
    '<div id="runnerGameArea" class="runner-game-area" tabindex="0" aria-label="Игровое поле. Пробел — прыжок, стрелка вниз — присесть.">' +
    '<div id="runnerGround" class="runner-ground"></div><div id="runnerItems" class="runner-items"></div><div id="runnerCharacter" class="runner-character"><div class="runner-character-inner"></div></div>' +
    '<div id="runnerSpeech" class="runner-speech" role="status" hidden></div>' +
    '<div id="runnerPauseLayer" class="runner-pause-layer"' + (paused ? '' : ' hidden') + '><strong>Передышка</strong><p>Очки и жизни на месте. Таймер не идёт.</p><button type="button" id="runnerResume" class="btn-primary">Продолжить</button></div></div>' +
    '<div class="runner-controls"><button type="button" id="runnerJumpBtn" class="btn-primary">↑ Прыжок</button><button type="button" id="runnerCrouchBtn" class="runner-crouch-btn" aria-label="Присесть" aria-pressed="false">↓ Удерживай</button></div></div>';
  renderCharacterAvatar(document.querySelector('.runner-character-inner'), getCharacterAppearance(), 72, { fullBody: true });
  runnerResize();
  var area = document.getElementById('runnerGameArea'), crouch = document.getElementById('runnerCrouchBtn');
  area.addEventListener('pointerdown', function (event) { if (event.target.closest('button') || event.button > 0) return; event.preventDefault(); runnerJump(); });
  document.getElementById('runnerJumpBtn').addEventListener('click', runnerJump);
  crouch.addEventListener('pointerdown', function (event) {
    event.preventDefault(); runnerSetCrouch(true);
    try { crouch.setPointerCapture(event.pointerId); } catch (_) {}
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => crouch.addEventListener(name, function () { runnerSetCrouch(false); }));
  crouch.addEventListener('keydown', function (event) {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); runnerSetCrouch(true);
  });
  crouch.addEventListener('keyup', function (event) {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); runnerSetCrouch(false);
  });
  crouch.addEventListener('click', function (event) { if (event.detail === 0) runnerSetCrouch(!runnerEngine.isCrouching); });
  document.getElementById('runnerPauseBtn').addEventListener('click', function () { if (runnerEngine.phase === 'paused') runnerResume(); else runnerPause(); });
  document.getElementById('runnerResume').addEventListener('click', runnerResume);
  if (!paused) {
    runnerEngine.spawnTimer = setInterval(runnerSpawn, runnerEngine.spawnInterval);
    runnerStartLoop();
    companion.runner('↑ Прыжок. ↓ Удерживай, чтобы присесть. Поехали!', 'point');
    area.focus({ preventScroll: true });
  }
}
document.addEventListener('keydown', function (event) {
  if (!document.getElementById('screen-runner').classList.contains('active') || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  var key = event.key.toLowerCase();
  if (event.target.closest('button') && [' ', 'enter'].includes(key)) return;
  if (key === 'p' || key === 'з' || key === 'escape') {
    event.preventDefault(); if (event.repeat) return;
    if (runnerEngine.phase === 'playing') runnerPause(); else if (runnerEngine.phase === 'paused') runnerResume();
  } else if (runnerEngine.phase === 'playing' && [' ', 'arrowup', 'w', 'ц'].includes(key)) {
    event.preventDefault(); if (!event.repeat) runnerJump();
  } else if (runnerEngine.phase === 'playing' && ['arrowdown', 's', 'ы'].includes(key)) {
    event.preventDefault(); runnerSetCrouch(true);
  }
});
document.addEventListener('keyup', function (event) { if (['ArrowDown','s','S','ы','Ы'].includes(event.key)) runnerSetCrouch(false); });
window.addEventListener('pointerup', function () { if (runnerEngine.isCrouching) runnerSetCrouch(false); });
window.addEventListener('blur', function () { runnerSetCrouch(false); });
window.addEventListener('resize', runnerResize);
document.getElementById('btnBackRunner').addEventListener('click', function () {
  runnerStopLoop(); runnerEngine.phase = 'start'; runnerSetCrouch(false); showScreen('game');
});
document.getElementById('rugpullInvest').addEventListener('click', rugpullInvest);
document.getElementById('rugpullSell').addEventListener('click', rugpullSell);
document.getElementById('rugpullBet').addEventListener('input', function () {
  rugpullPreset = null;
  document.getElementById('rugpullError').textContent = '';
  document.getElementById('rugpullBet').removeAttribute('aria-invalid');
  updateRugpullBet();
});
document.querySelectorAll('[data-rug-amount], [data-rug-percent]').forEach(function (button) {
  button.addEventListener('click', function () {
    if (rugpullPhase !== 'idle' || button.disabled) return;
    var amount = button.dataset.rugAmount ? Number(button.dataset.rugAmount) : Math.floor(getRugpullBalance() * Number(button.dataset.rugPercent)) / 100;
    rugpullPreset = button;
    document.getElementById('rugpullBet').value = String(amount);
    document.getElementById('rugpullError').textContent = '';
    document.getElementById('rugpullBet').removeAttribute('aria-invalid');
    updateRugpullBet();
    characterMotion.react('tap', { anchor: button, text: 'Выбрали ' + formatMoney(amount) + ' ₽. Это учебные деньги, но риск потерять всю ставку остаётся.' });
    companion.highlight('#rugpullBet', 'tap', document.getElementById('buddy-rugpull'));
  });
});
document.getElementById('rugpullResetBank').addEventListener('click', function () {
  if (rugpullPhase !== 'idle' || getRugpullBalance() > 0) return;
  setRugpullBalance(10000);
  rugpullLastResult = ''; document.getElementById('rugpullBet').value = '1000';
  renderRugpull();
  characterMotion.react('explain', { anchor: '#rugpullBet', text: 'Новая учебная попытка. Попробуй меньшую долю банка и сравни последствия.' });
});

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    if (runnerEngine.phase === 'playing') runnerPause();
    pauseVictorina(true);
    stopRugpullTimer();
  } else if (document.getElementById('screen-rugpull').classList.contains('active')) renderRugpull();
});
document.getElementById('rugpullPlayAgain').addEventListener('click', rugpullPlayAgain);

document.getElementById('btnSell').addEventListener('click', () => {
  showScreen('sell');
  renderSell();
});

// ——— Sell screen ———
let sellSheetHolding = null;

function renderSell() {
  const portfolio = getPortfolio();
  const prices = Object.fromEntries(stocks.map(s => [s.ticker, s.price]));
  const stockList = document.getElementById('sellStockList');
  const cryptoList = document.getElementById('sellCryptoList');
  const emptyEl = document.getElementById('sellEmpty');
  stockList.innerHTML = '';
  cryptoList.innerHTML = '';
  let hasAny = false;
  (portfolio.stocks || []).forEach(h => {
    const val = (h.quantity || 0) * (prices[h.ticker] || 0);
    if (h.quantity > 0) {
      hasAny = true;
      stockList.innerHTML += `<div class="sell-row">
        <div class="sell-row-info">
          <span class="ticker">${escapeHtml(h.ticker)}</span>
          <span class="meta">${formatQty(h.quantity || 0)} шт. · ${val > 0 ? formatMoney(val) + ' ₽' : 'цена недоступна'}</span>
        </div>
        <button type="button" class="btn-sell-small" ${!prices[h.ticker] || stocks.find(s => s.ticker === h.ticker)?.stale ? 'disabled' : ''} data-sell-stock="${escapeHtml(h.ticker)}" data-qty="${h.quantity}">Продать</button>
      </div>`;
    }
  });
  (portfolio.crypto || []).forEach(h => {
    const val = (h.amount || 0) * (CRYPTO_PRICES[h.symbol] || 0);
    if (h.amount > 0) {
      hasAny = true;
      cryptoList.innerHTML += `<div class="sell-row">
        <div class="sell-row-info">
          <span class="ticker">${escapeHtml(h.symbol)}</span>
          <span class="meta">${formatCrypto(h.amount || 0)} · ${formatMoney(val)} ₽</span>
        </div>
        <button type="button" class="btn-sell-small" data-sell-crypto="${escapeHtml(h.symbol)}" data-amount="${h.amount}">Продать</button>
      </div>`;
    }
  });
  emptyEl.classList.toggle('hidden', hasAny);
}

function formatQty(v) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 }).format(v);
}
function formatCrypto(v) {
  return v.toFixed(6);
}

function openSellSheet(type, tickerOrSymbol, qtyOrAmount) {
  document.getElementById('sellSheetMessage').textContent = '';
  sellSheetHolding = { type, tickerOrSymbol, qtyOrAmount };
  document.getElementById('sellSheetTitle').textContent = type === 'stock' ? 'Продать ' + tickerOrSymbol : 'Продать ' + tickerOrSymbol;
  const input = document.getElementById('sellSheetQty');
  input.value = type === 'stock' ? String(qtyOrAmount) : String(qtyOrAmount);
  input.dataset.max = String(qtyOrAmount);
  updateSellSheetTotal();
  document.getElementById('sellSheet').classList.remove('hidden');
}

function updateSellSheetTotal() {
  if (!sellSheetHolding) return;
  const input = document.getElementById('sellSheetQty');
  const parsed = Number((input.value || '0').replace(',', '.'));
  const val = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  document.getElementById('sellSheetMessage').textContent = '';
  const priceVal = sellSheetHolding.type === 'stock'
    ? (stocks.find(s => s.ticker === sellSheetHolding.tickerOrSymbol)?.price ?? 0)
    : (CRYPTO_PRICES[sellSheetHolding.tickerOrSymbol] ?? 0);
  document.getElementById('sellSheetTotal').textContent = formatMoney(val * priceVal);
}

let salePending = false;
async function confirmSell() {
  if (salePending) return;
  if (!sellSheetHolding) return;
  salePending = true;
  const saleButton = document.getElementById('sellSheetConfirm');
  saleButton.disabled = true;
  const holding = { ...sellSheetHolding };
  const accountId = loadBundleFromStorage().activeId;
  try {
  const input = document.getElementById('sellSheetQty');
  const val = Number((input.value || '0').replace(',', '.'));
  const max = parseFloat(sellSheetHolding.qtyOrAmount) || 0;
  if (!Number.isFinite(val) || val <= 0 || val > max) {
    document.getElementById('sellSheetMessage').textContent = 'Укажи количество больше 0 и не больше ' + formatQty(max);
    return;
  }
  const portfolio = getPortfolio();
  if (sellSheetHolding.type === 'stock') {
    const displayedPrice = stocks.find(s => s.ticker === sellSheetHolding.tickerOrSymbol)?.price;
    const price = await fetchCurrentPrice(sellSheetHolding.tickerOrSymbol) ?? 0;
    if (!sellSheetHolding || sellSheetHolding.tickerOrSymbol !== holding.tickerOrSymbol || loadBundleFromStorage().activeId !== accountId) return;
    const owned = portfolio.stocks.find(h => h.ticker === holding.tickerOrSymbol);
    if (!owned || owned.quantity < val) return;
    if (price <= 0) {
      document.getElementById('sellSheetMessage').textContent = 'Биржа не ответила. Продажа не выполнена — попробуй ещё раз.';
      document.getElementById('sellMessage').textContent = 'Не удалось получить актуальную цену';
      document.getElementById('sellMessage').className = 'message error';
      return;
    }
    if (displayedPrice && Math.abs(displayedPrice - price) > .005) {
      updateSellSheetTotal();
      document.getElementById('sellSheetMessage').textContent = 'Цена обновилась. Проверь сумму и подтверди продажу ещё раз.';
      return;
    }
    const rub = Math.round(val * price * 100) / 100;
    if (rub < 0.01) { document.getElementById('sellSheetMessage').textContent = 'Минимальная сумма сделки — 0,01 ₽'; return; }
    setBalance(getBalance() + rub);
    const i = portfolio.stocks.findIndex(h => h.ticker === sellSheetHolding.tickerOrSymbol);
    if (i >= 0) {
      portfolio.stocks[i].quantity = Math.round((portfolio.stocks[i].quantity - val) * 1e8) / 1e8;
      if (portfolio.stocks[i].quantity <= 0) portfolio.stocks.splice(i, 1);
    }
    document.getElementById('sellMessage').textContent = 'Успех! Продано ' + formatQty(val) + ' ' + sellSheetHolding.tickerOrSymbol + ' по ' + formatMoney(price) + ' ₽ на ' + formatMoney(rub) + ' ₽.';
    if (typeof appendOperationLog === 'function') {
      appendOperationLog({ kind: 'sell', ticker: sellSheetHolding.tickerOrSymbol, quantity: val, price: price, totalRub: rub });
    }
  } else {
    const price = CRYPTO_PRICES[sellSheetHolding.tickerOrSymbol] ?? 0;
    const rub = Math.round(val * price * 100) / 100;
    if (rub < 0.01) { document.getElementById('sellSheetMessage').textContent = 'Минимальная сумма сделки — 0,01 ₽'; return; }
    setBalance(getBalance() + rub);
    const i = portfolio.crypto.findIndex(h => h.symbol === sellSheetHolding.tickerOrSymbol);
    if (i >= 0) {
      portfolio.crypto[i].amount -= val;
      if (portfolio.crypto[i].amount <= 0) portfolio.crypto.splice(i, 1);
    }
    document.getElementById('sellMessage').textContent = 'Успех! Продано ' + formatCrypto(val) + ' ' + sellSheetHolding.tickerOrSymbol + ' на ' + formatMoney(rub) + ' ₽.';
    if (typeof appendOperationLog === 'function') {
      appendOperationLog({ kind: 'sell', ticker: sellSheetHolding.tickerOrSymbol, quantity: val, totalRub: rub });
    }
  }
  document.getElementById('sellMessage').className = 'message success';
  setPortfolio(portfolio);
  if (typeof pushPortfolioToServerIfBackend === 'function') pushPortfolioToServerIfBackend();
  if (typeof authApi !== 'undefined' && authApi.isUsingBackend && authApi.isUsingBackend() && authApi.syncMyStats) {
    var st2 = getUserStats();
    var totalW2 = typeof getAggregatedWealthRub === 'function'
      ? getAggregatedWealthRub(stocks, CRYPTO_PRICES)
      : getBalance() + totalStocksValue(getPortfolio(), Object.fromEntries(stocks.map(function (s) { return [s.ticker, s.price]; }))) + totalCryptoValue(getPortfolio(), CRYPTO_PRICES);
    authApi.syncMyStats({ balanceRub: totalW2, videosWatched: st2.videosWatched, quizCorrectCount: st2.quizCorrectCount });
  }
  sellSheetHolding = null;
  document.getElementById('sellSheet').classList.add('hidden');
  renderSell();
  renderHome();
  characterMotion.react('sell', { anchor: '#sellMessage', text: 'Чек на месте. Учебные деньги снова на счёте.' });
  } finally {
    salePending = false;
    saleButton.disabled = false;
  }
}

document.getElementById('btnBackSell').addEventListener('click', () => showScreen('home'));
document.getElementById('sellSheetBackdrop').addEventListener('click', () => {
  sellSheetHolding = null;
  document.getElementById('sellSheet').classList.add('hidden');
});
document.getElementById('sellSheetCancel').addEventListener('click', () => {
  sellSheetHolding = null;
  document.getElementById('sellSheet').classList.add('hidden');
});
document.getElementById('sellSheetQty').addEventListener('input', updateSellSheetTotal);
document.getElementById('sellSheetConfirm').addEventListener('click', () => { confirmSell(); });

document.body.addEventListener('click', e => {
  const btn = e.target.closest('[data-sell-stock]');
  if (btn) {
    e.preventDefault();
    openSellSheet('stock', btn.getAttribute('data-sell-stock'), parseFloat(btn.getAttribute('data-qty')));
  }
  const btnC = e.target.closest('[data-sell-crypto]');
  if (btnC) {
    e.preventDefault();
    openSellSheet('crypto', btnC.getAttribute('data-sell-crypto'), parseFloat(btnC.getAttribute('data-amount')));
  }
});

// ——— Topic detail (как в приложении: описание темы — криптовалюта, фьючерсы, налоги, фондовый рынок) ———
function renderTopicDetail(topicId) {
  var details = DATA.topicDetails && DATA.topicDetails[topicId];
  if (!details) {
    details = { title: topicId, paragraphs: ['Материал по этой теме готовится.'], facts: [], canBuy: false, buyTitle: null, showStocksLink: false };
  }
  document.getElementById('topicDetailTitle').textContent = details.title;
  var html = '';
  html += '<section class="topic-section"><p class="topic-section-label">Материал</p>';
  (details.paragraphs || []).forEach(function (p) {
    html += '<p class="topic-paragraph">' + escapeHtml(p) + '</p>';
  });
  html += '</section>';
  if (details.facts && details.facts.length > 0) {
    html += '<section class="topic-facts"><p class="topic-facts-title">Полезно знать</p>';
    details.facts.forEach(function (f) {
      html += '<p class="topic-fact">• ' + escapeHtml(f) + '</p>';
    });
    html += '</section>';
  }
  if (details.canBuy && details.buyTitle) {
    html += '<button type="button" class="btn-primary topic-btn-buy" data-topic-action="buy" data-topic-id="' + escapeHtml(topicId) + '">🛒 ' + escapeHtml(details.buyTitle) + '</button>';
  }
  if (details.showStocksLink) {
    html += '<button type="button" class="btn-topic-outline" id="topicShowStocks">Посмотреть акции →</button>';
  }
  document.getElementById('topicDetailContent').innerHTML = html;
  var buyBtn = document.querySelector('.topic-btn-buy[data-topic-id="' + topicId + '"]');
  if (buyBtn) {
    buyBtn.addEventListener('click', function () {
      if (topicId === 'stock') {
        renderStocksFull();
        showScreen('stocks');
      } else {
        alert('Покупка ' + (topicId === 'crypto' ? 'криптовалюты' : 'фьючерсов') + ' доступна в мобильном приложении.');
      }
    });
  }
  var showStocks = document.getElementById('topicShowStocks');
  if (showStocks) {
    showStocks.addEventListener('click', function () {
      renderStocksFull();
      showScreen('stocks');
    });
  }
}

document.getElementById('btnBackTopic').addEventListener('click', function () {
  showScreen('home');
  renderHome();
});

// ——— Education, Friends, Profile ———
function renderEducation() {
  learning.library();
}

function renderFriends() {
  document.getElementById('friendsDemoHint').classList.toggle('hidden', typeof authApi !== 'undefined' && authApi.isUsingBackend());
  var friends = getFriends();
  var ranking = document.getElementById('friendsRanking').value;
  var portfolio = getPortfolio();
  var prices = Object.fromEntries(stocks.map(function (s) { return [s.ticker, s.price]; }));
  var stats = getUserStats();
  var myBalance = typeof getAggregatedWealthRub === 'function'
    ? getAggregatedWealthRub(stocks, CRYPTO_PRICES)
    : getBalance() + totalStocksValue(portfolio, prices) + totalCryptoValue(portfolio, CRYPTO_PRICES);
  var list = [{ id: 'me', name: getProfileName(), balanceRub: myBalance, videosWatched: stats.videosWatched, quizCorrectCount: stats.quizCorrectCount }].concat(friends);
  var sorted = ranking === 'balance' ? list.slice().sort(function (a, b) { return (b.balanceRub || 0) - (a.balanceRub || 0); })
    : ranking === 'videos' ? list.slice().sort(function (a, b) { return (b.videosWatched || 0) - (a.videosWatched || 0); })
    : list.slice().sort(function (a, b) { return (b.quizCorrectCount || 0) - (a.quizCorrectCount || 0); });
  document.getElementById('friendsList').innerHTML = sorted.map(function (f, i) {
    var rank = i + 1;
    var valueText = ranking === 'balance' ? formatMoney(f.balanceRub || 0) + ' ₽' : ranking === 'videos' ? (f.videosWatched || 0) + ' уроков' : (f.quizCorrectCount || 0) + ' верных';
    var isMe = f.id === 'me';
    return '<div class="friend-row ' + (rank <= 3 ? 'rank-' + rank : '') + (isMe ? ' is-me' : '') + '">' +
      '<span class="friend-rank">' + rank + '</span>' +
      (isMe ? '<span class="friend-own-avatar" id="friendsOwnAvatar"></span>' : '') +
      '<div><span class="friend-name">' + escapeHtml(f.name) + (isMe ? ' <span class="friend-me-label">(Вы)</span>' : '') + '</span></div>' +
      '<span class="friend-value">' + valueText + '</span></div>';
  }).join('');
  renderCharacterAvatar(document.getElementById('friendsOwnAvatar'), getCharacterAppearance(), 36);
}

function renderProfile() {
  var user = getCurrentUser();
  document.getElementById('profileName').textContent = getProfileName();
  document.getElementById('profileSubtitle').textContent = (typeof isGuestOnlyMode === 'function' && isGuestOnlyMode()) ? 'Прогресс в этом браузере' : (user && user.email) ? user.email : 'Рубликс';
  var lvl = getInvestorLevel();
  var lvlRu = lvl === 'pro' ? 'Юный профи' : (lvl === 'explorer' ? 'Исследователь' : 'Новичок');
  var invEl = document.getElementById('profileInvestorLevel');
  if (invEl) invEl.textContent = 'Стиль инвестора: ' + lvlRu;
  var planId = getCurrentSubscriptionId();
  var plans = getSubscriptionPlans();
  var plan = plans.find(function (p) { return p.id === planId; }) || plans[0];
  document.getElementById('profileSubscription').textContent = plan.name;
  document.getElementById('profileSubscriptionPeriod').textContent = 'Демо · без оплаты';
  document.getElementById('profileSubscriptionBar').style.background = plan.color;
  renderCharacterAvatar(document.getElementById('profileAvatar'), getCharacterAppearance(), 128, { fullBody: true });
  var progressStats = getUserStats();
  const completedLessons = learning.completed();
  document.getElementById('profileWallet').innerHTML = '<div><strong>' + getVictorinaXp() + '<span> XP</span></strong><span>Опыт</span></div><div><strong>' + getRublixBalance() + '</strong><span>Рубликсы</span></div><div><strong>' + completedLessons + '<span> / 6</span></strong><span>Миссии</span></div>';
  const badges = [
    { name: 'Есть база', count: completedLessons, target: 1, unit: 'миссия', color: '#FFF1C1', art: '<path d="M18 29q14-7 30 1 16-8 30-1v43q-15-6-30 1-15-7-30-1z" fill="#FFFDF7"/><path d="M48 30v43M27 40h12m-12 9h12m17-9h13m-13 9h13"/><path d="M57 26v17l5-4 5 4V25" fill="#E3B640"/>' },
    { name: 'В точку', count: progressStats.quizCorrectCount, target: 10, unit: 'ответов', color: '#E2EFF0', art: '<path d="m33 58-7 25 17-7 6 8 8-27" fill="#D9B15B"/><path d="m53 56 6 27 9-9 12 5-9-28" fill="#D9B15B"/><circle cx="48" cy="41" r="25" fill="#FFFDF7"/><path d="m35 41 9 9 17-19" stroke-width="5"/>' },
    { name: 'Весь маршрут', count: completedLessons, target: 6, unit: 'миссий', color: '#F8E3D8', art: '<path d="m15 24 22-6 23 8 21-7v54l-21 7-23-8-22 6z" fill="#FFFDF7"/><path d="M37 18v54m23-46v54" opacity=".5"/><path d="m24 61 8-15 15 9 16-15" stroke-dasharray="4 5"/><path d="M64 22v21m0-21 12 5-12 5" fill="#D74632"/><circle cx="24" cy="61" r="3" fill="#3E5B4B"/>' }
  ];
  document.getElementById('profileAchievements').innerHTML = badges.map(badge => {
    const count = Math.min(badge.count, badge.target);
    const done = count >= badge.target;
    return '<div class="achievement-badge" data-done="' + done + '"><svg viewBox="0 0 96 96" class="achievement-icon" aria-hidden="true" fill="none" stroke="#3E5B4B" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"><path d="M48 5 85 20v43L48 91 11 63V20z" fill="' + badge.color + '" stroke="none"/>' + badge.art + '</svg><strong>' + badge.name + '</strong><span class="achievement-progress">' + (done ? '✓ Получено' : count + ' / ' + badge.target + ' ' + badge.unit) + '</span></div>';
  }).join('');
}


document.getElementById('btnAddFriend').addEventListener('click', function () {
  var email = (document.getElementById('friendEmail') && document.getElementById('friendEmail').value || '').trim();
  var optionalName = (document.getElementById('friendName') && document.getElementById('friendName').value || '').trim();
  var emailInput = document.getElementById('friendEmail');
  if (!email || !emailInput.reportValidity()) return;
  var result = addFriendByEmail(email, optionalName);
  function done() {
    if (document.getElementById('friendEmail')) document.getElementById('friendEmail').value = '';
    if (document.getElementById('friendName')) document.getElementById('friendName').value = '';
    renderFriends();
  }
  if (result && typeof result.then === 'function') {
    result.then(done).catch(function (e) { alert(e && e.message ? e.message : 'Не удалось добавить'); });
  } else {
    if (result) done(); else alert('Уже в друзьях или пользователь не найден');
  }
});
document.getElementById('friendsRanking').addEventListener('change', renderFriends);

document.body.addEventListener('click', e => {
  const newsCard = e.target.closest('[data-article-id]');
  if (newsCard && newsCard.getAttribute('data-article-id')) {
    e.preventDefault();
    renderArticle(newsCard.getAttribute('data-article-id'));
    showScreen('article');
    return;
  }
  const articleRow = e.target.closest('.article-list-item');
  if (articleRow && articleRow.getAttribute('data-article-id')) {
    e.preventDefault();
    renderArticle(articleRow.getAttribute('data-article-id'));
    showScreen('article');
    return;
  }
  const mover = e.target.closest('.top-mover-row');
  if (mover && mover.getAttribute('data-ticker')) {
    e.preventDefault();
    chartScale = 'days';
    openSecurityScreen(mover.getAttribute('data-ticker'));
    return;
  }

  const chip = e.target.closest('.stock-chip');
  if (chip) {
    e.preventDefault();
    chartScale = 'days';
    openSecurityScreen(chip.getAttribute('data-ticker'));
    return;
  }
  const row = e.target.closest('.stock-row');
  if (row) {
    e.preventDefault();
    chartScale = 'days';
    openSecurityScreen(row.getAttribute('data-ticker'));
    return;
  }
  const hrow = e.target.closest('.holdings-row-link');
  if (hrow && hrow.getAttribute('data-ticker')) {
    e.preventDefault();
    chartScale = 'days';
    openSecurityScreen(hrow.getAttribute('data-ticker'));
    return;
  }
  const favRow = e.target.closest('.home-fav-row');
  if (favRow && favRow.getAttribute('data-ticker')) {
    e.preventDefault();
    chartScale = 'days';
    openSecurityScreen(favRow.getAttribute('data-ticker'));
    return;
  }
  const storyBtn = e.target.closest('.home-story-card');
  if (storyBtn) {
    e.preventDefault();
    showScreen('education');
    return;
  }
  var gameCard = e.target.closest('.game-card');
  if (gameCard) {
    e.preventDefault();
    var id = gameCard.getAttribute('data-game');
    if (id === 'rugpull') {
      renderRugpull();
      showScreen('rugpull');
    } else if (id === 'victorina') {
      showScreen('victorina-entry');
    } else if (id === 'quiz') {
      startQuiz();
      showScreen('quiz');
    } else if (id === 'choice') {
      renderChoice();
      showScreen('choice');
    } else if (id === 'runner') {
      renderRunner();
      showScreen('runner');
    } else {
      showScreen('game');
    }
  }
  var topicCard = e.target.closest('.topic-card');
  if (topicCard) {
    e.preventDefault();
    var topicId = topicCard.getAttribute('data-id');
    if (topicId) {
      renderTopicDetail(topicId);
      showScreen('topic');
    }
  }
  var lessonLink = e.target.closest('.lesson-link');
  if (lessonLink) {
    e.preventDefault();
    var idx = parseInt(lessonLink.getAttribute('data-lesson-index'), 10);
    var lesson = DATA.lessons[idx];
    if (lesson && lesson.youtubeUrl) window.open(lesson.youtubeUrl, '_blank', 'noopener,noreferrer');
  }
});

var chartScaleBarEl = document.getElementById('chartScaleBar');
if (chartScaleBarEl) {
  chartScaleBarEl.addEventListener('click', function (e) {
    const btn = e.target.closest('.chart-scale-btn');
    if (!btn) return;
    var scale = btn.getAttribute('data-scale');
    var allowed = typeof subscriptionChartScaleIds === 'function' ? subscriptionChartScaleIds() : ['days'];
    if (allowed.indexOf(scale) < 0) return;
    chartScale = scale;
    document.querySelectorAll('.chart-scale-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    loadChart(false);
  });
}

document.getElementById('btnLoadOlder').addEventListener('click', async () => {
  const btn = document.getElementById('btnLoadOlder');
  if (!btn || btn.classList.contains('hidden')) return;
  btn.disabled = true;
  btn.textContent = 'Загрузка…';
  await loadChart(true);
  btn.disabled = false;
  btn.textContent = 'Загрузить более старые данные';
});

window.addEventListener('resize', resizeCharts);
window.addEventListener('resize', function () {
  if (document.getElementById('screen-rugpull').classList.contains('active')) drawRugpullChart();
});

// ——— Character modal ———
function openCharacterModal() {
  characterMotion.clear();
  var app = getCharacterAppearance();
  document.getElementById('characterName').value = app.name;
  var optsEl = document.getElementById('characterOptions');
  optsEl.innerHTML = '';
  var keys = ['skinTone', 'face', 'hair', 'top', 'bottom', 'shoes', 'accessory'];
  var titles = { skinTone: 'ТОН КОЖИ', face: 'ЛИЦО', hair: 'ПРИЧЕСКА', top: 'ВЕРХНЯЯ ОДЕЖДА', bottom: 'НИЖНЯЯ ОДЕЖДА', shoes: 'ОБУВЬ', accessory: 'АКСЕССУАРЫ' };
  keys.forEach(function (key) {
    var arr = CHARACTER_OPTIONS[key];
    var prop = key === 'skinTone' ? 'skinToneIndex' : key + 'Index';
    var idx = app[prop] != null ? app[prop] : 0;
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'character-option-row';
    row.dataset.key = key;
    row.innerHTML = '<span class="opt-title">' + titles[key] + '</span><span class="opt-value">' + escapeHtml(arr[idx]) + '</span><span class="opt-chevron">›</span>';
    row.addEventListener('click', function () {
      var cur = app[prop] != null ? app[prop] : 0;
      var next = (cur + 1) % arr.length;
      app[prop] = next;
      row.querySelector('.opt-value').textContent = arr[next];
      renderCharacterAvatar(document.getElementById('characterAvatarPreview'), app, 200, { fullBody: true });
      var gesture = { hair: 'hair', shoes: 'shuffle', accessory: 'watch', face: 'correct', skinTone: 'welcome' }[key] || 'pose';
      if (key === 'accessory') gesture = ['watch', 'hair', 'groove', 'careful'][next];
      characterMotion.play(document.getElementById('characterAvatarPreview'), gesture);
    });
    optsEl.appendChild(row);
  });
  renderCharacterAvatar(document.getElementById('characterAvatarPreview'), app, 200, { fullBody: true });
  document.querySelectorAll('.character-preset').forEach(function (button) {
    button.onclick = function () {
      var presets = [
        { hairIndex: 0, topIndex: 0, bottomIndex: 0, shoesIndex: 0, accessoryIndex: 0 },
        { hairIndex: 5, topIndex: 3, bottomIndex: 4, shoesIndex: 2, accessoryIndex: 2 },
        { hairIndex: 2, topIndex: 4, bottomIndex: 0, shoesIndex: 0, accessoryIndex: 1 }
      ];
      Object.assign(app, presets[Number(button.dataset.preset)]);
      optsEl.querySelectorAll('.character-option-row').forEach(function (row) {
        var key = row.dataset.key;
        var prop = key === 'skinTone' ? 'skinToneIndex' : key + 'Index';
        row.querySelector('.opt-value').textContent = CHARACTER_OPTIONS[key][app[prop] || 0];
      });
      renderCharacterAvatar(document.getElementById('characterAvatarPreview'), app, 200, { fullBody: true, emotion: 'happy' });
      characterMotion.play(document.getElementById('characterAvatarPreview'), 'pose');
    };
  });
  document.getElementById('characterModal').classList.remove('hidden');
  characterMotion.play(document.getElementById('characterAvatarPreview'), 'welcome');
}

document.getElementById('profileCard').addEventListener('click', openCharacterModal);
document.getElementById('btnHomeCharacter').addEventListener('click', openCharacterModal);
document.getElementById('characterCancel').addEventListener('click', function () {
  characterMotion.stop(document.getElementById('characterAvatarPreview'));
  document.getElementById('characterModal').classList.add('hidden');
});
document.getElementById('characterModalBackdrop').addEventListener('click', function () {
  characterMotion.stop(document.getElementById('characterAvatarPreview'));
  document.getElementById('characterModal').classList.add('hidden');
});
document.getElementById('characterSave').addEventListener('click', function () {
  var app = getCharacterAppearance();
  app.name = (document.getElementById('characterName').value || '').trim();
  var keys = ['skinTone', 'face', 'hair', 'top', 'bottom', 'shoes', 'accessory'];
  document.querySelectorAll('#characterOptions .character-option-row').forEach(function (row) {
    var key = row.dataset.key;
    var prop = key === 'skinTone' ? 'skinToneIndex' : key + 'Index';
    var idx = CHARACTER_OPTIONS[key].indexOf(row.querySelector('.opt-value').textContent);
    if (idx >= 0) app[prop] = idx;
  });
  setCharacterAppearance(app);
  document.getElementById('characterModal').classList.add('hidden');
  renderProfile();
  renderHome();
  characterMotion.play(document.getElementById('profileAvatar'), 'pose');
  characterMotion.play(document.getElementById('homeCharacterAvatar'), 'pose');
});

// ——— Subscription modal ———
function openSubscriptionModal() {
  var current = getCurrentSubscriptionId();
  var list = document.getElementById('subscriptionPlanList');
  list.innerHTML = getSubscriptionPlans().map(function (p) {
    var selected = p.id === current ? ' selected' : '';
    var features = (p.features || []).map(function (f) { return '• ' + f; }).join('<br>');
    return '<div class="subscription-plan-item' + selected + '" data-id="' + escapeHtml(p.id) + '">' +
      '<span class="plan-bar" style="background:' + p.color + '"></span>' +
      '<div><span class="plan-name">' + (p.isBestOffer ? '<span class="plan-badge">Самый выгодный</span> ' : '') + escapeHtml(p.name) + '</span>' +
      (p.priceSubtitle ? '<p class="plan-price">' + escapeHtml(p.priceSubtitle) + '</p>' : '') +
      '<p class="plan-price">' + escapeHtml(p.price) + ' · ' + escapeHtml(p.period) + '</p>' +
      '<p class="plan-features">' + features + '</p></div>' +
      (p.id === current ? '<span class="plan-check">✓</span>' : '') + '</div>';
  }).join('');
  list.querySelectorAll('.subscription-plan-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var pid = el.getAttribute('data-id');
      if (!pid) return;
      setSubscriptionId(pid);
      list.querySelectorAll('.subscription-plan-item').forEach(function (x) { x.classList.remove('selected'); x.querySelectorAll('.plan-check').forEach(function (c) { c.remove(); }); });
      el.classList.add('selected');
      el.appendChild(document.createElement('span')).className = 'plan-check';
      el.lastChild.textContent = '✓';
      renderProfile();
    });
  });
  document.getElementById('subscriptionModal').classList.remove('hidden');
}

document.getElementById('btnSubscription').addEventListener('click', openSubscriptionModal);
document.getElementById('subscriptionDone').addEventListener('click', function () {
  document.getElementById('subscriptionModal').classList.add('hidden');
  refreshAfterSubscriptionChange();
});
document.getElementById('subscriptionModalBackdrop').addEventListener('click', function () {
  document.getElementById('subscriptionModal').classList.add('hidden');
  refreshAfterSubscriptionChange();
});

// ——— Auth ———
document.getElementById('authTabLogin').addEventListener('click', function () {
  document.getElementById('authTabLogin').classList.add('active');
  document.getElementById('authTabRegister').classList.remove('active');
  document.getElementById('authFormRegister').classList.add('hidden');
  document.getElementById('authFormLogin').classList.remove('hidden');
  document.getElementById('authError').textContent = '';
  document.getElementById('authLoginError').textContent = '';
});
document.getElementById('authTabRegister').addEventListener('click', function () {
  document.getElementById('authTabRegister').classList.add('active');
  document.getElementById('authTabLogin').classList.remove('active');
  document.getElementById('authFormLogin').classList.add('hidden');
  document.getElementById('authFormRegister').classList.remove('hidden');
  document.getElementById('authError').textContent = '';
  document.getElementById('authLoginError').textContent = '';
});
document.getElementById('authFormRegister').addEventListener('submit', function (e) {
  e.preventDefault();
  var email = (document.getElementById('authEmail').value || '').trim();
  var password = document.getElementById('authPassword').value || '';
  var confirm = document.getElementById('authConfirmPassword').value || '';
  var displayName = (document.getElementById('authDisplayName').value || '').trim();
  var err = document.getElementById('authError');
  if (!email) { err.textContent = 'Введите email'; return; }
  if (password.length < 4) { err.textContent = 'Пароль должен быть не короче 4 символов'; return; }
  if (password !== confirm) { err.textContent = 'Пароли не совпадают'; return; }
  var result = registerUser(email, password, displayName);
  if (result && typeof result.then === 'function') {
    result.then(function () {
      showAuth(false);
      enterAppAfterAuth();
    }).catch(function (e) { err.textContent = e && e.message ? e.message : 'Ошибка регистрации'; });
  } else {
    if (result) { showAuth(false); enterAppAfterAuth(); }
    else { err.textContent = 'Такой email уже зарегистрирован'; }
  }
});
document.getElementById('authFormLogin').addEventListener('submit', function (e) {
  e.preventDefault();
  var email = (document.getElementById('authLoginEmail').value || '').trim();
  var password = document.getElementById('authLoginPassword').value || '';
  var err = document.getElementById('authLoginError');
  if (!email || !password) { err.textContent = 'Введите email и пароль'; return; }
  var result = loginUser(email, password);
  if (result && typeof result.then === 'function') {
    result.then(function () {
      showAuth(false);
      enterAppAfterAuth();
    }).catch(function (e) { err.textContent = e && e.message ? e.message : 'Неверный email или пароль'; });
  } else {
    if (result) { showAuth(false); enterAppAfterAuth(); }
    else { err.textContent = 'Неверный email или пароль'; }
  }
});

document.getElementById('btnLogout').addEventListener('click', function () {
  if (typeof isGuestOnlyMode === 'function' && isGuestOnlyMode()) return;
  logoutUser();
  showAuth(true);
});

// Load — при бэкенде: проверка по токену; иначе SQLite/localStorage
(function init() {
  if (typeof ensureLocalGuestUser === 'function') ensureLocalGuestUser();
  if (typeof authApi !== 'undefined' && authApi.isUsingBackend()) {
    authApi.getMe().then(function (user) {
      if (user) {
        applyServerUserProfile(user);
        return typeof syncPortfolioFromServerIfBackend === 'function' ? syncPortfolioFromServerIfBackend() : Promise.resolve();
      }
      return Promise.reject(new Error('no user'));
    }).then(function () {
      showAuth(false);
      finishEnterApp();
    }).catch(function () { showAuth(true); });
    return;
  }
  (async function () {
    try {
      if (!isLocalOnlyScopedStorage() && typeof db !== 'undefined' && db.init) await db.init();
    } catch (e) { console.warn('DB init failed, using fallback', e); }
    if (typeof ensureLocalGuestUser === 'function') ensureLocalGuestUser();
    var user = getCurrentUser();
    if (!user) { showAuth(true); return; }
    showAuth(false);
    finishEnterApp();
  })();
})();

// ——— Онбординг, викторина, новости (кнопки) ———
document.getElementById('btnOnboardingTest').addEventListener('click', startEntranceTest);
document.getElementById('btnOnboardingSkip').addEventListener('click', function () {
  setOnboardingDone();
  showScreen('home');
});
document.getElementById('btnBackEntrance').addEventListener('click', function () {
  entranceStep = 0;
  entranceScore = 0;
  showScreen('onboarding');
});
document.getElementById('entranceBody').addEventListener('click', function (e) {
  var b = e.target.closest('.entrance-opt');
  if (!b) return;
  entranceScore += parseInt(b.getAttribute('data-score'), 10) || 0;
  entranceStep += 1;
  if (entranceStep >= (DATA.entranceTestV2 || []).length) finishEntranceTest();
  else renderEntranceStep();
});
document.getElementById('btnEntranceDone').addEventListener('click', function () { showScreen('home'); });

document.getElementById('btnBackVictorinaEntry').addEventListener('click', function () { showScreen('game'); });
document.getElementById('btnVictorinaStart').addEventListener('click', startVictorinaGame);
document.getElementById('btnBackVictorinaGame').addEventListener('click', function () { showScreen('game'); });
document.getElementById('btnVictorinaPause').addEventListener('click', function () { pauseVictorina(); });
document.getElementById('btnVictorinaNext').addEventListener('click', function () {
  if (!victorinaLocked || victorinaRoundFinished) return;
  victorinaIdx++;
  showVictorinaQuestion();
  if (victorinaIdx < 10) document.getElementById('victorinaText').focus({ preventScroll: true });
});
[0, 1, 2].forEach(function (i) {
  document.getElementById('btnVictorina' + i).addEventListener('click', function () { onVictorinaAnswer(i, false); });
});
document.getElementById('btnVictorinaAgain').addEventListener('click', function () { showScreen('victorina-entry'); });
document.getElementById('btnVictorinaToGames').addEventListener('click', function () { showScreen('game'); });

document.getElementById('linkAllNews').addEventListener('click', function (e) {
  e.preventDefault();
  showScreen('news');
});
document.getElementById('linkShortcutEdu').addEventListener('click', function (e) {
  e.preventDefault();
  showScreen('education');
});
document.getElementById('linkShortcutGames').addEventListener('click', function (e) {
  e.preventDefault();
  showScreen('game');
});
document.getElementById('linkParentReport').addEventListener('click', function (e) {
  e.preventDefault();
  showScreen('parent');
});
document.getElementById('btnBackNews').addEventListener('click', function () { showScreen('home'); });
document.getElementById('btnBackArticle').addEventListener('click', function () { showScreen(articleBackScreen); });
document.getElementById('btnBackParent').addEventListener('click', function () { showScreen('home'); });

// A visible recovery action also refreshes whichever market screen is open.
document.getElementById('btnRefreshQuotes').addEventListener('click', async function () {
  marketState.status = 'loading';
  updateQuotesRefreshLabel();
  await loadStocks();
  const id = document.querySelector('.screen.active')?.id;
  if (id === 'screen-stocks') renderStocksFull();
  if (id === 'screen-chart') { updateSecurityChrome(); await loadChart(false); }
  if (id === 'screen-sell') renderSell();
  if (id === 'screen-analytics') renderAnalytics();
});

document.getElementById('btnRetryChart').addEventListener('click', async () => { await loadStocks(); await loadChart(false); });

document.querySelectorAll('.btn-back:not([aria-label])').forEach(button => button.setAttribute('aria-label', 'Назад'));

document.addEventListener('click', event => {
  if (event.target.closest('[data-refresh-market]')) document.getElementById('btnRefreshQuotes').click();
});
