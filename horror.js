(() => {
'use strict';

/* ---------- SETTINGS ---------------------------------- */
const CFG = {
  audio: 'audio/interview%20with%20a%20vampire%20choir%20music.mp3', 
  volume: 0.85,          
  fadeMs: 2000,          
  title: 'CHARMBOOK',
  glitchMin: 20, glitchMax: 60,   
  eyesMin: 14,  eyesMax: 38,      
  favicon: 30,          
  whispers: [
    'we saw you come in', 'the door was open', 'stay a little longer',
    'someone is behind you', 'you are not the first', 'keep the light close',
    'it is quieter down here', 'do not look'
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
const speedUp = 1 + heat * 0.8;                      // returning visitors get more activity

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

/* ---------- layers ---------------------------------------------------- */
const mk = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'fx'; body.appendChild(d); return d; };
const dark = mk('dark'), whisp = mk('whisp'), eyes = mk('eyes');
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

/* ---------- 6. eyes in the dark ------------------------------------- */
const EYE_SVG = `<svg viewBox="0 0 60 20" aria-hidden="true"><g fill="#070707" stroke="#ece8e0" stroke-width="1.2" stroke-linejoin="round"><path d="M2 10C8 2 18 2 24 10C18 18 8 18 2 10Z"/><path d="M36 10C42 2 52 2 58 10C52 18 42 18 36 10Z"/></g><g fill="#ece8e0"><circle cx="13" cy="10" r="4.2"/><circle cx="47" cy="10" r="4.2"/></g><g fill="#000"><circle cx="13" cy="10" r="1.8"/><circle cx="47" cy="10" r="1.8"/></g></svg>`;
const watchers = [];
function killEye(w, fast) {
  if (w.dead) return; w.dead = true;
  clearTimeout(w.t);
  w.el.className = 'ey ' + (fast ? 'snap' : 'out');
  setTimeout(() => { w.el.remove(); const i = watchers.indexOf(w); if (i > -1) watchers.splice(i, 1); }, fast ? 200 : 950);
}
function spawnEye() {
  if (!motionOK() || watchers.length >= (coarse ? 1 : 2)) return;
  const rects = ['#sc', '#nav', '#strip', '#ttl'].map($).filter(Boolean).map(e => e.getBoundingClientRect());
  const w = coarse ? 40 : 54, h = w / 3;
  for (let i = 0; i < 40; i++) {
    const x = rand(10, W - w - 10), y = rand(62, H - h - 14);
    const clear = rects.every(r => x + w < r.left - 12 || x > r.right + 12 || y + h < r.top - 12 || y > r.bottom + 12);
    if (!clear || Math.hypot(x + w / 2 - lx, y + h / 2 - ly) < 240) continue;
    const el = document.createElement('div');
    el.className = 'ey'; el.innerHTML = EYE_SVG;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
    el.firstChild.style.animationDelay = (-rand(0, 4)).toFixed(1) + 's';
    eyes.appendChild(el);
    const rec = { el, x: x + w / 2, y: y + h / 2, dead: false };
    rec.t = setTimeout(() => killEye(rec, false), rand(4500, 8000));
    watchers.push(rec);
    return;
  }
}
(function eyeLoop() {
  setTimeout(() => { spawnEye(); eyeLoop(); }, rand(CFG.eyesMin, CFG.eyesMax) * 1000 / speedUp * (coarse ? 1.4 : 1));
})();
setTimeout(spawnEye, 9000 / speedUp);

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

  // eyes vanish when the light reaches them (on phones: only when actually touching)
  if (!coarse || touching || t - lastIn < 2500) {
    for (const w of watchers.slice()) if (!w.dead && Math.hypot(w.x - lx, w.y - ly) < r * 0.55) killEye(w, true);
  }
})(0);

/* ---------- 5 + 10. random glitch and layout shudder ----------------- */
function glitch() {
  const ttl = $('#ttl'), strip = $('#strip');
  const kinds = coarse ? ['split', 'word'] : ['shake', 'split', 'word'];
  const kind = kinds[Math.random() * kinds.length | 0];
  if (kind === 'shake') {                      
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
  body.classList.remove('shud'); void body.offsetWidth;   
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

/* ---------- 2. phones: tap marks (desktop gets the eye cursor in CSS) - */
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
ctl.innerHTML = `<button id="snd" type="button" title="Sound" aria-label="Background music" aria-pressed="true">${ICONS.snd}</button><button id="fxb" type="button" title="Atmosphere effects" aria-label="Atmosphere effects" aria-pressed="true">${ICONS.fx}</button>`;
body.appendChild(ctl);
const sndBtn = $('#snd'), fxBtn = $('#fxb');

const a = new Audio();
a.loop = true; a.preload = 'auto'; a.src = CFG.audio;
let ctx = null, gain = null, lvl = 0, fadeT, audible = false, armed = false;
let want = store.get('cb_snd') !== '0';

a.volume = 0.5;
const volumeWorks = Math.abs(a.volume - 0.5) < 0.01;      
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
  }, 50);
}
const resumeCtx = () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); };
const paintBtns = () => {
  sndBtn.setAttribute('aria-pressed', want ? 'true' : 'false');
  fxBtn.setAttribute('aria-pressed', fxOn ? 'true' : 'false');
};
function goAudible() { a.muted = false; audible = true; fadeTo(CFG.volume, CFG.fadeMs); }

const GESTURES = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'];
function onGesture(e) {
  if (e.target && e.target.closest && e.target.closest('#ctl')) return;
  if (e.type === 'keydown' && e.key === 'Escape') return;
  if (!want || audible) return disarm();
  resumeCtx(); a.muted = false;
  const p = a.play();
  Promise.resolve(p).then(() => { if (want && !audible) goAudible(); disarm(); })
    .catch(() => { a.muted = true; });                       
}
function arm() { if (armed) return; armed = true; GESTURES.forEach(g => addEventListener(g, onGesture, true)); }
function disarm() { armed = false; GESTURES.forEach(g => removeEventListener(g, onGesture, true)); }

if (!canControl) { sndBtn.hidden = true; }
else {
  a.addEventListener('error', () => { sndBtn.hidden = true; });
  setLevel(0);
  if (want) {
    a.muted = false;
    a.play().then(goAudible).catch(() => {                   
      a.muted = true; a.play().catch(() => {}); arm();
    });
  }
}
sndBtn.addEventListener('click', () => {
  want = !want; store.set('cb_snd', want ? '1' : '0'); paintBtns();
  if (want) {
    resumeCtx(); a.muted = false;
    a.play().then(goAudible).catch(() => {});
  } else {
    fadeTo(0, 700, () => { a.pause(); audible = false; });
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) a.pause();
  else if (want && canControl) a.play().catch(() => {});
});

/* ---------- effects toggle ------------------------------------------- */
function applyFx() {
  root.classList.toggle('fx-on', fxOn);
  if (!fxOn) {
    watchers.slice().forEach(w => killEye(w, true));
    if (grain) { grain.style.opacity = ''; pG = undefined; }
    document.title = CFG.title;
  } else placeWhispers();
  paintBtns();
}
fxBtn.addEventListener('click', () => { fxOn = !fxOn; store.set('cb_fx', fxOn ? '1' : '0'); applyFx(); });
applyFx();
})();
