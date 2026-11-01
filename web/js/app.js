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
  var list = stocks.length ? stocks : DATA.defaultStocks;
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
    });
  } else {
    if (appEl) appEl.classList.add('hide-tab-bar');
    document.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); });
  }
  if (id === 'home') { loadStocks().then(function () { renderHome(); }); }
  else if (id === 'stocks') {
    loadStocks().then(function () {
      updateStocksSearchHint();
      renderStocksFull();
    });
  }
  else if (id === 'game') renderGameList();
  else if (id === 'education') renderEducation();
  else if (id === 'friends') {
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
  else if (id === 'analytics') { loadStocks().then(function () { renderAnalytics(); }); }
  else if (id === 'operations') renderOperations();
  else if (id === 'profile') renderProfile();
  else if (id === 'sell') { loadStocks().then(function () { renderSell(); }); }
  else if (id === 'victorina-entry') renderVictorinaEntry();
  else if (id === 'news') renderNewsList();
  else if (id === 'parent') renderParentReport();
  else if (id === 'chart') {
    ensureChartScaleAllowed();
    renderScaleBar();
    updateSecurityChrome();
    setTimeout(function () { loadChart(false); }, 40);
  }
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
  var wrap = document.getElementById('secOrderbookTable');
  var hint = document.getElementById('secOrderbookHint');
  if (!wrap) return;
  if (hint) hint.textContent = 'Загрузка стакана…';
  wrap.innerHTML = '';
  var list = stocks.length ? stocks : DATA.defaultStocks;
  var s = list.find(function (x) { return x.ticker === currentChartSecid; });
  var last = s ? s.price : null;
  var ob = typeof fetchOrderBook === 'function' ? await fetchOrderBook(currentChartSecid, 15, last) : { bids: [], asks: [], mock: true };
  if (hint) {
    hint.textContent = ob.mock
      ? 'Биржа не ответила — учебный стакан вокруг последней цены (в браузере данные MOEX иногда режутся CORS/сетью).'
      : 'Стакан заявок TQBR (MOEX ISS), лучшие цены покупки и продажи.';
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
  var dm = DATA.dividendMock || {};
  var rows = dm[currentChartSecid] || dm.DEFAULT || [];
  if (!rows.length) {
    root.innerHTML = '<p class="flow-text">Нет учебных строк выплат для этого тикера.</p>';
    return;
  }
  var thead = '<table class="dividend-table"><thead><tr><th>Отсечка</th><th>Выплата</th><th>₽ / акцию</th><th>Доходность (оценка)</th><th>Тип</th></tr></thead><tbody>';
  var body = rows.map(function (r) {
    var per = r.rubPerShare != null ? formatMoney(r.rubPerShare) : '—';
    var yld = r.estYieldPct != null ? (escapeHtml(String(r.estYieldPct)) + '% г/г') : '—';
    return '<tr><td>' + escapeHtml(r.exDate) + '</td><td>' + escapeHtml(r.payDate) + '</td><td>' + per + '</td><td>' + yld + '</td><td>' + escapeHtml(r.kind || '') + '</td></tr>';
  }).join('');
  root.innerHTML = '<p class="sec-panel-hint">Учебные примеры, не официальный календарь эмитента.</p>' + thead + body + '</tbody></table>';
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
  var list = stocks.length ? stocks : DATA.defaultStocks;
  var prices = {};
  list.forEach(function (s) { prices[s.ticker] = s.price; });
  var portfolio = getPortfolio();
  var bal = getBalance();
  var assets = totalStocksValue(portfolio, prices) + totalCryptoValue(portfolio, CRYPTO_PRICES) + (portfolio.futuresValueRub || 0);
  var totalActive = bal + assets;
  var agg = typeof getAggregatedWealthRub === 'function' ? getAggregatedWealthRub(list, CRYPTO_PRICES) : totalActive;
  var snaps = typeof getPortfolioSnapshots === 'function' ? getPortfolioSnapshots() : [];
  var useAll = analyticsPortfolioScope === 'all';
  var stockCols = ['#522C80', '#E9110B', '#FFCA04', '#9276b2', '#1a7f37', '#0066cc'];
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
    pieSlices.push({ label: 'Фьючерсы (оценка)', v: futV, color: '#6366F1' });
  }
  var totalPie = pieSlices.reduce(function (s, p) { return s + p.v; }, 0);
  var gradient = 'conic-gradient(#e2e8f0 0% 100%)';
  if (totalPie > 0.005 && pieSlices.length) {
    var accPct = 0;
    var segs = pieSlices.map(function (p) {
      var pct = (p.v / totalPie) * 100;
      var start = accPct;
      accPct += pct;
      return p.color + ' ' + start.toFixed(3) + '% ' + accPct.toFixed(3) + '%';
    });
    gradient = 'conic-gradient(' + segs.join(', ') + ')';
  }
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
  var summaryAll = '<p class="flow-text">Режим <strong>«Все счета»</strong>: суммарная оценка по всем игровым счетам — <strong>' + formatMoney(agg) + ' ₽</strong>. Диаграмма — доли <strong>акций, рублей на счетах</strong> и прочих активов (позиции по акциям суммированы).</p>';
  var pieTitle = useAll ? 'Структура капитала (все счета)' : 'Структура капитала (активный счёт)';
  var roadmap = '<h3 class="subsection-title" style="margin-top:22px">По ТЗ (следующие итерации)</h3>' +
    '<p class="flow-text subtle">График доходности с таймфреймами (день / месяц / год), общий доход за период, дивиденды и купоны, будущие выплаты, структура по отраслям и валютам, активные заявки — расширим после MVP.</p>';
  el.innerHTML = freeBanner + scopeBar + (useAll ? summaryAll : summaryActive) +
    (!useAll ? '<p class="flow-text subtle">Всего по счетам: <strong>' + formatMoney(agg) + ' ₽</strong> (для друзей и рейтинга).</p>' : '') +
    '<h3 class="subsection-title">' + pieTitle + '</h3>' +
    '<div class="analytics-pie" style="background:' + gradient + '" title="Доли в портфеле"></div>' +
    (pieSlices.length
      ? '<ul class="flow-text analytics-pie-legend" style="font-size:13px">' + pieSlices.map(function (p) {
        var pct = totalPie > 0 ? Math.round((p.v / totalPie) * 1000) / 10 : 0;
        return '<li><span class="analytics-pie-swatch" style="background:' + p.color + '"></span><span>' + escapeHtml(p.label) + ': ' + formatMoney(p.v) + ' ₽ (' + pct + '%)</span></li>';
      }).join('') + '</ul>'
      : '<p class="flow-text subtle">Нет позиций и остатка на счёте для диаграммы.</p>') +
    '<h3 class="subsection-title">Снимки оценки (раз в день)</h3>' +
    (snapHtml ? '<ul class="analytics-snap-list">' + snapHtml + '</ul>' : '<p class="flow-text subtle">Появятся после посещений главной.</p>') +
    roadmap +
    '<div class="report-block" style="margin-top:20px"><h3>Подсказка</h3><p class="flow-text">Следи за долей одной бумаги: если она занимает почти весь портфель, вспомни про диверсификацию — это учебный сценарий, не рекомендация.</p></div>';
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
    '<p class="flow-text subtle">По ТЗ: покупки, продажи, выплаты и др. В демо — сделки по акциям.</p>' +
    '<label class="label" for="operationsAccountFilter">Счёт</label>' +
    '<select id="operationsAccountFilter" class="input operations-account-filter">' + accOpts + '</select>' +
    block + subNote +
    '<h3 class="subsection-title" style="margin-top:24px">Активные заявки</h3>' +
    '<p class="flow-text">В демо доступны только рыночные сделки. Лимитные и отложенные заявки — в следующих версиях.</p>';
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
  var list = stocks.length ? stocks : DATA.defaultStocks;
  var s = list.find(function (x) { return x.ticker === t; });
  var nameEl = document.getElementById('chartSecurityName');
  var tickEl = document.getElementById('chartSecurityTicker');
  if (nameEl) nameEl.textContent = s ? s.name : t;
  if (tickEl) tickEl.textContent = t;
  var p = s ? stockDayChangePercent(s) : 0;
  var chEl = document.getElementById('chartDayChange');
  if (chEl) {
    chEl.textContent = s ? ('Изменение за день: ' + (p >= 0 ? '+' : '') + p.toFixed(2) + '% к открытию') : '—';
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
  if (metList && typeof getSecurityMetricsLines === 'function') {
    var lines = getSecurityMetricsLines(t);
    metList.innerHTML = lines.map(function (row) {
      return '<li><span class="security-metric-label">' + escapeHtml(row.label) + '</span><span class="security-metric-value">' + escapeHtml(row.value) + '</span></li>';
    }).join('');
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
  victorinaIdx = 0;
  victorinaCorrect = 0;
  victorinaTimeMs = 0;
  victorinaLocked = false;
  clearVictorinaTimers();
  showScreen('victorina-game');
  showVictorinaQuestion();
}

function showVictorinaQuestion() {
  clearVictorinaTimers();
  victorinaLocked = false;
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
    victorinaSecsLeft -= 1;
    document.getElementById('victorinaTimer').textContent = String(Math.max(0, victorinaSecsLeft));
    if (victorinaSecsLeft <= 0) {
      clearVictorinaTimers();
      onVictorinaAnswer(-1, true);
    }
  }, 1000);
}

