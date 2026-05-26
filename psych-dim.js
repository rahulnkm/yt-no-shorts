// ============================================================
// psych-dim — score every video card's psychological intensity
// (open-loop curiosity + emotional lexicon + visceral triggers
// + visual loudness), then dim opacity into 3 discrete stages,
// relative to peers on the same page.
//
// Stages: 1.0 (calm/no signals), 0.25 (mild), 0.05 (loudest).
// Nothing is hidden — the eye is drawn toward calmer cards.
// ============================================================
(() => {
  // ---------- 1. Open-loop signals ----------
  const OPEN_LOOP_SIGNALS = [
    [26, /\b(you wo?n'?t believe|wait (?:for|til+|until)\b|what happened (?:next|when|after)|the result|i (?:can'?t|could ?n'?t) believe|until i (?:saw|tried|did|realized)|changed everything|and (?:then|that'?s when)|it all went wrong|gone wrong|you have to see)\b/i],
    [22, /\b(secret|secrets|hidden|nobody (?:tells|told) you|they do ?n'?t want you to know|what (?:they|no ?one) (?:wo?n'?t |do ?n'?t )?(?:tell|told)|reveal(?:ed|s)?|exposed|truth about|the truth)\b/i],
    [20, /\b(the (?:real )?reason|here'?s why|why .* (?:actually|really)|this is why|the reason why|how .* (?:actually|really) works)\b/i],
    [16, /(^|["'\s])(this|these|that one|one)\b(?!\s+(?:video|channel|week|year|is the|episode))/i],
    [18, /\b(\d+|top \d+|the #?1|the no\.? ?1)\s+(things|reasons|ways|mistakes|secrets|signs|tips|tricks|rules|habits|facts|lessons|types|steps)\b/i],
    [14, /(\?\s*$)|(^(why|when|where|which|who|can|will|is|are|do|does|should|could|would|did)\b)|(^how (?!to\b))|(^what (?!is\b|are\b))/i],
    [13, /\b(the (?:most|best|worst|only|biggest|smallest|fastest|hardest|weirdest|strangest|craziest|scariest|cheapest)|#1|number one|ever|of all time)\b/i],
    [15, /\b(stop (?:doing|using|eating|buying|chasing|trying|watching|wasting|believing|paying|listening|scrolling)|never (?:do|use|buy|eat|trust|believe)|do ?n'?t (?:do|use|buy|eat|watch|trust)?.* (?:until|before|unless)|before you (?:buy|start|do|try|invest|sign)|you'?re doing .* wrong|you should never|you must never)\b/i],
    [17, /\b(i (?:tried|ate|did|used|wore|lived|spent|trained|practiced)\b.*\bfor \d+\s*(?:days?|weeks?|months?|years?|hours?)|what .* did to me|after \d+\s*(?:days?|weeks?|months?|years?)|\d+\s*(?:days?|weeks?|months?) (?:later|of))\b/i],
    [14, /\b(one (?:trick|thing|reason|mistake|rule|habit|tip)|this (?:method|trick|technique|hack|tool|app|mistake)|a (?:strange|weird|simple|surprising)\b)/i],
    [8,  /(\.\.\.|…)/],
    [9,  /\b(your|you'?ll|you (?:need|have|must|should)|if you)\b/i],
    [16, /\b(i (?:should|shouldn'?t|should not|wish i)\s+(?:have|had|never|knew|told|tried|done|known|listened|stayed|left)|my biggest (?:regret|mistake)|biggest mistake of|what i wish (?:i )?(?:knew|had|told)|wish someone had told)\b/i],
    [14, /\b(inside (?:a |an |the |my )?(?:massive |huge |secret |hidden |famous |private |exclusive |abandoned )?[a-z]{4,}|behind the scenes|day in the life|what (?:really |actually )(?:goes on|happens)|i (?:visited|toured|went inside|spent a day|got access))\b/i],
    [14, /\b(i (?:asked|gave|sent|paid|hired|invited|let|made|called|emailed|texted|messaged|trained|fed|surprised|challenged|interviewed)\s+(?:my\s+|a\s+|the\s+|\d+\s+)?(?:friend|stranger|chef|expert|kid|child|wife|husband|brother|sister|dad|mom|coach|chatgpt|ai|claude|gpt|robot|professional|pro|master|legend|grandma))\b/i],
    [12, /\b(the (?:richest|smartest|fastest|strongest|biggest|most successful|most famous)\s+[a-z]+\s+(?:is|was|are|were)\s+(?:broke|dumb|slow|weak|sad|alone|poor|miserable|unhappy|secretly)|[a-z]+\s+but\s+(?:i|he|she|they|we|nobody|nothing|everything)\s+(?:can'?t|wo?n'?t|do ?n'?t|did ?n'?t|never|still))\b/i],
    [13, /\bthe (reason|moment|catch|problem|trick|key|answer|warning|story|secret|mistake|difference|trap|day|night|email|message|call)\s+(why|behind|of|that|to|i|we|you|he|she|it|they)\b/i],
  ];

  function scoreOpenLoop(title) {
    let s = 0;
    for (const [w, rx] of OPEN_LOOP_SIGNALS) if (rx.test(title)) s += w;
    return Math.min(s, 120);
  }

  // ---------- 2. Emotional intensity lexicon ----------
  const INTENSE_WORDS = new Set([
    'death','dead','die','died','dying','kill','killed','killer','murder','murdered',
    'broken','breaks','ruined','ruins','fail','failed','failure','disaster','tragedy',
    'tragic','crash','crashed','collapse','collapsed','destroyed','destroy','horrific',
    'horrible','terrible','worst','nightmare','panic','crisis','chaos',
    'insane','crazy','incredible','unbelievable','impossible','ultimate','massive',
    'huge','perfect','flawless','never','always','everyone','nobody','everything',
    'nothing','forever','instantly','immediately',
    'warning','danger','dangerous','threat','attack','attacked','beware','toxic',
    'poison','poisonous','deadly','lethal','fatal',
    'shocking','shocked','stunning','stunned','exposed','expose','betrayed','betrayal',
    'lied','lying','liar','scam','scammed','fraud','caught','arrested','banned',
    'quit','quits','fired','divorce','divorced','breakup','furious','outrage',
    'outraged','enraged','rage',
    'cancer','tumor','disease','infection','sick','pain','painful','bleeding',
    'wound','injury','injured','stroke',
    'broke','bankrupt','debt','poverty','stolen','steal','robbed','millionaire','billionaire',
    'mindblowing','jawdropping','breathtaking','gamechanging','lifechanging',
    'revolutionary','viral','trending',
  ]);

  function scoreEmotional(title) {
    const words = title.toLowerCase().split(/[^a-z']+/);
    let hits = 0;
    for (const w of words) if (INTENSE_WORDS.has(w)) hits++;
    return Math.min(hits * 8, 60);
  }

  // ---------- 3. Visceral triggers (sex / money / drugs / violence / power) ----------
  const TRIGGER_WORDS = {
    sex: new Set([
      'sexy','hot','naked','nude','lust','lingerie','bikini','kiss','kissed','kissing',
      'tinder','hookup','hookups','virgin','onlyfans','seduction','seduce','seduced',
      'affair','mistress','flirting','flirt','strip','stripper','porn','attractive',
      'crush','dating','sex','sexual','sensual','intimate','erotic','thirst',
    ]),
    money: new Set([
      'million','millions','billion','billions','trillion','rich','wealthy','wealth',
      'millionaire','billionaire','dollars','dollar','profit','profits','salary',
      'paycheck','income','passive','hustle','sidehustle','broke','poverty','debt',
      'cash','money','revenue','earnings','earned','networth','grand','grands',
      'fortune','fortunes','jackpot','lottery','raise','bonus','tax','taxes',
    ]),
    drugs: new Set([
      'weed','marijuana','cannabis','cocaine','coke','meth','heroin','opioid','xanax',
      'adderall','alcohol','alcoholic','drunk','high','stoned','addict','addiction',
      'addicted','overdose','drug','drugs','psychedelic','psychedelics','mushrooms',
      'shrooms','lsd','dmt','vape','vaping','smoked','smoking','blunt','bong','dab',
      'ketamine','molly','ecstasy','sober','sobriety',
    ]),
    violence: new Set([
      'fight','fought','fighting','beat','beaten','brawl','attack','attacked','war',
      'weapon','gun','guns','sword','knife','blood','bloody','gore','brutal','brutally',
      'violent','violence','assault','assaulted','punch','punched','knockout','ko',
      'shootout','shot','stabbed','stab',
    ]),
    power: new Set([
      'alpha','sigma','beta','dominant','dominate','dominated','dominating','king',
      'queen','emperor','elite','exclusive','royalty','royal','boss','ceo','tycoon',
      'mogul','empire','throne','submissive','obey','rule','rules','ruler','ruling',
    ]),
  };

  function scoreTriggers(title) {
    const words = title.toLowerCase().split(/[^a-z']+/);
    let hits = 0;
    for (const w of words) {
      if (!w) continue;
      for (const set of Object.values(TRIGGER_WORDS)) {
        if (set.has(w)) { hits++; break; }
      }
    }
    const dollarHits = (title.match(/\$\d/g) || []).length;
    return Math.min(hits * 7 + dollarHits * 5, 70);
  }

  // ---------- 4. Visual loudness ----------
  const EMOJI_RX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  function scoreVisualLoudness(title) {
    let s = 0;
    const capsWords = title.match(/\b[A-Z]{3,}\b/g) || [];
    s += capsWords.length * 8;
    const letters = title.replace(/[^A-Za-z]/g, '');
    if (letters.length > 0) {
      const caps = (letters.match(/[A-Z]/g) || []).length;
      const ratio = caps / letters.length;
      if (ratio > 0.4) s += 12;
      else if (ratio > 0.25) s += 6;
    }
    s += (title.match(/!/g) || []).length * 5;
    s += (title.match(/\?{2,}|!{2,}|!\?|\?!/g) || []).length * 8;
    s += (title.match(EMOJI_RX) || []).length * 6;
    return Math.min(s, 60);
  }

  function scoreCard(title) {
    return scoreOpenLoop(title) + scoreEmotional(title) + scoreTriggers(title) + scoreVisualLoudness(title);
  }

  // ---------- 5. Card walking & dimming ----------
  const CARD_SELECTORS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
  ].join(',');

  const STAGE_VALUES = ['1', '0.03'];

  function getTitle(card) {
    const a = card.querySelector('a[href*="/watch"]');
    if (!a) return '';
    let t = a.getAttribute('title') || a.getAttribute('aria-label') || '';
    if (!t) {
      const el = card.querySelector('#video-title, h3 a, yt-formatted-string[id="video-title"]');
      if (el) t = (el.getAttribute('title') || el.textContent || '');
    }
    return (t || '').replace(/\s+/g, ' ').trim();
  }

  function applyOpacity(card, stage) {
    card.style.setProperty('opacity', STAGE_VALUES[stage], 'important');
    card.style.transition = 'opacity 0.3s ease';
    if (stage === 0) card.removeAttribute('data-dimmed');
    else card.setAttribute('data-dimmed', '');
  }

  function dimAll() {
    const cards = Array.from(document.querySelectorAll(CARD_SELECTORS))
      .filter(c => c.offsetParent !== null);
    const scored = [];
    for (const card of cards) {
      const title = getTitle(card);
      if (!title) continue;
      scored.push({ card, score: scoreCard(title) });
    }
    if (scored.length < 2) return;

    // Two tiers: score 0 → stage 0 (full), any signals → stage 1 (dim)
    scored.forEach(item => {
      applyOpacity(item.card, item.score === 0 ? 0 : 1);
    });
  }

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    const run = () => { pending = false; try { dimAll(); } catch (e) { console.warn('[psych-dim]', e); } };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 500 });
    else setTimeout(run, 200);
  };

  // ---------- 6. Portal sync — hide preview entirely for dimmed cards ----------
  // Strategy: a stylesheet rule (with !important + multiple properties) hides
  // every preview-portal element while `html[data-psych-dim-hover]` is set.
  // Inline manipulation lost to YouTube re-setting; a stylesheet declaration
  // can't be wiped by them overwriting inline styles.
  const PORTAL_ELEMENT_SELECTORS = [
    '#preview > ytd-video-preview',
    'ytd-video-preview',
    '#inline-preview-player',
    'ytd-player#inline-player',
    '#player-container-wrapper',
    'ytd-player#inline-player video',
  ];

  function injectPortalStyle() {
    if (document.getElementById('__psych-dim-hide-portal__')) return;
    const style = document.createElement('style');
    style.id = '__psych-dim-hide-portal__';
    // Unconditionally hide every hover-preview portal element. Autoplay
    // previews are killed on every card — dimmed or not.
    style.textContent = `
      ${PORTAL_ELEMENT_SELECTORS.join(',\n')} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  const start = () => {
    injectPortalStyle();
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('yt-navigate-finish', schedule);
    setTimeout(schedule, 1500);
    setTimeout(schedule, 3500);
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
