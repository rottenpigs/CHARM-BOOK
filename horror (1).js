/* =========================================================================
   CHARMBOOK — atmosphere layer
   Everything here is an add-on: it never edits your page content.
   Tweak the numbers in CFG below.
   ========================================================================= */
(() => {
'use strict';

/* ---------- SETTINGS (safe to edit) ---------------------------------- */
const CFG = {
  audio: 'audio/interview%20with%20a%20vampire%20choir%20music.mp3', // spaces must be %20
  volume: 1,             // starting volume: 0 (silent) to 1 (full). Visitors can change it with the slider.
  fadeMs: 1200,          // how long the music takes to fade in (ms)
  title: 'CHARMBOOK',
  glitchMin: 20, glitchMax: 60,   // seconds between random glitch/shudder events
  favicon: 40,           // seconds before the tab icon opens its eye
  whispers: [
    'we saw you come in', 'the door was open', 'stay a little longer',
    'someone is behind you', 'you are not the first', 'keep the light close',
    'it is quieter down here', 'do not look at the frame'
  ],
  swapWords: ['STAY', 'LISTEN', 'LOOK', 'HELLO?']
};

/* ---------- helpers --------------------------------------------------- */
const $ = s => document.querySelector(s);
const root = document.documentElement, body = document.body;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const guard = (name, fn) => { try { fn(); } catch (e) { console.warn('[charmbook fx]', name, e); } };

const coarse = !matchMedia('(hover:hover) and (pointer:fine)').matches;   // phones / tablets
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W = innerWidth, H = innerHeight;
addEventListener('resize', () => { W = innerWidth; H = innerHeight; });

/* ---------- returning-visitor memory ---------------------------------- */
let visits = 1, daysAway = 0;
guard('memory', () => {
  const m = JSON.parse(store.get('cb_visit') || 'null');
  if (m) { visits = m.n; daysAway = (Date.now() - m.t) / 864e5; }
  if (!sessionStorage.getItem('cb_sess')) {          // count once per browsing session
    visits = (m ? m.n : 0) + 1;
    sessionStorage.setItem('cb_sess', '1');
    store.set('cb_visit', JSON.stringify({ n: visits, t: Date.now() }));
  }
});
const heat = Math.min(1, (visits - 1) / 6);          // 0 = first visit, 1 = regular
const speedUp = 1 + heat * 0.8;                      // returning visitors get more glitches

guard('welcome caption', () => {
  if (visits < 2 || typeof CAP === 'undefined') return;
  const cap = daysAway >= 3 ? 'IT HAS BEEN A WHILE'
    : visits >= 6 ? 'WE KEPT YOUR PLACE'
    : ['', '', 'WELCOME BACK', 'YOU CAME BACK', 'AGAIN', 'YOU KEEP COMING BACK'][visits];
  CAP[0] = cap;
  if (typeof cur !== 'undefined' && cur === 0) $('#strip').textContent = cap;
});

/* ---------- effects on/off ------------------------------------------- */
const savedFx = store.get('cb_fx');
let fxOn = savedFx === null ? true : savedFx === '1';
const motionOK = () => fxOn && !reduce && !document.hidden;

/* ---------- cursor: a different picture each visit (mouse devices only) ---- */
const CURSOR_COUNT = 10;
guard('cursor pick', () => {
  let n = parseInt(sessionStorage.getItem('cb_cur_s'), 10);   // same one for the whole visit
  if (!(n >= 1 && n <= CURSOR_COUNT)) {
    const last = parseInt(store.get('cb_cur_last'), 10);       // never the same as last visit
    do { n = 1 + Math.floor(Math.random() * CURSOR_COUNT); } while (n === last && CURSOR_COUNT > 1);
    sessionStorage.setItem('cb_cur_s', n); store.set('cb_cur_last', n);
  }
  root.dataset.cur = n;
});

/* ---------- layers ---------------------------------------------------- */
const mk = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'fx'; body.appendChild(d); return d; };
const dark = mk('dark'), whisp = mk('whisp');
const grain = $('#grain');
setTimeout(() => dark.classList.add('ready'), 500);

/* ---------- 1. flashlight + 7. scroll darkening ----------------------- */
let tx = W / 2, ty = H * 0.45, lx = tx, ly = ty, lastIn = -1e9, touching = false;
let prog = 0, depthS = 0, lastPage = -1;
guard('light input', () => {
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    tx = e.clientX; ty = e.clientY; lastIn = performance.now();
  }, { passive: true });
  const touch = e => {
    const t = e.touches[0]; if (!t) return;
    touching = true; tx = t.clientX; ty = t.clientY - 80;   // light sits above the finger
    lastIn = performance.now();
  };
  addEventListener('touchstart', touch, { passive: true });
  addEventListener('touchmove', touch, { passive: true });
  addEventListener('touchend', () => { touching = false; }, { passive: true });
  addEventListener('touchcancel', () => { touching = false; }, { passive: true });

  const sc = $('#sc');
  sc.addEventListener('scroll', () => {
    const m = sc.scrollHeight - sc.clientHeight;
    prog = m > 20 ? Math.min(1, sc.scrollTop / m) : 0;
  }, { passive: true });
});
const depth = () => Math.min(1, (typeof cur === 'number' ? cur / 7 : 0) * 0.4 + prog * 0.6);

