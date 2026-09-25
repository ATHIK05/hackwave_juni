/**
 * RESCUE NET — Authentication flow
 * Three-step progressive sign-in. Runs locally in prototype mode;
 * swap in Firebase Auth by filling firebase-config.js (see FIREBASE.md).
 */

import store from '../core/data-service.js';
import { bootShell, toast } from '../core/ui.js';
import { ROLES } from '../core/seed-data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = { method: 'phone', step: 1, identity: '', name: '', role: 'donor', code: '' };

/* ---------------- steps ---------------- */
function goStep(n) {
  state.step = n;
  $$('.step-view').forEach((v) => v.classList.toggle('is-active', Number(v.dataset.step) === n));
  $$('#progress-steps .pstep').forEach((p, i) => {
    p.classList.toggle('is-done', i < n - 1);
    p.classList.toggle('is-active', i === n - 1);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- method toggle ---------------- */
function setMethod(method) {
  state.method = method;
  $$('.auth-tab').forEach((t) => {
    const on = t.dataset.method === method;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  $$('[data-method-field]').forEach((f) => f.classList.toggle('hide', f.dataset.methodField !== method));
}

/* ---------------- validation ---------------- */
const validators = {
  phone: (v) => /^\+?[\d\s-]{8,16}$/.test(v.trim()),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
};

function markField(el, ok) {
  el.closest('.field').classList.toggle('has-error', !ok);
  return ok;
}

/* ---------------- OTP ---------------- */
let otpTimer;
function startOtp() {
  state.code = String(Math.floor(100000 + Math.random() * 900000));
  $('#otp-demo').textContent = state.code;
  $('#otp-target').textContent = state.identity;
  $$('.otp-input').forEach((i) => { i.value = ''; i.classList.remove('is-filled'); });
  setTimeout(() => $('.otp-input')?.focus(), 240);

  let left = 120;
  clearInterval(otpTimer);
  const paint = () => {
    const m = String(Math.floor(left / 60)).padStart(2, '0');
    const s = String(left % 60).padStart(2, '0');
    $('#otp-timer').textContent = `${m}:${s}`;
    if (left-- <= 0) { clearInterval(otpTimer); $('#otp-timer').textContent = 'expired'; }
  };
  paint();
  otpTimer = setInterval(paint, 1000);

  toast({ type: 'info', title: 'Verification code sent', message: `Prototype code ${state.code} — no SMS is dispatched.`, duration: 7000 });
}

function bindOtpInputs() {
  const inputs = $$('.otp-input');
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      input.classList.toggle('is-filled', Boolean(input.value));
      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
      if (inputs.every((x) => x.value)) setTimeout(verifyOtp, 160);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
      digits.forEach((d, k) => { if (inputs[k]) { inputs[k].value = d; inputs[k].classList.add('is-filled'); } });
      if (digits.length === 6) setTimeout(verifyOtp, 160);
    });
  });
}

function verifyOtp() {
  const entered = $$('.otp-input').map((i) => i.value).join('');
  if (entered.length < 6) {
    toast({ type: 'warn', title: 'Code incomplete', message: 'Enter all six digits.' });
    return;
  }
  if (entered !== state.code) {
    $('#otp-row').animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'ease-out' });
    toast({ type: 'error', title: 'Incorrect code', message: 'Check the digits and try again.' });
    return;
  }
  clearInterval(otpTimer);
  toast({ type: 'success', title: 'Identity verified', message: 'One last step — pick your role.' });
  goStep(3);
}

/* ---------------- roles ---------------- */
function renderRoles() {
  $('#role-pick').innerHTML = ROLES.map((r, i) => `
    <label class="role-opt">
      <input type="radio" name="role" value="${r.id}" ${i === 0 ? 'checked' : ''}>
      <i class="fa-solid ${r.icon}"></i>
      <strong>${r.label}</strong>
      <span>${r.blurb}</span>
    </label>`).join('');
  $$('#role-pick input').forEach((i) => i.addEventListener('change', () => { state.role = i.value; }));
}

/* ---------------- finish ---------------- */
function finish() {
  if (!$('#a-terms').checked) {
    toast({ type: 'warn', title: 'Confirmation required', message: 'Please confirm your food handling compliance.' });
    return;
  }
  const btn = $('#finish-btn');
  btn.classList.add('is-loading');
  const session = {
    name: state.name,
    role: state.role,
    identity: state.identity,
    org: $('#a-org').value.trim() || null,
    signedInAt: Date.now(),
  };
  setTimeout(() => {
    store.setSession(session);
    toast({ type: 'success', title: `Welcome, ${session.name.split(' ')[0]}`, message: 'Opening your console…' });
    setTimeout(() => { window.location.href = 'app.html'; }, 700);
  }, 620);
}

/* ---------------- boot ---------------- */
function main() {
  bootShell();
  renderRoles();
  bindOtpInputs();
  setMethod('phone');

  $$('.auth-tab').forEach((t) => t.addEventListener('click', () => setMethod(t.dataset.method)));

  $('#identity-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const idEl = state.method === 'phone' ? $('#a-phone') : $('#a-email');
    const nameEl = $('#a-name');
    const okId = markField(idEl, validators[state.method](idEl.value));
    const okName = markField(nameEl, nameEl.value.trim().length >= 2);
    if (!okId || !okName) {
      toast({ type: 'error', title: 'Check your details', message: 'Highlighted fields need attention.' });
      return;
    }
    state.identity = idEl.value.trim();
    state.name = nameEl.value.trim();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.classList.add('is-loading');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      goStep(2);
      startOtp();
    }, 620);
  });

  $('#otp-verify').addEventListener('click', verifyOtp);
  $('#otp-back').addEventListener('click', () => { clearInterval(otpTimer); goStep(1); });
  $('#otp-autofill').addEventListener('click', () => {
    $$('.otp-input').forEach((input, i) => { input.value = state.code[i]; input.classList.add('is-filled'); });
    setTimeout(verifyOtp, 200);
  });

  $('#demo-btn').addEventListener('click', () => {
    store.setSession({ name: 'Priya Raghavan', role: 'donor', identity: 'demo@rescuenet.app', org: 'Skyline Grand Hotel', signedInAt: Date.now() });
    toast({ type: 'success', title: 'Demo operator ready', message: 'Loading the console with seeded data…' });
    setTimeout(() => { window.location.href = 'app.html'; }, 650);
  });

  $('#finish-btn').addEventListener('click', finish);

  // Already signed in? Offer a fast path.
  const existing = store.getSession();
  if (existing) {
    toast({
      type: 'info',
      title: `Signed in as ${existing.name}`,
      message: 'Opening the console shortly — or sign in as someone else.',
      duration: 5200,
    });
    $('#a-name').value = existing.name;
  }
}

main();