function onVictorinaAnswer(choiceIndex, fromTimeout) {
  if (victorinaLocked) return;
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
    ex.textContent = prefix + q.explanation;
    ex.classList.remove('hidden');
  }
  var delay = ok ? 1000 : 3200;
  if (q.explanation && String(q.explanation).length > 140) delay += 600;
  victorinaExplainTimer = setTimeout(function () {
    victorinaIdx += 1;
    showVictorinaQuestion();
  }, delay);
}

function finishVictorinaRound() {
  clearVictorinaTimers();
  var won = victorinaCorrect >= 7;
  var timeSec = Math.max(1, Math.round(victorinaTimeMs / 1000));
  var xpGain = won ? 60 + victorinaCorrect * 4 : victorinaCorrect * 3;
  if (victorinaCorrect === 10) xpGain += 25;
  if (won && timeSec < 150) xpGain += 15;
  var rublixGain = won ? 12 : 0;
  if (victorinaCorrect === 10) rublixGain += 8;
  function applyRewardsAndShow(note) {
    addVictorinaXp(xpGain);
    if (rublixGain) addRublix(rublixGain);
    document.getElementById('victorinaResultTitle').textContent = won ? 'Победа в раунде!' : 'Раунд завершён';
    var stats = 'Верно: ' + victorinaCorrect + ' из 10. Время: ~' + timeSec + ' с.';
    if (!won) stats += ' Для победы нужно ≥7 верных.';
    document.getElementById('victorinaResultStats').textContent = stats;
    var rw = '+' + xpGain + ' XP';
    if (rublixGain) rw += ', +' + rublixGain + ' «Рубликсов»';
    document.getElementById('victorinaResultRewards').textContent = rw + (note ? ' ' + note : '');
    showScreen('victorina-result');
  }
  if (typeof authApi !== 'undefined' && authApi.isUsingBackend && authApi.isUsingBackend()) {
    authApi.postQuizComplete({ correctCount: victorinaCorrect, totalTimeSec: timeSec, won: won }).then(function (res) {
      if (res.ok && res.data && typeof res.data.playsToday === 'number') {
        setVictorinaPlaysTodayCount(res.data.playsToday);
        applyRewardsAndShow('');
      } else if (res.status === 429) {
        if (res.data && typeof res.data.playsToday === 'number') setVictorinaPlaysTodayCount(res.data.playsToday);
        applyRewardsAndShow('(Сервер не засчитал игру: дневной лимит. Счётчик синхронизирован.)');
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
  var list = DATA.newsArticles || [];
  document.getElementById('newsArticleList').innerHTML = list.length
    ? list.map(function (a) {
      var prev = (a.subtitle || (a.paragraphs && a.paragraphs[0]) || '').trim();
      if (prev.length > 160) prev = prev.slice(0, 157) + '…';
      return '<article class="news-list-card"><a href="#" class="article-list-item" data-article-id="' + escapeHtml(a.id) + '">' +
        '<h3>' + escapeHtml(a.title) + '</h3>' +
        '<p class="news-list-preview">' + escapeHtml(prev) + '</p>' +
        '<p class="meta">' + escapeHtml(a.date) + ' · ~' + (a.readMin || 3) + ' мин чтения</p>' +
        '<span class="news-read-btn">Читать</span></a></article>';
    }).join('')
    : '<p class="placeholder" style="padding:16px">Материалы скоро появятся.</p>';
}

function renderArticle(articleId) {
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
  var list = stocks.length ? stocks : DATA.defaultStocks;
  var portfolio = getPortfolio();
  var prices = Object.fromEntries(list.map(s => [s.ticker, s.price]));
  var assets = totalStocksValue(portfolio, prices) + totalCryptoValue(portfolio, CRYPTO_PRICES) + (portfolio.futuresValueRub || 0);
  var total = getBalance() + assets;
  var html = '<div class="report-block"><h3>Обучение</h3><div class="report-row"><span>Просмотрено уроков (метка)</span><span>' + vw + '</span></div>' +
    '<div class="report-row"><span>Верных ответов в квизах (всего)</span><span>' + qc + '</span></div>' +
    '<div class="report-row"><span>Стиль инвестора</span><span>' + escapeHtml(lvlRu) + '</span></div>' +
    '<div class="report-row"><span>XP викторины (локально)</span><span>' + getVictorinaXp() + '</span></div>' +
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
  loadStocks();
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
  var list = stocks.length ? stocks : DATA.defaultStocks;
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
    var priceStr = s ? (s.price >= 1000 ? s.price.toFixed(0) : s.price.toFixed(2)) : '—';
    return '<a href="#" class="home-fav-row" data-ticker="' + escapeHtml(t) + '"><span class="home-fav-letter" aria-hidden="true">' + escapeHtml(t.charAt(0)) + '</span><span class="home-fav-info"><strong>' + escapeHtml(t) + '</strong><span>' + escapeHtml(name) + '</span></span><span class="home-fav-meta"><span class="home-fav-price">' + priceStr + ' ₽</span><span class="home-fav-chg chg ' + cl + '">' + (p >= 0 ? '+' : '') + p.toFixed(2) + '%</span></span></a>';
  }).join('');
}

function renderHome() {
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

  const list = stocks.length ? stocks : DATA.defaultStocks;
  const portfolio = getPortfolio();
  const prices = Object.fromEntries(list.map(s => [s.ticker, s.price]));
  const totalStocks = totalStocksValue(portfolio, prices);
  const totalCrypto = totalCryptoValue(portfolio, CRYPTO_PRICES);
  const assetsTotal = totalStocks + totalCrypto + (portfolio.futuresValueRub || 0);
  const portfolioTotalRub = balance + assetsTotal;
  if (typeof recordPortfolioSnapshot === 'function') recordPortfolioSnapshot(portfolioTotalRub);
  const dayCh = portfolioDayChangeRub(portfolio, list);
  var homeTotal = document.getElementById('homePortfolioTotal');
  var homeDay = document.getElementById('homePortfolioDay');
  var chipLab = document.getElementById('portfolioChipLabel');
  if (chipLab && typeof getActivePortfolioAccountName === 'function') chipLab.textContent = getActivePortfolioAccountName();
  if (homeTotal) homeTotal.textContent = formatMoney(portfolioTotalRub) + ' ₽';

  var pillDay = document.getElementById('pillPortfolioDay');
  var pillAll = document.getElementById('pillPortfolioAll');
  if (pillDay) pillDay.classList.toggle('active', portfolioPillMode === 'day');
  if (pillAll) pillAll.classList.toggle('active', portfolioPillMode === 'all');

  if (homeDay) {
    homeDay.classList.remove('up', 'down');
    if (portfolioPillMode === 'day') {
      var chStr = (dayCh >= 0 ? '+' : '') + formatMoney(dayCh) + ' ₽ за день (оценка по котировкам)';
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
        homeDay.textContent = 'За всё время: переключись на «За день» или открой Аналитику — снимки растут при заходе на главную.';
      }
    }
  }

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

  const articles = DATA.newsArticles || [];
  const newsEl = document.getElementById('newsCarousel');
  if (newsEl) {
    if (articles.length) {
      newsEl.innerHTML = articles.slice(0, 4).map(function (a) {
        return '<a href="#" class="news-card" data-article-id="' + escapeHtml(a.id) + '"><h3>' + escapeHtml(a.title) + '</h3><p>' + escapeHtml(a.subtitle || '') + '</p><span class="link-all">Читать материал →</span></a>';
      }).join('');
    } else {
      newsEl.innerHTML = (DATA.news || []).map(function (n) {
        return '<article class="news-card"><h3>' + escapeHtml(n.title) + '</h3><p>' + escapeHtml(n.snippet) + '</p></article>';
      }).join('');
    }
  }

  const listEl = document.getElementById('stocksList');
  if (listEl) {
    listEl.innerHTML = list.slice(0, 6).map(s => {
      const ch = stockDayChangePercent(s);
      const changeClass = ch >= 0 ? 'up' : 'down';
      const priceStr = s.price >= 1000 ? s.price.toFixed(0) : s.price.toFixed(2);
      return `<a href="#" class="stock-chip" data-ticker="${escapeHtml(s.ticker)}">
      <span class="stock-identity"><span class="ticker">${escapeHtml(s.ticker)}</span><span class="stock-company">${escapeHtml(s.name || s.ticker)}</span></span>
      <span class="price">${priceStr} ₽</span>
      <span class="change ${changeClass}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span>
    </a>`;
    }).join('');
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
  if (total <= 0) {
    holdSection.classList.add('hidden');
  } else {
    holdSection.classList.remove('hidden');
    let html = '';
    portfolio.stocks.forEach(h => {
      const val = (h.quantity || 0) * (prices[h.ticker] || 0);
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
  var d = new Date();
  const demo = stocks.some(function (s) { return s.mock; });
  el.textContent = (demo ? 'Демо-котировки · ' : 'MOEX · ') + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
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
        if (s) document.getElementById('chartPrice').textContent = formatMoney(s.price);
        updateSecurityChrome();
      }
    }).catch(function () {});
  }, STOCKS_POLL_MS);
}

