/**
 * RESCUE NET — Operations console controller
 */

import store from '../core/data-service.js';
import {
  bootShell, fmt, escapeHtml, toast, Modal, initReveal, initTilt,
  initCounters, countUp, segmentThumb,
} from '../core/ui.js';
import { donationCard, notificationRow, activityItem, volunteerRow, startCountdownTicker } from '../ui/cards.js';
import { CATEGORIES, STORAGE_MODES, IMPACT_DAILY } from '../core/seed-data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ui = {
  role: 'donor',
  tab: 'overview',
  filters: { search: '', category: 'all', status: 'all', urgency: 'all', sort: 'urgent' },
  map: null,
  markers: null,
  detailId: null,
};

const ACTOR = {
  donor: { name: 'Skyline Grand Hotel', role: 'donor' },
  ngo: { name: 'Asha Hope Foundation', role: 'ngo' },
  courier: { name: 'Rider Unit 07 — Meera K.', role: 'courier' },
  admin: { name: 'City Coordinator', role: 'admin' },
};

let detailModal, sosModal;

/* ================================================================
   Metrics
================================================================ */
function metricCard({ icon, tone = '', value, label, suffix = '', delta, spark }) {
  return `
  <div class="metric">
    <div class="metric-top">
      <div class="metric-icon ${tone}"><i class="fa-solid ${icon}"></i></div>
      ${delta ? `<span class="metric-delta ${delta.dir}"><i class="fa-solid fa-arrow-trend-${delta.dir}"></i> ${delta.value}</span>` : ''}
    </div>
    <div class="metric-value" data-count="${value}" data-suffix="${suffix}">0</div>
    <div class="metric-label">${label}</div>
    ${spark ? `<div class="spark">${spark.map((h, i) => `<span style="height:${h}%;animation-delay:${i * 50}ms"></span>`).join('')}</div>` : ''}
  </div>`;
}

function renderMetrics() {
  const m = store.metrics();
  const spark = IMPACT_DAILY.map((d) => Math.round((d.meals / 3000) * 100));

  $('#metric-grid').innerHTML = [
    metricCard({ icon: 'fa-bolt', value: m.live, label: 'Active rescues', delta: { dir: 'up', value: '4 today' } }),
    metricCard({ icon: 'fa-bowl-food', tone: 'i-indigo', value: m.meals, label: 'Servings on the board', spark }),
    metricCard({ icon: 'fa-tower-broadcast', tone: 'i-coral', value: m.sos, label: 'SOS beacons live' }),
    metricCard({ icon: 'fa-stopwatch', tone: 'i-amber', value: m.avgResponseMin, suffix: ' min', label: 'Median response time' }),
  ].join('');

  const mapMetrics = $('#map-metrics');
  if (mapMetrics) {
    mapMetrics.innerHTML = [
      metricCard({ icon: 'fa-utensils', value: store.get('donations').filter((d) => d.status !== 'completed').length, label: 'Surplus nodes' }),
      metricCard({ icon: 'fa-hand-holding-heart', tone: 'i-indigo', value: store.get('organisations').filter((o) => o.type === 'ngo').length, label: 'Receiver hubs' }),
      metricCard({ icon: 'fa-route', tone: 'i-amber', value: m.volunteersOnline, label: 'Couriers online' }),
      metricCard({ icon: 'fa-tower-broadcast', tone: 'i-coral', value: m.sos, label: 'Active beacons' }),
    ].join('');
  }

  const impactMetrics = $('#impact-metrics');
  if (impactMetrics) {
    impactMetrics.innerHTML = [
      metricCard({ icon: 'fa-bowl-food', value: m.weekMeals, label: 'Meals served this week', delta: { dir: 'up', value: '18%' } }),
      metricCard({ icon: 'fa-weight-hanging', tone: 'i-indigo', value: m.weekKg, suffix: ' kg', label: 'Food diverted' }),
      metricCard({ icon: 'fa-leaf', tone: 'i-amber', value: Math.round(m.weekKg * 2.5), suffix: ' kg', label: 'CO₂e avoided' }),
      metricCard({ icon: 'fa-handshake-angle', tone: 'i-coral', value: m.partners, label: 'Active partners' }),
    ].join('');
  }

  initCounters();
}