/* ---------- 3. whispers (hidden text revealed by the light) ----------- */
function placeWhispers() {
  whisp.innerHTML = '';
  const sc = $('#sc'); if (!sc || !fxOn) return;
  const s = sc.getBoundingClientRect();
  const bands = [[8, s.left - 10], [s.right + 10, W - 8]].filter(b => b[1] - b[0] >= 24);
  if (!bands.length) return;
  const n = (coarse ? 2 : 3) + (visits > 2 ? 1 : 0);
  const pool = CFG.whispers.slice().sort(() => Math.random() - 0.5);
  const fs = coarse ? 15 : 17;
  for (let i = 0; i < n && i < pool.length; i++) {
    const b = bands[i % bands.length], sp = document.createElement('span');
    const len = pool[i].length * fs * 0.95;
    sp.textContent = pool[i];
    sp.style.fontSize = fs + 'px';
    sp.style.left = rand(b[0], Math.max(b[0], b[1] - fs * 1.4)) + 'px';
    sp.style.top = rand(60, Math.max(60, H - len - 50)) + 'px';
    if (Math.random() < 0.5) sp.style.transform = 'rotate(180deg)';
    whisp.appendChild(sp);
  }
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(placeWhispers, 250); });
document.fonts && document.fonts.ready.then(placeWhispers);
placeWhispers();

/* ---------- main animation loop -------------------------------------- */
let pX, pY, pR, pA, pG;
(function frame(t) {
  requestAnimationFrame(frame);
  if (!fxOn || document.hidden) return;

  if (typeof cur === 'number' && cur !== lastPage) { lastPage = cur; setTimeout(placeWhispers, 260); }

  // phones: when nobody is touching, the light drifts on its own
  if (coarse && !touching && !reduce && t - lastIn > 2500) {
    tx = W * (0.5 + 0.3 * Math.sin(t * 0.00031));
    ty = H * (0.48 + 0.26 * Math.sin(t * 0.00023 + 1.3));
  }
  const k = reduce ? 1 : (coarse ? 0.2 : 0.14);
  lx += (tx - lx) * k; ly += (ty - ly) * k;
  depthS += (depth() - depthS) * (reduce ? 1 : 0.04);

  const r = Math.round(lerp(coarse ? 230 : 310, coarse ? 140 : 170, depthS));
  const a = +lerp(0.16, 0.46, depthS).toFixed(3);
  const sx = Math.round(lx), sy = Math.round(ly);
  if (sx !== pX || sy !== pY || r !== pR || a !== pA) {
    pX = sx; pY = sy; pR = r; pA = a;
    dark.style.setProperty('--x', sx + 'px'); dark.style.setProperty('--y', sy + 'px');
    dark.style.setProperty('--r', r + 'px');  dark.style.setProperty('--a', a);
    whisp.style.setProperty('--x', sx + 'px'); whisp.style.setProperty('--y', sy + 'px');
    whisp.style.setProperty('--wr', Math.round(r * 0.42) + 'px');
  }
  const g = +(0.28 + 0.2 * depthS).toFixed(3);
  if (grain && g !== pG) { pG = g; grain.style.opacity = g; }
})(0);

