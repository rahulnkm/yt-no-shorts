# YouTube No Shorts

A tiny Chrome extension that removes every trace of Shorts from YouTube.

## What it does

- Hides the Shorts shelf on home, subscriptions, search, and channel pages
- Hides individual Shorts items in search results and feeds
- Hides the "Shorts" tab in the sidebar and mini-guide
- Hides the "Shorts" filter chip in the search chip bar
- Redirects any `youtube.com/shorts/<id>` URL to `youtube.com/watch?v=<id>`

Targets both the legacy `ytd-*` renderers and the newer view-model components (`grid-shelf-view-model`, `shorts-lockup-view-model`). Tested on desktop YouTube in Chrome.

## Install

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `yt-no-shorts` folder
5. Open YouTube — Shorts are gone

## How it works

Three independent strategies so a single YouTube DOM rename can't break it:

1. **CSS selectors** (`content.css`) target known Shorts renderer tags, including `:has()`-based section-wrapper rules.
2. **URL-anchor walker** (`content.js`) finds every `<a href="/shorts/...">`, climbs to its enclosing item or section, and hides it. Rename-resilient because it keys off the URL, not the tag name.
3. **Header text matcher** hides any shelf whose title is exactly "Shorts".

Plus a `MutationObserver` to catch lazy-loaded content and hooks into `yt-navigate-finish` / `history.pushState` for SPA route changes.

## License

MIT
