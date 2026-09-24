// RESCUE-NET 2099 Initial Seed Data & Mock Store

const INITIAL_DONATIONS = [
    {
        id: "RES-9901",
        title: "Grand Banquet Buffet Surplus - Gourmet Prepared",
        category: "Cooked Meals",
        quantity: "85 kg (approx 180 servings)",
        donor: "Skyline Grand Hotel & Resort",
        donorType: "Hotel",
        location: "Sector 7, Metro Cyber Hub, Tower A",
        lat: 28.6139,
        lng: 77.2090,
        expiryHours: 2,
        createdAt: Date.now() - (15 * 60 * 1000), // 15 mins ago
        expiryTimestamp: Date.now() + (1.75 * 60 * 60 * 1000), // ~1.75 hours left
        storage: "Thermal Heated",
        notes: "High quality cooked biryani, curries & bread. Packed in food-grade thermal containers at Dock 4.",
        status: "Available", // Available, Accepted, Picked Up, Completed
        claimedBy: null,
        claimedByRole: null,
        isSos: false,
        verified: true
    },
    {
        id: "RES-9902",
        title: "CRITICAL SOS: 150 Fresh Bakery & Sandwich Trays",
        category: "Bakery & Pastry",
        quantity: "150 Trays (approx 300 meals)",
        donor: "CyberBake Central Kitchen",
        donorType: "Bakery",
        location: "Block 4, Tech Corridor Gate 2",
        lat: 28.6250,
        lng: 77.2180,
        expiryHours: 1,
        createdAt: Date.now() - (30 * 60 * 1000),
        expiryTimestamp: Date.now() + (0.5 * 60 * 60 * 1000), // 30 mins left!
        storage: "Room Temperature Standard",
        notes: "Urgently requires pick up for evening homeless shelter distribution! Fully packaged sandwiches and croissants.",
        status: "Available",
        claimedBy: null,
        claimedByRole: null,
        isSos: true,
        verified: true
    },
    {
        id: "RES-9903",
        title: "Corporate Tech Cafeteria Surplus Lunch Packets",
        category: "Cooked Meals",
        quantity: "40 kg (approx 90 meals)",
        donor: "TechHub Central Kitchen",
        donorType: "Corporate Kitchen",
        location: "Sector 3, Innovation Park",
        lat: 28.6020,
        lng: 77.2290,
        expiryHours: 4,
        createdAt: Date.now() - (45 * 60 * 1000),
        expiryTimestamp: Date.now() + (3.25 * 60 * 60 * 1000),
        storage: "Refrigerated Required",
        notes: "Pre-sealed meal trays (Rice, Dal, Veggies). Stored in cold storage unit B.",
        status: "Accepted",
        claimedBy: "Asha Hope Foundation NGO",
        claimedByRole: "NGO / Food Bank",
        isSos: false,
        verified: true
    },
    {
        id: "RES-9904",
        title: "Fresh Organic Produce & Fruit Surplus",
        category: "Fresh Produce",
        quantity: "120 kg Fresh Vegetables",
        donor: "BioAgro Wholesale Market",
        donorType: "Supplier",
        location: "Wholesale Terminal 9",
        lat: 28.6380,
        lng: 77.2010,
        expiryHours: 24,
        createdAt: Date.now() - (2 * 60 * 60 * 1000),
        expiryTimestamp: Date.now() + (22 * 60 * 60 * 1000),
        storage: "Room Temperature Standard",
        notes: "Slight cosmetic blemishes on tomatoes, apples, and spinach. Excellent nutritional quality.",
        status: "Available",
        claimedBy: null,
        claimedByRole: null,
        isSos: false,
        verified: true
    },
    {
        id: "RES-9905",
        title: "Hostel Mess Surplus Dinner - Rice & Lentil Curry",
        category: "Cooked Meals",
        quantity: "35 kg (approx 70 meals)",
        donor: "Apex Campus Hostel Mess #2",
        donorType: "Hostel",
        location: "University Sector, Gate 5",
        lat: 28.5910,
        lng: 77.1950,
        expiryHours: 3,
        createdAt: Date.now() - (20 * 60 * 1000),
        expiryTimestamp: Date.now() + (2.6 * 60 * 60 * 1000),
        storage: "Thermal Heated",
        notes: "Freshly prepared vegetarian meals in stainless steel containers.",
        status: "Picked Up",
        claimedBy: "Volunteer Drone Dispatch Unit 7",
        claimedByRole: "Volunteer Courier",
        isSos: false,
        verified: true
    },
    {
        id: "RES-9906",
        title: "Sealed Juice & Dairy Surplus Crate",
        category: "Beverages",
        quantity: "200 Bottles (Fresh Juice & Milk)",
        donor: "Metro Supermart Logistics",
        donorType: "Supermarket",
        location: "Distribution Hub West",
        lat: 28.6450,
        lng: 77.2350,
        expiryHours: 8,
        createdAt: Date.now() - (60 * 60 * 1000),
        expiryTimestamp: Date.now() + (7 * 60 * 60 * 1000),
        storage: "Refrigerated Required",
        notes: "Pasteurized juice bottles expiring in 48h. Chilled and ready for immediate pick up.",
        status: "Completed",
        claimedBy: "City Care Shelter",
        claimedByRole: "NGO / Food Bank",
        isSos: false,
        verified: true
    }
];

const INITIAL_VERIFICATIONS = [
    {
        id: "VER-101",
        name: "OmniEvent Convention Center",
        role: "Event Organizer / Donor",
        license: "FSSAI-883920192",
        status: "Pending Verification"
    },
    {
        id: "VER-102",
        name: "Green Harvest Shelter NGO",
        role: "NGO / Shelter",
        license: "NGO-REG-2026-99",
        status: "Pending Verification"
    },
    {
        id: "VER-103",
        name: "CyberCatering Services",
        role: "Restaurant / Donor",
        license: "FSSAI-441092831",
        status: "Pending Verification"
    }
];

const INITIAL_NOTIFICATIONS = [
    {
        id: "notif-1",
        title: "SOS ALERT TRANSMITTED",
        message: "CRITICAL: CyberBake Central posted 150 bakery trays expiring in 30 mins!",
        time: "5 mins ago",
        type: "sos",
        read: false
    },
    {
        id: "notif-2",
        title: "Donation Claimed",
        message: "Asha Hope Foundation NGO accepted RES-9903 from TechHub Kitchen.",
        time: "12 mins ago",
        type: "info",
        read: false
    },
    {
        id: "notif-3",
        title: "System Synchronization",
        message: "Autonomous satellite radar vectoring active. 6 nodes online.",
        time: "30 mins ago",
        type: "system",
        read: true
    }
];
