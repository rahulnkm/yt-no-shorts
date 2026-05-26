// ============================================================
// top-bar.js — hide YouTube's masthead by default, slide it into
// view when the cursor enters the top 60px of the viewport.
// ============================================================
(() => {
  const SHOW_THRESHOLD = 60;   // px from top of viewport where bar should appear
  const HIDE_THRESHOLD = 80;   // px below which bar hides (a little buffer to avoid flicker)

  function setVisible(v) {
    document.documentElement.classList.toggle('psych-top-visible', v);
  }

  function init() {
    document.addEventListener('mousemove', (e) => {
      if (e.clientY < SHOW_THRESHOLD) setVisible(true);
      else if (e.clientY > HIDE_THRESHOLD) setVisible(false);
    }, { passive: true });

    document.addEventListener('mouseleave', () => setVisible(false));
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