/* ================================================================
   Board
================================================================ */
function renderBoard() {
  const rows = store.listDonations(ui.filters);
  const grid = $('#board-grid');
  $('#board-count').textContent = rows.length;
  $('#count-board').textContent = store.get('donations').filter((d) => d.status !== 'completed').length;

  if (!rows.length) {
    grid.innerHTML = `
      <div class="empty-state panel" style="grid-column:1/-1">
        <div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
        <h3>No rescues match those filters</h3>
        <p>Widen the urgency window or clear the search to see the full board.</p>
        <button class="btn btn-glass" style="margin-top:18px" id="empty-reset"><i class="fa-solid fa-filter-circle-xmark"></i> Reset filters</button>
      </div>`;
    $('#empty-reset')?.addEventListener('click', resetFilters);
    return;
  }

  grid.innerHTML = rows
    .map((d, i) => donationCard(d, { role: ui.role }).replace('<article', `<article style="animation-delay:${Math.min(i, 9) * 60}ms"`))
    .join('');
  initTilt(grid);
}

function renderUrgent() {
  const rows = store.listDonations({ sort: 'urgent' }).filter((d) => d.status !== 'completed').slice(0, 2);
  $('#urgent-grid').innerHTML = rows.length
    ? rows.map((d) => donationCard(d, { compact: true, role: ui.role })).join('')
    : '<p style="color:var(--ink-500);font-size:var(--fs-sm)">Nothing is close to expiring. Beautiful.</p>';
  initTilt($('#urgent-grid'));
}

function resetFilters() {
  ui.filters = { search: '', category: 'all', status: 'all', urgency: 'all', sort: 'urgent' };
  $('#f-search').value = '';
  $('#f-category').value = 'all';
  $('#f-status').value = 'all';
  $('#f-urgency').value = 'all';
  $('#f-sort').value = 'urgent';
  renderBoard();
  toast({ type: 'info', title: 'Filters cleared', message: 'Showing the full rescue board.' });
}

/* ================================================================
   Charts
================================================================ */
function renderBars(hostId, series) {
  const host = $(`#${hostId}`);
  if (!host) return;
  const max = Math.max(...series.map((s) => s.meals));
  host.innerHTML = series.map((s, i) => `
    <div class="bar-col">
      <span class="bar-value">${fmt.compact(s.meals)}</span>
      <div class="bar-visual" style="height:${(s.meals / max) * 100}%;transition-delay:${i * 70}ms"></div>
      <span class="bar-label">${s.day}</span>
    </div>`).join('');
  host.classList.add('is-in');
}