async function loadStocks() {
  if (!stocks.length) {
    stocks = mockStocksForTickers(tickersForMoexRequest());
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
      if (s) document.getElementById('chartPrice').textContent = formatMoney(s.price);
      updateSecurityChrome();
    }
  }).catch(function () {});
});

function renderScaleBar() {
  const allScales = [
    { id: 'allTime', label: 'Всё время' },
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
  const candles = appendOlder && chartCandles.length
    ? (await fetchOlderCandles(currentChartSecid, chartScale, chartCandles[0].time)).concat(chartCandles)
    : await fetchCandles(currentChartSecid, chartScale);
  if (requestId !== chartRequestId) return;
  if (!appendOlder) chartCandles = candles;
  else if (candles.length > chartCandles.length) chartCandles = candles;
  if (loadingEl) loadingEl.classList.add('hidden');
  const lastPrice = buildCharts('candlestickChart', 'volumeChart', chartCandles);
  document.getElementById('chartPrice').textContent = lastPrice != null ? formatMoney(lastPrice) : '—';
  document.getElementById('btnBuyTicker').textContent = currentChartSecid;
  const loadOlderBtn = document.getElementById('btnLoadOlder');
  if (loadOlderBtn) loadOlderBtn.classList.toggle('hidden', !chartCandles.length);
  updateSecurityChrome();
}

function renderStocksFull() {
  const list = stocks.length ? stocks : DATA.defaultStocks;
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
    const priceStr = s.price >= 1000 ? s.price.toFixed(0) : s.price.toFixed(2);
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
    `<option value="${escapeHtml(s.ticker)}" ${s.ticker === currentChartSecid ? 'selected' : ''}>${escapeHtml(s.ticker)} — ${s.price >= 1000 ? s.price.toFixed(0) : s.price.toFixed(2)} ₽</option>`
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
  if (!Number.isFinite(qty) || qty <= 0) { msgEl.textContent = 'Введите корректное количество'; msgEl.className = 'message error'; return; }
  const accountId = loadBundleFromStorage().activeId;
  const price = await fetchCurrentPrice(ticker) || (stocks.find(s => s.ticker === ticker)?.price) || 0;
  if (price <= 0) { msgEl.textContent = 'Не удалось получить цену'; msgEl.className = 'message error'; return; }
  const cost = price * qty;
  if (!Number.isFinite(cost) || loadBundleFromStorage().activeId !== accountId) return;
  const balance = getBalance();
  if (cost > balance) { msgEl.textContent = 'Недостаточно средств на выбранном счёте'; msgEl.className = 'message error'; return; }
  setBalance(balance - cost);
  const portfolio = getPortfolio();
  const i = portfolio.stocks.findIndex(h => h.ticker === ticker);
  if (i >= 0) portfolio.stocks[i].quantity = (portfolio.stocks[i].quantity || 0) + qty;
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
  setTimeout(() => { msgEl.textContent = ''; }, 2000);
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
  document.getElementById('gameCards').innerHTML = DATA.games.map(g => {
    var iconHtml = g.iconId ? gameIconSvg(g.iconId) : ('<span class="icon-fallback">' + escapeHtml(g.icon || '') + '</span>');
    var ac = accentById[g.id] || 'accent-violet';
    return `<a href="#" class="game-card ` + ac + `" data-game="${escapeHtml(g.id)}">
      <span class="game-card-icon">${iconHtml}</span>
      <div class="game-card-body">
        <h3>${escapeHtml(g.title)}</h3>
        <p>${escapeHtml(g.subtitle)}</p>
      </div>
      <span class="game-card-chevron" aria-hidden="true">›</span>
    </a>`;
  }).join('');
}

// ——— Rug pull game ———
let rugpullBalance = getRugpullBalance();
let rugpullInvested = 0;
let rugpullMultiplier = 1;
let rugpullPhase = 'idle';
let rugpullHistory = [1];
let rugpullTimer = null;
const RUGPULL_TICK_MS = 220;
const RUGPULL_GROWTH = [1.02, 1.10];
const RUGPULL_INSTANT_RUG = 0.05;

function rugProbability() {
  return Math.min(0.78, 0.015 + (rugpullMultiplier - 1) * 0.065);
}

function rugpullTick() {
  if (rugpullPhase !== 'pumping') return;
  if (Math.random() < rugProbability()) {
    rugpullPhase = 'crashed';
    rugpullInvested = 0;
    rugpullHistory.push(0);
    setRugpullBalance(rugpullBalance);
    renderRugpull();
    stopRugpullTimer();
    return;
  }
  rugpullMultiplier *= (RUGPULL_GROWTH[0] + Math.random() * (RUGPULL_GROWTH[1] - RUGPULL_GROWTH[0]));
  rugpullHistory.push(rugpullMultiplier);
  if (rugpullHistory.length > 80) rugpullHistory.shift();
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
  if (!canvas || rugpullHistory.length < 2) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const min = Math.min(...rugpullHistory.filter(x => x > 0));
  const max = Math.max(...rugpullHistory);
  const range = max - min || 1;
  const lastCrashed = rugpullHistory[rugpullHistory.length - 1] === 0;
  ctx.strokeStyle = lastCrashed ? '#cf363b' : '#0a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const stepX = w / (rugpullHistory.length - 1);
  for (let i = 0; i < rugpullHistory.length; i++) {
    const v = rugpullHistory[i];
    const x = i * stepX;
    const y = v === 0 ? h : h - ((v - min) / range) * (h * 0.9) - h * 0.05;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function rugpullInvest() {
  if (rugpullPhase !== 'idle') return;
  const amount = Number((document.getElementById('rugpullBet').value || '0').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0 || amount > rugpullBalance) return;
  rugpullBalance -= amount;
  rugpullInvested = amount;
  rugpullMultiplier = 1;
  rugpullHistory = [1];
  setRugpullBalance(rugpullBalance);
  if (Math.random() < RUGPULL_INSTANT_RUG) {
    rugpullPhase = 'crashed';
    rugpullInvested = 0;
    rugpullHistory.push(0);
  } else {
    rugpullPhase = 'pumping';
    startRugpullTimer();
  }
  renderRugpull();
}

function rugpullSell() {
  if (rugpullPhase !== 'pumping' || rugpullInvested <= 0) return;
  stopRugpullTimer();
  rugpullBalance += rugpullInvested * rugpullMultiplier;
  rugpullInvested = 0;
  rugpullPhase = 'idle';
  rugpullMultiplier = 1;
  rugpullHistory = [1];
  setRugpullBalance(rugpullBalance);
  renderRugpull();
}

function renderRugpull() {
  rugpullBalance = getRugpullBalance();
  document.getElementById('rugpullBalance').textContent = formatMoney(rugpullBalance) + ' ₽';
  document.getElementById('rugpullIdle').classList.toggle('hidden', rugpullPhase !== 'idle');
  document.getElementById('rugpullPumping').classList.toggle('hidden', rugpullPhase !== 'pumping');
  document.getElementById('rugpullCrashed').classList.toggle('hidden', rugpullPhase !== 'crashed');
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
    }
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
var bEarn = document.getElementById('btnHomeEarn');
if (bEarn) bEarn.addEventListener('click', function () { showScreen('education'); });

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
  await loadStocks();
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
  quizState.items = typeof getQuizDeck === 'function' ? getQuizDeck() : (DATA.quizItems || []);
  if (!quizState.items.length) quizState.items = DATA.quizItems || [];
  var tag = document.getElementById('quizNavTagline');
  var copy = (DATA.quizScreenCopy || {});
  if (tag) {
    tag.textContent = copy.lead || 'Вопросы про рынок и новости — с пояснениями.';
    tag.classList.remove('hidden');
  }
  var navTitle = document.querySelector('#screen-quiz .nav-title');
  if (navTitle && copy.eyebrow) navTitle.textContent = copy.eyebrow;
  renderQuizStep();
}

function renderQuizStep() {
  var container = document.getElementById('quizContent');
  if (!container) return;
  var items = quizState.items && quizState.items.length ? quizState.items : (DATA.quizItems || []);
  var appearance = getCharacterAppearance();
  var charName = (appearance.name || '').trim();
  if (quizState.index >= items.length) {
    var stats = getUserStats();
    stats.quizCorrectCount = (stats.quizCorrectCount || 0) + quizState.correct;
    setUserStats(stats);
    container.innerHTML = '<div class="quiz-play-area"><div class="quiz-done quiz-done-card"><p class="quiz-done-eyebrow">Готово</p><h3 class="quiz-done-title">Результат</h3><p class="quiz-result">' + quizState.correct + ' из ' + items.length + ' верных</p><button type="button" class="btn-primary" id="quizClose">Закрыть</button></div></div>';
    document.getElementById('quizClose').addEventListener('click', function () { showScreen('game'); });
    return;
  }
  var item = items[quizState.index];
  var avatarHtml = '<div class="quiz-avatar-wrap" id="quizAvatarWrap"></div>';
  if (charName) avatarHtml += '<span class="quiz-hero-text">' + escapeHtml(charName) + ', вперёд!</span>';
  var opts = item.options.map(function (opt, i) {
    var cls = 'quiz-option';
    if (quizState.showExplanation) {
      if (i === item.correctAnswerIndex) cls += ' correct';
      else if (i === quizState.selected && i !== item.correctAnswerIndex) cls += ' wrong';
    }
    return '<button type="button" class="' + cls + '" data-idx="' + i + '">' + escapeHtml(opt) + '</button>';
  }).join('');
  var expl = '';
  if (quizState.showExplanation) {
    var isCorrect = quizState.selected === item.correctAnswerIndex;
    var correctText = item.options[item.correctAnswerIndex];
    expl = '<div class="quiz-explanation-block">' +
      '<p class="quiz-explanation-head">💡 Пояснение</p>' +
      (isCorrect ? '<p class="quiz-feedback correct">Верно!</p>' : '<p class="quiz-feedback wrong">Правильный ответ: ' + escapeHtml(correctText) + '</p>') +
      '<p class="quiz-explanation-text">' + escapeHtml(item.explanation) + '</p></div>';
  }
  var nextBtn = quizState.showExplanation
    ? '<button type="button" class="btn-primary" id="quizNext">' + (quizState.index + 1 >= items.length ? 'Результат' : 'Далее') + '</button>'
    : '';
  container.innerHTML = '<div class="quiz-play-area">' +
    '<div class="quiz-hero">' + avatarHtml + '</div>' +
    '<p class="quiz-progress"><span class="quiz-progress-track"><span class="quiz-progress-fill" style="width:' + Math.round((quizState.index + 1) / items.length * 100) + '%"></span></span>Вопрос ' + (quizState.index + 1) + ' из ' + items.length + '</p>' +
    '<div class="quiz-question-card">' + escapeHtml(item.question) + '</div>' +
    (expl || '') +
    '<div class="quiz-options">' + opts + '</div>' + nextBtn + '</div>';
  var wrap = document.getElementById('quizAvatarWrap');
  if (wrap) renderCharacterAvatar(wrap, appearance, 56);
  if (!quizState.showExplanation) {
    container.querySelectorAll('.quiz-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (quizState.selected != null) return;
        quizState.selected = parseInt(btn.getAttribute('data-idx'), 10);
        if (quizState.selected === item.correctAnswerIndex) quizState.correct++;
        quizState.showExplanation = true;
        renderQuizStep();
      });
    });
  } else {
    var n = document.getElementById('quizNext');
    if (n) n.addEventListener('click', function () {
      quizState.index++;
      quizState.selected = null;
      quizState.showExplanation = false;
      renderQuizStep();
    });
  }
}

