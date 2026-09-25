/**
 * RESCUE NET — Seed dataset
 * -----------------------------------------------------------
 * Single source of truth for the prototype experience AND for
 * the Firestore seeding script (`npm run seed`).
 *
 * Collections (Firestore, Spark plan friendly — no Storage used):
 *   donations, organisations, volunteers, notifications,
 *   verifications, impact_daily, activity
 *
 * Images are referenced by REMOTE URL only (never Firebase Storage).
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Relative timestamps resolve at read time so the demo always feels live. */
export const nowOffset = (ms) => Date.now() + ms;

export const CATEGORIES = [
  'Cooked Meals',
  'Fresh Produce',
  'Bakery & Pastry',
  'Packaged & Dry Goods',
  'Dairy & Beverages',
  'Festive / Event Surplus',
];

export const STORAGE_MODES = [
  'Hot holding (60°C+)',
  'Chilled (2–5°C)',
  'Frozen (-18°C)',
  'Ambient / dry store',
];

export const ROLES = [
  { id: 'donor', label: 'Donor', icon: 'fa-utensils', blurb: 'Kitchens, hotels, caterers & events' },
  { id: 'ngo', label: 'NGO / Shelter', icon: 'fa-hand-holding-heart', blurb: 'Food banks, shelters & community kitchens' },
  { id: 'courier', label: 'Volunteer', icon: 'fa-route', blurb: 'Riders & drivers moving rescues' },
  { id: 'admin', label: 'Coordinator', icon: 'fa-shield-halved', blurb: 'City-level oversight & compliance' },
];

