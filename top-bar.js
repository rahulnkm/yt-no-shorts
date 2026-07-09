// ============================================================
// top-bar.js — hide YouTube's masthead by default, slide it into
// view when the cursor enters the top 60px of the viewport.
//
// Also hides in-feed "Explore more topics" sections by header
// text (since CSS :has() can't match text content directly).
// ============================================================
(() => {
  if (window.__psychOff) return;  // master toggle (gate.js)

  const SHOW_THRESHOLD = 60;
  const HIDE_THRESHOLD = 80;

  function setVisible(v) {
    document.documentElement.classList.toggle('psych-top-visible', v);
  }

  // ---------- Hide sections whose header matches a known phrase ----------
  // Two layers: exact text match (KILL_PHRASES) and regex/substring (KILL_PATTERNS).
  // Patterns catch all YouTube Premium upsell variants (Listen in background,
  // Watch ad-free, Download videos, Try N months for X, etc.) without listing
  // each one. Add new exact strings to KILL_PHRASES; add resilient regexes to
  // KILL_PATTERNS.
  const KILL_PHRASES = [
    'Explore more topics',
    'Topics for you',
    'Topics to explore',
    'More to explore',
    'Featured topics',
    'YouTube featured',
  ];
  const KILL_PATTERNS = [
    /YouTube Premium/i,        // every Premium upsell ("Listen in the background…", "Watch ad-free…", "Download videos…", "Try YouTube Premium", "Get YouTube Premium", etc.)
    /\bTry \d+ months? for\b/i, // localized "Try 1 month for $X" / "Try 3 months for THB 0" promos
    /YouTube Music Premium/i,
    /Become a member/i,         // channel-membership upsells injected into the feed
  ];

  const SECTION_TAGS = [
    'YTD-RICH-SECTION-RENDERER',
    'YTD-RICH-SHELF-RENDERER',
    'YTD-SHELF-RENDERER',
    'YTD-ITEM-SECTION-RENDERER',
  ];

  function matchesKill(text) {
    if (!text) return false;
    if (KILL_PHRASES.includes(text)) return true;
    return KILL_PATTERNS.some(rx => rx.test(text));
  }

  function killSectionByHeader() {
    const headers = document.querySelectorAll('h2, h3, h4, #title, [role="heading"], yt-formatted-string');
    for (const h of headers) {
      const t = (h.textContent || '').trim();
      if (!matchesKill(t)) continue;
      let p = h;
      while (p && p !== document.body) {
        if (SECTION_TAGS.includes(p.tagName)) {
          p.setAttribute('data-psych-hide-section', '');
          break;
        }
        p = p.parentElement;
      }
    }
  }

  function init() {
    document.addEventListener('mousemove', (e) => {
      if (e.clientY < SHOW_THRESHOLD) setVisible(true);
      else if (e.clientY > HIDE_THRESHOLD) setVisible(false);
    }, { passive: true });
    document.addEventListener('mouseleave', () => setVisible(false));

    // Initial + reactive sweeps for the explore-topics section
    killSectionByHeader();
    const mo = new MutationObserver(() => killSectionByHeader());
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('yt-navigate-finish', () => setTimeout(killSectionByHeader, 500));
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