document.getElementById('btnBackQuiz').addEventListener('click', function () { showScreen('game'); });

// ——— Financial choice (интерфейс как в квизе: персонаж, карточка вопроса, варианты, пояснение, Далее) ———
var choiceState = { index: 0, selected: null, showExplanation: false };

function renderChoice() {
  choiceState.index = 0;
  choiceState.selected = null;
  choiceState.showExplanation = false;
  renderChoiceStep();
}

function renderChoiceStep() {
  var el = document.getElementById('choiceContent');
  if (!el) return;
  var items = DATA.choiceItems || [];
  var appearance = getCharacterAppearance();
  var charName = (appearance.name || '').trim();
  if (choiceState.index >= items.length) {
    el.innerHTML = '<div class="quiz-play-area"><div class="quiz-done quiz-done-card"><p class="quiz-done-eyebrow">Финансовый выбор</p><h3 class="quiz-done-title">Ситуации пройдены</h3><p class="quiz-result">Разобрано: ' + items.length + '</p><button type="button" class="btn-primary" id="choiceClose">Закрыть</button></div></div>';
    document.getElementById('choiceClose').addEventListener('click', function () { showScreen('game'); });
    return;
  }
  var item = items[choiceState.index];
  var avatarHtml = '<div class="quiz-avatar-wrap" id="choiceAvatarWrap"></div>';
  if (charName) avatarHtml += '<span class="quiz-hero-text">' + escapeHtml(charName) + ', вперёд!</span>';
  var opts = item.options.map(function (opt, i) {
    var cls = 'quiz-option choice-option';
    if (choiceState.showExplanation) {
      if (i === item.correctAnswerIndex) cls += ' correct';
      else if (i === choiceState.selected && i !== item.correctAnswerIndex) cls += ' wrong';
    }
    return '<button type="button" class="' + cls + '" data-idx="' + i + '">' + escapeHtml(opt) + '</button>';
  }).join('');
  var expl = '';
  if (choiceState.showExplanation) {
    var isCorrect = choiceState.selected === item.correctAnswerIndex;
    expl = '<div class="quiz-explanation-block">' +
      '<p class="quiz-explanation-head">💡 Пояснение</p>' +
      (isCorrect ? '<p class="quiz-feedback correct">Верно!</p>' : '<p class="quiz-feedback wrong">Правильный ответ: ' + escapeHtml(item.options[item.correctAnswerIndex]) + '</p>') +
      '<p class="quiz-explanation-text">' + escapeHtml(item.explanation) + '</p></div>';
  }
  var nextBtn = choiceState.showExplanation
    ? '<button type="button" class="btn-primary" id="choiceNext">' + (choiceState.index + 1 >= items.length ? 'Завершить' : 'Далее') + '</button>'
    : '';
  el.innerHTML = '<div class="quiz-play-area">' +
    '<div class="quiz-hero">' + avatarHtml + '</div>' +
    '<p class="quiz-progress"><span class="quiz-progress-track"><span class="quiz-progress-fill" style="width:' + Math.round((choiceState.index + 1) / items.length * 100) + '%"></span></span>Ситуация ' + (choiceState.index + 1) + ' из ' + items.length + '</p>' +
    '<div class="quiz-question-card">' + escapeHtml(item.question) + '</div>' +
    (expl || '') +
    '<div class="quiz-options">' + opts + '</div>' + nextBtn + '</div>';
  var wrap = document.getElementById('choiceAvatarWrap');
  if (wrap) renderCharacterAvatar(wrap, appearance, 56);
  if (!choiceState.showExplanation) {
    el.querySelectorAll('.choice-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (choiceState.selected != null) return;
        choiceState.selected = parseInt(btn.getAttribute('data-idx'), 10);
        choiceState.showExplanation = true;
        renderChoiceStep();
      });
    });
  } else {
    var nextEl = document.getElementById('choiceNext');
    if (nextEl) nextEl.addEventListener('click', function () {
      choiceState.index++;
      choiceState.selected = null;
      choiceState.showExplanation = false;
      renderChoiceStep();
    });
  }
}