export const DONATIONS = [
  {
    id: 'RN-2481',
    title: 'Banquet surplus — biryani, curries & naan',
    category: 'Cooked Meals',
    quantityKg: 85,
    servings: 180,
    donorId: 'org-skyline',
    donor: 'Skyline Grand Hotel',
    donorType: 'Hotel',
    location: 'Sector 7, Cyber Hub — Loading Dock A',
    lat: 28.6139, lng: 77.209,
    storage: 'Hot holding (60°C+)',
    createdAt: nowOffset(-18 * MIN),
    expiresAt: nowOffset(1.8 * HOUR),
    windowHours: 2,
    status: 'available',
    claimedBy: null,
    isSos: false,
    verified: true,
    allergens: ['Dairy', 'Gluten'],
    notes: 'Packed in food-grade thermal trays. Temperature logged at 68°C on dispatch.',
    photo: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=70&auto=format&fit=crop',
    contact: '+91 98100 22114',
  },
  {
    id: 'RN-2482',
    title: 'URGENT — 150 sandwich & pastry trays',
    category: 'Bakery & Pastry',
    quantityKg: 62,
    servings: 300,
    donorId: 'org-cyberbake',
    donor: 'CyberBake Central Kitchen',
    donorType: 'Bakery',
    location: 'Block 4, Tech Corridor — Gate 2',
    lat: 28.625, lng: 77.218,
    storage: 'Ambient / dry store',
    createdAt: nowOffset(-32 * MIN),
    expiresAt: nowOffset(0.55 * HOUR),
    windowHours: 1,
    status: 'available',
    claimedBy: null,
    isSos: true,
    verified: true,
    allergens: ['Gluten', 'Egg', 'Nuts'],
    notes: 'Night-shift overproduction. Needs a courier within the hour for the 8pm shelter service.',
    photo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=70&auto=format&fit=crop',
    contact: '+91 99711 40382',
  },
  {
    id: 'RN-2483',
    title: 'Corporate cafeteria lunch trays (veg)',
    category: 'Cooked Meals',
    quantityKg: 40,
    servings: 90,
    donorId: 'org-techhub',
    donor: 'TechHub Campus Kitchen',
    donorType: 'Corporate kitchen',
    location: 'Sector 3, Innovation Park — Tower B',
    lat: 28.602, lng: 77.229,
    storage: 'Chilled (2–5°C)',
    createdAt: nowOffset(-48 * MIN),
    expiresAt: nowOffset(3.4 * HOUR),
    windowHours: 4,
    status: 'accepted',
    claimedBy: 'Asha Hope Foundation',
    claimedByRole: 'ngo',
    isSos: false,
    verified: true,
    allergens: ['Gluten'],
    notes: 'Sealed meal trays — rice, dal, seasonal vegetables. Cold room B.',
    photo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=70&auto=format&fit=crop',
    contact: '+91 98200 55190',
  },
  {
    id: 'RN-2484',
    title: 'Wholesale produce — tomatoes, apples, spinach',
    category: 'Fresh Produce',
    quantityKg: 120,
    servings: 240,
    donorId: 'org-bioagro',
    donor: 'BioAgro Wholesale Market',
    donorType: 'Supplier',
    location: 'Wholesale Terminal 9, North Ring',
    lat: 28.638, lng: 77.201,
    storage: 'Ambient / dry store',
    createdAt: nowOffset(-2.2 * HOUR),
    expiresAt: nowOffset(21 * HOUR),
    windowHours: 24,
    status: 'available',
    claimedBy: null,
    isSos: false,
    verified: true,
    allergens: [],
    notes: 'Cosmetic blemishes only — full nutritional quality. Palletised, forklift access.',
    photo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=70&auto=format&fit=crop',
    contact: '+91 90040 71123',
  },
  {
    id: 'RN-2485',
    title: 'Hostel mess dinner — rice & lentil curry',
    category: 'Cooked Meals',
    quantityKg: 35,
    servings: 70,
    donorId: 'org-apex',
    donor: 'Apex Campus Mess #2',
    donorType: 'Institution',
    location: 'University Sector — Gate 5',
    lat: 28.591, lng: 77.195,
    storage: 'Hot holding (60°C+)',
    createdAt: nowOffset(-22 * MIN),
    expiresAt: nowOffset(2.7 * HOUR),
    windowHours: 3,
    status: 'in_transit',
    claimedBy: 'Rider Unit 07 — Meera K.',
    claimedByRole: 'courier',
    isSos: false,
    verified: true,
    allergens: [],
    notes: 'Stainless containers, returnable. Courier en route, ETA 14 min.',
    photo: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=70&auto=format&fit=crop',
    contact: '+91 93110 88431',
  },
  {
    id: 'RN-2486',
    title: 'Chilled juice & milk crates (200 bottles)',
    category: 'Dairy & Beverages',
    quantityKg: 96,
    servings: 200,
    donorId: 'org-metromart',
    donor: 'MetroMart Logistics',
    donorType: 'Retail',
    location: 'Distribution Hub West, Bay 12',
    lat: 28.645, lng: 77.235,
    storage: 'Chilled (2–5°C)',
    createdAt: nowOffset(-4 * HOUR),
    expiresAt: nowOffset(6.5 * HOUR),
    windowHours: 8,
    status: 'completed',
    claimedBy: 'City Care Shelter',
    claimedByRole: 'ngo',
    isSos: false,
    verified: true,
    allergens: ['Dairy'],
    notes: 'Delivered and signed off. 200 bottles distributed across 3 shelters.',
    photo: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=70&auto=format&fit=crop',
    contact: '+91 98999 21345',
  },
  {
    id: 'RN-2487',
    title: 'Wedding buffet surplus — mixed vegetarian',
    category: 'Festive / Event Surplus',
    quantityKg: 140,
    servings: 320,
    donorId: 'org-omni',
    donor: 'OmniEvent Convention Centre',
    donorType: 'Event venue',
    location: 'Grand Hall 2, Expo District',
    lat: 28.617, lng: 77.246,
    storage: 'Hot holding (60°C+)',
    createdAt: nowOffset(-9 * MIN),
    expiresAt: nowOffset(2.2 * HOUR),
    windowHours: 3,
    status: 'available',
    claimedBy: null,
    isSos: false,
    verified: false,
    allergens: ['Dairy', 'Nuts'],
    notes: 'Awaiting hygiene verification — FSSAI record submitted 8 minutes ago.',
    photo: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=70&auto=format&fit=crop',
    contact: '+91 98180 33771',
  },
  {
    id: 'RN-2488',
    title: 'Packaged staples — rice, lentils, oil',
    category: 'Packaged & Dry Goods',
    quantityKg: 310,
    servings: 620,
    donorId: 'org-granary',
    donor: 'Granary Foods Distribution',
    donorType: 'Supplier',
    location: 'Cold Chain Park, Warehouse 4',
    lat: 28.585, lng: 77.243,
    storage: 'Ambient / dry store',
    createdAt: nowOffset(-6 * HOUR),
    expiresAt: nowOffset(70 * HOUR),
    windowHours: 72,
    status: 'available',
    claimedBy: null,
    isSos: false,
    verified: true,
    allergens: [],
    notes: 'Near-date packaged staples, 3 months shelf life remaining. Bulk pickup only.',
    photo: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=70&auto=format&fit=crop',
    contact: '+91 97110 55208',
  },
];

