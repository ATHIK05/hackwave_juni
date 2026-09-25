# Firebase — plug and play (Spark plan)

Rescue Net ships fully working with a **seeded local dataset**. Connecting a real
backend is a single config paste plus one command. No build step, no bundler,
no billing-enabled services.

> **Firebase Storage is deliberately not used anywhere.** Images are plain remote
> URL strings stored inside Firestore documents, so everything here stays inside
> the free **Spark** plan.

---

## 1. Create the project (2 minutes)

1. <https://console.firebase.google.com> → **Add project** (Spark / free is fine).
2. **Build → Firestore Database → Create database** → *Production mode* → pick a region.
3. *(Optional but recommended)* **Build → Authentication → Sign-in method → Anonymous → Enable.**
4. **Project settings → Your apps → Web app (`</>`)** → register → copy the config object.

## 2. Paste the config

Open `assets/js/core/firebase-config.js` and fill in the five values:

```js
export const firebaseConfig = {
  apiKey: 'AIza…',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:abc123',
};
```

That is the entire integration. On the next page load the app detects the config,
connects to Cloud Firestore, attaches realtime `onSnapshot` listeners and the
status pill in the header flips from **Prototype data** to **Firestore live**.

## 3. Seed the collections — one command

```bash
npm install
npm run seed
```

Options:

| Command | Effect |
| --- | --- |
| `npm run seed` | Upsert every document (safe to re-run) |
| `npm run seed:reset` | Delete existing docs, then seed fresh |
| `npm run seed:dry` | Print the plan, write nothing |

## 4. Deploy the security rules

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # select your project
npm run firebase:rules
```

`firestore.rules` ships with prototype-safe defaults: the public board is
readable by anyone, writes require a signed-in (even anonymous) user, and
reference/compliance collections require a `staff` custom claim.

---

## Data model

| Collection | Doc id | Purpose |
| --- | --- | --- |
| `donations` | `RN-2481` | The live rescue board — status, safety window, geo, servings |
| `organisations` | `org-asha` | Donors and receivers with capacity, zone and rating |
| `volunteers` | `vol-07` | Courier pool, live position and duty status |
| `notifications` | `ntf-…` | Bell feed, SOS broadcasts |
| `verifications` | `ver-101` | Licence / compliance queue |
| `impact_daily` | `Mon` | Daily meals, kilos and rescue counts |
| `activity` | `act-…` | Append-only audit trail |

Field shapes live in `assets/js/core/seed-data.js` — the web app and the seeder
import the exact same file, so they can never drift.

## Architecture note

Every screen talks only to `assets/js/core/data-service.js`. That module exposes
one API and picks its backend at runtime:

```
firebase-config.js filled?  ──yes──►  Cloud Firestore (+ realtime listeners)
                            ──no───►  Seeded prototype store (localStorage)
```

If Firestore is unreachable the service falls back to the seeded store and logs a
warning, so a demo never shows a broken screen.

## Going live checklist

- [ ] Config pasted into `firebase-config.js`
- [ ] `npm run seed` completed
- [ ] `npm run firebase:rules` deployed
- [ ] Anonymous auth enabled (or `FIREBASE_OPTIONS.anonymousAuth = false`)
- [ ] `FIREBASE_OPTIONS.useStorage` left `false` — always