function renderDonut(hostId, legendId) {
  const host = $(`#${hostId}`);
  const legend = $(`#${legendId}`);
  if (!host) return;
  const donations = store.get('donations');
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
    <svg viewBox="0 0 168 168" role="img" aria-label="Rescue status mix">
      <circle class="track" cx="84" cy="84" r="${R}"></circle>
      ${buckets.map((b) => {
        const len = (b.value / total) * C;
        const c = `<circle class="arc" cx="84" cy="84" r="${R}" stroke="${b.color}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}"></circle>`;
        offset += len;
        return c;
      }).join('')}
    </svg>
    <div class="donut-center"><strong>${total}</strong><span>Rescues</span></div>`;

  if (legend) {
    legend.innerHTML = buckets.map((b) => `
      <div class="lg-row"><span class="lg-dot" style="background:${b.color}"></span>${b.label}<span class="lg-val">${b.value}</span></div>`).join('');
  }
}

/* ================================================================
   Side panels
================================================================ */
function renderActivity() {
  $('#activity-feed').innerHTML = store.get('activity').slice(0, 8).map(activityItem).join('');
}

function renderVolunteers() {
  const vols = store.get('volunteers');
  $('#volunteer-list').innerHTML = vols.map(volunteerRow).join('');
  $('#courier-sub').textContent = `${vols.filter((v) => v.status !== 'off_duty').length} of ${vols.length} couriers online`;
}

function renderNotifications() {
  const list = store.get('notifications');
  const host = $('#notif-list');
  host.innerHTML = list.length
    ? list.map(notificationRow).join('')
    : '<div class="empty-state" style="padding:34px 18px"><div class="empty-icon" style="width:54px;height:54px;font-size:1.1rem"><i class="fa-regular fa-bell"></i></div><h3 style="font-size:1rem">All clear</h3><p>No notifications right now.</p></div>';
  const unread = store.unreadCount();
  const badge = $('#notif-badge');
  badge.textContent = unread;
  badge.classList.toggle('hide', unread === 0);
}

function renderPartners() {
  const host = $('#partner-table');
  if (!host) return;
  host.innerHTML = [...store.get('organisations')].sort((a, b) => b.rescues - a.rescues).map((o) => `
    <tr>
      <td><div class="row" style="gap:10px"><span class="avatar" style="width:32px;height:32px;border-radius:10px;font-size:.66rem">${fmt.initials(o.name)}</span><strong>${escapeHtml(o.name)}</strong></div></td>
      <td><span class="chip ${o.type === 'ngo' ? 'chip-accepted' : 'chip-available'}">${o.type === 'ngo' ? 'Receiver' : 'Donor'}</span></td>
      <td>${escapeHtml(o.area)}</td>
      <td><strong>${fmt.num(o.rescues)}</strong></td>
      <td>★ ${o.rating}</td>
      <td>${o.verified ? '<span class="chip chip-complete"><i class="fa-solid fa-badge-check"></i> Verified</span>' : '<span class="chip chip-transit">Pending</span>'}</td>
    </tr>`).join('');
}

function renderVerifications() {
  const host = $('#verify-table');
  if (!host) return;
  const rows = store.get('verifications');
  const pending = rows.filter((v) => v.status === 'pending');
  $('#count-admin').textContent = pending.length;
  $('#admin-pending-chip').textContent = `${pending.length} pending`;

  host.innerHTML = rows.map((v) => `
    <tr>
      <td><strong>${escapeHtml(v.name)}</strong><br><span style="font-size:var(--fs-xs);color:var(--ink-500)">${escapeHtml(v.contact)}</span></td>
      <td>${escapeHtml(v.role)}</td>
      <td class="mono" style="font-size:.78rem">${escapeHtml(v.licence)}</td>
      <td>${fmt.relative(v.submittedAt)}</td>
      <td>${v.status === 'approved' ? '<span class="chip chip-complete"><i class="fa-solid fa-check"></i> Approved</span>'
            : v.status === 'rejected' ? '<span class="chip chip-sos"><i class="fa-solid fa-xmark"></i> Rejected</span>'
            : '<span class="chip chip-transit"><i class="fa-solid fa-hourglass-half"></i> Pending</span>'}</td>
      <td style="text-align:right">
        ${v.status === 'pending' ? `
          <div class="row" style="justify-content:flex-end">
            <button class="btn btn-outline btn-sm" data-verify="${v.id}" data-decision="rejected">Reject</button>
            <button class="btn btn-primary btn-sm" data-verify="${v.id}" data-decision="approved">Approve</button>
          </div>` : '<span style="font-size:var(--fs-xs);color:var(--ink-400)">Resolved</span>'}
      </td>
    </tr>`).join('');
}

function renderHealth(mode) {
  const host = $('#system-health');
  if (!host) return;
  const rows = [
    { label: 'Data backend', value: mode === 'firebase' ? 'Cloud Firestore (live)' : 'Seeded prototype store', ok: true },
    { label: 'Firebase Storage', value: 'Not used by design — Spark safe', ok: true },
    { label: 'Realtime listeners', value: mode === 'firebase' ? 'Active (onSnapshot)' : 'Local event bus', ok: true },
    { label: 'Records loaded', value: `${store.get('donations').length} rescues · ${store.get('organisations').length} orgs`, ok: true },
    { label: 'Countdown engine', value: '1 Hz ticker, single interval', ok: true },
  ];
  host.innerHTML = rows.map((r) => `
    <div class="row-between" style="padding:11px 0;border-bottom:1px solid var(--hairline-soft)">
      <span style="font-size:var(--fs-sm);font-weight:700;color:var(--ink-700)">${r.label}</span>
      <span class="chip ${r.ok ? 'chip-available' : 'chip-sos'}">${escapeHtml(r.value)}</span>
    </div>`).join('');
}

/* ================================================================
   Detail modal
================================================================ */
function openDetail(id) {
  const d = store.findDonation(id);
  if (!d) return;
  ui.detailId = id;
  const cd = fmt.countdown(d.expiresAt);

  $('#detail-title').textContent = d.title;
  $('#detail-sub').textContent = `${d.id} · posted ${fmt.relative(d.createdAt)} by ${d.donor}`;

  $('#detail-body').innerHTML = `
    ${d.photo ? `<img src="${escapeHtml(d.photo)}" alt="" loading="lazy" style="width:100%;height:210px;object-fit:cover;border-radius:var(--r-md);margin-bottom:18px;box-shadow:var(--shadow-md)">` : ''}
    <div class="card-chips" style="margin-bottom:16px">
      ${d.isSos ? '<span class="chip chip-sos"><i class="fa-solid fa-tower-broadcast"></i> SOS beacon</span>' : ''}
      <span class="chip ${fmt.statusChip(d.status)}"><i class="fa-solid ${fmt.statusIcon(d.status)}"></i> ${fmt.statusLabel(d.status)}</span>
      <span class="chip chip-neutral"><i class="fa-solid fa-tag"></i> ${escapeHtml(d.category)}</span>
      ${d.verified ? '<span class="chip chip-complete"><i class="fa-solid fa-shield-halved"></i> Verified donor</span>' : '<span class="chip chip-transit">Verification pending</span>'}
    </div>

    <div class="countdown ${cd.level === 'ok' ? '' : cd.level}" style="margin-bottom:18px">
      <span class="countdown-label"><i class="fa-regular fa-clock"></i> Remaining safe window</span>
      <span class="countdown-time" data-countdown="${d.expiresAt}">${cd.text}</span>
    </div>

    <dl class="card-meta" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div class="meta-cell"><dt>Quantity</dt><dd>${fmt.num(d.quantityKg)} kg</dd></div>
      <div class="meta-cell"><dt>Servings</dt><dd>${fmt.num(d.servings)} meals</dd></div>
      <div class="meta-cell"><dt>Storage</dt><dd>${escapeHtml(d.storage)}</dd></div>
      <div class="meta-cell"><dt>Contact</dt><dd>${escapeHtml(d.contact || 'Via platform')}</dd></div>
      <div class="meta-cell" style="grid-column:1/-1"><dt>Pickup address</dt><dd>${escapeHtml(d.location)}</dd></div>
      ${d.allergens?.length ? `<div class="meta-cell" style="grid-column:1/-1"><dt>Allergens</dt><dd>${d.allergens.map(escapeHtml).join(' · ')}</dd></div>` : ''}
      ${d.claimedBy ? `<div class="meta-cell" style="grid-column:1/-1"><dt>Handled by</dt><dd>${escapeHtml(d.claimedBy)}</dd></div>` : ''}
    </dl>

    <h4 style="margin:20px 0 6px;font-size:var(--fs-sm)">Handling notes</h4>
    <p style="font-size:var(--fs-sm);margin:0">${escapeHtml(d.notes || 'No additional notes provided.')}</p>`;

  const btn = $('#detail-action');
  const label = { available: 'Claim rescue', accepted: 'Mark picked up', in_transit: 'Confirm delivery', completed: 'Completed' }[d.status];
  btn.innerHTML = `<i class="fa-solid fa-bolt"></i> ${label}`;
  btn.disabled = d.status === 'completed';
  detailModal.open();
}

/* ================================================================
   Map
================================================================ */
function initMap() {
  if (ui.map || typeof L === 'undefined') return;
  ui.map = L.map('map', { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
    .setView([28.6139, 77.215], 12.4);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO',
    maxZoom: 19,
  }).addTo(ui.map);

  ui.markers = L.layerGroup().addTo(ui.map);
  ui.map.on('click', () => ui.map.scrollWheelZoom.enable());
  renderMapMarkers();
}

function pinIcon(kind, icon) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin p-${kind}"><i class="fa-solid ${icon}"></i></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 26],
    popupAnchor: [0, -24],
  });
}

function renderMapMarkers() {
  if (!ui.markers) return;
  ui.markers.clearLayers();

  store.get('donations').forEach((d) => {
    const kind = d.isSos && d.status === 'available' ? 'sos' : d.status === 'completed' ? 'done' : 'donor';
    const cd = fmt.countdown(d.expiresAt);
    const marker = L.marker([d.lat, d.lng], { icon: pinIcon(kind, d.isSos ? 'fa-tower-broadcast' : 'fa-utensils') })
      .bindPopup(`
        <b>${escapeHtml(d.title)}</b><br>
        ${escapeHtml(d.donor)} · ${fmt.num(d.servings)} meals<br>
        <span style="color:var(--ink-500)">${escapeHtml(d.location)}</span><br>
        <span style="font-weight:700;color:${cd.level === 'crit' ? 'var(--coral-600)' : 'var(--verdant-700)'}">${cd.text} left</span>`);
    marker.on('popupopen', () => { ui.detailId = d.id; });
    ui.markers.addLayer(marker);
    if (kind === 'sos') {
      L.circle([d.lat, d.lng], { radius: 700, color: '#f43f5e', weight: 1.4, fillColor: '#f43f5e', fillOpacity: 0.09 }).addTo(ui.markers);
    }
  });

  store.get('organisations').filter((o) => o.type === 'ngo').forEach((o) => {
    ui.markers.addLayer(L.marker([o.lat, o.lng], { icon: pinIcon('ngo', 'fa-hand-holding-heart') })
      .bindPopup(`<b>${escapeHtml(o.name)}</b><br>Capacity ${o.capacity} meals/day<br>★ ${o.rating} · ${o.rescues} rescues`));
  });

  store.get('volunteers').filter((v) => v.status !== 'off_duty').forEach((v) => {
    ui.markers.addLayer(L.marker([v.lat, v.lng], { icon: pinIcon('donor', 'fa-route') })
      .bindPopup(`<b>${escapeHtml(v.name)}</b><br>${escapeHtml(v.vehicle)}<br>${v.status === 'on_route' ? `En route · ETA ${v.etaMin} min` : 'Available'}`));
  });
}

/* ================================================================
   Post form
================================================================ */
function hydrateSelects() {
  const catOptions = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  $('#p-category').innerHTML = catOptions;
  $('#f-category').innerHTML = `<option value="all">All categories</option>${catOptions}`;
  $('#p-storage').innerHTML = STORAGE_MODES.map((s) => `<option value="${s}">${s}</option>`).join('');
}

function draftFromForm() {
  const kg = parseFloat($('#p-kg').value) || 0;
  const hours = parseFloat($('#p-window').value) || 3;
  return {
    id: 'RN-PREVIEW',
    title: $('#p-title').value.trim() || 'Untitled surplus listing',
    category: $('#p-category').value,
    quantityKg: kg,
    servings: parseInt($('#p-servings').value, 10) || Math.round(kg * 2),
    donor: $('#p-donor').value.trim() || 'Your organisation',
    donorType: 'Donor',
    location: $('#p-location').value.trim() || 'Pickup address pending',
    lat: 28.6139 + (Math.random() - 0.5) * 0.05,
    lng: 77.209 + (Math.random() - 0.5) * 0.05,
    storage: $('#p-storage').value,
    windowHours: hours,
    createdAt: Date.now(),
    expiresAt: Date.now() + hours * 3600e3,
    status: 'available',
    claimedBy: null,
    isSos: $('#p-sos').checked,
    verified: true,
    notes: $('#p-notes').value.trim(),
    photo: $('#p-photo').value.trim() || null,
    contact: 'Via platform',
    allergens: [],
  };
}

function renderPostPreview() {
  $('#post-preview').innerHTML = donationCard(draftFromForm(), { compact: true, actions: false });
}

function validatePost() {
  let ok = true;
  [['p-title'], ['p-donor'], ['p-kg'], ['p-location'], ['p-window']].forEach(([id]) => {
    const el = $(`#${id}`);
    const field = el.closest('.field');
    const bad = !el.value.trim() || (el.type === 'number' && Number(el.value) <= 0);
    field.classList.toggle('has-error', bad);
    if (bad) ok = false;
  });
  return ok;
}