export const ORGANISATIONS = [
  { id: 'org-asha', name: 'Asha Hope Foundation', type: 'ngo', lat: 28.608, lng: 77.221, capacity: 400, verified: true, rating: 4.9, rescues: 312, area: 'Central District' },
  { id: 'org-citycare', name: 'City Care Shelter', type: 'ngo', lat: 28.632, lng: 77.238, capacity: 260, verified: true, rating: 4.8, rescues: 244, area: 'North Ring' },
  { id: 'org-annapurna', name: 'Annapurna Community Kitchen', type: 'ngo', lat: 28.596, lng: 77.207, capacity: 520, verified: true, rating: 5.0, rescues: 418, area: 'South Quarter' },
  { id: 'org-skyline', name: 'Skyline Grand Hotel', type: 'donor', lat: 28.6139, lng: 77.209, capacity: 0, verified: true, rating: 4.7, rescues: 96, area: 'Cyber Hub' },
  { id: 'org-cyberbake', name: 'CyberBake Central Kitchen', type: 'donor', lat: 28.625, lng: 77.218, capacity: 0, verified: true, rating: 4.6, rescues: 141, area: 'Tech Corridor' },
  { id: 'org-metromart', name: 'MetroMart Logistics', type: 'donor', lat: 28.645, lng: 77.235, capacity: 0, verified: true, rating: 4.5, rescues: 208, area: 'West Hub' },
];

export const VOLUNTEERS = [
  { id: 'vol-07', name: 'Meera Kulkarni', vehicle: 'Insulated scooter', lat: 28.599, lng: 77.2, status: 'on_route', trips: 184, rating: 4.9, etaMin: 14 },
  { id: 'vol-12', name: 'Arjun Nair', vehicle: 'Refrigerated van', lat: 28.628, lng: 77.212, status: 'available', trips: 96, rating: 4.8, etaMin: null },
  { id: 'vol-19', name: 'Farah Siddiqui', vehicle: 'Cargo bicycle', lat: 28.612, lng: 77.233, status: 'available', trips: 57, rating: 5.0, etaMin: null },
  { id: 'vol-23', name: 'Dev Prakash', vehicle: 'Compact car', lat: 28.641, lng: 77.198, status: 'off_duty', trips: 132, rating: 4.7, etaMin: null },
];

export const NOTIFICATIONS = [
  { id: 'ntf-1', type: 'sos', title: 'SOS beacon raised', message: 'CyberBake Central posted 150 trays expiring in 33 minutes.', createdAt: nowOffset(-4 * MIN), read: false },
  { id: 'ntf-2', type: 'success', title: 'Rescue claimed', message: 'Asha Hope Foundation accepted RN-2483 from TechHub Campus Kitchen.', createdAt: nowOffset(-13 * MIN), read: false },
  { id: 'ntf-3', type: 'info', title: 'Courier dispatched', message: 'Meera K. is en route to Apex Campus Mess #2 — ETA 14 min.', createdAt: nowOffset(-26 * MIN), read: false },
  { id: 'ntf-4', type: 'warn', title: 'Verification pending', message: 'OmniEvent Convention Centre submitted an FSSAI licence for review.', createdAt: nowOffset(-52 * MIN), read: true },
  { id: 'ntf-5', type: 'success', title: 'Delivery confirmed', message: '200 bottles delivered to City Care Shelter — 200 servings logged.', createdAt: nowOffset(-2.4 * HOUR), read: true },
];