document.getElementById('btnBackChoice').addEventListener('click', function () { showScreen('game'); });

// ——— Вперёд, инвестор! (как в приложении: тап — прыжок, кнопка — присед, монеты +10, камень −1 жизнь, минус −10 очков) ———
var runnerEngine = {
  phase: 'start',
  score: 0,
  lives: 3,
  characterY: 0.78,
  characterVelocity: 0,
  isCrouching: false,
  items: [],
  groundOffset: 0,
  bestScore: 0,
  gamePlayTime: 0,
  gravity: 0.0026,
  jumpForce: -0.044,
  groundY: 0.78,
  baseSpeed: 0.0095,
  spawnInterval: 950,
  speedGrowthPerSecond: 0.008,
  maxSpeedMultiplier: 2.0,
  crouchDropBoost: 0.018,
  charCenterX: 0.22,
  charWidth: 0.12,
  charHeightStand: 0.14,
  charHeightCrouch: 0.08,
  minusPenalty: 10,
  rockSize: 0.06,
  minusW: 0.08,
  minusH: 0.05,
  coinR: 0.04,
  rafId: null,
  spawnTimer: null
};


function runnerStart() {
  runnerEngine.phase = 'playing';
  runnerEngine.score = 0;
  runnerEngine.lives = 3;
  runnerEngine.characterY = runnerEngine.groundY;
  runnerEngine.characterVelocity = 0;
  runnerEngine.isCrouching = false;
  runnerEngine.items = [];
  runnerEngine.groundOffset = 0;
  runnerEngine.gamePlayTime = 0;
  runnerEngine.bestScore = getRunnerBestScore();
  renderRunner();
}

function runnerStartLoop() {
  var last = performance.now();
  function tick(now) {
    if (runnerEngine.phase !== 'playing') return;
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    runnerEngine.gamePlayTime += dt;
    var speed = runnerEngine.baseSpeed * (1.0 + Math.min(runnerEngine.gamePlayTime * runnerEngine.speedGrowthPerSecond, runnerEngine.maxSpeedMultiplier - 1.0));
    runnerEngine.groundOffset = (runnerEngine.groundOffset + speed) % 0.08;
    runnerEngine.characterVelocity += runnerEngine.gravity * 60 * dt;
    if (runnerEngine.isCrouching && runnerEngine.characterY < runnerEngine.groundY) {
      runnerEngine.characterVelocity += runnerEngine.crouchDropBoost * 60 * dt;
    }
    runnerEngine.characterY += runnerEngine.characterVelocity * 60 * dt;
    if (runnerEngine.characterY >= runnerEngine.groundY) {
      runnerEngine.characterY = runnerEngine.groundY;
      runnerEngine.characterVelocity = 0;
    }
    if (runnerEngine.characterY < 0.2) runnerEngine.characterY = 0.2;
    var charH = runnerEngine.isCrouching ? runnerEngine.charHeightCrouch : runnerEngine.charHeightStand;
    var charTop = runnerEngine.characterY - charH / 2;
    var charBottom = runnerEngine.characterY + charH / 2;
    var charLeft = runnerEngine.charCenterX - runnerEngine.charWidth / 2;
    var charRight = runnerEngine.charCenterX + runnerEngine.charWidth / 2;
    var newItems = [];
    for (var i = 0; i < runnerEngine.items.length; i++) {
      var item = runnerEngine.items[i];
      item.x -= speed * 60 * dt;
      if (item.x < runnerEngine.charCenterX - 0.18) continue;
      if (item.x < -0.3) continue;
      if (item.type === 'coin') {
        var overlapX = charRight > item.x - runnerEngine.coinR && charLeft < item.x + runnerEngine.coinR;
        var overlapY = charBottom > item.y - runnerEngine.coinR && charTop < item.y + runnerEngine.coinR;
        if (overlapX && overlapY) {
          runnerEngine.score += 10;
          continue;
        }
      } else if (item.type === 'rock') {
        var rTop = item.y - runnerEngine.rockSize / 2, rBottom = item.y + runnerEngine.rockSize / 2;
        var rLeft = item.x - runnerEngine.rockSize / 2, rRight = item.x + runnerEngine.rockSize / 2;
        if (charRight > rLeft && charLeft < rRight && charBottom > rTop && charTop < rBottom) {
          runnerEngine.lives--;
          if (runnerEngine.lives <= 0) {
            if (runnerEngine.score > runnerEngine.bestScore) {
              runnerEngine.bestScore = runnerEngine.score;
              setRunnerBestScore(runnerEngine.bestScore);
            }
            runnerEngine.phase = 'over';
            runnerStopLoop();
            renderRunner();
            return;
          }
          continue;
        }
      } else if (item.type === 'minus') {
        var mTop = item.y - runnerEngine.minusH / 2, mBottom = item.y + runnerEngine.minusH / 2;
        var mLeft = item.x - runnerEngine.minusW / 2, mRight = item.x + runnerEngine.minusW / 2;
        if (!runnerEngine.isCrouching && charRight > mLeft && charLeft < mRight && charBottom > mTop && charTop < mBottom) {
          runnerEngine.score = Math.max(0, runnerEngine.score - runnerEngine.minusPenalty);
          continue;
        }
      }
      newItems.push(item);
    }
    runnerEngine.items = newItems;
    runnerRenderGame();
    runnerEngine.rafId = requestAnimationFrame(tick);
  }
  runnerEngine.rafId = requestAnimationFrame(tick);
}

