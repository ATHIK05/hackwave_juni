/**
 * RESCUE NET — Data service
 * ===========================================================
 * One API, two backends:
 *
 *   • "prototype"  → seeded in-memory store persisted to
 *                    localStorage. Zero setup, works offline,
 *                    ships on GitHub Pages.
 *   • "firebase"   → live Cloud Firestore, activated the moment
 *                    assets/js/core/firebase-config.js is filled in.
 *
 * Every screen talks to this module only, so switching backends
 * is genuinely a single paste of credentials — no refactor.
 */

import SEED_BUNDLE from './seed-data.js';
import { firebaseConfig, COLLECTIONS, FIREBASE_OPTIONS, isFirebaseConfigured } from './firebase-config.js';

const FB_VERSION = '10.12.2';
const LS_KEY = 'rescuenet.store.v3';
const LS_USER = 'rescuenet.session.v3';

/* ------------------------------------------------------------------ *
 *  Tiny event bus
 * ------------------------------------------------------------------ */
class Emitter {
  constructor() { this.map = new Map(); }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) { this.map.get(evt)?.delete(fn); }
  emit(evt, payload) { this.map.get(evt)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } }); }
}

/* ------------------------------------------------------------------ *
 *  Store
 * ------------------------------------------------------------------ */
class DataService extends Emitter {
  constructor() {
    super();
    this.mode = 'prototype';
    this.ready = false;
    this.db = null;
    this.fb = null;
    this.state = {
      donations: [],
      organisations: [],
      volunteers: [],
      notifications: [],
      verifications: [],
      impact_daily: [],
      activity: [],
    };
  }