export const VERIFICATIONS = [
  { id: 'ver-101', name: 'OmniEvent Convention Centre', role: 'Event venue / Donor', licence: 'FSSAI-883920192', submittedAt: nowOffset(-8 * MIN), status: 'pending', contact: 'ops@omnievent.example' },
  { id: 'ver-102', name: 'Green Harvest Shelter', role: 'NGO / Shelter', licence: 'NGO-REG-2026-99', submittedAt: nowOffset(-3.1 * HOUR), status: 'pending', contact: 'admin@greenharvest.example' },
  { id: 'ver-103', name: 'Saffron Catering Co.', role: 'Caterer / Donor', licence: 'FSSAI-441092831', submittedAt: nowOffset(-27 * HOUR), status: 'pending', contact: 'hello@saffroncater.example' },
  { id: 'ver-104', name: 'Riverside Night Shelter', role: 'NGO / Shelter', licence: 'NGO-REG-2025-41', submittedAt: nowOffset(-49 * HOUR), status: 'approved', contact: 'care@riverside.example' },
];

export const IMPACT_DAILY = [
  { day: 'Mon', meals: 1240, kg: 520, rescues: 18 },
  { day: 'Tue', meals: 1580, kg: 640, rescues: 22 },
  { day: 'Wed', meals: 1180, kg: 470, rescues: 16 },
  { day: 'Thu', meals: 1920, kg: 780, rescues: 27 },
  { day: 'Fri', meals: 2340, kg: 960, rescues: 33 },
  { day: 'Sat', meals: 2980, kg: 1220, rescues: 41 },
  { day: 'Sun', meals: 2610, kg: 1080, rescues: 36 },
];

export const ACTIVITY = [
  { id: 'act-1', at: nowOffset(-2 * MIN), kind: 'sos', text: 'SOS beacon raised by CyberBake Central Kitchen (150 trays).' },
  { id: 'act-2', at: nowOffset(-7 * MIN), kind: 'post', text: 'OmniEvent Convention Centre posted 140 kg of festive surplus.' },
  { id: 'act-3', at: nowOffset(-14 * MIN), kind: 'claim', text: 'Asha Hope Foundation claimed RN-2483 (90 servings).' },
  { id: 'act-4', at: nowOffset(-21 * MIN), kind: 'transit', text: 'Meera K. picked up RN-2485 from Apex Campus Mess #2.' },
  { id: 'act-5', at: nowOffset(-38 * MIN), kind: 'done', text: 'City Care Shelter confirmed delivery of RN-2486 (200 servings).' },
  { id: 'act-6', at: nowOffset(-55 * MIN), kind: 'verify', text: 'Riverside Night Shelter approved by coordinator M. Rao.' },
];

export const TESTIMONIALS = [
  { quote: 'We used to bin 60 kilos after every banquet. Now a shelter collects it before the kitchen is even closed.', name: 'Priya Raghavan', role: 'Executive Chef, Skyline Grand', avatar: 'PR' },
  { quote: 'The countdown is the whole product. We see exactly what is still safe, and we move on it.', name: 'Imran Qureshi', role: 'Operations Lead, Asha Hope Foundation', avatar: 'IQ' },
];

/** Aggregate snapshot used on the landing page before the live store loads. */
export const HEADLINE_STATS = {
  mealsServed: 138420,
  kgRescued: 56180,
  co2Tonnes: 149,
  partnerOrgs: 312,
  avgResponseMin: 27,
  cities: 9,
};

export const SEED_BUNDLE = {
  donations: DONATIONS,
  organisations: ORGANISATIONS,
  volunteers: VOLUNTEERS,
  notifications: NOTIFICATIONS,
  verifications: VERIFICATIONS,
  impact_daily: IMPACT_DAILY,
  activity: ACTIVITY,
};

export default SEED_BUNDLE;