/* ---------- 5 + 10. random glitch and layout shudder ----------------- */
function glitch() {
  const ttl = $('#ttl'), strip = $('#strip');
  const kinds = coarse ? ['split', 'word'] : ['shake', 'split', 'word'];
  const kind = kinds[Math.random() * kinds.length | 0];
  if (kind === 'shake') {                      // reuses your page-turn glitch
    body.classList.add('gl'); setTimeout(() => body.classList.remove('gl'), 460);
  } else if (kind === 'split') {
    ttl.classList.add('split'); setTimeout(() => ttl.classList.remove('split'), 320);
  } else {
    const el = Math.random() < 0.65 ? ttl : strip, orig = el.textContent;
    const w = CFG.swapWords[Math.random() * CFG.swapWords.length | 0];
    el.textContent = w;
    setTimeout(() => { if (el.textContent === w) el.textContent = orig; }, 280);
  }
}
function shudder() {
  body.classList.remove('shud'); void body.offsetWidth;   // restart the animation
  body.classList.add('shud');
  setTimeout(() => body.classList.remove('shud'), 450);
}
(function chaos() {
  setTimeout(() => {
    if (motionOK()) {
      const roll = Math.random();
      if (roll < 0.35) glitch();
      else if (roll < 0.70) shudder();
      else { glitch(); shudder(); }
    }
    chaos();
  }, rand(CFG.glitchMin, CFG.glitchMax) * 1000 / speedUp * (coarse ? 1.5 : 1));
})();

/* ---------- 2. phones: tap marks (desktop gets the picture cursors, see CSS) - */
guard('tap marks', () => {
  addEventListener('pointerdown', e => {
    if (!fxOn || reduce || e.pointerType !== 'touch') return;
    if (body.querySelectorAll('.tm').length > 5) return;
    const m = document.createElement('div'); m.className = 'tm';
    m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px';
    m.addEventListener('animationend', () => m.remove());
    body.appendChild(m);
  }, { passive: true });
});

/* ---------- 4 + 9. tab title tricks and favicon swap ------------------ */
const svgURI = s => 'data:image/svg+xml,' + encodeURIComponent(s);
const ICON = {
  cross: (($('link[rel~="icon"]') || {}).href) || '',
  open: svgURI(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='10' fill='#000'/><path d='M6 32C16 16 48 16 58 32C48 48 16 48 6 32Z' fill='none' stroke='#ece8e0' stroke-width='3'/><circle cx='32' cy='32' r='10' fill='#ece8e0'/><circle cx='32' cy='32' r='4.5' fill='#000'/></svg>`),
  shut: svgURI(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='10' fill='#000'/><path d='M6 30C18 44 46 44 58 30' fill='none' stroke='#ece8e0' stroke-width='3.5' stroke-linecap='round'/><path d='M14 39l-4 7M26 43l-2 7M38 43l2 7M50 39l4 7' stroke='#ece8e0' stroke-width='3' stroke-linecap='round'/></svg>`)
};
function setIcon(k) {
  if (!ICON[k]) return;
  const old = $('link[rel~="icon"]'), n = document.createElement('link');
  n.rel = 'icon'; n.href = ICON[k];
  if (old) old.remove();
  document.head.appendChild(n);
}
guard('favicon timer', () => {
  setTimeout(() => {
    if (!fxOn || document.hidden) return;
    setIcon('shut'); setTimeout(() => setIcon('open'), 1500);
  }, Math.max(12, CFG.favicon - heat * 25) * 1000);
});
let awayAt = 0, restoreT;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    awayAt = Date.now();
    if (fxOn) { document.title = 'come back'; setIcon('shut'); }
  } else {
    clearTimeout(restoreT);
    if (fxOn) {
      setIcon('open');
      if (Date.now() - awayAt > 4000) {
        document.title = 'you left. we noticed.';
        restoreT = setTimeout(() => { document.title = CFG.title; }, 4200);
      } else document.title = CFG.title;
    } else document.title = CFG.title;
  }
});

/* ---------- background music ----------------------------------------- */
const ICONS = {
  snd: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path class="on" d="M16 9c1.3 1 1.3 5 0 6M18.5 6.5c3 2.5 3 8.5 0 11"/><path class="off" d="M16 9l5 6M21 9l-5 6"/></svg>`,
  fx: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7Z"/><circle cx="12" cy="12" r="3"/><path class="off" d="M4 20L20 4"/></svg>`
};
const ctl = document.createElement('div'); ctl.id = 'ctl';
ctl.innerHTML = `<button id="snd" type="button" title="Mute / unmute" aria-label="Background music" aria-pressed="true">${ICONS.snd}</button><input id="vol" type="range" min="0" max="1" step="0.01" aria-label="Volume" title="Volume"><button id="fxb" type="button" title="Atmosphere effects" aria-label="Atmosphere effects" aria-pressed="true">${ICONS.fx}</button>`;
body.appendChild(ctl);
const sndBtn = $('#snd'), fxBtn = $('#fxb'), volEl = $('#vol');

let userVol = parseFloat(store.get('cb_vol'));
if (!(userVol >= 0 && userVol <= 1)) userVol = CFG.volume;
volEl.value = userVol;
const target = () => userVol * userVol;                    // slider 1 = full volume, gentler curve below

