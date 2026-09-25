/**
 * Foodo - OTP Authentication & Login Controller
 * Manages Phone Number OTP, Gmail OTP, Dual Verification, local session storage, and Audio FX.
 */

class RescueNetAuth {
    constructor() {
        // Auth state
        this.activeTab = 'tab-phone';
        this.phoneOTP = null;
        this.gmailOTP = null;
        this.dualPhoneOTP = null;
        this.dualGmailOTP = null;

        this.phoneTimer = null;
        this.gmailTimer = null;

        this.phoneTarget = '';
        this.gmailTarget = '';
        this.roleSelected = 'donor';

        this.soundEnabled = true;
        this.audioCtx = null;

        // Initialize features
        this.initAudioContext();
        this.initCanvasBackground();
        this.initTabSwitching();
        this.initPhoneForm();
        this.initGmailForm();
        this.initDualForm();
        this.initGoogleOAuthModal();
        this.initDemoButtons();
        this.checkExistingUserSession();
    }

    /* -------------------------------------------------------------
       1. WEB AUDIO API SYNTHESIZER
    ------------------------------------------------------------- */
    initAudioContext() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            this.audioCtx = new AudioCtx();
        }

        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                soundBtn.innerHTML = this.soundEnabled 
                    ? '<i class="fa-solid fa-volume-high"></i>' 
                    : '<i class="fa-solid fa-volume-xmark"></i>';
                this.playSound(this.soundEnabled ? 'beep' : 'error');
            });
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
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'chime') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
                osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(180, now + 0.2);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            }
        } catch (e) {
            console.error("Audio FX error:", e);
        }
    }

    /* -------------------------------------------------------------
       2. CANVAS PARTICLES BACKGROUND
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

        const particles = Array.from({ length: 45 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.2,
            color: Math.random() > 0.5 ? '#38bdf8' : '#a855f7'
        }));

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p, idx) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();

                for (let j = idx + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = '#38bdf8';
                        ctx.globalAlpha = (1 - dist / 130) * 0.15;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(render);
        };
        render();
    }

    /* -------------------------------------------------------------
       3. TAB SWITCHING LOGIC
    ------------------------------------------------------------- */
    initTabSwitching() {
        const tabBtns = document.querySelectorAll('.auth-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.playSound('beep');
                const targetTabId = btn.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.auth-tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                const activeContent = document.getElementById(targetTabId);
                if (activeContent) {
                    activeContent.classList.add('active');
                }
                this.activeTab = targetTabId;
            });
        });
    }

    /* -------------------------------------------------------------
       4. PHONE NUMBER + OTP FLOW
    ------------------------------------------------------------- */
    initPhoneForm() {
        const reqForm = document.getElementById('phone-request-form');
        const phoneInput = document.getElementById('phone-input');
        const countrySelect = document.getElementById('country-code-select');
        const roleSelect = document.getElementById('phone-role-select');
        const verifyStep = document.getElementById('phone-verify-step');
        const backBtn = document.getElementById('back-to-phone-btn');
        const verifyBtn = document.getElementById('verify-phone-otp-btn');
        const resendBtn = document.getElementById('resend-phone-otp-btn');
        const container = document.getElementById('phone-otp-container');

        if (!reqForm) return;

        reqForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawPhone = phoneInput.value.trim();
            if (!rawPhone || rawPhone.length < 6) {
                this.showToast('Please enter a valid phone number', 'warning');
                this.playSound('error');
                return;
            }

            this.phoneTarget = `${countrySelect.value} ${rawPhone}`;
            this.roleSelected = roleSelect.value;

            document.getElementById('display-phone-target').innerText = this.phoneTarget;
            this.generateAndSendPhoneOTP();

            reqForm.classList.add('hidden');
            verifyStep.classList.remove('hidden');
            this.setupOTPBoxes(container, () => this.verifyPhoneOTP());
            this.startTimer('phone');
        });

        backBtn.addEventListener('click', () => {
            this.playSound('beep');
            verifyStep.classList.add('hidden');
            reqForm.classList.remove('hidden');
            if (this.phoneTimer) clearInterval(this.phoneTimer);
        });

        verifyBtn.addEventListener('click', () => {
            this.verifyPhoneOTP();
        });

        resendBtn.addEventListener('click', () => {
            if (!resendBtn.disabled) {
                this.generateAndSendPhoneOTP();
                this.startTimer('phone');
            }
        });
    }

    generateAndSendPhoneOTP() {
        this.phoneOTP = Math.floor(100000 + Math.random() * 900000).toString();
        this.playSound('beep');
        this.showToast(`📱 SMS Dispatch: OTP code for ${this.phoneTarget} is <strong>${this.phoneOTP}</strong>`, 'info', this.phoneOTP, 'phone-otp-container');
        document.getElementById('phone-otp-msg').innerText = 'Enter 6-digit SMS code sent to phone';
        document.getElementById('phone-otp-msg').className = 'otp-status-msg';
    }

    verifyPhoneOTP() {
        const entered = this.getOTPValue('phone-otp-container');
        const msgElem = document.getElementById('phone-otp-msg');

        if (entered.length < 6) {
            msgElem.innerText = '⚠️ Please enter all 6 digits.';
            msgElem.className = 'otp-status-msg error';
            this.playSound('error');
            return;
        }

        if (entered === this.phoneOTP) {
            msgElem.innerText = '✓ Phone OTP Verified Successfully!';
            msgElem.className = 'otp-status-msg success';
            this.playSound('chime');

            setTimeout(() => {
                this.completeAuthentication({
                    phone: this.phoneTarget,
                    phoneVerified: true,
                    gmail: 'Not linked',
                    gmailVerified: false,
                    role: this.roleSelected,
                    name: `Agent (${this.phoneTarget})`,
                    authMethod: 'Phone OTP SMS'
                });
            }, 600);
        } else {
            msgElem.innerText = '❌ Incorrect OTP code. Please try again.';
            msgElem.className = 'otp-status-msg error';
            this.playSound('error');
            this.shakeContainer('phone-otp-container');
        }
    }

    /* -------------------------------------------------------------
       5. GMAIL + OTP FLOW
    ------------------------------------------------------------- */
    initGmailForm() {
        const reqForm = document.getElementById('gmail-request-form');
        const gmailInput = document.getElementById('gmail-input');
        const roleSelect = document.getElementById('gmail-role-select');
        const verifyStep = document.getElementById('gmail-verify-step');
        const backBtn = document.getElementById('back-to-gmail-btn');
        const verifyBtn = document.getElementById('verify-gmail-otp-btn');
        const resendBtn = document.getElementById('resend-gmail-otp-btn');
        const container = document.getElementById('gmail-otp-container');

        if (!reqForm) return;

        reqForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = gmailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showToast('Please enter a valid Gmail / Email address', 'warning');
                this.playSound('error');
                return;
            }

            this.gmailTarget = email;
            this.roleSelected = roleSelect.value;

            document.getElementById('display-gmail-target').innerText = this.gmailTarget;
            this.generateAndSendGmailOTP();

            reqForm.classList.add('hidden');
            verifyStep.classList.remove('hidden');
            this.setupOTPBoxes(container, () => this.verifyGmailOTP());
            this.startTimer('gmail');
        });

        backBtn.addEventListener('click', () => {
            this.playSound('beep');
            verifyStep.classList.add('hidden');
            reqForm.classList.remove('hidden');
            if (this.gmailTimer) clearInterval(this.gmailTimer);
        });

        verifyBtn.addEventListener('click', () => {
            this.verifyGmailOTP();
        });

        resendBtn.addEventListener('click', () => {
            if (!resendBtn.disabled) {
                this.generateAndSendGmailOTP();
                this.startTimer('gmail');
            }
        });
    }

    generateAndSendGmailOTP() {
        this.gmailOTP = Math.floor(100000 + Math.random() * 900000).toString();
        this.playSound('beep');
        this.showToast(`📧 Gmail Notification: Verification code for ${this.gmailTarget} is <strong>${this.gmailOTP}</strong>`, 'info', this.gmailOTP, 'gmail-otp-container');
        document.getElementById('gmail-otp-msg').innerText = 'Enter 6-digit code emailed to inbox';
        document.getElementById('gmail-otp-msg').className = 'otp-status-msg';
    }

    verifyGmailOTP() {
        const entered = this.getOTPValue('gmail-otp-container');
        const msgElem = document.getElementById('gmail-otp-msg');

        if (entered.length < 6) {
            msgElem.innerText = '⚠️ Please enter all 6 digits.';
            msgElem.className = 'otp-status-msg error';
            this.playSound('error');
            return;
        }

        if (entered === this.gmailOTP) {
            msgElem.innerText = '✓ Gmail OTP Verified Successfully!';
            msgElem.className = 'otp-status-msg success';
            this.playSound('chime');

            setTimeout(() => {
                const namePart = this.gmailTarget.split('@')[0];
                const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                this.completeAuthentication({
                    phone: 'Not linked',
                    phoneVerified: false,
                    gmail: this.gmailTarget,
                    gmailVerified: true,
                    role: this.roleSelected,
                    name: capitalized,
                    authMethod: 'Gmail Passcode'
                });
            }, 600);
        } else {
            msgElem.innerText = '❌ Incorrect Gmail code. Please try again.';
            msgElem.className = 'otp-status-msg error';
            this.playSound('error');
            this.shakeContainer('gmail-otp-container');
        }
    }

    /* -------------------------------------------------------------
       6. DUAL OTP (PHONE + GMAIL COMBINED)
    ------------------------------------------------------------- */
    initDualForm() {
        const reqForm = document.getElementById('dual-request-form');
        const phoneInput = document.getElementById('dual-phone-input');
        const countrySelect = document.getElementById('dual-country-select');
        const gmailInput = document.getElementById('dual-gmail-input');
        const roleSelect = document.getElementById('dual-role-select');
        const verifyStep = document.getElementById('dual-verify-step');
        const backBtn = document.getElementById('back-to-dual-btn');
        const verifyBtn = document.getElementById('verify-dual-otp-btn');
        const phoneContainer = document.getElementById('dual-phone-otp-container');
        const gmailContainer = document.getElementById('dual-gmail-otp-container');

        if (!reqForm) return;

        reqForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawPhone = phoneInput.value.trim();
            const email = gmailInput.value.trim();

            if (!rawPhone || rawPhone.length < 6 || !email.includes('@')) {
                this.showToast('Please provide a valid Phone Number and Gmail address', 'warning');
                this.playSound('error');
                return;
            }

            this.phoneTarget = `${countrySelect.value} ${rawPhone}`;
            this.gmailTarget = email;
            this.roleSelected = roleSelect.value;

            document.getElementById('display-dual-phone').innerText = this.phoneTarget;
            document.getElementById('display-dual-gmail').innerText = this.gmailTarget;

            this.dualPhoneOTP = Math.floor(100000 + Math.random() * 900000).toString();
            this.dualGmailOTP = Math.floor(100000 + Math.random() * 900000).toString();

            this.showToast(`📱 Phone OTP: <strong>${this.dualPhoneOTP}</strong>`, 'info', this.dualPhoneOTP, 'dual-phone-otp-container');
            setTimeout(() => {
                this.showToast(`📧 Gmail OTP: <strong>${this.dualGmailOTP}</strong>`, 'info', this.dualGmailOTP, 'dual-gmail-otp-container');
            }, 800);

            reqForm.classList.add('hidden');
            verifyStep.classList.remove('hidden');

            this.setupOTPBoxes(phoneContainer, () => this.updateDualProgress());
            this.setupOTPBoxes(gmailContainer, () => this.updateDualProgress());
            this.updateDualProgress();
        });

        backBtn.addEventListener('click', () => {
            this.playSound('beep');
            verifyStep.classList.add('hidden');
            reqForm.classList.remove('hidden');
        });

        verifyBtn.addEventListener('click', () => {
            const pVal = this.getOTPValue('dual-phone-otp-container');
            const gVal = this.getOTPValue('dual-gmail-otp-container');

            if (pVal === this.dualPhoneOTP && gVal === this.dualGmailOTP) {
                this.playSound('chime');
                this.showToast('✓ Dual Authentication Complete!', 'success');
                const namePart = this.gmailTarget.split('@')[0];
                const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);

                setTimeout(() => {
                    this.completeAuthentication({
                        phone: this.phoneTarget,
                        phoneVerified: true,
                        gmail: this.gmailTarget,
                        gmailVerified: true,
                        role: this.roleSelected,
                        name: `${capitalized} (2FA Guarded)`,
                        authMethod: 'Dual Phone & Gmail OTP'
                    });
                }, 600);
            } else {
                this.playSound('error');
                this.showToast('❌ One or both OTP codes are incorrect!', 'warning');
                if (pVal !== this.dualPhoneOTP) this.shakeContainer('dual-phone-otp-container');
                if (gVal !== this.dualGmailOTP) this.shakeContainer('dual-gmail-otp-container');
            }
        });
    }

    updateDualProgress() {
        const pVal = this.getOTPValue('dual-phone-otp-container');
        const gVal = this.getOTPValue('dual-gmail-otp-container');
        let progress = 0;

        if (pVal === this.dualPhoneOTP) progress += 50;
        if (gVal === this.dualGmailOTP) progress += 50;

        const fill = document.getElementById('dual-progress-fill');
        if (fill) fill.style.width = `${progress}%`;
    }

    /* -------------------------------------------------------------
       7. GOOGLE OAUTH MODAL SIMULATION
    ------------------------------------------------------------- */
    initGoogleOAuthModal() {
        const btn = document.getElementById('google-oauth-btn');
        const modal = document.getElementById('google-modal');
        const closeBtn = document.getElementById('close-google-modal');
        const accountItems = document.querySelectorAll('.google-account-item');

        if (!btn || !modal) return;

        btn.addEventListener('click', () => {
            this.playSound('beep');
            modal.classList.remove('hidden');
        });

        closeBtn.addEventListener('click', () => {
            this.playSound('beep');
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });

        accountItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.id === 'custom-google-account-trigger') {
                    const customEmail = prompt("Enter your Gmail address:", "user@gmail.com");
                    if (customEmail) {
                        this.triggerGoogleAccountLogin(customEmail, customEmail.split('@')[0]);
                    }
                } else {
                    const email = item.dataset.email;
                    const name = item.dataset.name;
                    this.triggerGoogleAccountLogin(email, name);
                }
                modal.classList.add('hidden');
            });
        });
    }

    triggerGoogleAccountLogin(email, name) {
        this.playSound('chime');
        this.gmailTarget = email;
        document.getElementById('gmail-input').value = email;

        // Auto trigger Gmail OTP step
        document.getElementById('display-gmail-target').innerText = email;
        this.generateAndSendGmailOTP();

        document.getElementById('gmail-request-form').classList.add('hidden');
        document.getElementById('gmail-verify-step').classList.remove('hidden');
        this.setupOTPBoxes(document.getElementById('gmail-otp-container'), () => this.verifyGmailOTP());
        this.startTimer('gmail');
    }

    /* -------------------------------------------------------------
       8. OTP INPUT HELPER FUNCTIONS
    ------------------------------------------------------------- */
    setupOTPBoxes(container, onCompleteCallback) {
        if (!container) return;
        const boxes = container.querySelectorAll('.otp-box');

        boxes.forEach((box, index) => {
            box.value = '';
            box.classList.remove('filled');

            // Keyup event for auto-advance
            box.oninput = (e) => {
                const val = box.value.replace(/[^0-9]/g, '');
                box.value = val;

                if (val) {
                    box.classList.add('filled');
                    this.playSound('beep');
                    if (index < boxes.length - 1) {
                        boxes[index + 1].focus();
                    } else {
                        box.blur();
                        if (onCompleteCallback) onCompleteCallback();
                    }
                } else {
                    box.classList.remove('filled');
                }
            };

            // Keydown event for Backspace
            box.onkeydown = (e) => {
                if (e.key === 'Backspace' && !box.value && index > 0) {
                    boxes[index - 1].focus();
                    boxes[index - 1].value = '';
                    boxes[index - 1].classList.remove('filled');
                }
            };

            // Paste event handler
            box.onpaste = (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
                const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 6);

                if (digits) {
                    this.playSound('beep');
                    digits.split('').forEach((digit, i) => {
                        if (boxes[i]) {
                            boxes[i].value = digit;
                            boxes[i].classList.add('filled');
                        }
                    });
                    if (digits.length === 6) {
                        boxes[5].blur();
                        if (onCompleteCallback) onCompleteCallback();
                    } else if (boxes[digits.length]) {
                        boxes[digits.length].focus();
                    }
                }
            };
        });

        // Auto focus first box
        setTimeout(() => {
            if (boxes[0]) boxes[0].focus();
        }, 100);
    }

    getOTPValue(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return '';
        const boxes = container.querySelectorAll('.otp-box');
        let code = '';
        boxes.forEach(b => code += b.value.trim());
        return code;
    }

    shakeContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.style.animation = 'none';
        container.offsetHeight; // trigger reflow
        container.style.animation = 'shake 0.4s ease';
    }

    /* -------------------------------------------------------------
       9. RESEND TIMER CONTROLLER
    ------------------------------------------------------------- */
    startTimer(type) {
        const btnId = type === 'phone' ? 'resend-phone-otp-btn' : 'resend-gmail-otp-btn';
        const countId = type === 'phone' ? 'phone-timer-count' : 'gmail-timer-count';
        const btn = document.getElementById(btnId);
        const countElem = document.getElementById(countId);

        if (!btn || !countElem) return;

        let seconds = 60;
        btn.disabled = true;
        countElem.innerText = seconds;

        const timerKey = type === 'phone' ? 'phoneTimer' : 'gmailTimer';
        if (this[timerKey]) clearInterval(this[timerKey]);

        this[timerKey] = setInterval(() => {
            seconds--;
            countElem.innerText = seconds;
            if (seconds <= 0) {
                clearInterval(this[timerKey]);
                btn.disabled = false;
                btn.innerText = 'Resend Code Now';
            }
        }, 1000);
    }

    /* -------------------------------------------------------------
       10. COMPLETION & USER SESSION STORAGE
    ------------------------------------------------------------- */
    completeAuthentication(userData) {
        const token = 'RNET-AUTH-' + Math.floor(10000000 + Math.random() * 90000000);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const session = {
            ...userData,
            token: token,
            time: timestamp,
            createdAt: new Date().toISOString()
        };

        try {
            localStorage.setItem('rescue_user', JSON.stringify(session));
        } catch (e) {
            console.error("Failed to save session:", e);
        }

        this.displayUserSession(session);
    }

    checkExistingUserSession() {
        try {
            const stored = localStorage.getItem('rescue_user');
            if (stored) {
                const session = JSON.parse(stored);
                this.displayUserSession(session);
            }
        } catch (e) {
            console.error("Session check error:", e);
        }
    }

    displayUserSession(session) {
        const unauthView = document.getElementById('auth-unauthenticated-view');
        const authView = document.getElementById('auth-authenticated-view');

        if (!unauthView || !authView) return;

        unauthView.classList.add('hidden');
        authView.classList.remove('hidden');

        document.getElementById('user-display-name').innerText = session.name || 'Verified Rescue Agent';
        document.getElementById('user-display-role').innerHTML = `<i class="fa-solid fa-shield"></i> ${session.role ? session.role.toUpperCase() : 'MEMBER'}`;
        document.getElementById('user-display-phone').innerText = session.phone || 'Not verified';
        document.getElementById('user-display-gmail').innerText = session.gmail || 'Not verified';
        document.getElementById('user-display-token').innerText = session.token || 'RNET-TOKEN-88241';
        document.getElementById('user-display-time').innerText = session.time || 'Active Now';

        const signoutBtn = document.getElementById('signout-btn');
        if (signoutBtn) {
            signoutBtn.onclick = () => {
                this.playSound('error');
                localStorage.removeItem('rescue_user');
                authView.classList.add('hidden');
                unauthView.classList.remove('hidden');
                this.showToast('Signed out successfully', 'info');
            };
        }
    }

    /* -------------------------------------------------------------
       11. DEMO AUTO-FILL BUTTONS & TOAST ALERTS
    ------------------------------------------------------------- */
    initDemoButtons() {
        const demoPhoneBtn = document.getElementById('demo-phone-btn');
        if (demoPhoneBtn) {
            demoPhoneBtn.addEventListener('click', () => {
                document.getElementById('phone-input').value = '98765 43210';
                this.playSound('beep');
            });
        }

        const demoGmailBtn = document.getElementById('demo-gmail-btn');
        if (demoGmailBtn) {
            demoGmailBtn.addEventListener('click', () => {
                document.getElementById('gmail-input').value = 'rescue.partner@gmail.com';
                this.playSound('beep');
            });
        }

        const demoDualBtn = document.getElementById('demo-dual-btn');
        if (demoDualBtn) {
            demoDualBtn.addEventListener('click', () => {
                document.getElementById('dual-phone-input').value = '98765 43210';
                document.getElementById('dual-gmail-input').value = 'hero.volunteer@gmail.com';
                this.playSound('beep');
            });
        }
    }

    showToast(message, type = 'info', otpCode = null, targetContainerId = null) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;

        let icon = '<i class="fa-solid fa-circle-info text-cyan"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check text-green"></i>';
        if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation text-yellow"></i>';

        let autoFillHTML = '';
        if (otpCode && targetContainerId) {
            autoFillHTML = `<button type="button" class="toast-auto-fill-btn" data-code="${otpCode}" data-target="${targetContainerId}">Auto-fill OTP</button>`;
        }

        toast.innerHTML = `
            ${icon}
            <div>${message}</div>
            ${autoFillHTML}
        `;

        container.appendChild(toast);

        if (otpCode && targetContainerId) {
            const fillBtn = toast.querySelector('.toast-auto-fill-btn');
            fillBtn.addEventListener('click', () => {
                const targetCont = document.getElementById(targetContainerId);
                if (targetCont) {
                    const boxes = targetCont.querySelectorAll('.otp-box');
                    otpCode.split('').forEach((digit, i) => {
                        if (boxes[i]) {
                            boxes[i].value = digit;
                            boxes[i].classList.add('filled');
                        }
                    });
                    this.playSound('chime');
                }
                toast.remove();
            });
        }

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(50px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 8000);
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.rescueAuth = new RescueNetAuth();
});
