/**
 * RESCUE NET — UI kernel
 * The microperception layer: reveals, tilt, sheen, ripples,
 * counters, toasts, modals, plus shared formatters.
 */

export const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ *
 *  Formatters
 * ------------------------------------------------------------------ */
export const fmt = {
  num: (n) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0)),
  compact: (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0),
  initials: (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
  relative(ts) {
    const diff = Date.now() - ts;
    const m = Math.round(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    return `${Math.round(h / 24)} d ago`;
  },
  countdown(ts) {
    const ms = ts - Date.now();
    if (ms <= 0) return { text: 'Window closed', level: 'dead', ratio: 0, ms: 0 };
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const text = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
    const mins = ms / 60000;
    const level = mins <= 45 ? 'crit' : mins <= 150 ? 'warn' : 'ok';
    return { text, level, ms };
  },
  statusLabel: (s) => ({ available: 'Available', accepted: 'Claimed', in_transit: 'In transit', completed: 'Delivered' }[s] || s),
  statusChip: (s) => ({ available: 'chip-available', accepted: 'chip-accepted', in_transit: 'chip-transit', completed: 'chip-complete' }[s] || 'chip-neutral'),
  statusIcon: (s) => ({ available: 'fa-circle-check', accepted: 'fa-handshake-angle', in_transit: 'fa-truck-fast', completed: 'fa-flag-checkered' }[s] || 'fa-circle'),
};

export const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ *
 *  Scroll reveal
 * ------------------------------------------------------------------ */
let revealObserver;
export function initReveal(root = document) {
  const targets = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (prefersReduced()) { targets.forEach((el) => el.classList.add('is-in')); return; }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  }
  targets.forEach((el, i) => {
    if (!el.style.getPropertyValue('--reveal-delay')) {
      const group = el.closest('[data-reveal-group]');
      if (group) el.style.setProperty('--reveal-delay', `${Math.min(i, 8) * 70}ms`);
    }
    revealObserver.observe(el);
  });
}

/** Split a headline into animated lines (word-safe, accessible). */
export function splitLines(el) {
  if (!el || el.dataset.split === 'done') return;
  const lines = el.innerHTML.split(/<br\s*\/?>/i);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = lines
    .map((line, i) => `<span class="split-line" aria-hidden="true"><span style="--line-delay:${i * 110}ms">${line.trim()}</span></span>`)
    .join('');
  el.dataset.split = 'done';
}

/* ------------------------------------------------------------------ *
 *  Pointer-reactive effects
 * ------------------------------------------------------------------ */
