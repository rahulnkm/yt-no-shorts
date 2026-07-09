// ============================================================
// watch-overlay.js — full-bleed video + custom monospace overlay
// Replaces YouTube's native title & controls bar.
//
// Controls: play/pause · time · progress bar (with chapter markers)
//           volume slider · captions · settings · fullscreen.
// Autoplay-next is forced off on every /watch page load.
// Icons are inline Lucide SVG (https://lucide.dev/).
// ============================================================
(() => {
  if (window.__psychOff) return;  // master toggle (gate.js)

  const isWatchPage = () => location.pathname.startsWith('/watch');

  // ---------- Lucide SVG icons (inline) ----------
  const ICONS = {
    play:     '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause:    '<rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/>',
    volume:   '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    volumeLow:'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    volumeX:  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    captions: '<rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M7 15h4"/><path d="M15 15h2"/><path d="M7 11h2"/><path d="M13 11h4"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  };

  const iconSvg = (name) =>
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  // ---------- Metadata ----------
  function txt(sel, root) {
    const el = (root || document).querySelector(sel);
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function formatViewCount(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B views';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M views';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K views';
    return n + ' views';
  }

  function formatRelativeDate(isoDate) {
    if (!isoDate) return '';
    const then = new Date(isoDate);
    if (isNaN(then)) return '';
    const seconds = (Date.now() - then.getTime()) / 1000;
    const units = [
      ['year', 365 * 24 * 3600],
      ['month', 30 * 24 * 3600],
      ['week', 7 * 24 * 3600],
      ['day', 24 * 3600],
      ['hour', 3600],
      ['minute', 60],
    ];
    for (const [name, sec] of units) {
      const n = Math.floor(seconds / sec);
      if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  function extractMetadata() {
    const md = document.querySelector('ytd-watch-metadata');

    // ---- Pull view count + date from ytInitialPlayerResponse (source of truth).
    // yt-data-bridge.js runs in the page's MAIN world and writes the data onto
    // <html data-yt-meta="…">. Content scripts run in an isolated world so we
    // can only read globals via this DOM bridge.
    let info = '';
    try {
      const raw = document.documentElement.getAttribute('data-yt-meta');
      if (raw) {
        const data = JSON.parse(raw);
        const views = parseInt(data.viewCount, 10);
        const parts = [];
        if (!isNaN(views)) parts.push(formatViewCount(views));
        if (data.publishDate) parts.push(formatRelativeDate(data.publishDate));
        info = parts.join(' ');
      }
    } catch {}

    // ---- Fallback to DOM scraping if the global isn't reachable.
    if (!info) {
      let legacy = txt('#info-container, #info', md);
      legacy = legacy.replace(/\d{15,}/g, '').replace(/\s+/g, ' ').trim();
      const m = legacy.match(/^(.*?\sago)\b/i);
      info = m ? m[1] : legacy;
    }

    return {
      title: txt('h1.ytd-watch-metadata, h1 yt-formatted-string', md) || document.title.replace(/ - YouTube$/, ''),
      channel: txt('ytd-channel-name #channel-name #text, ytd-channel-name a', md),
      info,
    };
  }

  function getDescriptionHTML() {
    // The description text with anchor tags lives inside the inline expander.
    const selectors = [
      '#description-inline-expander #attributed-snippet-text',
      '#description-inline-expander yt-attributed-string',
      'ytd-text-inline-expander#description-inline-expander',
      '#description ytd-text-inline-expander',
      '#description #description-inner',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const html = el.innerHTML?.trim();
      if (html) return html;
    }
    return '';
  }

  function getPlayerSurface() {
    const flexy = document.querySelector('ytd-watch-flexy');
    if (flexy?.hasAttribute('theater')) {
      return document.querySelector('#full-bleed-container') || document.querySelector('#primary');
    }
    return document.querySelector('#primary');
  }

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    const total = Math.floor(s);
    const m = Math.floor(total / 60);
    const sec = (total % 60).toString().padStart(2, '0');
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${(m % 60).toString().padStart(2, '0')}:${sec}`;
    return `${m}:${sec}`;
  }

  // ---------- Chapters ----------
  function parseTimestamp(str) {
    const parts = (str || '').trim().split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // Returns [{ time: seconds, title }] — title is empty when only positions are known.
  function getChapters(duration) {
    // Primary: the *description chapters* engagement panel (creator-defined,
    // falls back to auto-chapters). Scope strictly to that panel — other macro
    // marker panels (e.g. key moments / most replayed) also use the same
    // <ytd-macro-markers-list-item-renderer> element and would create duplicates.
    const panelSel =
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"] ytd-macro-markers-list-item-renderer,' +
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-auto-chapters"] ytd-macro-markers-list-item-renderer';
    const items = document.querySelectorAll(panelSel);
    if (items.length > 0) {
      const chapters = [];
      for (const item of items) {
        const timeEl = item.querySelector('#time');
        const titleEl = item.querySelector('h4');
        if (!timeEl || !titleEl) continue;
        const seconds = parseTimestamp(timeEl.textContent);
        const title = titleEl.textContent.trim();
        if (title) chapters.push({ time: seconds, title });
      }
      if (chapters.length > 0) return chapters;
    }
    // Fallback: progress-bar segments (no titles — just positions).
    if (!duration) return [];
    const container = document.querySelector('.ytp-chapters-container');
    if (!container) return [];
    const segments = container.querySelectorAll('.ytp-chapter-hover-container');
    if (segments.length <= 1) return [];
    let cumPct = 0;
    const out = [];
    segments.forEach((seg, i) => {
      out.push({ time: (cumPct / 100) * duration, title: `Chapter ${i + 1}` });
      cumPct += parseFloat(seg.style.width) || 0;
    });
    return out;
  }

  function renderChapterMarkers(wrap, chapters, duration) {
    wrap.querySelectorAll('.psych-chapter-marker').forEach(m => m.remove());
    if (!duration || chapters.length <= 1) return;
    for (let i = 1; i < chapters.length; i++) {
      const pct = (chapters[i].time / duration) * 100;
      if (pct <= 0 || pct >= 100) continue;
      const m = document.createElement('div');
      m.className = 'psych-chapter-marker';
      m.style.left = `${pct}%`;
      wrap.appendChild(m);
    }
  }

  function findChapterAtPercent(chapters, percent, duration) {
    if (!chapters.length || !duration) return null;
    const t = (percent / 100) * duration;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (t >= chapters[i].time) return chapters[i];
    }
    return chapters[0];
  }

  // ---------- Overlay markup ----------
  function buildOverlayMarkup() {
    return `
      <div class="psych-watch-controls">
        <button class="psych-btn psych-play" title="Play/pause (k)">${iconSvg('play')}</button>
        <span class="psych-time">
          <span class="psych-cur">0:00</span>
          <span class="psych-time-sep">/</span>
          <span class="psych-dur">0:00</span>
        </span>
        <div class="psych-progress-wrap">
          <input type="range" class="psych-progress" min="0" max="1000" step="1" value="0">
          <div class="psych-chapter-tooltip"></div>
        </div>
        <div class="psych-volume-group">
          <button class="psych-btn psych-mute" title="Mute (m)">${iconSvg('volume')}</button>
          <input type="range" class="psych-volume" min="0" max="100" step="1" value="100" title="Volume">
        </div>
        <button class="psych-btn psych-cc" title="Captions (c)">${iconSvg('captions')}</button>
        <button class="psych-btn psych-speed" title="Playback speed">1×</button>
        <button class="psych-btn psych-settings" title="Settings">${iconSvg('settings')}</button>
        <button class="psych-btn psych-fullscreen" title="Fullscreen (f)">${iconSvg('maximize')}</button>
      </div>
      <div class="psych-watch-title"></div>
      <div class="psych-watch-meta"></div>
    `;
  }

  // ---------- Controls wiring ----------
  function wireControls(overlay) {
    if (overlay.dataset.psychControlsWired === '1') return;
    const video = document.querySelector('video');
    if (!video) return;

    const $ = (s) => overlay.querySelector(s);
    const playBtn = $('.psych-play');
    const curEl = $('.psych-cur');
    const durEl = $('.psych-dur');
    const progressWrap = $('.psych-progress-wrap');
    const progress = $('.psych-progress');
    const muteBtn = $('.psych-mute');
    const volumeSlider = $('.psych-volume');
    const ccBtn = $('.psych-cc');
    const speedBtn = $('.psych-speed');
    const settingsBtn = $('.psych-settings');
    const fsBtn = $('.psych-fullscreen');

    const SPEEDS = [1, 1.5, 2, 4];
    const syncSpeed = () => {
      const rate = video.playbackRate;
      speedBtn.textContent = `${rate}×`;
    };

    const setIcon = (btn, name) => { btn.innerHTML = iconSvg(name); };
    const syncPlay = () => setIcon(playBtn, video.paused ? 'play' : 'pause');
    const syncMute = () => {
      const muted = video.muted || video.volume === 0;
      if (muted) setIcon(muteBtn, 'volumeX');
      else if (video.volume < 0.5) setIcon(muteBtn, 'volumeLow');
      else setIcon(muteBtn, 'volume');
      volumeSlider.value = muted ? 0 : Math.round(video.volume * 100);
    };

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.paused ? video.play() : video.pause();
    });
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
    });
    volumeSlider.addEventListener('input', (e) => {
      e.stopPropagation();
      const v = parseInt(e.target.value, 10) / 100;
      video.volume = v;
      video.muted = (v === 0);
    });
    ccBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelector('.ytp-subtitles-button')?.click();
      ccBtn.classList.toggle('active');
    });
    speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = video.playbackRate;
      // Click cycles through preset speeds (1 → 1.5 → 2 → 4 → 1)
      const next = SPEEDS.find(s => s > cur) ?? SPEEDS[0];
      video.playbackRate = next;
    });
    // Scroll-wheel over the button: adjust by deltaY magnitude, clamped 0.5–4×
    speedBtn.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Sensitivity factor — bigger = more change per scroll
      const SENSITIVITY = 0.01;
      const raw = video.playbackRate - e.deltaY * SENSITIVITY;
      const next = Math.round(raw * 10) / 10;
      video.playbackRate = Math.max(0.5, Math.min(4, next));
    }, { passive: false });
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelector('.ytp-settings-button')?.click();
    });
    fsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const player = document.querySelector('#movie_player');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (player?.requestFullscreen) player.requestFullscreen();
    });

    let seeking = false;
    progress.addEventListener('input', (e) => {
      seeking = true;
      if (video.duration) {
        video.currentTime = (e.target.value / 1000) * video.duration;
      }
    });
    progress.addEventListener('change', () => { seeking = false; });

    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPlay);
    video.addEventListener('volumechange', syncMute);
    video.addEventListener('ratechange', syncSpeed);
    video.addEventListener('timeupdate', () => {
      curEl.textContent = fmtTime(video.currentTime);
      if (!seeking && video.duration) {
        progress.value = (video.currentTime / video.duration) * 1000;
      }
    });
    // Chapter state — re-derived when duration changes and on hydration retries.
    let chapters = [];
    const refreshChapters = () => {
      chapters = getChapters(video.duration);
      renderChapterMarkers(progressWrap, chapters, video.duration);
    };
    video.addEventListener('durationchange', () => {
      durEl.textContent = fmtTime(video.duration);
      refreshChapters();
    });
    setTimeout(refreshChapters, 1500);
    setTimeout(refreshChapters, 4000);

    // Tooltip: hovering over the progress bar shows the chapter at that position.
    const tooltip = $('.psych-chapter-tooltip');
    progressWrap.addEventListener('mousemove', (e) => {
      if (!video.duration || !chapters.length) {
        tooltip.classList.remove('visible');
        return;
      }
      const r = progressWrap.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      const ch = findChapterAtPercent(chapters, pct, video.duration);
      if (ch && ch.title) {
        tooltip.textContent = ch.title;
        tooltip.classList.add('visible');
      } else {
        tooltip.classList.remove('visible');
      }
    });
    progressWrap.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });

    syncPlay();
    syncMute();
    syncSpeed();
    if (video.duration) durEl.textContent = fmtTime(video.duration);

    overlay.dataset.psychControlsWired = '1';
  }

  function ensureOverlay() {
    const primary = getPlayerSurface();
    if (!primary) return null;
    let overlay = primary.querySelector('.psych-watch-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'psych-watch-overlay';
      overlay.innerHTML = buildOverlayMarkup();
      primary.appendChild(overlay);
    }
    return overlay;
  }

  // ---------- Bottom-third hover detection ----------
  let docListenerWired = false;
  function wireDocumentListener() {
    if (docListenerWired) return;
    docListenerWired = true;
    document.addEventListener('mousemove', (e) => {
      if (!isWatchPage()) return;
      const surface = getPlayerSurface();
      if (!surface) return;
      const overlay = surface.querySelector('.psych-watch-overlay');
      if (!overlay) return;
      const r = surface.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        overlay.classList.remove('visible');
        return;
      }
      const inSurface = e.clientX >= r.left && e.clientX <= r.right &&
                        e.clientY >= r.top && e.clientY <= r.bottom;
      const relativeY = e.clientY - r.top;
      const inBottomHalf = inSurface && relativeY > r.height * (1 / 2);
      overlay.classList.toggle('visible', inBottomHalf);
    }, { capture: true, passive: true });
  }

  // ---------- Force autoplay-next off ----------
  function ensureAutoplayOff() {
    if (!isWatchPage()) return;
    [500, 1500, 3000, 6000].forEach(t => {
      setTimeout(() => {
        const btn = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
        if (btn) btn.click();
      }, t);
    });
  }

  // ---------- Force theater mode on every /watch page ----------
  function ensureTheaterMode() {
    if (!isWatchPage()) return;
    [500, 1500, 3000, 6000].forEach(t => {
      setTimeout(() => {
        const flexy = document.querySelector('ytd-watch-flexy');
        if (!flexy || flexy.hasAttribute('theater')) return;
        const sizeBtn = document.querySelector('.ytp-size-button');
        if (sizeBtn) sizeBtn.click();
      }, t);
    });
  }

  // ---------- Description panel (draggable, scrollable) ----------
  let descPanel = null;

  function ensureDescPanel() {
    if (descPanel && document.body.contains(descPanel)) return descPanel;
    descPanel = document.createElement('div');
    descPanel.className = 'psych-desc-panel';
    descPanel.innerHTML = `
      <div class="psych-desc-header">
        <span class="psych-desc-title">Description</span>
        <button class="psych-desc-close" title="Close">×</button>
      </div>
      <div class="psych-desc-body"></div>
    `;
    document.body.appendChild(descPanel);

    const header = descPanel.querySelector('.psych-desc-header');
    const closeBtn = descPanel.querySelector('.psych-desc-close');

    closeBtn.addEventListener('click', () => {
      descPanel.classList.remove('visible');
    });

    // Drag
    let dragging = false, startX = 0, startY = 0, panelX = 0, panelY = 0;
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const r = descPanel.getBoundingClientRect();
      panelX = r.left; panelY = r.top;
      descPanel.classList.add('dragging');
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const w = descPanel.offsetWidth, h = descPanel.offsetHeight;
      let nx = panelX + (e.clientX - startX);
      let ny = panelY + (e.clientY - startY);
      nx = Math.max(0, Math.min(window.innerWidth - w, nx));
      ny = Math.max(0, Math.min(window.innerHeight - h, ny));
      descPanel.style.left = nx + 'px';
      descPanel.style.top = ny + 'px';
      descPanel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        descPanel.classList.remove('dragging');
      }
    });

    return descPanel;
  }

  function parseTimeFromHref(href) {
    if (!href) return null;
    const m = href.match(/[?&#]t=([^&]+)/);
    if (!m) return null;
    const t = m[1];
    if (/^\d+s?$/.test(t)) return parseInt(t, 10);
    if (/^(\d+h)?(\d+m)?(\d+s)?$/.test(t)) {
      let total = 0;
      const h = t.match(/(\d+)h/);
      const mm = t.match(/(\d+)m(?!s)/);
      const s = t.match(/(\d+)s/);
      if (h) total += parseInt(h[1], 10) * 3600;
      if (mm) total += parseInt(mm[1], 10) * 60;
      if (s) total += parseInt(s[1], 10);
      return total;
    }
    return null;
  }

  function seekVideo(seconds) {
    const video = document.querySelector('video');
    if (!video) return;
    video.currentTime = seconds;
    if (video.paused) video.play();
  }

  // Convert anchor-wrapped timestamps + plain-text timestamps in the
  // description into clickable seek links.
  function wireDescriptionLinks(body) {
    // Pass 1: existing <a> tags. Any anchor with a t= param is a seek;
    // everything else opens in a new tab.
    body.querySelectorAll('a').forEach(a => {
      const seconds = parseTimeFromHref(a.getAttribute('href'));
      if (seconds !== null) {
        a.classList.add('psych-timestamp');
        a.removeAttribute('target');
        a.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          seekVideo(seconds);
        });
      } else if (a.href) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });

    // Pass 2: linkify plain-text timestamps that YouTube didn't auto-link.
    const tsRe = /\b(\d{1,2}(?::\d{2}){1,2})\b/g;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const targets = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('a')) continue;
      if (!/\d{1,2}:\d{2}/.test(node.textContent)) continue;
      targets.push(node);
    }
    for (const tn of targets) {
      const text = tn.textContent;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      tsRe.lastIndex = 0;
      let m;
      while ((m = tsRe.exec(text))) {
        const parts = m[1].split(':').map(Number);
        let seconds;
        if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = m[1];
        a.className = 'psych-timestamp';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          seekVideo(seconds);
        });
        frag.appendChild(a);
        lastIdx = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      tn.parentNode?.replaceChild(frag, tn);
    }
  }

  function openDescription() {
    const panel = ensureDescPanel();
    const body = panel.querySelector('.psych-desc-body');
    body.innerHTML = getDescriptionHTML() || '<em style="opacity:0.5">No description available.</em>';
    wireDescriptionLinks(body);
    panel.classList.add('visible');
  }

  // ---------- Lifecycle ----------
  function update() {
    if (!isWatchPage()) return;
    const overlay = ensureOverlay();
    if (!overlay) return;
    wireDocumentListener();
    wireControls(overlay);
    const data = extractMetadata();
    overlay.querySelector('.psych-watch-title').textContent = data.title;

    const meta = overlay.querySelector('.psych-watch-meta');
    meta.textContent = '';
    const parts = [data.channel, data.info].filter(Boolean);
    parts.forEach((p, i) => {
      if (i > 0) meta.append('  ·  ');
      meta.append(p);
    });
    if (parts.length > 0) meta.append('  ·  ');
    const descLink = document.createElement('a');
    descLink.className = 'psych-desc-link';
    descLink.textContent = 'Description';
    descLink.href = '#';
    descLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDescription();
    });
    meta.append(descLink);
  }

  function retry() {
    if (!isWatchPage()) return;
    // Extended timing — some videos hydrate view-count / date after 4s
    [0, 300, 800, 2000, 4000, 8000, 12000].forEach(t => setTimeout(update, t));
    ensureAutoplayOff();
    ensureTheaterMode();
  }

  window.addEventListener('yt-navigate-finish', retry);
  if (document.readyState !== 'loading') retry();
  else document.addEventListener('DOMContentLoaded', retry, { once: true });
})();
