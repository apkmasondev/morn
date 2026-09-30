/* ==========================================================================
   MORN — one morning, told in scroll.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  const REDUCE = mqReduce.matches;
  const isMobile = () => innerWidth < 861;
  const vw = () => innerWidth;
  const vh = () => innerHeight;

  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGSAP) { // hard fallback: content stays readable
    root.classList.remove('is-loading', 'js');
    $('.loader') && $('.loader').remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'power2.out' });

  /* ────────────────────────────────────────────────────────────────────────
     Ridges — seeded, deterministic mountain lines drawn from the bag's art
     ──────────────────────────────────────────────────────────────────────── */
  function prng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function valueNoise(rand, n = 96) {
    const v = Array.from({ length: n }, rand);
    return x => {
      const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
      return v[((i % n) + n) % n] * (1 - s) + v[(((i + 1) % n) + n) % n] * s;
    };
  }
  function ridgePoints(o) {
    const W = o.w || 1600, rand = prng(o.seed), oct = o.oct || 4;
    const ns = Array.from({ length: oct }, () => valueNoise(rand));
    const pts = [];
    const step = o.step || 6;
    for (let x = -40; x <= W + 40; x += step) {
      const t = x / W;
      let n = 0, a = 1, f = o.freq || 3, norm = 0;
      for (let k = 0; k < oct; k++) {
        let v = ns[k](t * f + k * 7.31);
        if (k > 0 && o.ridged !== false) v = 1 - Math.abs(v * 2 - 1); // ridged octaves → sharp crests
        n += (v - 0.5) * a; norm += a; a *= (o.gain || 0.55); f *= 2.13;
      }
      let y = o.base - (n / norm) * 2 * o.amp;
      (o.peaks || []).forEach(p => {
        const w = x < p.x ? p.wl : p.wr;
        y -= p.h * Math.exp(-1.6 * Math.pow(Math.abs(x - p.x) / w, p.e || 1.15));
      });
      if (o.jitter) y += (rand() - 0.5) * o.jitter;
      pts.push([x, y]);
    }
    return pts;
  }
  function ridgePath(o, close = true) {
    const pts = ridgePoints(o), H = o.h || 900, W = o.w || 1600;
    let d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    if (close) d += `L${W + 40} ${H + 60}L-40 ${H + 60}Z`;
    return d;
  }
  const RIDGES = {
    far: { seed: 11, base: 540, amp: 52, freq: 3.2, oct: 5, peaks: [{ x: 290, h: 96, wl: 230, wr: 300 }, { x: 1400, h: 80, wl: 320, wr: 240 }, { x: 640, h: 40, wl: 140, wr: 160 }] },
    main: { seed: 5, base: 640, amp: 30, freq: 3.4, oct: 5, jitter: 1, peaks: [{ x: 990, h: 250, wl: 300, wr: 360, e: 1.05 }, { x: 1230, h: 70, wl: 90, wr: 140 }, { x: 520, h: 40, wl: 170, wr: 150 }] },
    mid: { seed: 23, base: 720, amp: 40, freq: 3.8, oct: 5, jitter: 1.6, peaks: [{ x: 200, h: 86, wl: 300, wr: 240 }, { x: 1320, h: 56, wl: 260, wr: 300 }] },
    near: { seed: 42, base: 816, amp: 28, freq: 5, oct: 5, jitter: 3.4, peaks: [{ x: 1490, h: 84, wl: 260, wr: 200 }, { x: 60, h: 50, wl: 200, wr: 260 }] },
    edge: { h: 160, seed: 9, base: 134, amp: 16, freq: 3.6, oct: 5, jitter: 1.2, peaks: [{ x: 1130, h: 90, wl: 240, wr: 300 }, { x: 330, h: 46, wl: 240, wr: 200 }] },
    edge2: { h: 160, seed: 31, base: 138, amp: 14, freq: 4, oct: 5, jitter: 1.2, peaks: [{ x: 460, h: 92, wl: 280, wr: 240 }, { x: 1260, h: 54, wl: 220, wr: 260 }] },
    elev: { h: 420, seed: 7, base: 340, amp: 26, freq: 3, oct: 5, jitter: 0.6, peaks: [{ x: 760, h: 236, wl: 380, wr: 450 }] }
  };
  $$('[data-ridge]').forEach(p => {
    const k = p.dataset.ridge;
    if (k === 'elev') p.setAttribute('d', ridgePath(RIDGES.elev, false));
    else if (k === 'elev-fill') p.setAttribute('d', ridgePath(RIDGES.elev, true));
    else p.setAttribute('d', ridgePath(RIDGES[k]));
  });

  /* ────────────────────────────────────────────────────────────────────────
     Split headings into masked words
     ──────────────────────────────────────────────────────────────────────── */
  function splitWords(el) {
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const parts = ch.textContent.split(/([ \t\n\r]+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            // keep non-breaking-space groups together
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    };
    walk(el);
    return $$('.w > span', el);
  }
  $$('[data-split]').forEach(el => { el._words = splitWords(el); gsap.set(el._words, { yPercent: 110 }); });

  /* ────────────────────────────────────────────────────────────────────────
     Media selection
     ──────────────────────────────────────────────────────────────────────── */
  const filmEl = $('.film');
  const video = $('.film__video');
  const fallbackImg = $('.film__fallback');
  const portrait = innerWidth / innerHeight < 0.9 || innerWidth < 700;
  video.src = portrait ? 'assets/video/film-720.mp4' : 'assets/video/film-1600.mp4';
  fallbackImg.src = portrait ? 'assets/img/film-poster-m.webp' : 'assets/img/film-poster.webp';
  video.poster = fallbackImg.src;
  video.load();

  let videoOK = true;
  video.addEventListener('error', () => { videoOK = false; filmEl.classList.add('is-fallback'); });

  /* ────────────────────────────────────────────────────────────────────────
     Smooth scroll
     ──────────────────────────────────────────────────────────────────────── */
  let lenis = null;
  if (!REDUCE && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const lock = on => { root.classList.toggle('is-locked', on); lenis && (on ? lenis.stop() : lenis.start()); };
  const scrollToY = (y, opts = {}) => {
    if (lenis) lenis.scrollTo(y, { duration: 2, ...opts });
    else window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
  };

  /* ────────────────────────────────────────────────────────────────────────
     Loader
     ──────────────────────────────────────────────────────────────────────── */
  const loader = $('.loader');
  const loaderClock = $('.loader__clock');
  const loadState = { shown: 0, target: 0 };
  const decodeImg = src => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => (i.decode ? i.decode().catch(() => {}).then(res) : res()); i.src = src; });
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  const tasks = [
    document.fonts ? document.fonts.ready : Promise.resolve(),
    decodeImg('assets/img/bag.webp'),
    decodeImg(fallbackImg.src),
    withTimeout(new Promise(res => {
      if (video.readyState >= 2) return res();
      video.addEventListener('loadeddata', res, { once: true });
      video.addEventListener('error', res, { once: true });
    }), 5000)
  ];
  let done = 0;
  tasks.forEach(t => t.then(() => { done++; loadState.target = done / tasks.length; }));

  gsap.set('.loader__line', { scaleX: 0 });
  const loaderTick = () => {
    loadState.shown = lerp(loadState.shown, loadState.target, 0.08);
    const p = loadState.shown;
    gsap.set('.loader__line', { scaleX: 0.08 + p * 0.92 });
    gsap.set('.loader__sun', { y: -p * 64 });
    const m = Math.round(30 + p * 17);
    loaderClock.textContent = '05:' + String(m).padStart(2, '0');
  };
  gsap.ticker.add(loaderTick);

  const minTime = new Promise(r => setTimeout(r, REDUCE ? 300 : 1500));
  Promise.all([Promise.all(tasks), minTime]).then(() => {
    loadState.target = 1;
    gsap.to(loadState, {
      shown: 1, duration: 0.5, ease: 'power2.inOut', onComplete: () => {
        gsap.ticker.remove(loaderTick);
        loaderTick();
        loaderClock.textContent = '05:47';
        exitLoader();
      }
    });
  });

  function exitLoader() {
    const tl = gsap.timeline({ onComplete: () => loader.remove() });
    tl.to('.loader__sun', { y: -120, opacity: 0, duration: 1.1, ease: 'power3.in' }, 0)
      .to('.loader__line', { scaleX: 4, opacity: 0, duration: 1.1, ease: 'power3.inOut' }, 0.05)
      .to(['.loader__time', '.loader__stack'], { opacity: 0, duration: 0.5 }, 0)
      .to(loader, { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 0.5)
      .add(() => { root.classList.remove('is-loading'); ScrollTrigger.refresh(); intro(); }, 0.45);
  }

  /* ────────────────────────────────────────────────────────────────────────
     Geometry helpers for the dawn stage (SVG slice mapping)
     ──────────────────────────────────────────────────────────────────────── */
  const SUN = { x: 760, cy: 640, r: 118, introY: 560, topY: 292 };
  const slice = () => {
    const s = Math.max(vw() / 1600, vh() / 900);
    return { s, ox: (vw() - 1600 * s) / 2, oy: vh() - 900 * s };
  };
  const sunScreen = () => {
    const { s, ox, oy } = slice();
    return { x: ox + SUN.x * s, y: oy + SUN.topY * s, r: SUN.r * s };
  };
  const letterbox = () => {
    if (isMobile() || vw() / vh() < 1) return Math.round(vh() * 0.15);
    return Math.round(clamp((vh() - vw() / 2.39) / 2, vh() * 0.1, vh() * 0.16));
  };

  /* ────────────────────────────────────────────────────────────────────────
     Intro (after loader)
     ──────────────────────────────────────────────────────────────────────── */
  const heroLetters = $$('.wordmark span');
  gsap.set('.layer--near .layer__in', { yPercent: 16 });
  gsap.set('.layer--mid .layer__in', { yPercent: 11 });
  gsap.set('.layer--main .layer__in', { yPercent: 7 });
  gsap.set('.layer--far .layer__in', { yPercent: 4 });
  gsap.set('.layer--sun .layer__in', { y: () => (SUN.cy + 110 - SUN.cy) * slice().s });
  gsap.set(heroLetters, { opacity: 0, yPercent: 30 });
  gsap.set(['.hero-copy > *', '.hero-side', '.scroll-cue', '.stars'], { opacity: 0 });
  gsap.set('.sky--night', { opacity: 0 });

  function intro() {
    const s = slice().s;
    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete: () => { root.classList.add('is-ready'); lock(false); ScrollTrigger.refresh(); if (REDUCE) followHash(); }
    });
    if (REDUCE) {
      tl.set('.layer__in', { yPercent: 0 })
        .set('.layer--sun .layer__in', { y: (SUN.introY - SUN.cy) * s })
        .set([heroLetters, '.hero-copy > *', '.hero-side', '.scroll-cue', '.sky--night', '.stars'], { opacity: 1, yPercent: 0 });
      return;
    }
    tl.to('.sky--night', { opacity: 1, duration: 1.6, ease: 'power1.out' }, 0)
      .to('.stars', { opacity: 0.5, duration: 3, ease: 'power1.inOut' }, 0.3)
      .to('.layer--far .layer__in', { yPercent: 0, duration: 2.6 }, 0.1)
      .to('.layer--main .layer__in', { yPercent: 0, duration: 2.6 }, 0.18)
      .to('.layer--mid .layer__in', { yPercent: 0, duration: 2.6 }, 0.26)
      .to('.layer--near .layer__in', { yPercent: 0, duration: 2.6 }, 0.34)
      .to('.layer--sun .layer__in', { y: (SUN.introY - SUN.cy) * s, duration: 3.4, ease: 'power3.out' }, 0.2)
      .to(heroLetters, { opacity: 1, yPercent: 0, duration: 2.2, stagger: 0.09 }, 0.7)
      .to('.hero-copy > *', { opacity: 1, duration: 1.6, stagger: 0.15, ease: 'power2.out' }, 1.5)
      .to('.hero-side', { opacity: 1, duration: 1.8, ease: 'power2.out' }, 1.8)
      .to('.scroll-cue', { opacity: 1, duration: 1.4, ease: 'power2.out' }, 2.1);
    lock(true);
    // allow early scroll after the hero has settled enough
    gsap.delayedCall(1.9, () => { lock(false); root.classList.add('is-ready'); followHash(); });
  }
  lock(true);

  /* ────────────────────────────────────────────────────────────────────────
     Mouse parallax on the dawn landscape
     ──────────────────────────────────────────────────────────────────────── */
  const dawnStage = $('.dawn__stage');
  let parallaxOn = true;
  if (mqFine.matches && !REDUCE) {
    const depth = [['.layer--far svg', 6], ['.layer--main svg', 12], ['.layer--word .wordmark', 18], ['.layer--mid svg', 24], ['.layer--near svg', 38]];
    const movers = depth.map(([sel, d]) => ({ d, x: gsap.quickTo(sel, 'x', { duration: 1.4, ease: 'power3.out' }), y: gsap.quickTo(sel, 'y', { duration: 1.4, ease: 'power3.out' }) }));
    dawnStage.addEventListener('pointermove', e => {
      if (!parallaxOn) return;
      const nx = e.clientX / vw() - 0.5, ny = e.clientY / vh() - 0.5;
      movers.forEach(m => { m.x(-nx * m.d); m.y(-ny * m.d * 0.5); });
    });
  }

  /* ────────────────────────────────────────────────────────────────────────
     I + II · DAWN master timeline
     ──────────────────────────────────────────────────────────────────────── */
  const filmMedia = $('.film__media');
  const filmProxy = { p: 0 };
  const captions = $$('.caption');
  const bars = $$('.film__bar');
  const hudBottomInner = ['.hud__clock', '.hud__chapter'];

  const setSunVars = () => {
    const sp = sunScreen();
    filmEl.style.setProperty('--sx', sp.x + 'px');
    filmEl.style.setProperty('--sy', sp.y + 'px');
    root.style.setProperty('--lb', letterbox() + 'px');
    $('.film__veil').style.background = `radial-gradient(circle at ${sp.x}px ${sp.y}px, #f8d9a6 0, #efbf7f ${sp.r * 0.6}px, #e2a664 ${sp.r}px, #d8975a ${sp.r * 3}px, #c98a50 100%)`;
  };
  setSunVars();
  ScrollTrigger.addEventListener('refreshInit', setSunVars);

  const clipAt = r => { const sp = sunScreen(); return `circle(${r}px at ${sp.x}px ${sp.y}px)`; };
  const farR = () => { const sp = sunScreen(); return Math.hypot(Math.max(sp.x, vw() - sp.x), Math.max(sp.y, vh() - sp.y)) + 4; };
  const barScale = () => letterbox() / (vh() * 0.502);

  const dawnTL = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.dawn', start: 'top top', end: () => '+=' + Math.round(vh() * (isMobile() ? 5.6 : 6.4)),
      pin: '.dawn__stage', scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: self => { parallaxOn = self.progress < 0.08; }
    }
  });

  dawnTL
    // rise
    .to('.scroll-cue', { opacity: 0, y: 20, duration: 0.25 }, 0)
    .to('.hero-copy', { opacity: 0, y: -30, duration: 0.5 }, 0.05)
    .to('.hero-side', { opacity: 0, duration: 0.4 }, 0.05)
    .to('.sky--dawn', { opacity: 1, duration: 1.3 }, 0)
    .to('.stars', { opacity: 0, duration: 0.8 }, 0)
    .to('.layer--sun', { y: () => -(SUN.introY - SUN.topY) * slice().s, duration: 1.3, ease: 'power1.inOut' }, 0)
    .to('.layer--far', { yPercent: 3, duration: 1.3 }, 0)
    .to('.layer--main', { yPercent: 6, duration: 1.3 }, 0)
    .to('.layer--word', { yPercent: -10, opacity: 0, duration: 1.1, ease: 'power1.in' }, 0.1)
    .to(heroLetters, { x: i => (i - 1.5) * vw() * 0.035, duration: 1.1, ease: 'power1.in' }, 0.1)
    .to('.layer--mid', { yPercent: 11, duration: 1.3 }, 0)
    .to('.layer--near', { yPercent: 20, duration: 1.3 }, 0)
    // portal: the sun becomes the window
    .set(filmEl, { visibility: 'visible' }, 1.15)
    .fromTo(filmEl, { clipPath: () => clipAt(sunScreen().r) }, { clipPath: () => clipAt(farR()), duration: 1.1, ease: 'power2.in' }, 1.15)
    .fromTo(filmMedia, { scale: 1.3 }, { scale: 1, duration: 1.5, ease: 'power2.out' }, 1.15)
    .fromTo('.film__veil', { opacity: 1 }, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 1.55)
    .set(['.sky', '.stars', '.layer', '.hero-copy', '.hero-side', '.scroll-cue'], { visibility: 'hidden' }, 2.3)
    .to(hudBottomInner, { autoAlpha: 0, duration: 0.2 }, 2.1)
    .fromTo(bars, { scaleY: 0 }, { scaleY: barScale, duration: 0.55, ease: 'power2.inOut' }, 2.05)
    .to('.film__hud', { opacity: 1, duration: 0.3 }, 2.45)
    // film scrub
    .to(filmProxy, { p: 1, duration: 5.3 }, 2.3)
    .addLabel('film', 2.45);

  const capWindows = [[2.7, 3.85], [3.95, 5.1], [5.2, 6.3], [6.45, null]];
  captions.forEach((c, i) => {
    const [a, b] = capWindows[i];
    dawnTL.fromTo(c, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' }, a);
    if (b) dawnTL.to(c, { opacity: 0, y: -10, filter: 'blur(4px)', duration: 0.25, ease: 'power2.in' }, b);
  });

  dawnTL
    // curtain: bars close like eyelids
    .to('.film__hud', { opacity: 0, duration: 0.2 }, 7.55)
    .to(bars, { scaleY: 1, duration: 0.6, ease: 'power2.inOut' }, 7.6)
    .to(hudBottomInner, { autoAlpha: 1, duration: 0.2 }, 8.0)
    .to({}, { duration: 0.2 }, 8.2);

  /* video scrubbing — decoupled from scroll with a soft follow */
  const tc = $('.film__tc');
  let vCur = 0, vDur = 10, lastTC = '';
  video.addEventListener('loadedmetadata', () => { vDur = video.duration || 10; });
  const primeVideo = () => { const p = video.play(); p && p.then(() => video.pause()).catch(() => {}); };
  video.addEventListener('loadeddata', primeVideo, { once: true });
  ['touchend', 'pointerdown'].forEach(ev => window.addEventListener(ev, primeVideo, { once: true, passive: true }));

  gsap.ticker.add(() => {
    const st = dawnTL.scrollTrigger;
    if (!st || !st.isActive) return;
    const target = clamp(filmProxy.p, 0, 1) * (vDur - 0.06);
    vCur = lerp(vCur, target, 0.22);
    if (Math.abs(vCur - target) < 0.002) vCur = target;
    if (videoOK && video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - vCur) > 0.018) {
      try { video.currentTime = vCur; } catch (e) { /* ignore */ }
    }
    if (!videoOK) gsap.set(fallbackImg, { scale: 1 + filmProxy.p * 0.35, transformOrigin: '38% 45%' });
    const f = Math.floor(vCur * 24), ss = Math.floor(f / 24), ff = f % 24;
    const str = `06:02:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
    if (str !== lastTC) { tc.textContent = str; lastTC = str; }
  });

  /* ────────────────────────────────────────────────────────────────────────
     III · ANATOMY
     ──────────────────────────────────────────────────────────────────────── */
  const bag = $('.bag');
  const bagZoom = $('.bag__zoom');
  const bagTilt = $('.bag__tilt');
  const hotspots = $$('.hotspot');
  const steps = $$('.astep');
  const ticks = $$('.anatomy__ticks li');
  const FOCUS = [
    { x: 0.508, y: 0.504, k: 1.75 },
    { x: 0.80, y: 0.118, k: 1.85 },
    { x: 0.118, y: 0.515, k: 1.55, tx: -0.3 },
    { x: 0.42, y: 0.745, k: 1.65 },
    { x: 0.775, y: 0.75, k: 1.85 }
  ];
  const focusOf = i => {
    const f = FOCUS[i], W = bag.offsetWidth, H = bag.offsetHeight;
    const k = isMobile() ? f.k * 0.78 : f.k;
    const tx = isMobile() ? 0 : vw() * (f.tx || -0.14);
    const ty = isMobile() ? -vh() * 0.05 : 0;
    return { x: tx - (f.x - 0.5) * W * k, y: ty - (f.y - 0.5) * H * k, scale: k };
  };
  const introPos = () => (isMobile() ? { x: 0, y: -vh() * 0.06, scale: 0.78 } : { x: vw() * 0.2, y: 0, scale: 0.92 });

  gsap.set(bagZoom, { opacity: 0 });
  const anaTL = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: '.anatomy', start: 'top top', end: () => '+=' + Math.round(vh() * (isMobile() ? 5 : 5.6)),
      pin: '.anatomy__stage', scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
    },
    onUpdate: () => bagZoom.style.setProperty('--k', (+gsap.getProperty(bagZoom, 'scale') || 1).toFixed(3))
  });
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.anatomy', start: 'top 85%', end: 'top top', scrub: 0.6, invalidateOnRefresh: true }
  })
    .fromTo('.anatomy__glow', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1 }, 0)
    .fromTo(bagZoom, { opacity: 0, x: () => introPos().x, y: () => introPos().y + vh() * 0.1, scale: () => introPos().scale * 0.92 },
      { opacity: 1, x: () => introPos().x, y: () => introPos().y, scale: () => introPos().scale, duration: 1, ease: 'power2.out' }, 0)
    .fromTo('.anatomy__intro > *', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out' }, 0.3);
  anaTL
    .to({}, { duration: 0.9 }, 0)
    .to('.anatomy__intro', { opacity: 0, y: -40, duration: 0.5, ease: 'power2.in' }, 0.7)
    .to('.anatomy__ticks', { opacity: 1, duration: 0.3 }, 1.0);

  FOCUS.forEach((f, i) => {
    const t = 1.0 + i * 1.1;
    const from = i === 0 ? introPos : () => focusOf(i - 1);
    anaTL.fromTo(bagZoom, { x: () => from().x, y: () => from().y, scale: () => from().scale },
      { x: () => focusOf(i).x, y: () => focusOf(i).y, scale: () => focusOf(i).scale, duration: 0.8, immediateRender: false }, t);
    anaTL.fromTo(hotspots[i], { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out', immediateRender: false }, t + 0.45);
    anaTL.fromTo(steps[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, t + 0.4);
    anaTL.fromTo(ticks[i], { '--p': 0 }, { '--p': 1, duration: 0.8, ease: 'none' }, t);
    if (i < FOCUS.length - 1) {
      anaTL.to(steps[i], { autoAlpha: 0, y: -30, duration: 0.25, ease: 'power2.in' }, t + 1.0);
      anaTL.to(hotspots[i], { opacity: 0.0, duration: 0.2 }, t + 1.0);
    }
  });
  const outT = 1.0 + FOCUS.length * 1.1;
  anaTL
    .to(steps[FOCUS.length - 1], { autoAlpha: 0, y: -30, duration: 0.25, ease: 'power2.in' }, outT)
    .to(bagZoom, { x: 0, y: () => (isMobile() ? -vh() * 0.02 : 0), scale: () => (isMobile() ? 0.9 : 0.86), duration: 0.9 }, outT)
    .to(hotspots, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'power3.out' }, outT + 0.5)
    .to('.anatomy__ticks', { opacity: 0, duration: 0.3 }, outT + 0.3)
    .to({}, { duration: 0.6 }, outT + 0.9);

  // tactile tilt + light sweep
  if (mqFine.matches && !REDUCE) {
    gsap.set(bagTilt, { transformPerspective: 1400 });
    const rx = gsap.quickTo(bagTilt, 'rotationX', { duration: 1.2, ease: 'power3.out' });
    const ry = gsap.quickTo(bagTilt, 'rotationY', { duration: 1.2, ease: 'power3.out' });
    const sheen = $('.bag__sheen');
    const sx = { v: 70 };
    const sxTo = gsap.quickTo(sx, 'v', { duration: 1.4, ease: 'power3.out', onUpdate: () => sheen.style.setProperty('--sx', sx.v + '%') });
    $('.anatomy__stage').addEventListener('pointermove', e => {
      const nx = e.clientX / vw() - 0.5, ny = e.clientY / vh() - 0.5;
      ry(nx * 14); rx(-ny * 8); sxTo(100 - (nx + 0.5) * 100);
    });
    $('.anatomy__stage').addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  if (!REDUCE) gsap.to(bagTilt, { y: -8, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  /* ────────────────────────────────────────────────────────────────────────
     IV · ORIGIN
     ──────────────────────────────────────────────────────────────────────── */
  const origin = $('.origin');
  // ridge edge rises as the section arrives — dawn light over the peaks
  $$('.ridge-edge').forEach(edge => {
    gsap.fromTo(edge, { yPercent: -100, y: 0, scaleY: 0.35, transformOrigin: '50% 100%' }, {
      yPercent: -100, y: 0, scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: edge.parentElement, start: 'top bottom', end: 'top 55%', scrub: true }
    });
  });

  // elevation profile draws itself
  const elevSvg = $('.elevation__svg');
  const elevPts = ridgePoints(RIDGES.elev);
  const yAt = x => { let best = elevPts[0]; for (const p of elevPts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1]; };
  const altAt = y => Math.round((1700 + (330 - y) * 200 / 120) / 10) * 10;
  let peak = elevPts.reduce((a, b) => (b[1] < a[1] ? b : a));
  const marksData = [
    { x: 300, t: 'Kochere', up: false },
    { x: Math.round(peak[0]), t: 'Gedeo', up: true },
    { x: 1250, t: 'Stacja obróbki', up: false }
  ];
  const marksWrap = $('.elevation__marks');
  const marks = marksData.map(m => {
    const y = m.x === Math.round(peak[0]) ? peak[1] : yAt(m.x);
    const el = document.createElement('div');
    el.className = 'emark' + (m.up ? ' emark--up' : '');
    el.style.left = (m.x / 1600 * 100) + '%';
    el.style.top = (y / 420 * 100) + '%';
    const alt = String(altAt(y)).replace(/\B(?=(\d{3})+$)/g, '\u00a0');
    el.innerHTML = `<span class="emark__dot"></span><span class="emark__stem"></span><span class="emark__txt"><b>${m.t}</b><span>${alt} m n.p.m.</span></span>`;
    marksWrap.appendChild(el);
    gsap.set(el, { xPercent: -50, yPercent: m.up ? -100 : 0, opacity: 0, y: 10 });
    return { el, p: m.x / 1600 };
  });
  gsap.set(elevSvg, { clipPath: 'inset(-10% 100% -10% 0)' });
  ScrollTrigger.create({
    trigger: '.elevation', start: 'top 85%', end: 'bottom 40%', scrub: 0.8,
    onUpdate: self => {
      const p = self.progress;
      elevSvg.style.clipPath = `inset(-10% ${(1 - p) * 100}% -10% 0)`;
      marks.forEach(m => {
        const on = p > m.p + 0.02;
        if (on !== m.on) { m.on = on; gsap.to(m.el, { opacity: on ? 1 : 0, y: on ? 0 : 10, duration: 0.6, ease: 'power3.out', overwrite: true }); }
      });
    }
  });

  // tasting notes tint the paper on hover
  const tint = document.createElement('div');
  tint.className = 'origin__tint';
  origin.prepend(tint);
  const TINTS = { jasmine: '#f4eedc', bergamot: '#ece5c2', berries: '#efd8cf' };
  $$('.note').forEach(n => {
    n.addEventListener('pointerenter', () => {
      if (!mqFine.matches) return;
      origin.dataset.tint = n.dataset.note; n.classList.add('is-on');
      tint.style.backgroundColor = TINTS[n.dataset.note]; tint.style.opacity = 1;
    });
    n.addEventListener('pointerleave', () => {
      delete origin.dataset.tint; n.classList.remove('is-on'); tint.style.opacity = 0;
    });
  });

  /* ────────────────────────────────────────────────────────────────────────
     Generic reveals
     ──────────────────────────────────────────────────────────────────────── */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: REDUCE ? 0.3 : 1.3, ease: 'expo.out', stagger: 0.08, overwrite: true })
  });
  $$('[data-split]').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(el._words, { yPercent: 0, duration: REDUCE ? 0.3 : 1.4, ease: 'expo.out', stagger: 0.055 })
    });
  });

  /* ────────────────────────────────────────────────────────────────────────
     V · RITUAL — a real four-minute French press timer
     ──────────────────────────────────────────────────────────────────────── */
  const brew = $('.brew');
  const bTime = $('.brew__time'), bState = $('.brew__state');
  const bStart = $('.brew__start'), bReset = $('.brew__reset'), bFast = $('.brew__fast');
  const bSun = $('.brew__sun'), bProg = $('.brew__progress');
  const bSteps = $$('.brew__steps li');
  const TOTAL = 240;
  const ARC = { cx: 200, cy: 210, r: 170 };
  const arcLen = Math.PI * ARC.r;
  bProg.style.strokeDasharray = arcLen;
  bProg.style.strokeDashoffset = arcLen;
  // minute ticks
  const ticksG = $('.brew__ticks');
  for (let m = 0; m <= 4; m++) {
    const a = Math.PI - (m / 4) * Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', ARC.cx + c * (ARC.r + 6)); l.setAttribute('y1', ARC.cy - s * (ARC.r + 6));
    l.setAttribute('x2', ARC.cx + c * (ARC.r + 13)); l.setAttribute('y2', ARC.cy - s * (ARC.r + 13));
    ticksG.appendChild(l);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', ARC.cx + c * (ARC.r + 28)); t.setAttribute('y', ARC.cy - s * (ARC.r + 28) + 4);
    t.setAttribute('text-anchor', 'middle'); t.textContent = m + (m === 0 ? '' : '′');
    if (m > 0) ticksG.appendChild(t);
  }
  const STEP_AT = bSteps.map(li => +li.dataset.at);
  const STEP_LABEL = ['Zalewaj powoli', 'Przełam kożuszek', 'Czekaj. Oddychaj.', 'Dzień dobry.'];
  const timer = { state: 'idle', elapsed: 0, speed: 1, last: 0, step: -1 };

  const drawTimer = () => {
    const p = clamp(timer.elapsed / TOTAL, 0, 1);
    const a = Math.PI - p * Math.PI;
    bSun.setAttribute('cx', (ARC.cx + Math.cos(a) * ARC.r).toFixed(2));
    bSun.setAttribute('cy', (ARC.cy - Math.sin(a) * ARC.r).toFixed(2));
    bProg.style.strokeDashoffset = arcLen * (1 - p);
    const left = Math.ceil(TOTAL - timer.elapsed - 1e-6);
    const mm = Math.floor(Math.max(0, left) / 60), ss = Math.max(0, left) % 60;
    bTime.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    let step = -1;
    STEP_AT.forEach((at, i) => { if (timer.elapsed >= at && timer.state !== 'idle') step = i; });
    if (timer.state === 'done') step = 3;
    if (step !== timer.step) {
      if (step > timer.step && step >= 0 && timer.state !== 'idle') chime(step === 3 ? 1 : 0.45);
      timer.step = step;
      bSteps.forEach((li, i) => { li.classList.toggle('is-now', i === step); li.classList.toggle('is-done', i < step); });
      if (step >= 0) bState.textContent = STEP_LABEL[step];
    }
  };
  const timerTick = () => {
    if (timer.state !== 'running') return;
    const now = performance.now();
    timer.elapsed += (now - timer.last) / 1000 * timer.speed;
    timer.last = now;
    if (timer.elapsed >= TOTAL) {
      timer.elapsed = TOTAL; timer.state = 'done';
      brew.classList.add('is-done');
      bStart.querySelector('span').textContent = 'Jeszcze raz';
      gsap.fromTo(bSun, { attr: { r: 15 } }, { attr: { r: 22 }, duration: 1.4, ease: 'elastic.out(1, .4)' });
    }
    drawTimer();
  };
  gsap.ticker.add(timerTick);
  const startTimer = (speed = 1) => {
    ensureAudio();
    if (timer.state === 'done' || timer.state === 'idle') { timer.elapsed = 0; timer.step = -1; brew.classList.remove('is-done'); gsap.set(bSun, { attr: { r: 15 } }); }
    timer.speed = speed; timer.state = 'running'; timer.last = performance.now();
    bStart.querySelector('span').textContent = 'Pauza';
    bReset.hidden = false;
    drawTimer();
  };
  bStart.addEventListener('click', () => {
    if (timer.state === 'running') { timer.state = 'paused'; bStart.querySelector('span').textContent = 'Wznów'; bState.textContent = 'Pauza'; return; }
    startTimer(timer.state === 'paused' ? timer.speed : 1);
  });
  bFast.addEventListener('click', () => { timer.state = 'idle'; startTimer(20); });
  bReset.addEventListener('click', () => {
    timer.state = 'idle'; timer.elapsed = 0; timer.step = -1; brew.classList.remove('is-done');
    bStart.querySelector('span').textContent = 'Rozpocznij rytuał'; bReset.hidden = true; bState.textContent = 'Gotowy, kiedy ty';
    bSteps.forEach(li => li.classList.remove('is-now', 'is-done'));
    gsap.set(bSun, { attr: { r: 15 } });
    drawTimer();
  });
  drawTimer();

  /* ────────────────────────────────────────────────────────────────────────
     Sound — real birdsong from the MORN film, looped; soft brew chimes
     ──────────────────────────────────────────────────────────────────────── */
  let actx = null, master = null, amb = null, ambGain = null, ambOn = false, ambEl = null;
  const soundBtn = $('.sound-btn');
  function ensureAudio() {
    if (actx) { actx.state === 'suspended' && actx.resume(); return actx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC(); master = actx.createGain(); master.gain.value = 1; master.connect(actx.destination);
    return actx;
  }
  function chime(level = 0.5) {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    [[659.25, 1], [987.77, 0.5], [1318.5, 0.18]].forEach(([f, g]) => {
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.09 * g * level, t + 0.02);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(a); a.connect(master); o.start(t); o.stop(t + 2.7);
    });
  }
  // "First Light Ritual" — a 2.5-minute loop, streamed through a gain node (decoding it whole would cost ~50 MB of RAM)
  let ambStopT = 0;
  function startAmbient() {
    const ctx = ensureAudio();
    clearTimeout(ambStopT);
    if (!ambEl) {
      ambEl = new Audio('assets/audio/morning.mp3');
      ambEl.loop = true; ambEl.preload = 'auto';
      if (ctx && location.protocol !== 'file:') {
        try {
          amb = ctx.createMediaElementSource(ambEl);
          ambGain = ctx.createGain(); ambGain.gain.value = 0;
          amb.connect(ambGain); ambGain.connect(master);
        } catch (e) { amb = null; ambGain = null; }
      }
    }
    if (ambGain) {
      ambGain.gain.cancelScheduledValues(ctx.currentTime);
      ambGain.gain.setValueAtTime(ambGain.gain.value, ctx.currentTime);
      ambGain.gain.setTargetAtTime(0.8, ctx.currentTime, 0.9);
    } else ambEl.volume = 0.7;
    ambEl.play().catch(() => {});
  }
  function stopAmbient() {
    if (!ambEl) return;
    if (ambGain && actx) {
      ambGain.gain.cancelScheduledValues(actx.currentTime);
      ambGain.gain.setValueAtTime(ambGain.gain.value, actx.currentTime);
      ambGain.gain.setTargetAtTime(0, actx.currentTime, 0.35);
      ambStopT = setTimeout(() => { if (!ambOn) ambEl.pause(); }, 1600);
    } else ambEl.pause();
  }
  soundBtn.addEventListener('click', () => {
    ambOn = !ambOn;
    soundBtn.classList.toggle('is-on', ambOn);
    soundBtn.setAttribute('aria-pressed', String(ambOn));
    ambOn ? startAmbient() : stopAmbient();
  });
  document.addEventListener('visibilitychange', () => {
    if (actx) document.hidden ? actx.suspend() : actx.resume();
    if (ambEl && ambOn) document.hidden ? ambEl.pause() : ambEl.play().catch(() => {});
  });

  /* ────────────────────────────────────────────────────────────────────────
     VI · TWO MORNINGS
     ──────────────────────────────────────────────────────────────────────── */
  const panelVideos = $$('.panel video');
  const vidIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src) { v.src = innerWidth < 1100 ? v.dataset.srcSm : v.dataset.srcLg; v.preload = 'auto'; }
        if (!REDUCE) { const p = v.play(); p && p.catch(() => {}); }
      } else if (v.src) v.pause();
    });
  }, { rootMargin: '25% 0px 25% 0px' });
  panelVideos.forEach(v => vidIO.observe(v));

  const panelsWrap = $('.mornings__panels');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    gsap.fromTo(panelsWrap, { clipPath: 'inset(14% 18% 0% 18%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: panelsWrap, start: 'top 95%', end: 'top 15%', scrub: true }
    });
  });
  mm.add('(max-width: 860px)', () => {
    $$('.panel').forEach(p => gsap.fromTo(p, { clipPath: 'inset(8% 6% 8% 6%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 95%', end: 'top 30%', scrub: true }
    }));
  });
  $$('.panel__media').forEach(m => gsap.fromTo(m, { yPercent: -4 }, {
    yPercent: 4, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
  }));
  $$('.panel__cap').forEach(c => gsap.from(c.children, {
    opacity: 0, y: 24, duration: 1.2, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: c, start: 'top 92%', once: true }
  }));

  /* ────────────────────────────────────────────────────────────────────────
     VII · SHOP + CART
     ──────────────────────────────────────────────────────────────────────── */
  gsap.fromTo('.shop__stack', { yPercent: -6 }, {
    yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.shop', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  /* product photography follows the configuration — one shot per form × grind × size */
  const VARIANT = {
    ziarno: { slug: 'beans', label: 'Ziarno', alt: 'kawa ziarnista', props: 'kubka kawy i miseczki ziaren' },
    Espresso: { slug: 'espresso', label: 'Mielona do espresso', alt: 'kawa mielona do espresso', props: 'filiżanki espresso i kolby ekspresu' },
    Kawiarka: { slug: 'moka', label: 'Mielona do kawiarki', alt: 'kawa mielona do kawiarki', props: 'kawiarki i kubka kawy' },
    Przelew: { slug: 'pourover', label: 'Mielona do przelewu', alt: 'kawa mielona do przelewu', props: 'dripa z karafką i kubka kawy' },
    'French press': { slug: 'frenchpress', label: 'Mielona do french pressa', alt: 'kawa mielona do french pressa', props: 'french pressa i kubka kawy' }
  };
  const shotStack = $('.shop__stack');
  const shopCaption = $('.shop__caption');
  const thumbImg = $('.buy__thumb img');
  const SHOT_SIZES = '(max-width: 860px) 100vw, 50vw';
  const shotSrc = (slug, size) => `assets/img/shop/${slug}-${size}`;
  const shotSrcset = base => `${base}-720.webp 720w, ${base}.webp 1122w`;
  let shotKey = 'beans-340', shotToken = 0;

  const showVariant = c => {
    const v = VARIANT[c.form === 'mielona' ? c.grind : 'ziarno'] || VARIANT.ziarno;
    const key = `${v.slug}-${c.size}`;
    shopCaption.textContent = `Edycja 01 · ${v.label} · ${c.size === 1000 ? '1 kg' : '340 g'}`;
    if (key === shotKey) return;
    shotKey = key;
    const token = ++shotToken;
    const base = shotSrc(v.slug, c.size);
    const img = new Image();
    img.className = 'shop__shot is-entering';
    img.sizes = SHOT_SIZES; img.srcset = shotSrcset(base); img.src = `${base}-720.webp`;
    img.width = 1122; img.height = 1402; img.decoding = 'async';
    img.alt = `Torebka MORN Ethiopia Yirgacheffe, ${v.alt} ${c.size === 1000 ? '1 kg' : '340 g'}, na kamiennym blacie obok ${v.props}`;
    const ready = img.decode ? img.decode().catch(() => {}) : new Promise(r => { img.onload = img.onerror = r; });
    ready.then(() => {
      if (token !== shotToken) return;
      shotStack.appendChild(img);
      const olds = $$('.shop__shot', shotStack).filter(el => el !== img);
      img.classList.remove('is-entering');
      gsap.fromTo(img, { opacity: 0, scale: REDUCE ? 1 : 1.06 }, {
        opacity: 1, scale: 1, duration: REDUCE ? 0.3 : 1.2, ease: 'expo.out',
        onComplete: () => { if (token === shotToken) olds.forEach(el => el.remove()); }
      });
      // compact preview for phones, where the big photo sits above the options
      thumbImg.classList.add('is-swapping');
      setTimeout(() => { if (token === shotToken) { thumbImg.src = `${base}-720.webp`; thumbImg.classList.remove('is-swapping'); } }, 180);
    });
  };

  // warm the cache with every variant once the shop is near
  const preloadShots = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    preloadShots.disconnect();
    const bases = [];
    Object.values(VARIANT).forEach(v => [340, 1000].forEach(s => bases.push(shotSrc(v.slug, s))));
    let i = 0;
    const next = () => {
      if (i >= bases.length) return;
      const im = new Image(); im.sizes = SHOT_SIZES; im.srcset = shotSrcset(bases[i++]);
      im.onload = im.onerror = () => setTimeout(next, 60);
    };
    (window.requestIdleCallback || setTimeout)(next);
  }, { rootMargin: '150% 0px' });
  preloadShots.observe($('.shop'));
  const form = $('.config');
  const grind = $('.grind');
  const priceVal = $('.price__val'), priceOld = $('.price__old');
  const buyBtn = $('.buy__btn');
  const PRICES = { 340: 69, 1000: 179 };
  const priceShown = { v: 69 };
  const readCfg = () => {
    const fd = new FormData(form);
    const size = +fd.get('size'), plan = fd.get('plan'), frm = fd.get('form');
    const base = PRICES[size];
    const price = priceOf(size, plan);
    return { size, plan, form: frm, grind: frm === 'mielona' ? fd.get('grind') : null, base, price };
  };
  const updatePrice = () => {
    const c = readCfg();
    const showGrind = c.form === 'mielona';
    if (showGrind && grind.hidden) { grind.hidden = false; gsap.fromTo(grind.children, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' }); }
    else if (!showGrind) grind.hidden = true;
    gsap.to(priceShown, { v: c.price, duration: 0.8, ease: 'power3.out', onUpdate: () => { priceVal.textContent = Math.round(priceShown.v); } });
    priceOld.hidden = c.plan !== 'sub';
    priceOld.textContent = c.base + ' zł';
    showVariant(c);
  };
  form.addEventListener('change', updatePrice);

  const cartEl = $('.cart'), cartItems = $('.cart__items'), cartSum = $('.cart__sum');
  const cartBtn = $('.cart-btn'), cartCount = $('.cart-btn__count');
  const GRINDS = ['Espresso', 'Kawiarka', 'Przelew', 'French press'];
  const priceOf = (size, plan) => (plan === 'sub' ? Math.round(PRICES[size] * 0.85) : PRICES[size]);
  const cleanItem = it => {
    if (!it || typeof it !== 'object') return null;
    const size = +it.size, plan = it.plan === 'sub' ? 'sub' : 'once', form = it.form === 'mielona' ? 'mielona' : 'ziarno';
    const grind = form === 'mielona' ? (GRINDS.includes(it.grind) ? it.grind : 'French press') : null;
    const qty = Math.min(99, Math.max(0, Math.floor(+it.qty || 0)));
    if (!PRICES[size] || !qty) return null;
    return { key: [size, plan, form, grind].join('|'), size, plan, form, grind, price: priceOf(size, plan), qty };
  };
  let cart = [];
  try { const raw = JSON.parse(localStorage.getItem('morn-cart') || '[]'); cart = Array.isArray(raw) ? raw.map(cleanItem).filter(Boolean) : []; } catch (e) { cart = []; }
  const saveCart = () => { try { localStorage.setItem('morn-cart', JSON.stringify(cart.map(({ size, plan, form, grind, qty }) => ({ size, plan, form, grind, qty })))); } catch (e) { /* private mode */ } };
  const fmt = n => n.toLocaleString('pl-PL') + ' zł';
  const renderCart = () => {
    const qty = cart.reduce((a, b) => a + b.qty, 0);
    const sum = cart.reduce((a, b) => a + b.qty * b.price, 0);
    cartCount.textContent = qty;
    cartBtn.classList.toggle('has-items', qty > 0);
    cartEl.classList.toggle('has-items', qty > 0);
    cartSum.textContent = fmt(sum);
    const left = Math.max(0, 120 - sum);
    $('.cart__ship-txt').textContent = left > 0 ? `Brakuje ${fmt(left)} do darmowej dostawy` : 'Dostawa gratis. Dobrego poranka.';
    $('.cart__ship-bar i').style.setProperty('--p', clamp(sum / 120, 0, 1));
    cartItems.innerHTML = cart.map((it, i) => `
      <li class="citem">
        <img src="${shotSrc((VARIANT[it.form === 'mielona' ? it.grind : 'ziarno'] || VARIANT.ziarno).slug, it.size)}-720.webp" alt="" width="64" height="86" loading="lazy">
        <div>
          <h3>Ethiopia Yirgacheffe</h3>
          <p>${it.size === 1000 ? '1 kg' : '340 g'} · ${it.form === 'mielona' ? 'mielona, ' + it.grind.toLowerCase() : 'ziarno'}${it.plan === 'sub' ? '<br>Subskrypcja co 2 tygodnie' : ''}</p>
          <div class="citem__qty"><button type="button" data-dec="${i}" aria-label="Mniej">−</button><span>${it.qty}</span><button type="button" data-inc="${i}" aria-label="Więcej">+</button></div>
        </div>
        <span class="citem__price">${fmt(it.qty * it.price)}</span>
      </li>`).join('');
  };
  cartItems.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (inc) cart[+inc.dataset.inc].qty = Math.min(99, cart[+inc.dataset.inc].qty + 1);
    if (dec) { const i = +dec.dataset.dec; cart[i].qty--; if (cart[i].qty <= 0) cart.splice(i, 1); }
    if (inc || dec) { saveCart(); renderCart(); }
  });
  renderCart();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const c = readCfg();
    const key = [c.size, c.plan, c.form, c.grind].join('|');
    const found = cart.find(it => it.key === key);
    if (found) found.qty = Math.min(99, found.qty + 1); else cart.push(cleanItem({ size: c.size, plan: c.plan, form: c.form, grind: c.grind, qty: 1 }));
    saveCart();
    // a little sun flies to the cart
    const a = buyBtn.getBoundingClientRect(), b = cartCount.getBoundingClientRect();
    const fl = $('.flyer');
    const sx = a.left + a.width / 2 - 11, sy = a.top + a.height / 2 - 11;
    const ex = b.left + b.width / 2 - 11, ey = b.top + b.height / 2 - 11;
    gsap.timeline()
      .set(fl, { x: sx, y: sy, opacity: 1, scale: 1 })
      .to(fl, { x: ex, duration: 0.9, ease: 'power1.inOut' }, 0)
      .to(fl, { y: Math.min(sy, ey) - 160, duration: 0.45, ease: 'power2.out' }, 0)
      .to(fl, { y: ey, duration: 0.45, ease: 'power2.in' }, 0.45)
      .to(fl, { scale: 0.4, opacity: 0, duration: 0.25 }, 0.8)
      .add(() => { renderCart(); cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }, 0.85);
    buyBtn.classList.add('is-added');
    buyBtn.querySelector('span').textContent = 'Dodano — dziękujemy';
    clearTimeout(buyBtn._t);
    buyBtn._t = setTimeout(() => { buyBtn.classList.remove('is-added'); buyBtn.querySelector('span').textContent = 'Dodaj do koszyka'; }, 2200);
  });

  /* dialogs: menu + cart */
  let lastFocus = null;
  const openCart = () => {
    lastFocus = document.activeElement;
    cartEl.hidden = false; lock(true);
    $('.cart__note').hidden = true;
    gsap.fromTo('.cart__scrim', { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.fromTo('.cart__panel', { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: 'expo.out' });
    gsap.set('.cart__panel', { x: 0 });
    setTimeout(() => $('.cart__head .btn-text').focus(), 50);
  };
  const closeCart = () => {
    gsap.to('.cart__scrim', { opacity: 0, duration: 0.4 });
    gsap.to('.cart__panel', { xPercent: 100, duration: 0.6, ease: 'expo.in', onComplete: () => { cartEl.hidden = true; lock(false); lastFocus && lastFocus.focus(); } });
  };
  gsap.set('.cart__panel', { xPercent: 100, x: 0 });
  cartBtn.addEventListener('click', openCart);
  cartEl.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCart(); });
  $('.cart__checkout').addEventListener('click', () => { const n = $('.cart__note'); n.hidden = false; gsap.from(n, { opacity: 0, y: 8, duration: 0.6 }); });

  const menu = $('.menu'), menuBtn = $('.menu-btn');
  let menuOpen = false;
  const menuItems = $$('.menu__list li');
  const openMenu = () => {
    menuOpen = true; lastFocus = document.activeElement;
    menu.hidden = false; lock(true); root.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Zamknij menu');
    HUD_KEYS.forEach(k => { root.dataset[k] = 'dark'; });
    gsap.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' });
    gsap.fromTo(menuItems, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.35 });
    gsap.fromTo(['.menu__eyebrow', '.menu__foot'], { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.6 });
    setTimeout(() => $('.menu__list a').focus({ preventScroll: true }), 400);
  };
  const closeMenu = (after) => {
    menuOpen = false; root.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Otwórz menu');
    if (after) after();
    gsap.to(menu, {
      clipPath: 'inset(100% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut', delay: after ? 0.15 : 0,
      onComplete: () => { menu.hidden = true; if (!after) { lock(false); lastFocus && lastFocus.focus(); } syncHud(); }
    });
    if (after) lock(false);
  };
  menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  const trap = (e, box, extra = []) => {
    const f = [...extra, ...$$('a[href], button:not([hidden]), input', box)].filter(el => el.offsetParent !== null || el === menuBtn);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      if (menuOpen) trap(e, menu, [menuBtn]);
      else if (!cartEl.hidden) trap(e, $('.cart__panel'));
      return;
    }
    if (e.key !== 'Escape') return;
    if (menuOpen) closeMenu();
    else if (!cartEl.hidden) closeCart();
  });

  /* navigation targets */
  const HASHES = ['anatomy', 'origin', 'ritual', 'mornings', 'shop', 'dusk'];
  let hashFollowed = false;
  function followHash() {
    if (hashFollowed) return; hashFollowed = true;
    const key = location.hash.slice(1);
    if (HASHES.includes(key)) goto(key, false);
  }
  const targetY = key => {
    const st = dawnTL.scrollTrigger;
    switch (key) {
      case 'dawn': return 0;
      case 'film': return st.labelToScroll ? st.labelToScroll('film') + 2 : st.start + (st.end - st.start) * 0.32;
      case 'anatomy': return anaTL.scrollTrigger.start + 1;
      default: {
        const el = document.getElementById(key);
        return el ? el.getBoundingClientRect().top + window.scrollY - (key === 'shop' ? 0 : vh() * 0.02) : 0;
      }
    }
  };
  const goto = (key, fromMenu) => {
    const y = targetY(key);
    const dist = Math.abs(y - window.scrollY);
    if (fromMenu) {
      closeMenu(() => { lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y); ScrollTrigger.update(); });
      return;
    }
    if (dist > vh() * 3.2) {
      const cur = document.createElement('div');
      cur.style.cssText = 'position:fixed;inset:0;background:#0f0c0a;z-index:160;opacity:0;pointer-events:none';
      document.body.appendChild(cur);
      gsap.timeline({ onComplete: () => cur.remove() })
        .to(cur, { opacity: 1, duration: 0.45, ease: 'power2.in' })
        .add(() => { lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y); ScrollTrigger.update(); })
        .to(cur, { opacity: 0, duration: 0.8, ease: 'power2.out' }, '+=0.1');
    } else scrollToY(y, { duration: key === 'film' ? 3.2 : 1.8 });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    goto(a.dataset.goto, !!a.closest('.menu'));
  });

  /* ────────────────────────────────────────────────────────────────────────
     END · DUSK — the sun sets, the loop closes
     ──────────────────────────────────────────────────────────────────────── */
  const placeDuskSun = () => $$('.dusk__sun, .dusk__glow').forEach(c => c.setAttribute('cx', isMobile() ? 830 : 1210));
  placeDuskSun();
  ScrollTrigger.addEventListener('refreshInit', placeDuskSun);
  gsap.fromTo(['.dusk__sun', '.dusk__glow'], { y: -190 }, {
    y: 40, ease: 'none',
    scrollTrigger: { trigger: '.dusk', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });
  gsap.fromTo('.dusk__sky', { opacity: 1 }, {
    opacity: 0.45, ease: 'none',
    scrollTrigger: { trigger: '.dusk', start: 'top 50%', end: 'bottom bottom', scrub: true }
  });
  const letter = $('.letter'), letterMsg = $('.letter__msg');
  letter.addEventListener('submit', e => {
    e.preventDefault();
    const v = letter.email.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    letterMsg.classList.toggle('is-ok', ok);
    letterMsg.textContent = ok ? 'Dziękujemy. Pierwszy list przyjdzie o świcie.' : 'Sprawdź proszę adres e-mail.';
    if (ok) { letter.email.value = ''; letter.email.blur(); }
    gsap.fromTo(letterMsg, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6 });
  });

  /* ────────────────────────────────────────────────────────────────────────
     HUD — clock, sun path, chapter, colour
     ──────────────────────────────────────────────────────────────────────── */
  const digits = $('.hud__digits'), place = $('.hud__place');
  const romanEl = $('.hud__roman'), nameEl = $('.hud__name');
  const sunDot = $('.sunpath__sun');
  let timeMap = [], chapMap = [];
  const T = (h, m) => h * 60 + m;
  const buildMaps = () => {
    const d = dawnTL.scrollTrigger, a = anaTL.scrollTrigger;
    const top = id => { const el = document.getElementById(id); return el.getBoundingClientRect().top + window.scrollY; };
    const filmY = d.labelToScroll ? d.labelToScroll('film') : d.start + (d.end - d.start) * 0.3;
    const maxY = ScrollTrigger.maxScroll(window);
    const h = vh();
    timeMap = [
      [0, T(5, 47)], [filmY, T(6, 2)], [d.end, T(6, 12)],
      [a.start, T(6, 14)], [a.end, T(6, 23)],
      [top('origin') - h * 0.5, T(6, 25)], [top('ritual') - h * 0.5, T(6, 40)],
      [top('mornings') - h * 0.5, T(7, 12)], [top('shop') - h * 0.5, T(7, 30)],
      [top('dusk') - h * 0.6, T(7, 48)], [maxY, T(19, 41)]
    ];
    chapMap = [
      [0, 'I', 'Przed świtem'], [filmY - h * 0.6, 'II', 'Pierwsze światło'], [a.start - h * 0.3, 'III', 'Opakowanie'],
      [top('origin') - h * 0.5, 'IV', 'Pochodzenie'], [top('ritual') - h * 0.5, 'V', 'Rytuał'],
      [top('mornings') - h * 0.5, 'VI', 'Dwa poranki'], [top('shop') - h * 0.5, 'VII', 'Twój poranek'],
      [top('dusk') - h * 0.5, '—', 'Do jutra']
    ];
  };
  ScrollTrigger.addEventListener('refresh', () => { buildMaps(); lastChap && updateHud(); });
  let lastChap = '', lastClock = '';
  const updateHud = () => {
    if (!timeMap.length) return;
    const y = window.scrollY;
    let mins = timeMap[0][1];
    for (let i = 0; i < timeMap.length - 1; i++) {
      const [y0, m0] = timeMap[i], [y1, m1] = timeMap[i + 1];
      if (y >= y0 && y <= y1) { mins = lerp(m0, m1, y1 === y0 ? 1 : (y - y0) / (y1 - y0)); break; }
      if (y > y1) mins = m1;
    }
    const mm = Math.floor(mins), str = String(Math.floor(mm / 60)).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0');
    if (str !== lastClock) { digits.textContent = str; lastClock = str; }
    const pl = mins >= T(19, 0) ? 'Kraków · zmierzch' : mins >= T(6, 20) ? 'Kraków · poranek' : 'Kraków · świt';
    if (place.textContent !== pl) place.textContent = pl;
    // sun path: rises through the morning, sets at the end
    const dayP = mins <= T(7, 48) ? (mins - T(5, 47)) / (T(7, 48) - T(5, 47)) * 0.42 : 0.42 + (mins - T(7, 48)) / (T(19, 41) - T(7, 48)) * 0.58;
    const ang = Math.PI - clamp(dayP, 0, 1) * Math.PI;
    sunDot.setAttribute('cx', (32 + Math.cos(ang) * 28).toFixed(2));
    sunDot.setAttribute('cy', (30 - Math.sin(ang) * 28).toFixed(2));
    let c = chapMap[0];
    chapMap.forEach(ch => { if (y >= ch[0]) c = ch; });
    if (c[2] !== lastChap) {
      const first = !lastChap;
      lastChap = c[2];
      if (first) { romanEl.textContent = c[1]; nameEl.textContent = c[2]; }
      else {
        gsap.timeline()
          .to([romanEl, nameEl], { opacity: 0, y: -8, duration: 0.25, ease: 'power2.in' })
          .add(() => { romanEl.textContent = c[1]; nameEl.textContent = c[2]; })
          .fromTo([romanEl, nameEl], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 });
      }
    }
  };

  // HUD colour follows whatever sits beneath it
  const hudSections = $$('[data-hud]');
  let hudRanges = [];
  const measureHud = () => {
    hudRanges = hudSections.map(s => {
      const r = s.getBoundingClientRect();
      return [r.top + window.scrollY, r.bottom + window.scrollY, r.left, r.right, s.dataset.hud];
    });
  };
  const HUD_KEYS = ['hudTl', 'hudTr', 'hudBl', 'hudBr'];
  function syncHud() {
    if (menuOpen) return;
    const y = window.scrollY, gx = 90;
    const probe = (px, py) => { let v = 'dark'; for (const r of hudRanges) if (r[0] <= y + py && r[1] > y + py && r[2] <= px && r[3] > px) v = r[4]; return v; };
    const vals = [probe(gx, 34), probe(vw() - gx, 34), probe(gx, vh() - 40), probe(vw() - gx, vh() - 40)];
    HUD_KEYS.forEach((k, i) => { if (root.dataset[k] !== vals[i]) root.dataset[k] = vals[i]; });
  }
  ScrollTrigger.addEventListener('refresh', () => { measureHud(); syncHud(); });
  let idleT = 0;
  const wake = () => { root.classList.add('is-scrolling'); clearTimeout(idleT); idleT = setTimeout(() => root.classList.remove('is-scrolling'), 1400); };
  window.addEventListener('scroll', () => { syncHud(); updateHud(); wake(); }, { passive: true });

  /* ────────────────────────────────────────────────────────────────────────
     Housekeeping
     ──────────────────────────────────────────────────────────────────────── */
  // pause the grain when the tab is hidden, and pause decorative loops offscreen
  document.addEventListener('visibilitychange', () => { $('.grain').style.animationPlayState = document.hidden ? 'paused' : 'running'; });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  ScrollTrigger.refresh();
  buildMaps(); measureHud(); syncHud(); updateHud();
})();
