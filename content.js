// ============================================================
// YouTube No Shorts — content script
//
// Strategy: belt, suspenders, and rope.
//   (1) CSS file targets known renderer/view-model tag names.
//   (2) URL-anchor walker: from every <a href="/shorts/..."> climb
//       to the nearest section/shelf ancestor and hide it. This is
//       the most rename-resilient path.
//   (3) Header text matcher: any shelf whose title is exactly
//       "Shorts" gets its section hidden, even before items render.
//   (4) /shorts/<id> URL → redirect to /watch?v=<id>.
// ============================================================

function redirectShorts() {
  const m = location.pathname.match(/^\/shorts\/([\w-]+)/);
  if (m) {
    location.replace(`${location.origin}/watch?v=${m[1]}`);
    return true;
  }
  return false;
}

if (!redirectShorts()) {
  // SPA nav hooks
  const _push = history.pushState;
  const _replace = history.replaceState;
  const fireLoc = () => window.dispatchEvent(new Event("yt-no-shorts:locationchange"));
  history.pushState = function () { _push.apply(this, arguments); fireLoc(); };
  history.replaceState = function () { _replace.apply(this, arguments); fireLoc(); };
  window.addEventListener("popstate", fireLoc);
  window.addEventListener("yt-no-shorts:locationchange", () => {
    if (redirectShorts()) return;
    scan(document.body);
  });
  // YouTube's own SPA event — fires on every route change
  window.addEventListener("yt-navigate-finish", () => scan(document.body));

  // Tag names that, by themselves, mean "this is a Shorts thing"
  const SHORTS_TAGS = new Set([
    "YTD-REEL-SHELF-RENDERER",
    "YTD-REEL-ITEM-RENDERER",
    "YTD-SHORTS",
    "GRID-SHELF-VIEW-MODEL",
    "SHORTS-LOCKUP-VIEW-MODEL",
    "YTM-SHORTS-LOCKUP-VIEW-MODEL",
    "YTM-SHORTS-LOCKUP-VIEW-MODEL-V2",
  ]);

  // Ancestors we climb to when we want to kill the whole shelf, not just an item
  const SECTION_ANCESTORS =
    "ytd-item-section-renderer, ytd-shelf-renderer, ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer";

  // Ancestors we climb to from a /shorts/ anchor to find the enclosing item
  const ITEM_ANCESTORS =
    "ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer, ytd-notification-renderer, shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, ytm-shorts-lockup-view-model";

  const hide = (el) => {
    if (!el || el.dataset?.ytNoShortsHidden) return;
    try {
      el.style.setProperty("display", "none", "important");
      if (el.dataset) el.dataset.ytNoShortsHidden = "1";
    } catch {}
  };

  // Walk up from any element to the nearest "section-like" wrapper and hide it.
  // This is the rope — when tag names shift, this still works because it
  // operates on the anchor URL, which is invariant.
  const hideSectionFor = (el) => {
    const section = el.closest?.(SECTION_ANCESTORS);
    if (section) hide(section);
  };

  const scan = (root) => {
    if (!(root instanceof Element) && !(root instanceof Document)) return;

    // (a) Hide any element that IS a Shorts container by tag
    if (root instanceof Element && SHORTS_TAGS.has(root.tagName)) {
      hide(root);
      hideSectionFor(root);
    }

    // (b) Find all /shorts/ anchors inside and kill their item + section wrappers
    root.querySelectorAll?.('a[href^="/shorts/"]').forEach((a) => {
      const item = a.closest(ITEM_ANCESTORS);
      if (item) hide(item);
      hideSectionFor(a);
    });

    // (c) Find any Shorts-tagged descendants and kill them + their sections
    SHORTS_TAGS.forEach((tag) => {
      root.querySelectorAll?.(tag.toLowerCase()).forEach((el) => {
        hide(el);
        hideSectionFor(el);
      });
    });

    // (d) Header text matcher: any shelf title that is exactly "Shorts"
    //     (scoped to shelf-title elements, never video titles)
    root
      .querySelectorAll?.(
        'ytd-shelf-renderer #title, ytd-item-section-renderer #title, grid-shelf-view-model h2, grid-shelf-view-model [role="heading"]'
      )
      .forEach((titleEl) => {
        const txt = titleEl.textContent?.trim();
        if (txt === "Shorts") hideSectionFor(titleEl);
      });

    // (e) "Shorts" filter chip in the search chip bar — match by exact label
    root.querySelectorAll?.("yt-chip-cloud-chip-renderer").forEach((chip) => {
      if (chip.textContent?.trim() === "Shorts") hide(chip);
    });
  };

  const start = () => {
    scan(document.body);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) scan(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
