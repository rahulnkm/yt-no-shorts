// ============================================================
// popup.js — the extension's on/off control.
//
// Writes durable state to chrome.storage.local, mirrors it into the
// active YouTube tab's localStorage (for gate.js's synchronous read),
// then reloads that tab preserving the current video timestamp.
// ============================================================
const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

function render(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? 'Effects on' : 'Effects off';
}

// Initialise from durable state (default: enabled).
chrome.storage.local.get('enabled', (r) => {
  render(r.enabled !== false);
});

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  render(enabled);
  await chrome.storage.local.set({ enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && /:\/\/([^/]*\.)?youtube\.com\//.test(tab.url || '')) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [enabled],
      func: (en) => {
        // Mirror state for gate.js's synchronous pre-paint read.
        try { localStorage.setItem('psychEnabled', en ? '1' : '0'); } catch {}
        // Preserve playback position across the reload via YouTube's ?t= param.
        const url = new URL(location.href);
        const v = document.querySelector('video');
        if (v && location.pathname.startsWith('/watch') &&
            isFinite(v.currentTime) && v.currentTime > 1) {
          url.searchParams.set('t', Math.floor(v.currentTime) + 's');
        }
        location.href = url.toString();
      },
    });
    window.close();
  }
  // If the active tab isn't YouTube, durable state is saved; any YouTube
  // tab self-heals to the new state on its next load (see gate.js).
});
