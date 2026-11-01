/* Short, action-driven SVG gestures. No background loops or animation dependencies. */
(function (global) {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const rigs = new WeakMap();
  const greeted = new WeakSet();
  const neutral = { x: 0, y: 0, turn: 0, sx: 1, sy: 1, head: 0, left: 0, right: 0,
    footLeft: 0, footRight: 0, blink: 1, coin: 0, coinX: 0, coinY: 0,
    receipt: 0, receiptY: 0, sweat: 0, sweatY: 0, stars: 0 };
  const poses = {
    welcome: [[0, {}], [.18, { y: 3, sy: .98, right: 12 }], [.4, { right: -145, head: -5 }], [.55, { right: -118, head: -3 }], [.7, { right: -153 }], [.85, { right: -120 }], [1, {}]],
    buy: [[0, {}], [.2, { right: -30, head: -6 }], [.4, { right: -40, coin: 1, coinY: -30 }], [.65, { right: 48, head: 8, coin: 1, coinX: -55, coinY: 27 }], [.82, { right: 35, coinX: -55, coinY: 32, y: 3, sy: .98 }], [1, {}]],
    sell: [[0, {}], [.2, { right: 45, head: 8 }], [.5, { right: -40, receipt: 1, receiptY: -15, turn: -3 }], [.7, { right: -25, receipt: 1, receiptY: -24, head: -5 }], [.85, { receiptY: -40 }], [1, {}]],
    correct: [[0, {}], [.15, { y: 4, sy: .97 }], [.38, { y: -14, sx: .98, sy: 1.03, right: -145, head: -6 }], [.62, { y: 3, sx: 1.03, sy: .97, right: -130 }], [.8, { head: 7, blink: .1 }], [1, {}]],
    think: [[0, {}], [.25, { head: 11, right: -150, turn: -2 }], [.43, { head: 8, right: -158 }], [.6, { head: 11, right: -146, blink: .15 }], [.78, { head: 5, right: -153 }], [1, {}]],
    pose: [[0, {}], [.2, { y: 3, sy: .98 }], [.45, { turn: -6, left: 35, right: -30, footRight: -12, head: 8 }], [.7, { turn: 5, left: 15, right: -45, footLeft: 12, head: -7 }], [1, {}]],
    hair: [[0, {}], [.25, { right: -157, head: 8 }], [.5, { right: -145, head: -6, blink: .15 }], [.7, { right: -155, head: 6 }], [1, {}]],
    shuffle: [[0, {}], [.22, { x: -5, turn: -4, footLeft: 20, left: 25, head: 10 }], [.45, { x: 5, turn: 4, footRight: -20, right: -25, head: 8 }], [.68, { x: -3, footLeft: 14, head: 6 }], [1, {}]],
    watch: [[0, {}], [.25, { head: 14, left: -48, right: 25 }], [.55, { head: 18, left: -52, blink: .1 }], [.75, { head: -5, left: -40 }], [1, {}]],
    groove: [[0, {}], [.2, { head: 10, turn: -4, y: 3, left: 20, footRight: -10 }], [.4, { head: -8, turn: 4, right: -20, footLeft: 10 }], [.6, { head: 10, turn: -4, y: 3, left: 20 }], [.8, { head: -6, turn: 3, right: -20 }], [1, {}]],
    victory: [[0, {}], [.15, { y: 6, sx: 1.04, sy: .96 }], [.33, { y: -27, left: 145, right: -145, sx: .97, sy: 1.03, stars: 1 }], [.5, { y: 4, sx: 1.04, sy: .96, left: 120, right: -130, stars: .7 }], [.68, { y: -17, turn: -5, left: 150, right: -150, stars: 1 }], [.84, { y: 3, sy: .98, head: 6 }], [1, {}]],
    careful: [[0, {}], [.25, { left: 35, right: -38, head: -9, sy: .98 }], [.5, { left: 43, right: -43, head: 9 }], [.75, { head: -4, blink: .2 }], [1, {}]],
    relief: [[0, {}], [.24, { head: 8, right: -155, sweat: 1 }], [.5, { head: -7, right: -140, sweat: 1, sweatY: 18 }], [.75, { y: 4, sy: .98, sweatY: 35 }], [1, {}]],
    bump: [[0, {}], [.2, { x: -5, turn: -10, head: 15, left: 40, right: -50, stars: 1 }], [.45, { turn: 5, head: -8, stars: .6 }], [.7, { head: 4 }], [1, {}]],
    jump: [[0, {}], [.2, { left: 65, right: -65, head: -8, footLeft: 12, footRight: -12 }], [.65, { left: 30, right: -30, head: 3 }], [1, {}]],
    coin: [[0, {}], [.2, { right: -35, coin: 1, coinY: -25, head: -4 }], [.55, { right: 40, coin: 1, coinX: -50, coinY: 22 }], [.8, { coinX: -50, coinY: 30 }], [1, {}]]
  };
  const durations = { welcome: 1350, buy: 1300, sell: 1300, correct: 1050, think: 1450,
    pose: 1200, hair: 1150, shuffle: 1200, watch: 1300, groove: 1350, victory: 1550,
    careful: 1200, relief: 1400, bump: 650, jump: 650, coin: 600 };
  let dock, dockAvatar, dockText, hideTimer, entrance, targetEffect;
  let anchor = null, previousFocus = null;

  function rig(container) {
    const svg = container && container.querySelector('.character-art');
    if (!svg) return null;
    if (!rigs.has(svg)) {
      const parts = {};
      ['actor', 'head', 'arm-left', 'arm-right', 'foot-left', 'foot-right', 'eyes', 'coin', 'receipt', 'sweat', 'stars'].forEach(name => {
        parts[name] = svg.querySelector('.char-' + name);
      });
      rigs.set(svg, parts);
    }
    return rigs.get(svg);
  }
  function transform(node, value) { if (node) node.setAttribute('transform', value); }
  function prop(node, opacity, x, y) {
    if (!node) return;
    node.setAttribute('opacity', opacity);
    transform(node, 'translate(' + x + ' ' + y + ')');
  }
  function apply(parts, p) {
    // Explicit SVG pivots stay correct for both the portrait and full-body viewBoxes.
    transform(parts.actor, `translate(${p.x} ${p.y}) translate(140 340) rotate(${p.turn}) scale(${p.sx} ${p.sy}) translate(-140 -340)`);
    transform(parts.head, `rotate(${p.head} 139 157)`);
    transform(parts['arm-left'], `rotate(${p.left} 110 171)`);
    transform(parts['arm-right'], `rotate(${p.right} 171 172)`);
    transform(parts['foot-left'], `rotate(${p.footLeft} 125 322)`);
    transform(parts['foot-right'], `rotate(${p.footRight} 160 322)`);
    transform(parts.eyes, `translate(139 106) scale(1 ${p.blink}) translate(-139 -106)`);
    prop(parts.coin, p.coin, p.coinX, p.coinY);
    prop(parts.receipt, p.receipt, 0, p.receiptY);
    transform(parts.receipt, `rotate(${p.right} 171 172) translate(0 ${p.receiptY})`);
    prop(parts.sweat, p.sweat, 0, p.sweatY);
    prop(parts.stars, p.stars, 0, -p.y * .25);
  }
  function frame(type, progress) {
    const keys = poses[type];
    let i = 1;
    while (i < keys.length - 1 && progress > keys[i][0]) i++;
    const from = keys[i - 1], to = keys[i];
    let t = Math.max(0, Math.min(1, (progress - from[0]) / (to[0] - from[0])));
    t = t * t * (3 - 2 * t);
    const result = {};
    Object.keys(neutral).forEach(key => {
      const a = from[1][key] == null ? neutral[key] : from[1][key];
      const b = to[1][key] == null ? neutral[key] : to[1][key];
      result[key] = a + (b - a) * t;
    });
    return result;
  }
  function stop(container) {
    const state = active.get(container);
    if (state) { cancelAnimationFrame(state.raf); active.delete(container); }
    const parts = rig(container);
    if (parts) apply(parts, neutral);
    if (container) delete container.dataset.motion;
  }
  function play(container, type) {
    if (!container || !poses[type]) return;
    stop(container);
    const parts = rig(container);
    if (!parts) return;
    container.dataset.lastMotion = type;
    if (reduced.matches || document.hidden) return;
    const state = { start: performance.now(), raf: null };
    active.set(container, state);
    container.dataset.motion = type;
    function tick(now) {
      if (!container.isConnected || !container.getClientRects().length || reduced.matches) { stop(container); return; }
      const progress = Math.min(1, (now - state.start) / durations[type]);
      apply(parts, frame(type, progress));
      if (progress < 1) state.raf = requestAnimationFrame(tick);
      else stop(container);
    }
    state.raf = requestAnimationFrame(tick);
  }
  function ensureDock() {
    if (dock) return;
    dock = document.createElement('aside');
    dock.id = 'characterReaction';
    dock.className = 'character-reaction';
    dock.hidden = true;
    dock.setAttribute('aria-label', 'Реакция персонажа');
    dock.innerHTML = '<div class="character-reaction-art" aria-hidden="true"></div><p class="character-reaction-text" role="status" aria-live="polite" aria-atomic="true"></p><button type="button" class="character-reaction-close" aria-label="Скрыть реакцию персонажа">×</button>';
    document.body.appendChild(dock);
    dockAvatar = dock.querySelector('.character-reaction-art');
    dockText = dock.querySelector('.character-reaction-text');
    dock.querySelector('button').addEventListener('click', clear);
  }
  function position() {
    if (!dock || dock.hidden) return;
    const viewport = global.visualViewport;
    const leftEdge = (viewport ? viewport.offsetLeft : 0) + 12;
    const topEdge = Math.max(viewport ? viewport.offsetTop : 0, document.querySelector('.header').getBoundingClientRect().bottom) + 12;
    const rightEdge = leftEdge + (viewport ? viewport.width : innerWidth) - 24;
    const tab = document.querySelector('.tab-bar');
    const tabHeight = tab && tab.getClientRects().length && innerWidth < 1000 ? tab.offsetHeight : 0;
    const bottomEdge = (viewport ? viewport.offsetTop + viewport.height : innerHeight) - tabHeight - 12;
    dock.style.width = Math.min(310, rightEdge - leftEdge) + 'px';
    const w = dock.offsetWidth, h = dock.offsetHeight;
    const rect = anchor && anchor.isConnected ? anchor.getBoundingClientRect() : null;
    let x = rightEdge - w, y = bottomEdge - h;
    if (rect) {
      if (rect.right + 16 + w <= rightEdge) { x = rect.right + 16; y = rect.top - 12; }
      else if (rect.left - 16 - w >= leftEdge) { x = rect.left - 16 - w; y = rect.top - 12; }
      else {
        x = rect.left + (rect.width - w) / 2;
        y = rect.bottom + h + 14 <= bottomEdge ? rect.bottom + 14 : rect.top - h - 14;
      }
    }
    dock.style.left = Math.max(leftEdge, Math.min(x, rightEdge - w)) + 'px';
    dock.style.top = Math.max(topEdge, Math.min(y, bottomEdge - h)) + 'px';
  }
  function clear() {
    const restoreFocus = dock && dock.contains(document.activeElement) ? previousFocus : null;
    clearTimeout(hideTimer);
    if (entrance) { entrance.cancel(); entrance = null; }
    if (targetEffect) { targetEffect.cancel(); targetEffect = null; }
    Array.from(active.keys()).forEach(stop);
    if (dock) { dock.hidden = true; dockText.textContent = ''; }
    anchor = null;
    if (restoreFocus && restoreFocus.isConnected && restoreFocus.getClientRects().length) restoreFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function react(type, options) {
    if (document.hidden) return;
    options = options || {};
    const target = typeof options.anchor === 'string' ? document.querySelector(options.anchor) : options.anchor;
    if (target && !target.getClientRects().length) return;
    ensureDock();
    clear();
    anchor = target;
    previousFocus = document.activeElement;
    dock.dataset.reaction = type;
    dock.hidden = false;
    renderCharacterAvatar(dockAvatar, options.appearance || getCharacterAppearance(), 100, {
      fullBody: true, emotion: ['think', 'careful', 'bump'].includes(type) ? 'thinking' : 'happy'
    });
    dockText.textContent = options.text || '';
    position();
    play(dockAvatar, type);
    if (!reduced.matches) entrance = dock.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    if (!reduced.matches && target && target.tagName === 'BUTTON') {
      targetEffect = target.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(2px)', offset: .35 }, { transform: 'translateY(0)' }], { delay: 300, duration: 360 });
    }
    hideTimer = setTimeout(clear, options.duration || 3100);
  }
  function greet(container) {
    if (!container || greeted.has(container) || !container.closest('.screen.active')) return;
    greeted.add(container);
    play(container, 'welcome');
  }
  function runStep(container, seconds, crouching, airborne) {
    if (reduced.matches || active.has(container)) return;
    const parts = rig(container);
    if (!parts) return;
    const stride = Math.sin(seconds * 15);
    apply(parts, { ...neutral, y: crouching ? 5 : -Math.abs(stride) * 4,
      head: crouching ? 10 : -3, left: airborne ? 55 : stride * 28,
      right: airborne ? -55 : -stride * 28, footLeft: stride * 12, footRight: -stride * 12 });
  }
  global.characterMotion = { play, react, stop, clear, greet, runStep };
  reduced.addEventListener('change', function () {
    // Preference changes stop movement without erasing a newly announced result.
    if (entrance) { entrance.cancel(); entrance = null; }
    if (targetEffect) { targetEffect.cancel(); targetEffect = null; }
    Array.from(active.keys()).forEach(stop);
    document.querySelectorAll('.illustrated-avatar').forEach(stop);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) clear(); });
  global.addEventListener('resize', position);
  // Focus and mobile keyboards can scroll after a click. Keep the result visible
  // and reposition it rather than dismissing it before the user can read it.
  global.addEventListener('scroll', position, { passive: true });
  if (global.visualViewport) global.visualViewport.addEventListener('resize', position);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') clear(); });
  // A wave on hover/focus invites the user to open their wardrobe. Touch uses the usual tap.
  function invite(event) {
    const button = event.target.closest && event.target.closest('#btnHomeCharacter');
    if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
    const avatar = button.querySelector('.illustrated-avatar');
    if (avatar && !active.has(avatar)) play(avatar, 'welcome');
  }
  document.addEventListener('pointerover', invite);
  document.addEventListener('focusin', invite);
})(window);
