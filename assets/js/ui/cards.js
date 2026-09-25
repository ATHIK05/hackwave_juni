/**
 * RESCUE NET — Shared render partials
 * Used by both the landing preview and the operations console so
 * the marketing surface and the product never drift apart.
 */

import { fmt, escapeHtml } from '../core/ui.js';

export function donationCard(d, { compact = false, actions = true, role = 'ngo' } = {}) {
  const cd = fmt.countdown(d.expiresAt);
  const span = Math.max(1, (d.expiresAt - d.createdAt));
  const ratio = Math.max(0, Math.min(1, (d.expiresAt - Date.now()) / span));
  const fillClass = cd.level === 'crit' ? 'crit' : cd.level === 'warn' ? 'warn' : '';

  const primary = {
    available: role === 'courier' ? 'Accept run' : 'Claim rescue',
    accepted: 'Mark picked up',
    in_transit: 'Confirm delivery',
    completed: 'Completed',
  }[d.status];

  return `
  <article class="rescue-card ${d.isSos ? 'is-sos' : ''} sheen" data-id="${d.id}" data-tilt="4">
    <div class="card-head">
      <div class="card-chips">
        ${d.isSos ? '<span class="chip chip-sos chip-dot"><i class="fa-solid fa-tower-broadcast"></i> SOS</span>' : ''}
        <span class="chip ${fmt.statusChip(d.status)}"><i class="fa-solid ${fmt.statusIcon(d.status)}"></i> ${fmt.statusLabel(d.status)}</span>
        ${d.verified ? '' : '<span class="chip chip-transit"><i class="fa-solid fa-hourglass-half"></i> Verifying</span>'}
      </div>
      <span class="card-id">${escapeHtml(d.id)}</span>
    </div>

    <h3 class="card-title">${escapeHtml(d.title)}</h3>

    <div class="card-donor">
      <span class="card-avatar">${fmt.initials(d.donor)}</span>
      <span>${escapeHtml(d.donor)}</span>
      <span style="color:var(--ink-300)">·</span>
      <span style="font-weight:600;color:var(--ink-500)">${escapeHtml(d.donorType || 'Partner')}</span>
    </div>

    <dl class="card-meta">
      <div class="meta-cell"><dt>Quantity</dt><dd>${fmt.num(d.quantityKg)} kg · ${fmt.num(d.servings)} meals</dd></div>
      <div class="meta-cell"><dt>Storage</dt><dd>${escapeHtml(d.storage)}</dd></div>
      ${compact ? '' : `<div class="meta-cell" style="grid-column:1/-1"><dt>Pickup</dt><dd>${escapeHtml(d.location)}</dd></div>`}
    </dl>

    <div class="countdown ${cd.level === 'ok' ? '' : cd.level}">
      <span class="countdown-label"><i class="fa-regular fa-clock"></i> Safe window</span>
      <span class="countdown-time" data-countdown="${d.expiresAt}">${cd.text}</span>
    </div>

    <div class="freshness-bar" aria-hidden="true">
      <div class="freshness-fill ${fillClass}" style="width:${(ratio * 100).toFixed(1)}%"></div>
    </div>

    ${d.claimedBy ? `<p class="list-sub" style="margin:-6px 0 14px"><i class="fa-solid fa-user-check" style="color:var(--verdant-600)"></i> ${escapeHtml(d.claimedBy)}</p>` : ''}

    ${actions ? `
    <div class="card-actions">
      <button class="btn btn-glass btn-sm" data-action="details" data-id="${d.id}"><i class="fa-solid fa-circle-info"></i> Details</button>
      ${d.status === 'completed'
        ? `<button class="btn btn-outline btn-sm" disabled><i class="fa-solid fa-check"></i> ${primary}</button>`
        : `<button class="btn btn-primary btn-sm" data-action="advance" data-id="${d.id}"><i class="fa-solid fa-bolt"></i> ${primary}</button>`}
    </div>` : ''}
  </article>`;
}

export function notificationRow(n) {
  const icon = { sos: 'fa-tower-broadcast', success: 'fa-circle-check', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' }[n.type] || 'fa-bell';
  const tone = { sos: 'i-coral', success: '', info: 'i-indigo', warn: 'i-amber' }[n.type] || '';
  return `
  <div class="list-row ${n.read ? '' : 'is-unread'}">
    <div class="list-icon ${tone}"><i class="fa-solid ${icon}"></i></div>
    <div class="list-main">
      <p class="list-title">${escapeHtml(n.title)}</p>
      <p class="list-sub">${escapeHtml(n.message)}</p>
    </div>
    <span class="list-time">${fmt.relative(n.createdAt)}</span>
  </div>`;
}

export function activityItem(a) {
  const sos = a.kind === 'sos';
  return `
  <div class="timeline-item ${sos ? 'is-sos' : ''}">
    <p class="t-title">${escapeHtml(a.text)}</p>
    <p class="t-meta">${fmt.relative(a.at)} · ${escapeHtml(a.kind)}</p>
  </div>`;
}

export function volunteerRow(v) {
  const tone = { on_route: 'chip-transit', available: 'chip-available', off_duty: 'chip-neutral' }[v.status];
  const label = { on_route: 'On route', available: 'Available', off_duty: 'Off duty' }[v.status];
  return `
  <div class="list-row">
    <span class="avatar">${fmt.initials(v.name)}</span>
    <div class="list-main">
      <p class="list-title">${escapeHtml(v.name)}</p>
      <p class="list-sub">${escapeHtml(v.vehicle)} · ${v.trips} runs · ★ ${v.rating}</p>
    </div>
    <span class="chip ${tone}">${label}${v.etaMin ? ` · ${v.etaMin}m` : ''}</span>
  </div>`;
}

/** Keep every visible countdown ticking from a single interval. */
export function startCountdownTicker() {
  const tick = () => {
    document.querySelectorAll('[data-countdown]').forEach((el) => {
      const cd = fmt.countdown(Number(el.dataset.countdown));
      el.textContent = cd.text;
      const box = el.closest('.countdown');
      if (box) box.className = `countdown ${cd.level === 'ok' ? '' : cd.level}`;
      const card = el.closest('.rescue-card');
      const fill = card?.querySelector('.freshness-fill');
      if (fill) {
        fill.classList.toggle('crit', cd.level === 'crit');
        fill.classList.toggle('warn', cd.level === 'warn');
      }
    });
  };
  tick();
  return setInterval(tick, 1000);
}