function runnerSpawn() {
  if (runnerEngine.phase !== 'playing') return;
  var roll = Math.floor(Math.random() * 100) + 1;
  var type = roll <= 50 ? 'coin' : roll <= 75 ? 'rock' : 'minus';
  var y = type === 'coin' ? 0.58 + Math.random() * 0.08 : type === 'rock' ? 0.85 - runnerEngine.rockSize / 2 : 0.78;
  runnerEngine.items.push({ id: Math.random(), x: 1.15, y: y, type: type });
}

function runnerStopLoop() {
  if (runnerEngine.rafId != null) {
    cancelAnimationFrame(runnerEngine.rafId);
    runnerEngine.rafId = null;
  }
  if (runnerEngine.spawnTimer != null) {
    clearInterval(runnerEngine.spawnTimer);
    runnerEngine.spawnTimer = null;
  }
}

function runnerJump() {
  if (runnerEngine.phase !== 'playing' || runnerEngine.characterY < runnerEngine.groundY - 0.01) return;
  runnerEngine.characterVelocity = runnerEngine.jumpForce;
}

function runnerSetCrouch(v) {
  runnerEngine.isCrouching = v;
}

function runnerRenderGame() {
  var container = document.getElementById('runnerGameArea');
  if (!container) return;
  var w = container.offsetWidth;
  var h = container.offsetHeight;
  var charEl = document.getElementById('runnerCharacter');
  if (charEl) {
    var size = runnerEngine.isCrouching ? 52 : 72;
    var charHNorm = runnerEngine.isCrouching ? runnerEngine.charHeightCrouch : runnerEngine.charHeightStand;
    charEl.style.width = size + 'px';
    charEl.style.height = size + 'px';
    charEl.style.left = (runnerEngine.charCenterX * w - size / 2) + 'px';
    charEl.style.top = (runnerEngine.characterY * h - charHNorm * h / 2) + 'px';
    charEl.style.transform = runnerEngine.isCrouching ? 'scaleY(0.5)' : 'scaleY(1)';
    charEl.style.transformOrigin = 'center bottom';
  }
  var itemsEl = document.getElementById('runnerItems');
  if (itemsEl) {
    itemsEl.innerHTML = runnerEngine.items.map(function (item) {
      var left = (item.x * w) + 'px';
      var top = (item.y * h) + 'px';
      if (item.type === 'coin') {
        return '<div class="runner-coin" style="left:' + left + ';top:' + top + '">₽</div>';
      }
      if (item.type === 'rock') {
        return '<div class="runner-rock" style="left:' + left + ';top:' + top + '"></div>';
      }
      return '<div class="runner-minus" style="left:' + left + ';top:' + top + '">📉</div>';
    }).join('');
  }
  var scoreEl = document.getElementById('runnerScore');
  if (scoreEl) scoreEl.textContent = runnerEngine.score;
  var livesEl = document.getElementById('runnerLives');
  if (livesEl) {
    livesEl.innerHTML = [1, 2, 3].map(function (i) {
      return '<span class="runner-heart">' + (i <= runnerEngine.lives ? '♥' : '♡') + '</span>';
    }).join('');
  }
  var groundEl = document.getElementById('runnerGround');
  if (groundEl) groundEl.style.backgroundPosition = (runnerEngine.groundOffset * w) + 'px 0';
}

function renderRunner() {
  var el = document.getElementById('runnerContent');
  if (!el) return;
  runnerEngine.bestScore = getRunnerBestScore();
  if (runnerEngine.phase === 'start' || runnerEngine.phase === 'over') {
    var isOver = runnerEngine.phase === 'over';
    var avatarWrap = '<div class="runner-start-avatar" id="runnerStartAvatar"></div>';
    el.innerHTML = '<div class="runner-start">' +
      avatarWrap +
      '<h3 class="runner-start-title">Вперёд, инвестор!</h3>' +
      '<p class="runner-start-desc">Тап — прыжок. Кнопка вниз — присед. Монеты +10. Минусы −10 очков. Камень −1 жизнь. 0 жизней — конец.</p>' +
      '<div class="runner-badges">' +
      '<div class="runner-badge"><span class="runner-badge-coin">₽</span><span>+10</span></div>' +
      '<div class="runner-badge"><span class="runner-badge-rock"></span><span>−1 жизнь</span></div>' +
      '<div class="runner-badge"><span class="runner-badge-minus">📉</span><span>−10 очков</span></div>' +
      '</div>' +
      (isOver ? ('<h3 class="runner-stop-title">Стоп!</h3><p class="runner-over-score">Очки: ' + runnerEngine.score + '</p>' +
        (runnerEngine.score >= runnerEngine.bestScore && runnerEngine.score > 0 ? '<p class="runner-new-record">Новый рекорд!</p>' : '') +
        '<p class="runner-record">Рекорд: ' + runnerEngine.bestScore + '</p>') : '') +
      '<button type="button" class="btn-primary runner-btn-start" id="runnerBtnStart">' + (isOver ? 'Ещё раз' : 'Бежать!') + '</button></div>';
    var av = document.getElementById('runnerStartAvatar');
    if (av) renderCharacterAvatar(av, getCharacterAppearance(), 90);
    document.getElementById('runnerBtnStart').addEventListener('click', function () {
      runnerStart();
    });
    return;
  }
  if (runnerEngine.phase === 'playing') {
    el.innerHTML = '<div class="runner-game-wrap">' +
      '<div class="runner-hud"><span id="runnerScore">0</span> очков <span class="runner-lives" id="runnerLives">♥♥♥</span></div>' +
      '<div id="runnerGameArea" class="runner-game-area">' +
      '<div id="runnerGround" class="runner-ground"></div>' +
      '<div id="runnerItems" class="runner-items"></div>' +
      '<div id="runnerCharacter" class="runner-character"></div>' +
      '</div>' +
      '<button type="button" class="runner-crouch-btn" id="runnerCrouchBtn" aria-label="Присесть">↓</button>' +
      '</div>';
    var charWrap = document.getElementById('runnerCharacter');
    if (charWrap) {
      var inner = document.createElement('div');
      inner.className = 'runner-character-inner';
      charWrap.appendChild(inner);
      renderCharacterAvatar(inner, getCharacterAppearance(), 72);
    }
    var area = document.getElementById('runnerGameArea');
    area.addEventListener('click', function (e) { e.preventDefault(); runnerJump(); });
    area.addEventListener('touchstart', function (e) { e.preventDefault(); runnerJump(); }, { passive: false });
    var crouchBtn = document.getElementById('runnerCrouchBtn');
    if (crouchBtn) {
      crouchBtn.addEventListener('mousedown', function () { runnerSetCrouch(true); });
      crouchBtn.addEventListener('mouseup', function () { runnerSetCrouch(false); });
      crouchBtn.addEventListener('mouseleave', function () { runnerSetCrouch(false); });
      crouchBtn.addEventListener('touchstart', function (e) { e.preventDefault(); runnerSetCrouch(true); }, { passive: false });
      crouchBtn.addEventListener('touchend', function (e) { e.preventDefault(); runnerSetCrouch(false); });
    }
    runnerRenderGame();
    runnerEngine.spawnTimer = setInterval(runnerSpawn, runnerEngine.spawnInterval);
    runnerStartLoop();
  }
}