async function submitPost(e) {
  e.preventDefault();
  const btn = e.submitter || $('#post-form button[type="submit"]');
  if (!validatePost()) {
    toast({ type: 'error', title: 'Check the highlighted fields', message: 'A few required details are missing.' });
    $('#post-form .has-error input')?.focus();
    return;
  }
  btn.classList.add('is-loading');
  const draft = draftFromForm();
  delete draft.id;
  await new Promise((r) => setTimeout(r, 620));
  const created = await store.addDonation(draft);
  btn.classList.remove('is-loading');

  toast({
    type: created.isSos ? 'sos' : 'success',
    title: created.isSos ? 'SOS beacon broadcast' : 'Rescue published',
    message: `${created.id} is live — ${fmt.num(created.servings)} servings visible to receivers in range.`,
  });
  if (created.isSos) showSosBanner(`${created.donor} · ${created.title}`, created.id);
  $('#post-form').reset();
  renderPostPreview();
  switchTab('board');
}

/* ================================================================
   SOS
================================================================ */
function showSosBanner(message, id) {
  const banner = $('#sos-banner');
  $('#sos-banner-msg').textContent = message;
  banner.classList.add('is-on');
  banner.dataset.id = id || '';
  setTimeout(() => banner.classList.remove('is-on'), 14000);
}

