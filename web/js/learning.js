/* Short, self-contained lessons: read, make a choice, explain, try in the simulator. */
(function (global) {
  'use strict';
  const lessons = [
    { id: 'a1', category: 'Первый шаг', title: 'Что на самом деле даёт акция?', subtitle: 'Стань совладельцем на маленькую долю.', visual: 'share', scenario: 'У компании «Кеды» 1 000 акций. Ты купил 10. Какой кусочек бизнеса теперь твой?',
      paragraphs: ['Акция — доля в компании. В нашем примере 10 из 1 000 акций — это 1%. У публичных компаний акций гораздо больше, поэтому одна акция обычно даёт очень маленькую долю.', 'Заработать можно на росте цены и дивидендах, если компания решит их выплатить. Цена может упасть, а дивидендов может не быть. Даже знакомый бренд не обещает доход.'],
      takeaway: 'Покупка акции связывает твой результат с делами компании и ожиданиями рынка.',
      question: { prompt: 'Компания стала популярнее. Прибыль от её акций теперь гарантирована?', options: ['Да, популярность гарантирует рост', 'Нет, цена и результаты могут измениться'], correct: 1, explanation: 'Популярность — только один фактор. Цена уже может учитывать ожидания, а бизнес может столкнуться с расходами или конкурентами.' }, action: 'stocks', actionLabel: 'Найти знакомую компанию' },
    { id: 'a2', category: 'Деньги вокруг', title: 'Куда исчезает десятка из сотни?', subtitle: 'Покупательная способность на примере перекуса.', visual: 'inflation', scenario: 'В прошлом году перекус стоил 100 ₽. Теперь — 110 ₽. У тебя по-прежнему 1 000 ₽.',
      paragraphs: ['Раньше на эту сумму хватало 10 перекусов. Теперь — только 9, и останется 10 ₽. Рублей столько же, а купить получается меньше.', 'Инфляция — общий рост цен. По одному перекусу её не измерить: разные товары дорожают по-разному. Когда сравниваешь доходность, важно учитывать изменение покупательной способности.'],
      takeaway: 'Смотри и на число рублей, и на то, что на них можно купить.',
      question: { prompt: 'Накопления выросли на 5%, а цены на твою корзину — на 8%. Что с покупательной способностью?', options: ['Она снизилась', 'Она выросла на 5%'], correct: 0, explanation: 'Денег прибавилось медленнее, чем выросли цены. На накопления теперь получится купить меньше той же корзины товаров.' }, action: 'choice', actionLabel: 'Решить финансовую ситуацию' },
    { id: 'a3', category: 'Риск', title: 'Весь портфель в одних кедах?', subtitle: 'Зачем распределять деньги между разными бизнесами.', visual: 'basket', scenario: 'Ты вложил 9 000 ₽ в одну компанию. У неё неприятности, акция падает на треть. В портфеле осталось 6 000 ₽.',
      paragraphs: ['Теперь другой вариант: по 3 000 ₽ в три разных бизнеса. Если один потеряет треть, а два других не изменятся, общая сумма станет 8 000 ₽. Удар по одной компании затронул меньшую часть портфеля.', 'Это диверсификация. Компании из одной отрасли часто двигаются вместе, а во время кризиса могут падать и разные активы. Распределение снижает отдельные риски, но не отменяет убытки.'],
      takeaway: 'Важны доли и различия между активами, а не просто число тикеров.',
      question: { prompt: 'Три нефтяные компании дают такую же независимость рисков, как три разных отрасли?', options: ['Да, главное — три тикера', 'Нет, они зависят от общих факторов'], correct: 1, explanation: 'Цена нефти может одновременно повлиять на все три бизнеса. Разные названия ещё не означают разные источники риска.' }, action: 'analytics', actionLabel: 'Посмотреть доли портфеля' },
    { id: 'a4', category: 'Инфошум', title: '«Ракета завтра». А доказательства?', subtitle: 'Пауза между громкой новостью и покупкой.', visual: 'news', scenario: 'В чате обещают: «Эта акция точно вырастет вдвое». На картинке — зелёный график и очень уверенный кот.',
      paragraphs: ['Уверенный тон и красивая картинка не доказывают обещание. Проверь, кто автор, откуда взяты данные, когда они опубликованы и что может быть ему выгодно.', 'Даже настоящая хорошая новость не гарантирует рост: рынок мог отреагировать раньше. Можно пропустить сделку и спокойно разобраться. Необходимости покупать по каждой новости нет.'],
      takeaway: 'Обещание гарантированной высокой прибыли — повод остановиться и проверить информацию.',
      question: { prompt: 'Что полезнее сделать первым после такого сообщения?', options: ['Купить быстрее остальных', 'Найти первоисточник и проверить аргументы'], correct: 1, explanation: 'Проверяемый источник и понимание риска полезнее спешки. Решение не покупать тоже остаётся решением.' }, action: 'choice', actionLabel: 'Потренировать выбор' },
    { id: 'a5', category: 'План', title: 'Кроссовки через месяц. А акции?', subtitle: 'Срок цели помогает выбрать риск.', visual: 'goal', scenario: 'На новые кроссовки нужно 6 000 ₽ через месяц. Ты уже собрал эту сумму и думаешь вложить её в акции.',
      paragraphs: ['На коротком сроке цена акций может заметно измениться. Если она упадёт прямо перед покупкой кроссовок, придётся отложить цель или продать с убытком.', 'Раздели деньги по задачам: обязательные ближайшие траты, запас на неожиданности и долгие цели. Сначала определи срок и допустимую потерю, затем изучай инструменты.'],
      takeaway: 'Чем ближе обязательная трата, тем важнее доступность денег и сохранность нужной суммы.',
      question: { prompt: 'Деньги понадобятся через месяц. Что стоит определить до выбора инструмента?', options: ['Какую потерю и задержку покупки ты можешь выдержать', 'Какая акция вчера выросла сильнее'], correct: 0, explanation: 'Срок и последствия потери связаны с твоей целью. Вчерашний рост не отвечает на вопрос, хватит ли денег к нужной дате.' }, action: 'choice', actionLabel: 'Разобрать ещё одну ситуацию' },
    { id: 'a6', category: 'Рост', title: 'Когда проценты тоже работают', subtitle: 'Два года и одна простая математика.', visual: 'growth', scenario: 'Условный инструмент приносит 10% за год. Ты оставляешь и 1 000 ₽, и заработанные проценты внутри.',
      paragraphs: ['После первого года получится 1 100 ₽. Во втором году 10% считаются уже от 1 100 ₽: это ещё 110 ₽. Итого — 1 210 ₽. Такой эффект называют сложным процентом.', 'В примере ставка постоянная, нет комиссий и налогов. На рынке доходность меняется, а убытки тоже влияют на следующий результат. Расчёт помогает понять механизм, но не обещает такую прибыль.'],
      takeaway: 'Повторное вложение дохода меняет базу следующего расчёта.',
      question: { prompt: 'Почему во втором году прибавилось 110 ₽, а не 100 ₽?', options: ['Проценты начислены и на прошлый доход', 'Ставка выросла до 11%'], correct: 0, explanation: 'Ставка осталась 10%. Увеличилась сумма: 10% от 1 100 ₽ равны 110 ₽.' }, action: 'quiz', actionLabel: 'Закрепить в квизе' }
  ].map(lesson => ({ ...lesson, readMin: 2, date: '', tickers: [], sources: 'Рубликс · учебные примеры', sourceUrl: 'https://fincult.info/' }));
  DATA.newsArticles = lessons;
  function progress() {
    try { const value = JSON.parse(lsGetScoped('rubliks_learning') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (_) { return {}; }
  }
  function completed() { const state = progress(); return lessons.filter(l => state[l.id]?.done).length; }
  function next() { const state = progress(); return lessons.find(l => !state[l.id]?.done) || lessons[0]; }
  function art(lesson) {
    const parts = {
      share: ['КОМПАНИЯ', '10 / 1 000', 'ТВОЯ ДОЛЯ · 1%'],
      inflation: ['ПЕРЕКУС', '100 ₽ → 110 ₽', 'ОДНА СУММА · МЕНЬШЕ ПОКУПОК'],
      basket: ['ОДНА КОМПАНИЯ', '9 000 → 6 000 ₽', 'ТРИ КОМПАНИИ · 9 000 → 8 000 ₽'],
      news: ['СООБЩЕНИЕ ИЗ ЧАТА', '«ТОЧНО ×2»', 'ИЩЕМ ПЕРВОИСТОЧНИК'],
      goal: ['ТВОЯ ЦЕЛЬ', '6 000 ₽', 'ДО ПОКУПКИ · 1 МЕСЯЦ'],
      growth: ['УСЛОВНЫЕ 10% В ГОД', '1 000 → 1 210 ₽', 'ДВА ГОДА · БЕЗ НАЛОГОВ И КОМИССИЙ']
    }[lesson.visual];
    return '<div class="lesson-art lesson-art--' + lesson.visual + '" aria-hidden="true"><span>' + parts[0] + '</span><strong>' + parts[1] + '</strong><small>' + parts[2] + '</small></div>';
  }
  function card(lesson, index, featured) {
    const done = !!progress()[lesson.id]?.done;
    return '<a href="#" class="learning-card' + (featured ? ' learning-card--featured' : '') + '" data-article-id="' + lesson.id + '"><div class="lesson-card-top"><span>' + (done ? '✓ Пройдено' : 'Миссия ' + String(index + 1).padStart(2, '0')) + '</span><span>2 минуты · +10 XP</span></div>' + art(lesson) + '<span class="lesson-category">' + lesson.category + '</span><h3>' + lesson.title + '</h3><p>' + lesson.subtitle + '</p><span class="lesson-card-action">' + (done ? 'Повторить' : 'Разобраться') + ' <span aria-hidden="true">↗</span></span></a>';
  }
  function home() {
    const root = document.getElementById('homeLearningMission');
    if (!root) return;
    const lesson = next();
    const key = lesson.id + ':' + completed();
    if (root.dataset.lessonKey === key) return;
    root.dataset.lessonKey = key;
    root.innerHTML = '<div class="section-row"><h2 class="section-title">Разберись за пару минут</h2><a href="#" class="link-all" data-learning-library>Все миссии</a></div>' + card(lesson, lessons.indexOf(lesson), true);
  }
  function library() {
    const count = completed();
    const root = document.getElementById('educationLessons');
    root.innerHTML = '<div class="learning-route"><div><span class="lesson-category">Твой маршрут</span><h3>Разобраться. Попробовать. Повторить.</h3><p>Короткие ситуации из жизни и один выбор в конце. Можно идти в любом порядке.</p></div><strong>' + count + ' / ' + lessons.length + '</strong><progress value="' + count + '" max="' + lessons.length + '" aria-label="Пройденные миссии"></progress></div><div class="learning-grid">' + lessons.map((l, i) => card(l, i)).join('') + '</div>';
  }
  function checkpoint(lesson) {
    const state = progress()[lesson.id];
    return '<section class="lesson-check" aria-labelledby="lessonCheckTitle"><span class="lesson-category">Проверим на примере</span><h2 id="lessonCheckTitle">' + lesson.question.prompt + '</h2><div class="lesson-check-options">' + lesson.question.options.map((o, i) => '<button type="button" class="lesson-answer' + (state?.done && i === lesson.question.correct ? ' is-correct' : '') + '" data-lesson-answer="' + i + '"' + (state?.done ? ' disabled' : '') + '><span>' + ['А', 'Б'][i] + '</span>' + o + '</button>').join('') + '</div><div class="lesson-feedback" role="status" tabindex="-1">' + (state?.done ? '<strong>✓ Разобрались · миссия пройдена</strong><p>' + lesson.question.explanation + '</p><span class="lesson-reward">Награда уже в кошельке · +10 XP и 1 рубликс</span>' : '') + '</div></section>';
  }
  function article(id) {
    const lesson = lessons.find(l => l.id === id);
    if (!lesson) return false;
    const index = lessons.indexOf(lesson);
    const root = document.getElementById('articleView');
    root.dataset.lesson = id;
    root.innerHTML = '<div class="lesson-card-top"><span>Миссия ' + String(index + 1).padStart(2, '0') + ' / ' + lessons.length + ' · ' + lesson.category + '</span><span>2 минуты</span></div><h1>' + lesson.title + '</h1><p class="subtitle">' + lesson.subtitle + '</p>' + art(lesson) + '<section class="lesson-scenario"><span class="lesson-category">Представь</span><p>' + lesson.scenario + '</p></section><section class="lesson-explainer"><h2>Разберёмся</h2>' + lesson.paragraphs.map(p => '<p>' + p + '</p>').join('') + '</section><aside class="lesson-takeaway"><span>В карман памяти</span><p>' + lesson.takeaway + '</p></aside><div id="lessonGuide" data-buddy></div><div id="lessonCheckpoint">' + checkpoint(lesson) + '</div><div class="lesson-next-actions"><button type="button" class="btn-primary" data-lesson-practice="' + lesson.action + '">' + lesson.actionLabel + ' →</button>' + (index + 1 < lessons.length ? '<button type="button" class="btn-secondary" data-next-lesson="' + lessons[index + 1].id + '">Следующая миссия</button>' : '') + '</div><p class="sources">Учебные примеры Рубликса · <a href="' + lesson.sourceUrl + '" target="_blank" rel="noopener noreferrer">Финансовая культура Банка России</a></p>';
    root.querySelectorAll('[data-lesson-answer]').forEach(button => button.addEventListener('click', () => answer(lesson, Number(button.dataset.lessonAnswer))));
    return true;
  }
  function answer(lesson, selected) {
    const state = progress();
    if (state[lesson.id]?.done) return;
    const correct = selected === lesson.question.correct;
    const feedback = document.querySelector('#lessonCheckpoint .lesson-feedback');
    feedback.innerHTML = '<strong>' + (correct ? '✓ Да, логика такая' : 'Попробуй ещё раз') + '</strong><p>' + (correct ? lesson.question.explanation : 'Вернись к примеру выше: ' + lesson.takeaway) + '</p>';
    if (correct) {
      state[lesson.id] = { done: true, completedAt: Date.now() };
      lsSetScoped('rubliks_learning', JSON.stringify(state));
      addVictorinaXp(10); addRublix(1);
      const stats = getUserStats(); stats.videosWatched += 1; setUserStats(stats);
      feedback.innerHTML += '<span class="lesson-reward">+10 XP и 1 рубликс · первая победа в этой миссии</span>';
      document.querySelectorAll('[data-lesson-answer]').forEach(button => { button.disabled = true; button.classList.toggle('is-correct', Number(button.dataset.lessonAnswer) === selected); });
      characterMotion.react('correct', { anchor: feedback, text: 'Есть! Теперь проверь эту идею на практике — кнопка ниже.' });
    } else {
      const button = document.querySelector('[data-lesson-answer="' + selected + '"]');
      button.classList.add('is-wrong');
      characterMotion.react('think', { anchor: feedback, text: 'Спешить некуда. Сравни варианты с примером выше.' });
    }
    feedback.focus({ preventScroll: true });
    feedback.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  document.addEventListener('click', event => {
    const practiceLink = event.target.closest('[data-learning-practice]');
    if (practiceLink) { event.preventDefault(); renderChoice(); showScreen('choice'); }
    const libraryLink = event.target.closest('[data-learning-library]');
    if (libraryLink) { event.preventDefault(); showScreen('education'); }
    const nextLesson = event.target.closest('[data-next-lesson]');
    if (nextLesson) { renderArticle(nextLesson.dataset.nextLesson); showScreen('article'); }
    const practice = event.target.closest('[data-lesson-practice]');
    if (practice) {
      const action = practice.dataset.lessonPractice;
      if (action === 'quiz') { startQuiz(); showScreen('quiz'); }
      else if (action === 'choice') { renderChoice(); showScreen('choice'); }
      else showScreen(action);
    }
  });
  global.learning = { home, library, article, completed, progress, card, next };
})(window);