document.getElementById('btnBackRunner').addEventListener('click', function () {
  runnerStopLoop();
  runnerEngine.phase = 'start';
  showScreen('game');
});
document.getElementById('rugpullInvest').addEventListener('click', rugpullInvest);
document.getElementById('rugpullSell').addEventListener('click', rugpullSell);
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
    if (val > 0) {
      hasAny = true;
      stockList.innerHTML += `<div class="sell-row">
        <div class="sell-row-info">
          <span class="ticker">${escapeHtml(h.ticker)}</span>
          <span class="meta">${formatQty(h.quantity || 0)} шт. · ${formatMoney(val)} ₽</span>
        </div>
        <button type="button" class="btn-sell-small" data-sell-stock="${escapeHtml(h.ticker)}" data-qty="${h.quantity}">Продать</button>
      </div>`;
    }
  });
  (portfolio.crypto || []).forEach(h => {
    const val = (h.amount || 0) * (CRYPTO_PRICES[h.symbol] || 0);
    if (val > 0) {
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
  return v >= 1 ? v.toFixed(0) : v.toFixed(4);
}
function formatCrypto(v) {
  return v.toFixed(6);
}

function openSellSheet(type, tickerOrSymbol, qtyOrAmount) {
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
  const val = parseFloat((input.value || '0').replace(',', '.')) || 0;
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
    document.getElementById('sellSheetTotal').textContent = 'Укажи количество от 0 до ' + max;
    return;
  }
  const portfolio = getPortfolio();
  if (sellSheetHolding.type === 'stock') {
    const price = await fetchCurrentPrice(sellSheetHolding.tickerOrSymbol) ?? (stocks.find(s => s.ticker === sellSheetHolding.tickerOrSymbol)?.price) ?? 0;
    if (!sellSheetHolding || sellSheetHolding.tickerOrSymbol !== holding.tickerOrSymbol || loadBundleFromStorage().activeId !== accountId) return;
    const owned = portfolio.stocks.find(h => h.ticker === holding.tickerOrSymbol);
    if (!owned || owned.quantity < val) return;
    if (price <= 0) {
      document.getElementById('sellMessage').textContent = 'Не удалось получить актуальную цену';
      document.getElementById('sellMessage').className = 'message error';
      return;
    }
    const rub = val * price;
    setBalance(getBalance() + rub);
    const i = portfolio.stocks.findIndex(h => h.ticker === sellSheetHolding.tickerOrSymbol);
    if (i >= 0) {
      portfolio.stocks[i].quantity -= val;
      if (portfolio.stocks[i].quantity <= 0) portfolio.stocks.splice(i, 1);
    }
    document.getElementById('sellMessage').textContent = 'Успех! Продано ' + formatQty(val) + ' ' + sellSheetHolding.tickerOrSymbol + ' по ' + formatMoney(price) + ' ₽ на ' + formatMoney(rub) + ' ₽.';
    if (typeof appendOperationLog === 'function') {
      appendOperationLog({ kind: 'sell', ticker: sellSheetHolding.tickerOrSymbol, quantity: val, price: price, totalRub: rub });
    }
  } else {
    const price = CRYPTO_PRICES[sellSheetHolding.tickerOrSymbol] ?? 0;
    const rub = val * price;
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
    html += '<section class="topic-facts"><p class="topic-facts-title">💡 Интересные факты</p>';
    details.facts.forEach(function (f) {
      html += '<p class="topic-fact">• ' + escapeHtml(f) + '</p>';
    });
    html += '</section>';
  }
  if (details.canBuy && details.buyTitle) {
    html += '<button type="button" class="btn-primary topic-btn-buy" data-topic-action="buy" data-topic-id="' + escapeHtml(topicId) + '">🛒 ' + escapeHtml(details.buyTitle) + '</button>';
  }
  if (details.showStocksLink) {
    html += '<button type="button" class="btn-topic-outline" id="topicShowStocks">📋 Смотреть акции</button>';
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
  document.getElementById('educationLessons').innerHTML = DATA.lessons.map(function (l, i) {
    return '<a href="#" class="lesson-row lesson-link" data-lesson-index="' + i + '">' +
      '<h4>' + escapeHtml(l.title) + '</h4><span class="duration">' + escapeHtml(l.duration) + '</span><p>' + escapeHtml(l.shortText) + '</p></a>';
  }).join('');
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
      '<div><span class="friend-name">' + escapeHtml(f.name) + (isMe ? ' <span class="friend-me-label">(Вы)</span>' : '') + '</span></div>' +
      '<span class="friend-value">' + valueText + '</span></div>';
  }).join('');
}

function renderProfile() {
  var user = getCurrentUser();
  document.getElementById('profileName').textContent = getProfileName();
  document.getElementById('profileSubtitle').textContent = (user && user.email) ? user.email : 'Рубликс';
  var lvl = getInvestorLevel();
  var lvlRu = lvl === 'pro' ? 'Юный профи' : (lvl === 'explorer' ? 'Исследователь' : 'Новичок');
  var invEl = document.getElementById('profileInvestorLevel');
  if (invEl) invEl.textContent = 'Стиль инвестора: ' + lvlRu;
  var planId = getCurrentSubscriptionId();
  var plans = getSubscriptionPlans();
  var plan = plans.find(function (p) { return p.id === planId; }) || plans[0];
  document.getElementById('profileSubscription').textContent = plan.name;
  document.getElementById('profileSubscriptionPeriod').textContent = plan.price + ' / ' + plan.period;
  document.getElementById('profileSubscriptionBar').style.background = plan.color;
  renderCharacterAvatar(document.getElementById('profileAvatar'), getCharacterAppearance(), 80);
  var progressStats = getUserStats();
  document.querySelectorAll('.achievement-badge').forEach(function (badge, index) {
    badge.dataset.done = String(index === 0 ? progressStats.videosWatched > 0 : index === 1 ? progressStats.quizCorrectCount > 0 : progressStats.quizCorrectCount >= 50);
  });
}