export function initTilt(root = document) {
  if (prefersReduced() || window.matchMedia('(pointer: coarse)').matches) return;
  root.querySelectorAll('[data-tilt]').forEach((el) => {
    if (el.dataset.tiltBound) return;
    el.dataset.tiltBound = '1';
    const max = parseFloat(el.dataset.tilt) || 7;
    let raf = null;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-4px)`;
      });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.style.transform = ''; });
  });
}

export function initSpotlight(root = document) {
  root.querySelectorAll('[data-spotlight]').forEach((el) => {
    if (el.dataset.spotBound) return;
    el.dataset.spotBound = '1';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

export function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .tab, .icon-btn');
    if (!btn || prefersReduced()) return;
    const r = btn.getBoundingClientRect();
    const span = document.createElement('span');
    const size = Math.max(r.width, r.height);
    span.className = 'ripple';
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - r.left - size / 2}px`;
    span.style.top = `${e.clientY - r.top - size / 2}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 640);
  }, { passive: true });
}

/** Subtle parallax on the ambient aurora — ties the whole page together. */
export function initParallax() {
  if (prefersReduced()) return;
  const blobs = [...document.querySelectorAll('.aurora-blob')];
  if (!blobs.length) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      blobs.forEach((b, i) => { b.style.translate = `0 ${y * (0.04 + i * 0.025)}px`; });
      ticking = false;
    });
  }, { passive: true });
}

export function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

export function initStickyNav() {
  const nav = document.querySelector('.app-nav');
  if (!nav) return;
  const update = () => nav.classList.toggle('is-stuck', window.scrollY > 12);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ------------------------------------------------------------------ *
 *  Animated counters
 * ------------------------------------------------------------------ */
export function countUp(el, to, { duration = 1500, decimals = 0, suffix = '', prefix = '' } = {}) {
  if (!el) return;
  const from = parseFloat(el.dataset.current || '0') || 0;
  el.dataset.current = String(to);
  if (prefersReduced()) { el.textContent = `${prefix}${fmt.num(to)}${suffix}`; return; }
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const v = from + (to - from) * ease(p);
    el.textContent = `${prefix}${decimals ? v.toFixed(decimals) : fmt.num(v)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initCounters(root = document) {
  const els = [...root.querySelectorAll('[data-count]')].filter((el) => !el.dataset.counted);
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.dataset.counted = '1';
      countUp(el, parseFloat(el.dataset.count), {
        decimals: parseInt(el.dataset.decimals || '0', 10),
        suffix: el.dataset.suffix || '',
        prefix: el.dataset.prefix || '',
      });
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ *
 *  Toasts
 * ------------------------------------------------------------------ */
const TOAST_ICON = { success: 'fa-check', info: 'fa-circle-info', warn: 'fa-triangle-exclamation', error: 'fa-xmark', sos: 'fa-tower-broadcast' };

export function toast({ type = 'success', title = '', message = '', duration = 4800 } = {}) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${TOAST_ICON[type] || 'fa-bell'}"></i></div>
    <div style="flex:1;min-width:0">
      <p class="toast-title">${escapeHtml(title)}</p>
      ${message ? `<p class="toast-msg">${escapeHtml(message)}</p>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss notification"><i class="fa-solid fa-xmark"></i></button>
    <div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
  stack.appendChild(el);
  const kill = () => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 320);
  };
  el.querySelector('.toast-close').addEventListener('click', kill);
  const timer = setTimeout(kill, duration);
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  return kill;
}

/* ------------------------------------------------------------------ *
 *  Modal controller (focus-trapped, escape-closable)
 * ------------------------------------------------------------------ */
export class Modal {
  constructor(id) {
    this.el = document.getElementById(id);
    if (!this.el) return;
    this.overlay = document.querySelector('.overlay');
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el || e.target.closest('[data-close]')) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.el.classList.contains('is-open')) this.close();
      if (e.key === 'Tab' && this.el.classList.contains('is-open')) this._trap(e);
    });
  }
  _focusables() {
    return [...this.el.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null);
  }
  _trap(e) {
    const f = this._focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  open(html) {
    if (!this.el) return;
    if (html && this.el.querySelector('[data-modal-body]')) this.el.querySelector('[data-modal-body]').innerHTML = html;
    this._lastFocus = document.activeElement;
    this.el.classList.add('is-open');
    this.overlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => this._focusables()[0]?.focus(), 80);
  }
  close() {
    if (!this.el) return;
    this.el.classList.remove('is-open');
    this.overlay?.classList.remove('is-open');
    document.body.style.overflow = '';
    this._lastFocus?.focus?.();
  }
}

/* ------------------------------------------------------------------ *
 *  Small helpers
 * ------------------------------------------------------------------ */
export function segmentThumb(container) {
  const thumb = container.querySelector('.segment-thumb');
  const active = container.querySelector('[aria-selected="true"]');
  if (!thumb || !active) return;
  thumb.style.width = `${active.offsetWidth}px`;
  thumb.style.transform = `translateX(${active.offsetLeft}px)`;
}

export function onMenuToggle() {
  const burger = document.querySelector('.nav-burger');
  const links = document.querySelector('.nav-links');
  if (!burger || !links) return;
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.innerHTML = `<i class="fa-solid ${open ? 'fa-xmark' : 'fa-bars'}"></i>`;
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.classList.remove('is-open');
      burger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }
  });
}

export function initPopovers() {
  document.querySelectorAll('[data-popover-trigger]').forEach((trigger) => {
    const pop = document.getElementById(trigger.dataset.popoverTrigger);
    if (!pop) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pop.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(open));
    });
    pop.addEventListener('click', (e) => e.stopPropagation());
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.popover.is-open').forEach((p) => {
      p.classList.remove('is-open');
      document.querySelector(`[data-popover-trigger="${p.id}"]`)?.setAttribute('aria-expanded', 'false');
    });
  });
}

/** Boot everything that every page shares. */
export function bootShell() {
  initReveal();
  initTilt();
  initSpotlight();
  initRipple();
  initParallax();
  initScrollProgress();
  initStickyNav();
  initCounters();
  onMenuToggle();
  initPopovers();
  document.querySelectorAll('[data-split]').forEach(splitLines);
  // Reveal above-the-fold content immediately for a confident first paint.
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-reveal-now]').forEach((el) => el.classList.add('is-in'));
  });
}