async function broadcastSos() {
  const source = $('#s-source').value.trim();
  const food = $('#s-food').value.trim();
  const location = $('#s-location').value.trim();
  const minutes = parseInt($('#s-minutes').value, 10) || 45;
  if (!source || !food || !location) {
    toast({ type: 'error', title: 'Beacon incomplete', message: 'Source, contents and pickup point are required.' });
    return;
  }
  const btn = $('#sos-submit');
  btn.classList.add('is-loading');
  const created = await store.addDonation({
    title: `URGENT — ${food}`,
    category: 'Cooked Meals',
    quantityKg: 40,
    servings: 90,
    donor: source,
    donorType: 'Emergency donor',
    location,
    lat: 28.6139 + (Math.random() - 0.5) * 0.06,
    lng: 77.209 + (Math.random() - 0.5) * 0.06,
    storage: 'Hot holding (60°C+)',
    windowHours: minutes / 60,
    expiresAt: Date.now() + minutes * 60000,
    isSos: true,
    notes: 'Emergency beacon raised from the console. Immediate pickup required.',
    contact: 'Via platform',
  });
  await store.pushNotification({ type: 'sos', title: 'SOS beacon raised', message: `${source} — ${food}, ${minutes} minutes remaining.` });
  btn.classList.remove('is-loading');
  sosModal.close();
  $('#sos-form').reset();
  $('#s-minutes').value = 45;
  showSosBanner(`${source} · ${food} · ${minutes} min`, created.id);
  toast({ type: 'sos', title: 'Beacon broadcast', message: `Every verified receiver in range has been alerted.`, duration: 6500 });
  switchTab('board');
}