function renderCharacterAvatar(container, appearance, size) {
  if (!container) return;
  size = size || 80;
  var s = size;
  var skinColors = ['#fff5d1', '#f2c79e', '#c2997a'];
  var hairColors = ['#59381e', '#40260d', '#8b5a33', '#804d26', '#664026', '#996640'];
  var topColors = ['#5991f2', '#fafafa', '#5e3e8f', '#665980', '#338066'];
  var bottomColors = ['#38528c', '#333333', '#727880', '#805980', '#596673'];
  var shoesColors = ['#666666', '#473428', '#262626', '#403433', '#996640'];
  var skin = skinColors[appearance.skinToneIndex % 3] || skinColors[0];
  var hair = hairColors[appearance.hairIndex % 6] || hairColors[0];
  var top = topColors[appearance.topIndex % 5] || topColors[0];
  var bottom = bottomColors[appearance.bottomIndex % 5] || bottomColors[0];
  var shoes = shoesColors[appearance.shoesIndex % 5] || shoesColors[0];
  var faceIdx = appearance.faceIndex % 5;
  var hairIdx = appearance.hairIndex % 6;
  var accIdx = appearance.accessoryIndex % 4;
  var hw = s * 0.38;
  var hh = s * 0.36;
  var cx = s / 2;
  var faceX = cx - hw / 2;
  var faceY = s * 0.22 - hh / 2;
  var faceShape = faceIdx === 0 ? ('<ellipse cx="' + cx + '" cy="' + (s * 0.22) + '" rx="' + (hw / 2) + '" ry="' + (hh / 2) + '" fill="' + skin + '"/>')
    : faceIdx === 1 ? ('<ellipse cx="' + cx + '" cy="' + (s * 0.22) + '" rx="' + (hw * 0.45) + '" ry="' + (hh * 0.55) + '" fill="' + skin + '"/>')
    : faceIdx === 2 ? ('<rect x="' + faceX + '" y="' + faceY + '" width="' + hw + '" height="' + hh + '" rx="' + (hw * 0.25) + '" fill="' + skin + '"/>')
    : faceIdx === 3 ? ('<ellipse cx="' + cx + '" cy="' + (s * 0.22) + '" rx="' + (hw * 0.52) + '" ry="' + (hh * 0.47) + '" fill="' + skin + '"/>')
    : ('<rect x="' + faceX + '" y="' + faceY + '" width="' + hw + '" height="' + hh + '" rx="' + (hw * 0.35) + '" fill="' + skin + '"/>');
  var hairW = s * 0.42;
  var hairH = s * 0.2;
  var hairY = s * 0.01;
  var hairShape = hairIdx === 0 ? ('<rect x="' + (cx - hairW / 2) + '" y="' + hairY + '" width="' + hairW + '" height="' + (hairH * 0.7) + '" rx="4" fill="' + hair + '"/>')
    : hairIdx === 1 ? ('<g fill="' + hair + '">' + [0, 1, 2, 3, 4].map(function (i) { return '<rect x="' + (cx - hairW * 0.25) + '" y="' + (hairY + i * 4) + '" width="' + (hairW * 0.5) + '" height="4" rx="2"/>'; }).join('') + '</g>')
    : hairIdx === 2 ? ('<rect x="' + (cx - hairW * 0.55) + '" y="' + hairY + '" width="' + (hairW * 1.1) + '" height="' + hairH + '" rx="6" fill="' + hair + '"/>')
    : hairIdx === 3 ? ('<ellipse cx="' + cx + '" cy="' + (hairY + hairH * 0.7) + '" rx="' + (hairW * 0.45) + '" ry="' + (hairH * 0.7) + '" fill="' + hair + '"/>')
    : hairIdx === 4 ? ('<ellipse cx="' + cx + '" cy="' + (hairY + hairH * 0.8) + '" rx="' + (hairW * 0.2) + '" ry="' + (hairH * 0.8) + '" fill="' + hair + '"/>')
    : ('<ellipse cx="' + cx + '" cy="' + (hairY + hairH / 2) + '" rx="' + (hairW / 2) + '" ry="' + (hairH / 2) + '" fill="' + hair + '"/>');
  var neck = '<rect x="' + (cx - s * 0.06) + '" y="' + (s * 0.38) + '" width="' + (s * 0.12) + '" height="' + (s * 0.08) + '" rx="2" fill="' + skin + '"/>';
  var torso = '<rect x="' + (cx - s * 0.25) + '" y="' + (s * 0.46) + '" width="' + (s * 0.5) + '" height="' + (s * 0.28) + '" rx="6" fill="' + top + '" stroke="#ddd" stroke-width="0.5"/>';
  var legW = s * 0.18;
  var legH = s * 0.22;
  var legY = s * 0.72;
  var legs = '<rect x="' + (cx - legW - s * 0.04) + '" y="' + legY + '" width="' + legW + '" height="' + legH + '" rx="3" fill="' + bottom + '"/>' +
    '<rect x="' + (cx + s * 0.04) + '" y="' + legY + '" width="' + legW + '" height="' + legH + '" rx="3" fill="' + bottom + '"/>';
  var shoeY = legY + legH;
  var shoeW = s * 0.2;
  var shoeH = s * 0.08;
  var shoeGap = s * 0.12;
  var shoes = '<rect x="' + (cx - shoeW - shoeGap / 2) + '" y="' + shoeY + '" width="' + shoeW + '" height="' + shoeH + '" rx="2" fill="' + shoes + '"/>' +
    '<rect x="' + (cx + shoeGap / 2) + '" y="' + shoeY + '" width="' + shoeW + '" height="' + shoeH + '" rx="2" fill="' + shoes + '"/>';
  var acc = '';
  if (accIdx === 0) {
    acc = '<circle cx="' + (cx + s * 0.32) + '" cy="' + (s * 0.28) + '" r="' + (s * 0.1) + '" fill="none" stroke="#5e3e8f" stroke-width="2"/>';
  } else if (accIdx === 1) {
    acc = '<rect x="' + (cx - s * 0.175) + '" y="' + (s * 0.14) + '" width="' + (s * 0.35) + '" height="' + (s * 0.12) + '" rx="4" fill="none" stroke="#5e3e8f" stroke-width="2"/>';
  } else if (accIdx === 2) {
    acc = '<circle cx="' + (cx - s * 0.3) + '" cy="' + (s * 0.18) + '" r="' + (s * 0.075) + '" fill="#4d4d4d"/>' +
      '<circle cx="' + (cx + s * 0.3) + '" cy="' + (s * 0.18) + '" r="' + (s * 0.075) + '" fill="#4d4d4d"/>';
  }
  var bg = 'rgba(146, 118, 178, 0.15)';
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" width="' + s + '" height="' + s + '">' +
    '<circle cx="' + cx + '" cy="' + (s / 2) + '" r="' + (s / 2) + '" fill="' + bg + '"/>' +
    legs + shoes + torso + neck + faceShape + hairShape + acc +
    '</svg>';
  container.innerHTML = svg;
  container.style.width = s + 'px';
  container.style.height = s + 'px';
  container.style.display = 'block';
  container.style.borderRadius = '50%';
  container.style.overflow = 'hidden';
}

document.getElementById('btnAddFriend').addEventListener('click', function () {
  var email = (document.getElementById('friendEmail') && document.getElementById('friendEmail').value || '').trim();
  var optionalName = (document.getElementById('friendName') && document.getElementById('friendName').value || '').trim();
  if (!email) return;
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
  const newsCard = e.target.closest('.news-card');
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

// ——— Character modal ———
function openCharacterModal() {
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
    var row = document.createElement('div');
    row.className = 'character-option-row';
    row.dataset.key = key;
    row.innerHTML = '<span class="opt-title">' + titles[key] + '</span><span class="opt-value">' + escapeHtml(arr[idx]) + '</span><span class="opt-chevron">›</span>';
    row.addEventListener('click', function () {
      var cur = app[prop] != null ? app[prop] : 0;
      var next = (cur + 1) % arr.length;
      app[prop] = next;
      row.querySelector('.opt-value').textContent = arr[next];
      renderCharacterAvatar(document.getElementById('characterAvatarPreview'), app, 120);
    });
    optsEl.appendChild(row);
  });
  renderCharacterAvatar(document.getElementById('characterAvatarPreview'), app, 120);
  document.getElementById('characterModal').classList.remove('hidden');
}

document.getElementById('profileCard').addEventListener('click', openCharacterModal);
document.getElementById('characterCancel').addEventListener('click', function () {
  document.getElementById('characterModal').classList.add('hidden');
});
document.getElementById('characterModalBackdrop').addEventListener('click', function () {
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
document.getElementById('btnBackArticle').addEventListener('click', function () { showScreen('news'); });
document.getElementById('btnBackParent').addEventListener('click', function () { showScreen('home'); });
