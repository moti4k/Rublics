/* The same editable character hosts the games and explains the current action. */
(function (global) {
  'use strict';
  const states = new WeakMap();
  const highlights = new Map();
  let homeGreeting = true;
  let runnerHideTimer = null;
  const scenes = {
    game: { before: '#gameCards', text: 'Выбирай маршрут. Потренируем логику, реакцию или умение замечать риск.', target: '.game-card', tips: ['Три практики на день: квиз, финансовый выбор и пробежка с монетой. За первую попытку — опыт и рубликсы.', 'Начни с финансового выбора: там нет таймера, а каждый ответ можно разобрать.'] },
    'victorina-entry': { before: '#btnVictorinaStart', text: 'Я приношу новость, ты выбираешь реакцию рынка. После ответа объясню логику — дальше пойдём, когда будешь готов.', target: '#btnVictorinaStart', tips: ['За один раунд — 10 вопросов. Семь верных ответов уже считаются победой.', 'Пауза останавливает таймер. Можно спокойно сделать перерыв.'] },
    'victorina-game': { before: '#victorinaText', text: 'Сначала новость. Потом — кто от неё выигрывает и кто теряет.', target: '#victorinaText', tips: ['Подумай, как событие меняет выручку, затраты или ожидания. Не каждая новость двигает цену.', 'Это упрощённая учебная модель. На настоящем рынке цена зависит от множества факторов.'] },
    'victorina-result': { before: '#victorinaResultStats', text: 'Раунд закрыт! Самое ценное здесь — понять, почему сработал ответ.', target: '#victorinaResultStats', mood: 'proud' },
    rugpull: { before: '.rugpull-chart-wrap', text: 'Сначала выбери учебную сумму. Чем больше ставка, тем больше можно потерять. Предсказать момент падения нельзя.', target: '#rugpullBet', tips: ['Можно нажать готовую сумму или ввести свою. Например, 250 или 250,50.', 'Рост графика не делает монету безопаснее. Даже после длинного роста цена может обнулиться.'] },
    purchase: { before: '.purchase-form', text: 'Здесь всё учебное. Выбери бумагу и количество — итоговая сумма появится до покупки.', target: '#purchaseQty', tips: ['Смотри на итог и доступный остаток. Если денег не хватает, уменьши количество.', 'В приложении можно тренироваться с дробным количеством — например, 1,5.'] },
    sell: { before: '#sellStockList', text: 'Нажми «Продать» у позиции и проверь количество. Деньги вернутся на выбранный учебный счёт.', target: '#sellStockList', tips: ['Продать можно только то количество, которое есть на активном счёте.'] },
    analytics: { before: '#analyticsRoot', text: 'Этот круг — карта твоего портфеля. Большой кусок одной бумаги означает сильную зависимость от неё.', target: '.analytics-pie', tips: ['Сравни активный счёт со всеми счетами: суммы и доли могут отличаться.'] },
    education: { before: '#educationLessons', text: 'Можно идти по интересу. Выбери тему, а потом закрепи её в игре — так понятнее, зачем она нужна.', target: '.lesson-row', tips: ['Начни с акции и диверсификации, если слова на торговом экране пока незнакомы.'] },
    chart: { before: '#btnLoadOlder', text: 'Свеча показывает, как двигалась цена за один период. Цвет — направление, тонкие хвосты — максимум и минимум.', target: '#candlestickChart', tips: ['Объём снизу показывает активность торгов. Он не гарантирует будущий рост или падение.'] }
  };
  function highlight(selector, gesture, root) {
    const target = typeof selector === 'string' ? document.querySelector('.screen.active ' + selector) : selector;
    if (!target || !target.getClientRects().length) return;
    if (highlights.has(target)) clearTimeout(highlights.get(target));
    target.classList.add('buddy-target');
    highlights.set(target, setTimeout(function () { target.classList.remove('buddy-target'); highlights.delete(target); }, 1800));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) target.animate([
      { transform: 'translateY(0)' }, { transform: 'translateY(2px)', offset: .4 }, { transform: 'translateY(-1px)', offset: .7 }, { transform: 'translateY(0)' }
    ], { delay: 250, duration: 420 });
    const state = root && states.get(root);
    if (state) characterMotion.play(state.avatar, gesture || 'point');
  }
  function say(root, text, mood, target) {
    const state = states.get(root);
    if (!state) return;
    characterMotion.stopSpeech(state.avatar);
    state.text = String(text || '');
    state.mood = mood || 'explain';
    state.target = target || state.target;
    state.name.textContent = getCharacterAppearance().name || 'Твой напарник';
    state.announcer.textContent = state.text;
    const words = state.text.split(/\s+/).filter(Boolean);
    state.visual.replaceChildren();
    const spans = words.map(function (word, i) {
      const span = document.createElement('span');
      span.textContent = word + (i === words.length - 1 ? '' : ' ');
      span.className = 'buddy-word';
      state.visual.appendChild(span);
      return span;
    });
    state.replay.textContent = 'Сразу';
    root.dataset.reaction = state.mood;
    if (!root.closest('.screen.active')) { spans.forEach(span => span.classList.add('is-spoken')); state.replay.textContent = 'Повторить'; return; }
    characterMotion.play(state.avatar, state.mood);
    let shown = 0;
    characterMotion.speak(state.avatar, state.text, function (progress) {
      const count = Math.min(spans.length, Math.ceil(progress * spans.length));
      for (; shown < count; shown++) spans[shown].classList.add('is-spoken');
      if (progress >= 1) state.replay.textContent = 'Повторить';
    });
  }
  function attach(root, config) {
    if (!root) return;
    config = config || {};
    let state = states.get(root);
    root.dataset.buddy = '';
    root.classList.add('buddy');
    if (!state) {
      let avatar = config.avatar || root.querySelector('.buddy-avatar');
      if (!avatar) { avatar = document.createElement('div'); avatar.className = 'buddy-avatar'; root.prepend(avatar); }
      const copy = document.createElement('div');
      copy.className = 'buddy-copy';
      copy.innerHTML = '<div class="speech-bubble"><span class="buddy-name"></span><span class="buddy-announce sr-only" role="status" aria-live="polite" aria-atomic="true"></span><p class="buddy-words" aria-hidden="true"></p></div><div class="buddy-tools"><button type="button" class="buddy-hint">Подсказка</button><button type="button" class="buddy-replay">Повторить</button></div>';
      root.append(copy);
      state = { avatar, visual: copy.querySelector('.buddy-words'), announcer: copy.querySelector('.buddy-announce'), name: copy.querySelector('.buddy-name'), replay: copy.querySelector('.buddy-replay'), hints: [], hintIndex: 0 };
      states.set(root, state);
      copy.querySelector('.buddy-hint').addEventListener('click', function () {
        const hints = state.hints.length ? state.hints : ['Можно ошибаться: здесь важнее разобраться в объяснении, чем угадать.'];
        say(root, hints[state.hintIndex++ % hints.length], 'point', state.target);
        highlight(state.target, 'point', root);
      });
      state.replay.addEventListener('click', function () {
        if (state.avatar.dataset.speaking) characterMotion.stopSpeech(state.avatar);
        else say(root, state.text, state.mood, state.target);
      });
    }
    if (config.tips) state.hints = config.tips;
    if (config.target) state.target = config.target;
    if (config.avatarId) state.avatar.id = config.avatarId;
    if (config.art !== false) renderCharacterAvatar(state.avatar, getCharacterAppearance(), config.size || 112, { fullBody: true, emotion: ['think', 'careful', 'bump'].includes(config.mood) ? 'thinking' : 'neutral' });
    if (config.text) say(root, config.text, config.mood, config.target);
    return state;
  }
  function enter(id) {
    if (id === 'home') { homeGreeting = true; return; }
    const screen = document.getElementById('screen-' + id);
    if (!screen) return;
    screen.classList.toggle('play-screen', ['game', 'quiz', 'choice', 'runner', 'rugpull', 'victorina-entry', 'victorina-game', 'victorina-result'].includes(id));
    const config = scenes[id];
    let root = screen.querySelector('[data-buddy]');
    if (config && !root) {
      const before = screen.querySelector(config.before);
      if (!before) return;
      root = document.createElement('section');
      root.id = 'buddy-' + id;
      before.before(root);
    }
    if (config) {
      const settings = id === 'rugpull' && typeof rugpullPhase !== 'undefined' && rugpullPhase === 'pumping'
        ? { ...config, text: 'Раунд продолжается. Выход — на жёлтой плашке внизу. Рост не защищает от падения.', target: '#rugpullSell' } : config;
      attach(root, settings);
    }
    else if (root) {
      const state = states.get(root);
      if (state) say(root, state.text, state.mood, state.target);
    }
  }
  function home() {
    const root = document.querySelector('.home-intro');
    if (!root) return;
    root.classList.add('home-buddy');
    const state = attach(root, { avatar: document.getElementById('homeCharacterAvatar'), art: false, target: '#btnHomeAnalytics', tips: ['Не все деньги обязательно тратить. Свободный остаток тоже часть учебного портфеля.', 'После первой покупки открой аналитику: там видно, как изменились доли активов.'] });
    if (homeGreeting && root.closest('.screen.active')) {
      say(root, 'Соберём первый портфель или начнём с игры? Выбирай, я помогу разобраться.', 'welcome', '#btnHomeAnalytics');
      homeGreeting = false;
    } else if (!state.text) say(root, 'Собери портфель и проверь идеи в играх.', 'welcome');
  }
  function respond(type, options) {
    const root = document.querySelector('.screen.active [data-buddy]');
    if (!root || !states.has(root)) return false;
    const rect = root.getBoundingClientRect();
    if (rect.bottom < 80 || rect.top > innerHeight - 40) return false;
    characterMotion.dismissFloating();
    say(root, options.text, type, options.anchor);
    return true;
  }
  function leave() {
    clearTimeout(runnerHideTimer);
    highlights.forEach(function (timer, target) { clearTimeout(timer); target.classList.remove('buddy-target'); });
    highlights.clear();
  }
  function runner(text, mood) {
    const avatar = document.querySelector('.runner-character-inner');
    const bubble = document.getElementById('runnerSpeech');
    if (!avatar || !bubble) return;
    bubble.textContent = text;
    bubble.hidden = false;
    bubble._speechHeight = bubble.offsetHeight;
    bubble._speechWidth = bubble.offsetWidth;
    characterMotion.play(avatar, mood || 'point');
    characterMotion.speak(avatar, text);
    clearTimeout(runnerHideTimer);
    runnerHideTimer = setTimeout(function () {
      if (bubble.isConnected) bubble.hidden = true;
      characterMotion.stopSpeech(avatar);
    }, Math.min(5000, Math.max(2000, text.length * 30 + 800)));
  }
  global.companion = { attach, enter, home, say, respond, highlight, leave, runner };
})(window);