/* ================================================================
   Tabs / role
================================================================ */
function switchTab(name) {
  ui.tab = name;
  $$('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  $$('.tab-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
  if (name === 'map') setTimeout(() => { initMap(); ui.map?.invalidateSize(); }, 60);
  if (name === 'impact') { renderBars('impact-chart-full', IMPACT_DAILY); renderDonut('console-donut', 'console-legend'); }
  initReveal();
  initCounters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setRole(role) {
  ui.role = role;
  $$('#role-segment .segment-item').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.role === role)));
  segmentThumb($('#role-segment'));
  renderBoard();
  renderUrgent();
  const copy = {
    donor: 'Post surplus, track pickups and prove your diversion rate.',
    ngo: 'Claim rescues by urgency and capacity across your service area.',
    courier: 'Accept runs, confirm pickups and close out deliveries.',
    admin: 'Oversee verification, compliance and city-wide throughput.',
  }[role];
  $('#console-subline').textContent = copy;
  toast({ type: 'info', title: `Viewing as ${role === 'ngo' ? 'NGO / Shelter' : role[0].toUpperCase() + role.slice(1)}`, message: copy, duration: 3200 });
}

/* ================================================================
   Session
================================================================ */
function renderSession() {
  const s = store.getSession();
  if (!s) return;
  $('#user-name').textContent = s.name || 'Operator';
  $('#user-role').textContent = (s.role || 'member').toUpperCase();
  $('#user-avatar').textContent = fmt.initials(s.name || 'Op');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#console-greeting').textContent = `${greet}, ${(s.name || 'operator').split(' ')[0]}`;
  if (s.role && ACTOR[s.role]) setRole(s.role);
}

function renderBackendPill(mode) {
  const pill = $('#fb-status');
  const text = $('#fb-status-text');
  if (mode === 'firebase') {
    pill.classList.add('is-live');
    text.textContent = 'Firestore live';
  } else {
    text.textContent = 'Prototype data';
    pill.title = 'Seeded local dataset — paste your Firebase config to go live';
  }
}

