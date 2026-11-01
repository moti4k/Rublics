/* Keep dynamically opened sheets usable with keyboard and assistive technology. */
(function () {
  const dialogs = Array.from(document.querySelectorAll('.modal'));
  let active = null;
  let returnFocus = null;
  function update() {
    dialogs.forEach(dialog => {
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-hidden', String(dialog.classList.contains('hidden')));
      const title = dialog.querySelector('h3, h2');
      if (title) {
        if (!title.id) title.id = dialog.id + '-title';
        dialog.setAttribute('aria-labelledby', title.id);
      }
    });
    const opened = dialogs.find(dialog => !dialog.classList.contains('hidden')) || null;
    if (opened === active) return;
    if (opened) {
      returnFocus = document.activeElement;
      const first = opened.querySelector('input, button:not(:disabled), select, a[href]');
      if (first) first.focus();
    } else if (returnFocus && returnFocus.isConnected) {
      returnFocus.focus();
    }
    active = opened;
    document.body.style.overflow = active ? 'hidden' : '';
  }
  const observer = new MutationObserver(update);
  dialogs.forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['class'] }));
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') {
      const close = active.querySelector('[id$="Cancel"], [id$="Done"], [id$="Backdrop"]');
      if (close) close.click();
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(active.querySelectorAll('button:not(:disabled), input, select, a[href]')).filter(el => el.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  update();
})();
