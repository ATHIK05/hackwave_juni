/**
 * RESCUE NET — Landing page controller
 */

import store from '../core/data-service.js';
import { bootShell, fmt, initReveal, initTilt, initCounters, escapeHtml } from '../core/ui.js';
import { donationCard, startCountdownTicker } from '../ui/cards.js';
import { TESTIMONIALS, IMPACT_DAILY } from '../core/seed-data.js';

const $ = (s, r = document) => r.querySelector(s);

const PARTNERS = [
  ['fa-hotel', 'Skyline Grand'], ['fa-bread-slice', 'CyberBake'], ['fa-building', 'TechHub Kitchen'],
  ['fa-carrot', 'BioAgro Market'], ['fa-hand-holding-heart', 'Asha Hope'], ['fa-house-chimney', 'City Care Shelter'],
  ['fa-bowl-rice', 'Annapurna Kitchen'], ['fa-truck', 'MetroMart Logistics'], ['fa-graduation-cap', 'Apex Campus'],
];

function renderMarquee() {
  const track = $('#marquee-track');
  if (!track) return;
  const items = [...PARTNERS, ...PARTNERS]
    .map(([icon, name]) => `<span class="marquee-item"><i class="fa-solid ${icon}"></i> ${name}</span>`).join('');
  track.innerHTML = items;
}

function renderStageRows(donations) {
  const host = $('#stage-rows');
  if (!host) return;
  host.innerHTML = donations.slice(0, 3).map((d) => {
    const cd = fmt.countdown(d.expiresAt);
    const tone = cd.level === 'crit' ? 'chip-sos' : cd.level === 'warn' ? 'chip-transit' : 'chip-available';
    return `
      <div class="stage-row">
        <span class="card-avatar" style="width:30px;height:30px;border-radius:9px">${fmt.initials(d.donor)}</span>
        <div style="min-width:0;flex:1">
          <div class="rr-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(d.title)}</div>
          <div class="rr-sub">${fmt.num(d.servings)} meals · ${escapeHtml(d.donorType)}</div>
        </div>
        <span class="chip ${tone}" style="font-size:.66rem"><span data-countdown="${d.expiresAt}">${cd.text}</span></span>
      </div>`;
  }).join('');
}

function renderPreview(donations) {
  const grid = $('#preview-grid');
  if (!grid) return;
  grid.innerHTML = donations.slice(0, 3)
    .map((d, i) => donationCard(d, { compact: true, actions: false }).replace('<article', `<article style="animation-delay:${i * 90}ms"`))
    .join('');
  initTilt(grid);
}

function renderChart(series) {
  const host = document.getElementById('impact-chart');
  if (!host) return;
  const max = Math.max(...series.map((s) => s.meals));
  host.innerHTML = series.map((s) => `
    <div class="bar-col">
      <span class="bar-value">${fmt.compact(s.meals)}</span>
      <div class="bar-visual" style="height:${(s.meals / max) * 100}%;transition-delay:${series.indexOf(s) * 80}ms"></div>
      <span class="bar-label">${s.day}</span>
    </div>`).join('');
  host.setAttribute('data-reveal', '');
  initReveal(host.parentElement);
}

function renderDonut(donations) {
  const host = document.getElementById('impact-donut');
  const legend = document.getElementById('impact-legend');
  if (!host || !legend) return;

  const buckets = [
    { key: 'available', label: 'Awaiting pickup', color: 'var(--verdant-500)' },
    { key: 'accepted', label: 'Claimed', color: 'var(--indigo-500)' },
    { key: 'in_transit', label: 'In transit', color: 'var(--amber-500)' },
    { key: 'completed', label: 'Delivered', color: '#14b8a6' },
  ].map((b) => ({ ...b, value: donations.filter((d) => d.status === b.key).length }));

  const total = buckets.reduce((s, b) => s + b.value, 0) || 1;
  const R = 68, C = 2 * Math.PI * R;
  let offset = 0;

  host.innerHTML = `
    <svg viewBox="0 0 168 168" role="img" aria-label="Rescue status breakdown">
      <circle class="track" cx="84" cy="84" r="${R}"></circle>
      ${buckets.map((b) => {
        const len = (b.value / total) * C;
        const circle = `<circle class="arc" cx="84" cy="84" r="${R}" stroke="${b.color}"
          stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}"></circle>`;
        offset += len;
        return circle;
      }).join('')}
    </svg>
    <div class="donut-center"><strong>${total}</strong><span>Rescues</span></div>`;

  legend.innerHTML = buckets.map((b) => `
    <div class="lg-row">
      <span class="lg-dot" style="background:${b.color}"></span>
      ${b.label}
      <span class="lg-val">${b.value}</span>
    </div>`).join('');
}

function renderTestimonials() {
  const host = document.getElementById('testimonials');
  if (!host) return;
  host.innerHTML = TESTIMONIALS.map((t) => `
    <figure class="quote-card glass-strong noise-card" data-reveal data-tilt="4" style="margin:0">
      <blockquote>${escapeHtml(t.quote)}</blockquote>
      <figcaption class="row">
        <span class="avatar avatar-lg" style="width:44px;height:44px;border-radius:14px">${t.avatar}</span>
        <span>
          <strong style="display:block;font-size:var(--fs-sm)">${escapeHtml(t.name)}</strong>
          <span style="font-size:var(--fs-xs);color:var(--ink-500)">${escapeHtml(t.role)}</span>
        </span>
      </figcaption>
    </figure>`).join('');
  initReveal(host);
  initTilt(host);
}

function renderBackendPill(mode) {
  const pill = document.getElementById('fb-status');
  const text = document.getElementById('fb-status-text');
  if (!pill || !text) return;
  if (mode === 'firebase') {
    pill.classList.add('is-live');
    text.textContent = 'Firestore live';
    pill.title = 'Connected to Cloud Firestore';
  } else {
    text.textContent = 'Prototype data';
    pill.title = 'Seeded local dataset — add your Firebase config to go live';
  }
}

async function main() {
  bootShell();
  document.getElementById('year').textContent = new Date().getFullYear();
  renderMarquee();
  renderTestimonials();
  renderChart(IMPACT_DAILY);

  const mode = await store.init();
  renderBackendPill(mode);

  const paint = () => {
    const rows = store.listDonations({ sort: 'urgent' });
    renderStageRows(rows);
    renderPreview(rows);
    renderDonut(store.get('donations'));
    const m = store.metrics();
    const line = document.getElementById('hero-live-line');
    if (line) line.textContent = `${m.live} rescues moving · ${m.sos} SOS beacon${m.sos === 1 ? '' : 's'} · ${m.volunteersOnline} couriers online`;
    initCounters();
  };

  paint();
  store.on('change', paint);
  startCountdownTicker();
}

main();