/* ================================================================
   Voice assistant (progressive enhancement)
================================================================ */
function initVoice() {
  const fab = $('#voice-fab');
  const sheet = $('#voice-sheet');
  const status = $('#voice-status');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const run = (cmd) => {
    const map = { board: 'board', map: 'map', impact: 'impact', post: 'post', admin: 'admin', overview: 'overview' };
    if (cmd === 'sos') {
      ui.filters.urgency = 'sos';
      $('#f-urgency').value = 'sos';
      renderBoard();
      switchTab('board');
      status.textContent = 'Showing SOS beacons.';
      return;
    }
    if (map[cmd]) { switchTab(map[cmd]); status.textContent = `Opened ${cmd}.`; }
  };

  fab.addEventListener('click', () => {
    sheet.classList.toggle('is-open');
    if (!sheet.classList.contains('is-open')) return;
    if (!SR) { status.textContent = 'Voice input is not supported in this browser — use the shortcuts below.'; return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    fab.classList.add('is-listening');
    status.textContent = 'Listening…';
    rec.onresult = (e) => {
      const said = e.results[0][0].transcript.toLowerCase();
      status.textContent = `“${said}”`;
      const hit = ['sos', 'board', 'map', 'impact', 'post', 'admin', 'overview'].find((k) => said.includes(k));
      if (hit) run(hit); else status.textContent = `Didn’t catch a command in “${said}”.`;
    };
    rec.onerror = () => { status.textContent = 'Microphone unavailable. Use the shortcuts below.'; };
    rec.onend = () => fab.classList.remove('is-listening');
    rec.start();
  });

  $('#voice-close').addEventListener('click', () => sheet.classList.remove('is-open'));
  $$('[data-voice]').forEach((b) => b.addEventListener('click', () => run(b.dataset.voice)));
}

/* ================================================================
   Wire up
================================================================ */
function bindEvents() {
  $$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.goto)));
  $$('#role-segment .segment-item').forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)));

  // Board filters
  let searchTimer;
  $('#f-search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { ui.filters.search = e.target.value; renderBoard(); }, 190);
  });
  ['category', 'status', 'urgency', 'sort'].forEach((key) => {
    $(`#f-${key}`).addEventListener('change', (e) => { ui.filters[key] = e.target.value; renderBoard(); });
  });
  $('#f-reset').addEventListener('click', resetFilters);

  $('#purge-expired').addEventListener('click', async () => {
    const n = await store.purgeExpired();
    toast({ type: n ? 'warn' : 'info', title: n ? `${n} expired rescue${n === 1 ? '' : 's'} archived` : 'Nothing expired', message: n ? 'Removed from the live board and logged.' : 'Every rescue is still inside its safe window.' });
  });

  // Card actions (delegated)
  document.addEventListener('click', async (e) => {
    const details = e.target.closest('[data-action="details"]');
    if (details) return openDetail(details.dataset.id);

    const advance = e.target.closest('[data-action="advance"]');
    if (advance) {
      const btn = advance;
      btn.classList.add('is-loading');
      const d = await store.advanceDonation(btn.dataset.id, ACTOR[ui.role]);
      btn.classList.remove('is-loading');
      toast({ type: d.status === 'completed' ? 'success' : 'info', title: `${d.id} → ${fmt.statusLabel(d.status)}`, message: d.status === 'completed' ? `${fmt.num(d.servings)} servings logged to impact.` : `Handled by ${d.claimedBy}.` });
      return;
    }

    const verify = e.target.closest('[data-verify]');
    if (verify) {
      await store.resolveVerification(verify.dataset.verify, verify.dataset.decision);
      toast({ type: verify.dataset.decision === 'approved' ? 'success' : 'warn', title: `Application ${verify.dataset.decision}`, message: 'The organisation has been notified.' });
    }
  });

  // Detail modal action
  $('#detail-action').addEventListener('click', async () => {
    if (!ui.detailId) return;
    const btn = $('#detail-action');
    btn.classList.add('is-loading');
    const d = await store.advanceDonation(ui.detailId, ACTOR[ui.role]);
    btn.classList.remove('is-loading');
    detailModal.close();
    toast({ type: 'success', title: `${d.id} → ${fmt.statusLabel(d.status)}`, message: `Handled by ${d.claimedBy}.` });
  });

  // SOS
  $('#sos-btn').addEventListener('click', () => sosModal.open());
  $('#sos-submit').addEventListener('click', broadcastSos);
  $('#sos-banner-close').addEventListener('click', () => $('#sos-banner').classList.remove('is-on'));
  $('#sos-banner-view').addEventListener('click', () => {
    const id = $('#sos-banner').dataset.id;
    if (id) openDetail(id); else switchTab('board');
  });

  // Post form
  $('#post-form').addEventListener('submit', submitPost);
  $('#post-form').addEventListener('input', renderPostPreview);
  $('#post-form').addEventListener('reset', () => setTimeout(renderPostPreview, 0));
  $('#p-sos').addEventListener('change', (e) => $('#p-sos-card').classList.toggle('is-on', e.target.checked));
  $('#p-fill').addEventListener('click', () => {
    $('#p-title').value = 'Conference lunch surplus — paneer, rice & salad';
    $('#p-donor').value = 'Meridian Convention Centre';
    $('#p-kg').value = 64;
    $('#p-servings').value = 140;
    $('#p-window').value = 2.5;
    $('#p-location').value = 'Hall 3 service corridor, Expo District';
    $('#p-notes').value = 'Buffet untouched, held at 64°C. Trays are stackable and returnable.';
    renderPostPreview();
    toast({ type: 'info', title: 'Sample filled', message: 'Adjust anything, then publish.' });
  });
  $('#quick-post').addEventListener('click', () => switchTab('post'));

  // Notifications
  $('#notif-read-all').addEventListener('click', async () => { await store.markAllRead(); toast({ type: 'info', title: 'Notifications cleared', message: 'Everything marked as read.' }); });
  $('#notif-clear').addEventListener('click', async () => { await store.clearNotifications(); });

  // Map controls
  $('#map-recenter').addEventListener('click', () => ui.map?.flyTo([28.6139, 77.215], 12.4, { duration: 0.9 }));
  $('#map-sos-focus').addEventListener('click', () => {
    const sos = store.get('donations').find((d) => d.isSos && d.status === 'available');
    if (!sos) return toast({ type: 'info', title: 'No live beacons', message: 'Nothing is in critical escalation right now.' });
    switchTab('map');
    setTimeout(() => ui.map?.flyTo([sos.lat, sos.lng], 14.4, { duration: 1.1 }), 260);
  });

  // Reset demo data
  $('#reset-seed').addEventListener('click', async () => {
    try {
      await store.resetSeed();
      toast({ type: 'success', title: 'Demo data restored', message: 'The board is back to its pristine seeded state.' });
    } catch (err) {
      toast({ type: 'warn', title: 'Connected to Firestore', message: err.message });
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const map = { '1': 'overview', '2': 'board', '3': 'post', '4': 'map', '5': 'impact', '6': 'admin' };
    if (map[e.key]) switchTab(map[e.key]);
    if (e.key === '/') { e.preventDefault(); switchTab('board'); $('#f-search').focus(); }
  });

  window.addEventListener('resize', () => segmentThumb($('#role-segment')));
}

