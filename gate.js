// ============================================================
// gate.js — master on/off switch. Runs FIRST at document_start.
//
// Reads a synchronous per-origin localStorage mirror so effects can
// be gated before first paint (no flash). chrome.storage.local is the
// durable source of truth (what the popup writes); gate.js self-heals
// the mirror from it on load, reloading once if they disagree.
//
// When OFF: sets html[data-psych-off] (CSS gate) + window.__psychOff
// (JS guard other content scripts check).
// ============================================================
(() => {
  // Synchronous read — absent means enabled (the default).
  let off = false;
  try { off = localStorage.getItem('psychEnabled') === '0'; } catch {}

  window.__psychOff = off;
  if (off) document.documentElement.setAttribute('data-psych-off', '');

  // Self-heal from durable storage (covers state changed while this origin
  // had no open tab). At most one reload, and only on genuine disagreement.
  try {
    chrome.storage?.local.get('enabled', (r) => {
      const durableOff = r && r.enabled === false;      // default = enabled
      const mirrorOff = (() => {
        try { return localStorage.getItem('psychEnabled') === '0'; } catch { return false; }
      })();
      if (durableOff !== mirrorOff) {
        try { localStorage.setItem('psychEnabled', durableOff ? '0' : '1'); } catch {}
        location.reload();
      }
    });
  } catch {}
})();
