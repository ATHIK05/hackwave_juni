#!/usr/bin/env node
/**
 * RESCUE NET — one-command Firestore seeder
 * ===========================================================
 *   npm run seed            → upsert every collection
 *   npm run seed -- --reset → delete existing docs first
 *   npm run seed -- --dry   → print the plan, write nothing
 *
 * Reads the SAME credentials the web app uses:
 *   assets/js/core/firebase-config.js
 *
 * Uses the Firebase Web SDK (modular) so no service-account key
 * and no billing-enabled plan are required — Spark works.
 * Firebase Storage is never touched: images are URL strings.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, writeBatch, getDocs,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const DRY = args.includes('--dry');

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const log = (...a) => console.log(...a);
const ok = (m) => log(`${c.green}✔${c.reset} ${m}`);
const warn = (m) => log(`${c.yellow}▲${c.reset} ${m}`);
const fail = (m) => log(`${c.red}✖${c.reset} ${m}`);

async function loadModules() {
  const configUrl = new URL('../assets/js/core/firebase-config.js', import.meta.url);
  const seedUrl = new URL('../assets/js/core/seed-data.js', import.meta.url);
  const [cfg, seed] = await Promise.all([import(configUrl), import(seedUrl)]);
  return { cfg, seed };
}

async function wipe(db, name) {
  const snap = await getDocs(collection(db, name));
  if (snap.empty) return 0;
  let batch = writeBatch(db);
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    if (++n % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
  }
  await batch.commit();
  return n;
}

async function seedCollection(db, name, rows, idKey = 'id') {
  let batch = writeBatch(db);
  let n = 0;
  for (const row of rows) {
    const id = String(row[idKey] ?? row.day ?? `${name}-${n}`);
    const payload = { ...row, id, seededAt: Date.now() };
    batch.set(doc(collection(db, name), id), payload, { merge: true });
    if (++n % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
  }
  await batch.commit();
  return n;
}

async function main() {
  log(`\n${c.bold}${c.cyan}Rescue Net — Firestore seeder${c.reset}`);
  log(`${c.dim}${ROOT}${c.reset}\n`);

  const { cfg, seed } = await loadModules();
  const { firebaseConfig, COLLECTIONS, FIREBASE_OPTIONS, isFirebaseConfigured } = cfg;

  if (!isFirebaseConfigured()) {
    fail('Firebase is not configured yet.');
    log(`
  1. Create a project at ${c.cyan}https://console.firebase.google.com${c.reset} (Spark / free plan is fine)
  2. Build → Firestore Database → Create database
  3. Project settings → Your apps → Web app → copy the config
  4. Paste apiKey / authDomain / projectId / messagingSenderId / appId into
     ${c.bold}assets/js/core/firebase-config.js${c.reset}
  5. Re-run ${c.bold}npm run seed${c.reset}
`);
    process.exit(1);
  }

  if (FIREBASE_OPTIONS.useStorage) {
    fail('FIREBASE_OPTIONS.useStorage must stay false — this project never uses Firebase Storage.');
    process.exit(1);
  }

  const bundle = {
    [COLLECTIONS.donations]: seed.DONATIONS,
    [COLLECTIONS.organisations]: seed.ORGANISATIONS,
    [COLLECTIONS.volunteers]: seed.VOLUNTEERS,
    [COLLECTIONS.notifications]: seed.NOTIFICATIONS,
    [COLLECTIONS.verifications]: seed.VERIFICATIONS,
    [COLLECTIONS.impact]: seed.IMPACT_DAILY,
    [COLLECTIONS.activity]: seed.ACTIVITY,
  };

  log(`${c.bold}Project:${c.reset} ${firebaseConfig.projectId}`);
  log(`${c.bold}Mode:${c.reset}    ${DRY ? 'dry run' : RESET ? 'reset + seed' : 'upsert'}\n`);

  Object.entries(bundle).forEach(([name, rows]) => log(`  ${c.dim}•${c.reset} ${name.padEnd(16)} ${rows.length} docs`));
  log('');

  if (DRY) { warn('Dry run — nothing was written.'); return; }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  if (FIREBASE_OPTIONS.anonymousAuth) {
    try {
      await signInAnonymously(getAuth(app));
      ok('Signed in anonymously');
    } catch (e) {
      warn(`Anonymous auth unavailable (${e.code}) — continuing with open rules.`);
    }
  }

  for (const [name, rows] of Object.entries(bundle)) {
    if (RESET) {
      const removed = await wipe(db, name);
      if (removed) warn(`${name}: removed ${removed} existing docs`);
    }
    const written = await seedCollection(db, name, rows);
    ok(`${name}: wrote ${written} docs`);
  }

  log(`\n${c.green}${c.bold}Done.${c.reset} Reload the app — it is now reading live Firestore data.\n`);
  process.exit(0);
}

main().catch((err) => {
  fail(err?.message || String(err));
  if (String(err).includes('permission-denied')) {
    log(`\n${c.yellow}Tip:${c.reset} deploy the bundled rules first:\n  firebase deploy --only firestore:rules\n`);
  }
  process.exit(1);
});
