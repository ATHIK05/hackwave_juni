/**
 * RESCUE-NET 2099 - Main Application Controller
 * High-Tech Autonomous Surplus Food Rescue Platform
 */

class RescueNetApp {
    constructor() {
        // State management
        this.donations = this.loadLocalStorage('rescue_donations', INITIAL_DONATIONS);
        this.verifications = this.loadLocalStorage('rescue_verifications', INITIAL_VERIFICATIONS);
        this.notifications = this.loadLocalStorage('rescue_notifs', INITIAL_NOTIFICATIONS);
        this.currentRole = 'donor'; // donor, ngo, volunteer, admin
        this.activeTab = 'tab-dashboard';
        this.soundEnabled = true;
        this.map = null;
        this.markersGroup = null;
        this.audioCtx = null;

        // Initialize components
        this.initAudioContext();
        this.initCanvasBackground();
        this.initNavigation();
        this.checkUserSession();
        this.initNotifications();
        this.initMap();
        this.initDonationGrid();
        this.initUrgentWatchlist();
        this.initFormHandlers();
        this.initAdminHUD();
        this.startLiveTimers();
        this.updateStats();
    }

    /* -------------------------------------------------------------
       1. LOCAL STORAGE & UTILS
    ------------------------------------------------------------- */
    loadLocalStorage(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.error("Storage error:", e);
            return fallback;
        }
    }

    saveLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("Storage save error:", e);
        }
    }

    /* -------------------------------------------------------------
       2. WEB AUDIO API SYNTHESIZER (Sci-Fi Audio FX)
    ------------------------------------------------------------- */
    initAudioContext() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            this.audioCtx = new AudioCtx();
        }
    }

    playSound(type = 'beep') {
        if (!this.soundEnabled || !this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'beep') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'chime') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'sos') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.linearRampToValueAtTime(880, now + 0.2);
                osc.frequency.linearRampToValueAtTime(440, now + 0.4);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            }
        } catch (e) {
            console.log('Audio playback prevented:', e);
        }
    }

    /* -------------------------------------------------------------
       3. BACKGROUND PARTICLES & GRID CANVAS
    ------------------------------------------------------------- */
    initCanvasBackground() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        // Generate elegant ambient glowing nodes
        const particles = Array.from({ length: 35 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 2 + 1.5,
            color: Math.random() > 0.5 ? '16, 185, 129' : '56, 189, 248',
            alpha: Math.random() * 0.4 + 0.15
        }));

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw Floating Soft Ambient Particles & Subtle Connections
            particles.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
                ctx.fill();

                // Soft subtle constellation lines
                for (let j = idx + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 140) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(${p.color}, ${0.1 * (1 - dist / 140)})`;
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    /* -------------------------------------------------------------
       4. NAVIGATION & ROLE SWITCHING
    ------------------------------------------------------------- */
    initNavigation() {
        // Tab Buttons
        const tabBtns = document.querySelectorAll('.nav-link');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Role Selector
        const roleSelect = document.getElementById('role-select');
        if (roleSelect) {
            roleSelect.value = this.currentRole;
            roleSelect.addEventListener('change', (e) => {
                this.currentRole = e.target.value;
                this.playSound('chime');
                this.showToast(`Role Switch: Authorized as ${this.currentRole.toUpperCase()}`, 'info');
                this.renderDonationGrid();
            });
        }

        // Sound Toggle
        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                soundBtn.innerHTML = this.soundEnabled
                    ? `<i class="fa-solid fa-volume-high"></i>`
                    : `<i class="fa-solid fa-volume-xmark" style="color:var(--text-muted)"></i>`;
                this.showToast(`Audio FX: ${this.soundEnabled ? 'ENABLED' : 'MUTED'}`, 'system');
            });
        }

        // SOS Header Button
        const sosBtn = document.getElementById('sos-trigger-btn');
        if (sosBtn) {
            sosBtn.addEventListener('click', () => {
                this.openSosModal();
            });
        }

        // SOS Banner Dismiss
        const sosDismissBtn = document.getElementById('sos-dismiss-btn');
        if (sosDismissBtn) {
            sosDismissBtn.addEventListener('click', () => {
                document.getElementById('sos-alert-banner').classList.add('hidden');
            });
        }
    }

    checkUserSession() {
        try {
            const rawUser = localStorage.getItem('rescue_user');
            if (rawUser) {
                const user = JSON.parse(rawUser);
                const loginBtn = document.getElementById('nav-login-btn');
                const profileBadge = document.getElementById('nav-profile-badge');
                const userNameElem = document.getElementById('nav-user-name');

                if (loginBtn && profileBadge) {
                    loginBtn.classList.add('hidden');
                    profileBadge.classList.remove('hidden');
                    if (userNameElem) userNameElem.innerText = user.name || 'Verified Agent';
                }

                if (user.role) {
                    const roleSelect = document.getElementById('role-select');
                    if (roleSelect) {
                        roleSelect.value = user.role;
                        this.currentRole = user.role;
                    }
                }
            }
        } catch (e) {
            console.error("User session check failed:", e);
        }
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        this.playSound('beep');

        document.querySelectorAll('.nav-link').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.toggle('active', tab.id === tabId);
        });

        if (tabId === 'tab-dashboard' && this.map) {
            setTimeout(() => this.map.invalidateSize(), 200);
        }
    }

    /* -------------------------------------------------------------
       5. NOTIFICATIONS ENGINE & DROPDOWN
    ------------------------------------------------------------- */
    initNotifications() {
        const bellBtn = document.getElementById('notif-bell-btn');
        const notifDropdown = document.getElementById('notif-dropdown');
        const clearBtn = document.getElementById('clear-notifs-btn');

        if (bellBtn && notifDropdown) {
            bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('hidden');
                this.playSound('beep');
            });

            document.addEventListener('click', () => {
                notifDropdown.classList.add('hidden');
            });

            notifDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.notifications = [];
                this.saveLocalStorage('rescue_notifs', this.notifications);
                this.renderNotifications();
            });
        }

        this.renderNotifications();
    }

    renderNotifications() {
        const listContainer = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (!listContainer || !badge) return;

        const unreadCount = this.notifications.filter(n => !n.read).length;
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `<div class="p-3 text-center text-muted font-mono" style="padding:15px; text-align:center;">No pending transmissions</div>`;
            return;
        }

        listContainer.innerHTML = this.notifications.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'} type-${n.type}">
                <div class="notif-item-title">${n.title}</div>
                <div class="notif-item-msg">${n.message}</div>
                <div class="notif-item-time"><i class="fa-solid fa-clock"></i> ${n.time}</div>
            </div>
        `).join('');
    }

    showToast(message, type = 'info', title = 'SYSTEM NOTIFICATION') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `cyber-toast ${type === 'sos' ? 'toast-sos' : ''}`;

        const iconMap = {
            info: 'fa-solid fa-circle-info',
            sos: 'fa-solid fa-triangle-exclamation',
            success: 'fa-solid fa-circle-check',
            system: 'fa-solid fa-tower-broadcast'
        };

        toast.innerHTML = `
            <div class="toast-icon"><i class="${iconMap[type] || iconMap.info}"></i></div>
            <div class="toast-body">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);
        this.playSound(type === 'sos' ? 'sos' : 'chime');

        // Add to persistent notification dropdown
        const newNotif = {
            id: 'notif-' + Date.now(),
            title: title,
            message: message,
            time: 'Just now',
            type: type,
            read: false
        };
        this.notifications.unshift(newNotif);
        this.saveLocalStorage('rescue_notifs', this.notifications);
        this.renderNotifications();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    triggerDemoNotif() {
        const demoMessages = [
            { title: "NEW SURPLUS POSTED", msg: "CyberDiner logged 30kg excess buffet food in Sector 2.", type: "info" },
            { title: "RESCUE DISPATCH EN ROUTE", msg: "Volunteer Team Delta accepted pickup for RES-9901.", type: "success" },
            { title: "EXPIRY WARNING", msg: "Donation RES-9902 expires in under 20 minutes!", type: "sos" }
        ];
        const random = demoMessages[Math.floor(Math.random() * demoMessages.length)];
        this.showToast(random.msg, random.type, random.title);
    }

    /* -------------------------------------------------------------
       6. LEAFLET TACTICAL RADAR MAP
    ------------------------------------------------------------- */
    initMap() {
        const mapEl = document.getElementById('map');
        if (!mapEl || typeof L === 'undefined') return;

        // Center on Delhi Cyber City coordinates
        this.map = L.map('map', { zoomControl: false }).setView([28.6139, 77.2090], 13);
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Dark Matter Futuristic Tile Layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; Rescue-Net 2099',
            maxZoom: 19
        }).addTo(this.map);

        this.markersGroup = L.layerGroup().addTo(this.map);
        this.renderMapMarkers();

        const recenterBtn = document.getElementById('recenter-map-btn');
        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => {
                this.map.setView([28.6139, 77.2090], 13);
                this.playSound('beep');
            });
        }
    }

    renderMapMarkers() {
        if (!this.map || !this.markersGroup) return;
        this.markersGroup.clearLayers();

        let donorCnt = 0, ngoCnt = 0, activeCnt = 0, sosCnt = 0;

        this.donations.forEach(item => {
            if (item.isSos) sosCnt++;
            else if (item.status === 'Available') donorCnt++;
            else if (item.status === 'Accepted' || item.status === 'Picked Up') activeCnt++;

            let color = item.isSos ? '#ff0055' : (item.status === 'Available' ? '#00f3ff' : '#ffb700');
            if (item.status === 'Completed') color = '#666666';

            // Custom glowing SVG marker
            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `
                    <div style="
                        width: 24px;
                        height: 24px;
                        background: ${color};
                        border: 2px solid #ffffff;
                        border-radius: 50%;
                        box-shadow: 0 0 14px ${color};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #000;
                        font-size: 11px;
                    ">
                        <i class="${item.isSos ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-utensils'}"></i>
                    </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([item.lat, item.lng], { icon: customIcon });

            marker.bindPopup(`
                <div style="font-family:'Rajdhani',sans-serif; color:#050811; padding:4px;">
                    <strong style="color:${item.isSos ? '#ff0055' : '#00a3cc'}; font-size:14px;">${item.title}</strong><br/>
                    <b>Donor:</b> ${item.donor}<br/>
                    <b>Quantity:</b> ${item.quantity}<br/>
                    <b>Status:</b> ${item.status}<br/>
                    <button onclick="app.showDonationDetails('${item.id}')" style="margin-top:6px; background:#050811; color:#00f3ff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">View Listing</button>
                </div>
            `);

            this.markersGroup.addLayer(marker);
        });

        // NGO Hub Marker
        const ngoHubIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `<div style="width:22px; height:22px; background:#00ff9d; border:2px solid #fff; border-radius:4px; box-shadow:0 0 12px #00ff9d; display:flex; align-items:center; justify-content:center; color:#000; font-size:10px;"><i class="fa-solid fa-hand-holding-heart"></i></div>`,
            iconSize: [22, 22]
        });
        const ngoMarker = L.marker([28.6180, 77.2250], { icon: ngoHubIcon });
        ngoMarker.bindPopup(`<b>Asha Hope Foundation NGO Command</b><br/>Rapid Food Rescue Dispatch Unit`);
        this.markersGroup.addLayer(ngoMarker);
        ngoCnt = 1;

        // Update map counters
        document.getElementById('map-donor-cnt').innerText = donorCnt;
        document.getElementById('map-ngo-cnt').innerText = ngoCnt;
        document.getElementById('map-active-cnt').innerText = activeCnt;
        document.getElementById('map-sos-cnt').innerText = sosCnt;
    }

    /* -------------------------------------------------------------
       7. DONATION LISTINGS & STATUS WORKFLOW
    ------------------------------------------------------------- */
    initDonationGrid() {
        const searchInput = document.getElementById('search-input');
        const filterCat = document.getElementById('filter-category');
        const filterStatus = document.getElementById('filter-status');
        const filterUrgency = document.getElementById('filter-urgency');
        const resetBtn = document.getElementById('reset-filters-btn');

        if (searchInput) searchInput.addEventListener('input', () => this.renderDonationGrid());
        if (filterCat) filterCat.addEventListener('change', () => this.renderDonationGrid());
        if (filterStatus) filterStatus.addEventListener('change', () => this.renderDonationGrid());
        if (filterUrgency) filterUrgency.addEventListener('change', () => this.renderDonationGrid());

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (filterCat) filterCat.value = 'all';
                if (filterStatus) filterStatus.value = 'all';
                if (filterUrgency) filterUrgency.value = 'all';
                this.renderDonationGrid();
            });
        }

        this.renderDonationGrid();
    }

    renderDonationGrid() {
        const grid = document.getElementById('donations-grid');
        if (!grid) return;

        const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase();
        const catVal = document.getElementById('filter-category')?.value || 'all';
        const statusVal = document.getElementById('filter-status')?.value || 'all';
        const urgencyVal = document.getElementById('filter-urgency')?.value || 'all';

        const filtered = this.donations.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchVal) ||
                item.donor.toLowerCase().includes(searchVal) ||
                item.location.toLowerCase().includes(searchVal);

            const matchesCat = catVal === 'all' || item.category === catVal;
            const matchesStatus = statusVal === 'all' || item.status === statusVal;

            let matchesUrgency = true;
            const hoursLeft = (item.expiryTimestamp - Date.now()) / (1000 * 60 * 60);
            if (urgencyVal === 'sos') matchesUrgency = item.isSos;
            else if (urgencyVal === 'critical') matchesUrgency = hoursLeft <= 1;

            return matchesSearch && matchesCat && matchesStatus && matchesUrgency;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-2 text-center p-5 text-muted font-mono" style="padding:40px; grid-column: 1 / -1; text-align:center;">No surplus listings match your radar parameters.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(item => this.createDonationCardHTML(item)).join('');
    }

    createDonationCardHTML(item) {
        const hoursLeft = Math.max(0, (item.expiryTimestamp - Date.now()) / (1000 * 60 * 60));
        let timerClass = 'timer-count';
        if (hoursLeft <= 1 || item.isSos) timerClass += ' critical';
        else if (hoursLeft <= 2) timerClass += ' urgent';

        const displayTime = this.formatTimeLeft(item.expiryTimestamp);

        // Action button based on current logged-in role
        let actionBtnHTML = '';
        if (item.status === 'Available') {
            if (this.currentRole === 'ngo' || this.currentRole === 'volunteer' || this.currentRole === 'admin') {
                actionBtnHTML = `<button class="cyber-btn primary-btn" onclick="app.claimDonation('${item.id}')"><i class="fa-solid fa-hand-holding-heart"></i> CLAIM SURPLUS</button>`;
            } else {
                actionBtnHTML = `<button class="cyber-btn secondary-btn" onclick="app.showDonationDetails('${item.id}')"><i class="fa-solid fa-eye"></i> VIEW LISTING</button>`;
            }
        } else if (item.status === 'Accepted') {
            if (this.currentRole === 'volunteer' || this.currentRole === 'ngo' || this.currentRole === 'admin') {
                actionBtnHTML = `<button class="cyber-btn primary-btn" onclick="app.updateStatus('${item.id}', 'Picked Up')"><i class="fa-solid fa-truck-ramp-box"></i> MARK PICKED UP</button>`;
            } else {
                actionBtnHTML = `<span class="text-xs text-muted font-mono"><i class="fa-solid fa-user-check"></i> Claimed by ${item.claimedBy || 'NGO'}</span>`;
            }
        } else if (item.status === 'Picked Up') {
            if (this.currentRole === 'volunteer' || this.currentRole === 'admin') {
                actionBtnHTML = `<button class="cyber-btn primary-btn" onclick="app.updateStatus('${item.id}', 'Completed')"><i class="fa-solid fa-check-double"></i> CONFIRM DELIVERED</button>`;
            } else {
                actionBtnHTML = `<span class="text-xs text-muted font-mono"><i class="fa-solid fa-truck-fast"></i> En Route to Shelter</span>`;
            }
        } else {
            actionBtnHTML = `<button class="cyber-btn secondary-btn" disabled><i class="fa-solid fa-circle-check"></i> RESCUE COMPLETED</button>`;
        }

        return `
            <div class="donation-card ${item.isSos ? 'sos-card' : ''}">
                <div>
                    <div class="card-header-badge">
                        <span class="cat-badge">${item.category}</span>
                        <span class="status-badge status-${item.status.toLowerCase().replace(/\s+/g, '')}">${item.status}</span>
                    </div>

                    ${item.isSos ? `<div style="font-family:var(--font-heading); font-size:11px; color:var(--red); font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-triangle-exclamation"></i> CRITICAL SOS DISPATCH</div>` : ''}

                    <h3 class="card-title">${item.title}</h3>

                    <div class="card-meta">
                        <div class="meta-row"><i class="fa-solid fa-building"></i> <span><strong>Donor:</strong> ${item.donor}</span></div>
                        <div class="meta-row"><i class="fa-solid fa-scale-balanced"></i> <span><strong>Quantity:</strong> ${item.quantity}</span></div>
                        <div class="meta-row"><i class="fa-solid fa-location-dot"></i> <span>${item.location}</span></div>
                        <div class="meta-row"><i class="fa-solid fa-snowflake"></i> <span>${item.storage || 'Room Temp'}</span></div>
                    </div>
                </div>

                <div>
                    <div class="card-timer-bar">
                        <span><i class="fa-solid fa-stopwatch"></i> EXPIRY WINDOW:</span>
                        <span class="${timerClass}" id="timer-${item.id}">${displayTime}</span>
                    </div>

                    <div class="card-actions">
                        ${actionBtnHTML}
                    </div>
                </div>
            </div>
        `;
    }

    claimDonation(id) {
        const item = this.donations.find(d => d.id === id);
        if (!item) return;

        item.status = 'Accepted';
        item.claimedBy = this.currentRole === 'ngo' ? 'Asha Hope Foundation NGO' : 'Volunteer Courier Vector 4';
        item.claimedByRole = this.currentRole;

        this.saveLocalStorage('rescue_donations', this.donations);
        this.renderDonationGrid();
        this.renderMapMarkers();
        this.updateStats();

        this.showToast(`Claim successful for ${item.title}. Route assigned to ${item.claimedBy}`, 'success', 'SURPLUS CLAIMED');
        this.logDispatchActivity(`CLAIMED: ${item.claimedBy} accepted ${item.title}`);
    }

    updateStatus(id, newStatus) {
        const item = this.donations.find(d => d.id === id);
        if (!item) return;

        item.status = newStatus;
        this.saveLocalStorage('rescue_donations', this.donations);
        this.renderDonationGrid();
        this.renderMapMarkers();
        this.updateStats();

        this.showToast(`Status updated to [${newStatus.toUpperCase()}] for ${item.title}`, 'info', 'STATUS PROGRESSION');
        this.logDispatchActivity(`STATUS: ${item.title} moved to [${newStatus}]`);
    }

    showDonationDetails(id) {
        const item = this.donations.find(d => d.id === id);
        if (!item) return;

        const content = document.getElementById('modal-detail-content');
        document.getElementById('modal-detail-title').innerText = item.title;

        content.innerHTML = `
            <div style="font-size:14px; display:flex; flex-direction:column; gap:10px;">
                <p><strong>Listing ID:</strong> <span class="font-mono text-cyan">${item.id}</span></p>
                <p><strong>Donor Organization:</strong> ${item.donor} (${item.donorType})</p>
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Quantity:</strong> ${item.quantity}</p>
                <p><strong>Pickup Address:</strong> ${item.location}</p>
                <p><strong>Storage Condition:</strong> ${item.storage}</p>
                <p><strong>Current Status:</strong> <span class="text-green">${item.status}</span></p>
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; border-left:3px solid var(--cyan);">
                    <strong>Pickup Notes:</strong><br/>
                    ${item.notes || 'No special notes provided.'}
                </div>
                <div style="margin-top:10px; display:flex; gap:10px; justify-content:flex-end;">
                    <button class="cyber-btn secondary-btn" onclick="app.closeDetailsModal()">CLOSE</button>
                    ${item.status === 'Available' ? `<button class="cyber-btn primary-btn" onclick="app.claimDonation('${item.id}'); app.closeDetailsModal();">CLAIM SURPLUS</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('details-modal').classList.remove('hidden');
    }

    closeDetailsModal() {
        document.getElementById('details-modal').classList.add('hidden');
    }

    /* -------------------------------------------------------------
       8. URGENT EXPIRY WATCHLIST & TIMERS
    ------------------------------------------------------------- */
    initUrgentWatchlist() {
        this.renderUrgentWatchlist();
    }

    renderUrgentWatchlist() {
        const container = document.getElementById('urgent-watchlist');
        if (!container) return;

        // Filter items expiring in < 2 hours and not completed
        const urgent = this.donations.filter(item => {
            const hoursLeft = (item.expiryTimestamp - Date.now()) / (1000 * 60 * 60);
            return hoursLeft > 0 && hoursLeft <= 2 && item.status !== 'Completed';
        });

        if (urgent.length === 0) {
            container.innerHTML = `<div class="p-2 text-muted text-xs font-mono">No critical expirations registered on watchlist.</div>`;
            return;
        }

        container.innerHTML = urgent.map(item => `
            <div class="urgent-item" onclick="app.showDonationDetails('${item.id}')" style="cursor:pointer;">
                <div class="urgent-info">
                    <h4>${item.title.substring(0, 32)}...</h4>
                    <p><i class="fa-solid fa-building"></i> ${item.donor}</p>
                </div>
                <div class="time-left">${this.formatTimeLeft(item.expiryTimestamp)}</div>
            </div>
        `).join('');
    }

    startLiveTimers() {
        setInterval(() => {
            this.donations.forEach(item => {
                const el = document.getElementById(`timer-${item.id}`);
                if (el) {
                    el.innerText = this.formatTimeLeft(item.expiryTimestamp);
                }
            });
            this.renderUrgentWatchlist();
        }, 1000);
    }

    formatTimeLeft(expiryTimestamp) {
        const diff = expiryTimestamp - Date.now();
        if (diff <= 0) return 'EXPIRED';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        return `${mins}m ${secs}s`;
    }

    /* -------------------------------------------------------------
       9. FORM HANDLERS (New Donation & SOS Emergency)
    ------------------------------------------------------------- */
    initFormHandlers() {
        // New Donation Form
        const postForm = document.getElementById('post-donation-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewDonation();
            });
        }

        // SOS Form Submit
        const sosForm = document.getElementById('sos-form');
        if (sosForm) {
            sosForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.broadcastSosFromForm();
            });
        }
    }

    createNewDonation() {
        const title = document.getElementById('post-title').value;
        const category = document.getElementById('post-category').value;
        const quantity = document.getElementById('post-quantity').value;
        const donor = document.getElementById('post-donor').value;
        const location = document.getElementById('post-location').value;
        const expiryHours = parseFloat(document.getElementById('post-expiry-hours').value);
        const storage = document.getElementById('post-storage').value;
        const notes = document.getElementById('post-notes').value;
        const isSos = document.getElementById('post-is-sos').checked;

        // Generate near central coordinates with small random offset
        const lat = 28.6139 + (Math.random() - 0.5) * 0.05;
        const lng = 77.2090 + (Math.random() - 0.5) * 0.05;

        const newDonation = {
            id: 'RES-' + Math.floor(1000 + Math.random() * 9000),
            title,
            category,
            quantity,
            donor,
            donorType: 'Verified Partner',
            location,
            lat,
            lng,
            expiryHours,
            createdAt: Date.now(),
            expiryTimestamp: Date.now() + (expiryHours * 60 * 60 * 1000),
            storage,
            notes,
            status: 'Available',
            claimedBy: null,
            claimedByRole: null,
            isSos,
            verified: true
        };

        this.donations.unshift(newDonation);
        this.saveLocalStorage('rescue_donations', this.donations);

        this.renderDonationGrid();
        this.renderMapMarkers();
        this.updateStats();

        document.getElementById('post-donation-form').reset();
        this.switchTab('tab-browse');

        if (isSos) {
            this.triggerSosAlertBanner(newDonation);
        } else {
            this.showToast(`New surplus posted: ${title}`, 'success', 'TRANSMISSION SENT');
        }

        this.logDispatchActivity(`POSTED: ${donor} logged ${title}`);
    }

    /* -------------------------------------------------------------
       10. SOS EMERGENCY PROTOCOL & MODALS
    ------------------------------------------------------------- */
    openSosModal() {
        document.getElementById('sos-modal').classList.remove('hidden');
        this.playSound('sos');
    }

    closeSosModal() {
        document.getElementById('sos-modal').classList.add('hidden');
    }

    broadcastSosFromForm() {
        const source = document.getElementById('sos-source').value;
        const food = document.getElementById('sos-food').value;
        const location = document.getElementById('sos-location').value;
        const timeWindow = document.getElementById('sos-time').value;

        const hoursMap = { "30 mins": 0.5, "1 hour": 1.0, "2 hours": 2.0 };
        const hours = hoursMap[timeWindow] || 1.0;

        const sosItem = {
            id: 'RES-SOS-' + Math.floor(100 + Math.random() * 900),
            title: `CRITICAL SOS: ${food}`,
            category: 'Cooked Meals',
            quantity: food,
            donor: source,
            donorType: 'Emergency Beacon',
            location: location,
            lat: 28.6200 + (Math.random() - 0.5) * 0.03,
            lng: 77.2150 + (Math.random() - 0.5) * 0.03,
            expiryHours: hours,
            createdAt: Date.now(),
            expiryTimestamp: Date.now() + (hours * 60 * 60 * 1000),
            storage: 'Keep Hot / Immediate Dispatch',
            notes: `URGENT SOS DISPATCH: High perishable volume requiring immediate volunteer vectors.`,
            status: 'Available',
            claimedBy: null,
            claimedByRole: null,
            isSos: true,
            verified: true
        };

        this.donations.unshift(sosItem);
        this.saveLocalStorage('rescue_donations', this.donations);

        this.closeSosModal();
        this.renderDonationGrid();
        this.renderMapMarkers();
        this.updateStats();

        this.triggerSosAlertBanner(sosItem);
        this.logDispatchActivity(`CRITICAL SOS: ${source} triggered emergency beacon for ${food}`);
    }

    triggerSosAlertBanner(item) {
        const banner = document.getElementById('sos-alert-banner');
        const msg = document.getElementById('sos-banner-msg');
        if (banner && msg) {
            msg.innerText = `CRITICAL DISPATCH: ${item.donor} transmitted emergency beacon for ${item.quantity}!`;
            banner.classList.remove('hidden');
        }
        this.showToast(`EMERGENCY BROADCAST PUSHED TO ALL NGO COURIERS`, 'sos', 'SOS BEACON ACTIVE');
    }

    /* -------------------------------------------------------------
       11. ADMIN HUD & VERIFICATION TABLE
    ------------------------------------------------------------- */
    initAdminHUD() {
        this.renderAdminTable();

        const purgeBtn = document.getElementById('purge-expired-btn');
        if (purgeBtn) {
            purgeBtn.addEventListener('click', () => {
                const initialCount = this.donations.length;
                this.donations = this.donations.filter(d => d.expiryTimestamp > Date.now());
                this.saveLocalStorage('rescue_donations', this.donations);

                const purged = initialCount - this.donations.length;
                this.renderDonationGrid();
                this.renderMapMarkers();
                this.updateStats();

                this.showToast(`Admin purged ${purged} expired listing(s).`, 'system', 'PURGE COMPLETE');
            });
        }

        const resetDataBtn = document.getElementById('seed-data-reset-btn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => {
                if (confirm('Reset system data to initial demonstration state?')) {
                    localStorage.removeItem('rescue_donations');
                    localStorage.removeItem('rescue_verifications');
                    localStorage.removeItem('rescue_notifs');
                    this.donations = INITIAL_DONATIONS;
                    this.verifications = INITIAL_VERIFICATIONS;
                    this.notifications = INITIAL_NOTIFICATIONS;

                    this.renderDonationGrid();
                    this.renderMapMarkers();
                    this.renderAdminTable();
                    this.renderNotifications();
                    this.updateStats();
                    this.showToast('System data reset to default seed benchmarks.', 'info', 'SYSTEM RESET');
                }
            });
        }
    }

    renderAdminTable() {
        const tbody = document.getElementById('admin-verification-table');
        if (!tbody) return;

        tbody.innerHTML = this.verifications.map(item => `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.role}</td>
                <td><span class="font-mono text-cyan">${item.license}</span></td>
                <td><span class="badge yellow-badge">${item.status}</span></td>
                <td>
                    <button class="cyber-btn primary-btn sm" onclick="app.verifyEntity('${item.id}')"><i class="fa-solid fa-check"></i> VERIFY</button>
                </td>
            </tr>
        `).join('');
    }

    verifyEntity(id) {
        this.verifications = this.verifications.filter(v => v.id !== id);
        this.saveLocalStorage('rescue_verifications', this.verifications);
        this.renderAdminTable();
        this.showToast('Entity credentials verified & granted donor dispatch clearance.', 'success', 'CREDENTIAL VERIFIED');
    }

    /* -------------------------------------------------------------
       12. STATS & LOGGING
    ------------------------------------------------------------- */
    updateStats() {
        const activeCount = this.donations.filter(d => d.status === 'Available').length;
        const activeEl = document.getElementById('stat-active-count');
        if (activeEl) activeEl.innerText = activeCount;
    }

    logDispatchActivity(msg) {
        const feed = document.getElementById('live-dispatch-log');
        if (!feed) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `<span class="time">[${timeStr}]</span> <span>${msg}</span>`;

        feed.insertBefore(item, feed.firstChild);
    }
}

// Instantiate App when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RescueNetApp();
});