  /* ---------------- lifecycle ---------------- */

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      if (isFirebaseConfigured()) {
        try {
          await this._initFirebase();
          this.mode = 'firebase';
        } catch (err) {
          console.warn('[RescueNet] Firebase unavailable, falling back to prototype store.', err);
          this._initLocal();
        }
      } else {
        this._initLocal();
      }
      this.ready = true;
      this.emit('ready', this.mode);
      this.emit('change', this.state);
      return this.mode;
    })();
    return this._initPromise;
  }

  /* ---------------- prototype backend ---------------- */

  _initLocal() {
    this.mode = 'prototype';
    const saved = this._readLS();
    if (saved) {
      this.state = { ...this.state, ...saved };
      // Keep the demo alive: refresh expiry windows that fully elapsed.
      this.state.donations = this.state.donations.map((d) =>
        d.expiresAt < Date.now() - 6 * 3600e3 ? { ...d, expiresAt: Date.now() + (d.windowHours || 3) * 3600e3 } : d);
    } else {
      this.state = structuredClone(SEED_BUNDLE);
    }
    this._persist();
  }

  _readLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  _persist() {
    if (this.mode !== 'prototype') return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch { /* quota */ }
  }

  /* ---------------- firebase backend ---------------- */

  async _initFirebase() {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;
    const [appMod, fsMod] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-firestore.js`),
    ]);

    const app = appMod.initializeApp(firebaseConfig);
    this.db = fsMod.getFirestore(app);
    this.fb = fsMod;

    if (FIREBASE_OPTIONS.anonymousAuth) {
      try {
        const authMod = await import(`${base}/firebase-auth.js`);
        const auth = authMod.getAuth(app);
        if (!auth.currentUser) await authMod.signInAnonymously(auth);
      } catch (e) {
        console.info('[RescueNet] Anonymous auth skipped:', e?.code || e);
      }
    }

    const entries = Object.entries(COLLECTIONS);
    await Promise.all(entries.map(async ([stateKey, colName]) => {
      const key = stateKey === 'impact' ? 'impact_daily' : stateKey;
      const colRef = fsMod.collection(this.db, colName);
      if (FIREBASE_OPTIONS.realtime) {
        fsMod.onSnapshot(colRef, (snap) => {
          this.state[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          this.emit('change', this.state);
          this.emit(`change:${key}`, this.state[key]);
        }, (err) => console.warn(`[RescueNet] listener ${colName}:`, err.code));
      }
      const snap = await fsMod.getDocs(colRef);
      this.state[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }));

    // Empty project? Hydrate the UI from seed so the prototype never looks broken.
    if (!this.state.donations.length) {
      console.info('[RescueNet] Firestore is empty — run `npm run seed` to populate it.');
      this.state = { ...structuredClone(SEED_BUNDLE), ...this._nonEmpty(this.state) };
    }
  }

  _nonEmpty(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => Array.isArray(v) && v.length));
  }

  async _fsSet(colKey, id, data) {
    const { doc, setDoc, collection: col } = this.fb;
    const colName = COLLECTIONS[colKey] || colKey;
    const ref = id ? doc(this.db, colName, id) : doc(col(this.db, colName));
    await setDoc(ref, data, { merge: true });
    return ref.id;
  }

  async _fsDelete(colKey, id) {
    const { doc, deleteDoc } = this.fb;
    await deleteDoc(doc(this.db, COLLECTIONS[colKey] || colKey, id));
  }

  /* ---------------- generic helpers ---------------- */

  get(key) { return this.state[key] || []; }

  subscribe(fn) {
    fn(this.state);
    return this.on('change', fn);
  }

  _commit(key) {
    this._persist();
    this.emit('change', this.state);
    this.emit(`change:${key}`, this.state[key]);
  }

  /* ---------------- donations ---------------- */

  listDonations({ search = '', category = 'all', status = 'all', urgency = 'all', sort = 'urgent' } = {}) {
    const q = search.trim().toLowerCase();
    let rows = [...this.state.donations];

    if (q) {
      rows = rows.filter((d) =>
        [d.title, d.donor, d.location, d.category, d.id].filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (category !== 'all') rows = rows.filter((d) => d.category === category);
    if (status !== 'all') rows = rows.filter((d) => d.status === status);
    if (urgency !== 'all') {
      rows = rows.filter((d) => {
        const mins = (d.expiresAt - Date.now()) / 60000;
        if (urgency === 'sos') return d.isSos;
        if (urgency === 'critical') return mins <= 60;
        if (urgency === 'soon') return mins > 60 && mins <= 240;
        return mins > 240;
      });
    }

    const weight = { available: 0, accepted: 1, in_transit: 2, completed: 3 };
    rows.sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt;
      if (sort === 'largest') return (b.servings || 0) - (a.servings || 0);
      if (a.isSos !== b.isSos) return a.isSos ? -1 : 1;
      if (weight[a.status] !== weight[b.status]) return weight[a.status] - weight[b.status];
      return a.expiresAt - b.expiresAt;
    });
    return rows;
  }

  findDonation(id) { return this.state.donations.find((d) => d.id === id) || null; }

  async addDonation(payload) {
    const id = payload.id || `RN-${Math.floor(2500 + Math.random() * 7400)}`;
    const record = {
      status: 'available',
      claimedBy: null,
      verified: true,
      allergens: [],
      createdAt: Date.now(),
      ...payload,
      id,
    };
    this.state.donations = [record, ...this.state.donations];
    this._commit('donations');
    await this.logActivity(record.isSos ? 'sos' : 'post',
      `${record.donor} posted ${record.quantityKg} kg — ${record.title}.`);
    if (this.mode === 'firebase') await this._fsSet('donations', id, record);
    return record;
  }

  async updateDonation(id, patch) {
    this.state.donations = this.state.donations.map((d) => (d.id === id ? { ...d, ...patch } : d));
    this._commit('donations');
    if (this.mode === 'firebase') await this._fsSet('donations', id, patch);
    return this.findDonation(id);
  }

  async claimDonation(id, actor) {
    const d = this.findDonation(id);
    if (!d) return null;
    await this.updateDonation(id, { status: 'accepted', claimedBy: actor.name, claimedByRole: actor.role, claimedAt: Date.now() });
    await this.logActivity('claim', `${actor.name} claimed ${id} — ${d.servings} servings secured.`);
    await this.pushNotification({ type: 'success', title: 'Rescue claimed', message: `${actor.name} accepted ${id} from ${d.donor}.` });
    return this.findDonation(id);
  }

  async advanceDonation(id, actor) {
    const d = this.findDonation(id);
    if (!d) return null;
    const next = { available: 'accepted', accepted: 'in_transit', in_transit: 'completed', completed: 'completed' }[d.status];
    await this.updateDonation(id, { status: next, claimedBy: d.claimedBy || actor.name, claimedByRole: d.claimedByRole || actor.role });
    const copy = {
      accepted: `${actor.name} accepted ${id}.`,
      in_transit: `${id} picked up — courier en route.`,
      completed: `${id} delivered. ${d.servings} servings logged.`,
    }[next];
    await this.logActivity(next === 'completed' ? 'done' : next === 'in_transit' ? 'transit' : 'claim', copy);
    await this.pushNotification({ type: next === 'completed' ? 'success' : 'info', title: 'Rescue updated', message: copy });
    return this.findDonation(id);
  }

  async removeDonation(id) {
    this.state.donations = this.state.donations.filter((d) => d.id !== id);
    this._commit('donations');
    if (this.mode === 'firebase') await this._fsDelete('donations', id);
  }

  async purgeExpired() {
    const cutoff = Date.now();
    const gone = this.state.donations.filter((d) => d.expiresAt < cutoff && d.status !== 'completed');
    for (const d of gone) await this.removeDonation(d.id);
    return gone.length;
  }

  /* ---------------- notifications ---------------- */

  async pushNotification({ type = 'info', title, message }) {
    const record = { id: `ntf-${Date.now()}-${Math.floor(Math.random() * 999)}`, type, title, message, createdAt: Date.now(), read: false };
    this.state.notifications = [record, ...this.state.notifications].slice(0, 60);
    this._commit('notifications');
    this.emit('notification', record);
    if (this.mode === 'firebase') await this._fsSet('notifications', record.id, record);
    return record;
  }

  async markAllRead() {
    this.state.notifications = this.state.notifications.map((n) => ({ ...n, read: true }));
    this._commit('notifications');
    if (this.mode === 'firebase') {
      await Promise.all(this.state.notifications.map((n) => this._fsSet('notifications', n.id, { read: true })));
    }
  }

  async clearNotifications() {
    const ids = this.state.notifications.map((n) => n.id);
    this.state.notifications = [];
    this._commit('notifications');
    if (this.mode === 'firebase') await Promise.all(ids.map((id) => this._fsDelete('notifications', id)));
  }

  unreadCount() { return this.state.notifications.filter((n) => !n.read).length; }

  /* ---------------- verifications ---------------- */

  async resolveVerification(id, status) {
    this.state.verifications = this.state.verifications.map((v) => (v.id === id ? { ...v, status } : v));
    this._commit('verifications');
    const v = this.state.verifications.find((x) => x.id === id);
    await this.logActivity('verify', `${v?.name} ${status === 'approved' ? 'approved' : 'rejected'} by coordinator.`);
    if (this.mode === 'firebase') await this._fsSet('verifications', id, { status });
  }

  /* ---------------- activity ---------------- */

  async logActivity(kind, text) {
    const record = { id: `act-${Date.now()}-${Math.floor(Math.random() * 999)}`, kind, text, at: Date.now() };
    this.state.activity = [record, ...this.state.activity].slice(0, 80);
    this._commit('activity');
    if (this.mode === 'firebase') await this._fsSet('activity', record.id, record);
    return record;
  }

  /* ---------------- derived metrics ---------------- */

  metrics() {
    const d = this.state.donations;
    const live = d.filter((x) => x.status !== 'completed');
    const completed = d.filter((x) => x.status === 'completed');
    const sos = d.filter((x) => x.isSos && x.status === 'available');
    const kg = d.reduce((s, x) => s + (x.quantityKg || 0), 0);
    const meals = d.reduce((s, x) => s + (x.servings || 0), 0);
    const week = this.state.impact_daily || [];
    return {
      live: live.length,
      available: d.filter((x) => x.status === 'available').length,
      inTransit: d.filter((x) => x.status === 'in_transit').length,
      completed: completed.length,
      sos: sos.length,
      kg,
      meals,
      co2: Math.round(kg * 2.5),
      weekMeals: week.reduce((s, x) => s + x.meals, 0),
      weekKg: week.reduce((s, x) => s + x.kg, 0),
      avgResponseMin: 27,
      partners: this.state.organisations.length,
      volunteersOnline: this.state.volunteers.filter((v) => v.status !== 'off_duty').length,
    };
  }

  /** Reset everything back to the pristine seed (prototype mode only). */
  async resetSeed() {
    if (this.mode === 'firebase') {
      throw new Error('Connected to Firestore — run `npm run seed -- --reset` instead.');
    }
    this.state = structuredClone(SEED_BUNDLE);
    this._persist();
    this.emit('change', this.state);
    return true;
  }

  /* ---------------- session ---------------- */

  getSession() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch { return null; }
  }
  setSession(user) {
    localStorage.setItem(LS_USER, JSON.stringify(user));
    this.emit('session', user);
    return user;
  }
  clearSession() {
    localStorage.removeItem(LS_USER);
    this.emit('session', null);
  }
}

export const store = new DataService();
export default store;
