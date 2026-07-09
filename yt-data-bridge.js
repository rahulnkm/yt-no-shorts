// ============================================================
// yt-data-bridge.js — runs in the page's MAIN world (declared in
// manifest) so it can read YouTube's window.ytInitialPlayerResponse.
// Publishes view count + publish date onto <html data-yt-meta="…">
// so the isolated-world content scripts (watch-overlay.js) can read
// from a single DOM source of truth instead of scraping rendered text.
// ============================================================
(() => {
  function publish() {
    try {
      const r = window.ytInitialPlayerResponse;
      const det = r?.videoDetails;
      if (!det) return;
      const mf = r?.microformat?.playerMicroformatRenderer;
      const data = {
        videoId: det.videoId || '',
        viewCount: det.viewCount || '',
        publishDate: mf?.publishDate || mf?.uploadDate || '',
      };
      document.documentElement.setAttribute('data-yt-meta', JSON.stringify(data));
    } catch {}
  }

  publish();
  // Re-publish on SPA navigation (YouTube swaps the global per video)
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(publish, 100);
    setTimeout(publish, 800);
  });
})();