/* ================================================================
   Boot
================================================================ */
async function main() {
  bootShell();
  detailModal = new Modal('detail-modal');
  sosModal = new Modal('sos-modal');
  hydrateSelects();
  bindEvents();
  initVoice();
  renderPostPreview();
  segmentThumb($('#role-segment'));

  const mode = await store.init();
  renderBackendPill(mode);
  renderSession();

  const paintAll = () => {
    renderMetrics();
    renderBoard();
    renderUrgent();
    renderActivity();
    renderVolunteers();
    renderNotifications();
    renderPartners();
    renderVerifications();
    renderHealth(mode);
    renderBars('overview-chart', IMPACT_DAILY);
    if (ui.tab === 'impact') { renderBars('impact-chart-full', IMPACT_DAILY); renderDonut('console-donut', 'console-legend'); }
    renderMapMarkers();
  };

  paintAll();
  store.on('change', paintAll);
  store.on('notification', (n) => {
    if (n.type === 'sos') showSosBanner(n.message);
  });
  startCountdownTicker();

  // Ambient simulation — keeps the prototype feeling alive without noise.
  setInterval(() => {
    if (document.hidden || store.mode === 'firebase') return;
    const pool = store.get('donations').filter((d) => d.status === 'available' && !d.isSos);
    if (!pool.length || Math.random() > 0.35) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    store.claimDonation(pick.id, ACTOR.ngo);
  }, 45000);
}

main();
