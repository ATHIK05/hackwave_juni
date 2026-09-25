/**
 * RESCUE NET — Firebase plug-and-play configuration
 * ===========================================================
 * 1. Create a Firebase project (Spark / free plan is enough).
 * 2. Project settings → Your apps → Web app → copy the config.
 * 3. Paste the values below.  Nothing else in the codebase
 *    needs to change — the data layer switches from the local
 *    prototype store to live Firestore automatically.
 * 4. Seed your Firestore collections with one command:
 *        npm run seed
 *
 * NOTE: Firebase **Storage is intentionally not used** anywhere
 * (Storage requires a billing-enabled plan). Images are plain
 * remote URLs stored as strings inside Firestore documents.
 *
 * Only Firestore + (optional) Anonymous/Email Auth are used —
 * both are fully available on the Spark plan.
 */

export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  // storageBucket is deliberately omitted — Firebase Storage is not used.
  messagingSenderId: '',
  appId: '',
};

/** Firestore collection names (kept in one place for the seeder + app). */
export const COLLECTIONS = {
  donations: 'donations',
  organisations: 'organisations',
  volunteers: 'volunteers',
  notifications: 'notifications',
  verifications: 'verifications',
  impact: 'impact_daily',
  activity: 'activity',
};

/** Feature switches — safe defaults for the Spark plan. */
export const FIREBASE_OPTIONS = {
  /** Live Firestore listeners (onSnapshot). Set false to fetch once per load. */
  realtime: true,
  /** Sign in anonymously so Firestore rules can require request.auth != null. */
  anonymousAuth: true,
  /** Never enable — Firebase Storage is not part of this architecture. */
  useStorage: false,
};

export const isFirebaseConfigured = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export default firebaseConfig;