const a = new Audio();
a.loop = true; a.preload = 'auto'; a.src = CFG.audio;
let ctx = null, gain = null, lvl = 0, fadeT, audible = false, armed = false;
let want = store.get('cb_snd') !== '0';

a.volume = 0.5;
const volumeWorks = Math.abs(a.volume - 0.5) < 0.01;      // iPhones ignore audio.volume
if (!volumeWorks) {
  guard('webaudio gain', () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC(); const src = ctx.createMediaElementSource(a);
    gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(gain); gain.connect(ctx.destination); a.volume = 1;
  });
}
const canControl = volumeWorks || !!gain;
const setLevel = v => { lvl = v; if (gain) gain.gain.value = v; else a.volume = Math.max(0, Math.min(1, v)); };
function fadeTo(v, ms, done) {
  clearInterval(fadeT);
  const s = lvl, t0 = performance.now();
  fadeT = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    setLevel(s + (v - s) * (p * p * (3 - 2 * p)));
    if (p >= 1) { clearInterval(fadeT); done && done(); }
  }, 40);
}
const resumeCtx = () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); };
const paintBtns = () => {
  sndBtn.setAttribute('aria-pressed', want ? 'true' : 'false');
  fxBtn.setAttribute('aria-pressed', fxOn ? 'true' : 'false');
};
function goAudible() { a.muted = false; audible = true; fadeTo(target(), CFG.fadeMs); }

/* "click anywhere to begin" screen: shown only when the browser blocks autoplay */
let gate = null;
function showGate() {
  if (gate) return;
  gate = document.createElement('div'); gate.id = 'gate';
  gate.innerHTML = '<div><div class="g1">CHARMBOOK</div><div class="g2">click anywhere to begin &nbsp;&middot;&nbsp; sound on</div></div>';
  body.appendChild(gate);
}
function hideGate() {
  if (!gate) return;
  const g = gate; gate = null; g.classList.add('hide'); setTimeout(() => g.remove(), 1000);
}

const GESTURES = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'];
function onGesture(e) {
  if (e.target && e.target.closest && e.target.closest('#ctl')) return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  if (!want || audible) { disarm(); hideGate(); return; }
  resumeCtx(); a.muted = false;
  const real = e.type === 'click' || e.type === 'keydown' || e.type === 'touchend';
  Promise.resolve(a.play()).then(() => {
    if (want && !audible) goAudible();
    disarm(); hideGate();
  }).catch(() => { /* not a real activation yet: stay armed for the next event */ });
  if (real) hideGate();
}
function arm() { if (armed) return; armed = true; GESTURES.forEach(g => addEventListener(g, onGesture, true)); }
function disarm() { armed = false; GESTURES.forEach(g => removeEventListener(g, onGesture, true)); }

if (!canControl) { sndBtn.hidden = true; volEl.hidden = true; }
else {
  a.addEventListener('error', () => { sndBtn.hidden = true; volEl.hidden = true; hideGate(); disarm(); });
  setLevel(0);
  if (want) {
    a.muted = false;
    a.play().then(goAudible).catch(() => { showGate(); arm(); });   // blocked -> ask for one click
  }
}
function startNow() {
  resumeCtx(); a.muted = false;
  a.play().then(() => { if (!audible) goAudible(); hideGate(); }).catch(() => {});
}
sndBtn.addEventListener('click', () => {
  want = !want; store.set('cb_snd', want ? '1' : '0'); paintBtns();
  if (want) {
    if (userVol === 0) { userVol = 1; volEl.value = 1; store.set('cb_vol', 1); }
    audible ? fadeTo(target(), 500) : startNow();
  } else {
    fadeTo(0, 500, () => { a.pause(); audible = false; });
  }
});
volEl.addEventListener('input', () => {
  userVol = +volEl.value; store.set('cb_vol', userVol);
  if (userVol > 0 && !want) { want = true; store.set('cb_snd', '1'); paintBtns(); startNow(); }
  else if (audible) { clearInterval(fadeT); setLevel(target()); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) a.pause();
  else if (want && canControl && audible) a.play().catch(() => {});
});

/* ---------- effects toggle ------------------------------------------- */
function applyFx() {
  root.classList.toggle('fx-on', fxOn);
  if (!fxOn) {
    if (grain) { grain.style.opacity = ''; pG = undefined; }
    document.title = CFG.title;
  } else placeWhispers();
  paintBtns();
}
fxBtn.addEventListener('click', () => { fxOn = !fxOn; store.set('cb_fx', fxOn ? '1' : '0'); applyFx(); });
applyFx();
})();
