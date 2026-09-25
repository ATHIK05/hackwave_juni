/* Foodo voice assistant: browser-only speech input and output. */
(function () {
    'use strict';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    class FoodoVoiceAssistant {
        constructor() {
            this.isListening = false;
            this.recognition = null;
            this.button = null;
            this.panel = null;
            this.status = null;
            this.transcript = null;
            this.response = null;
            this.languageSelect = null;
            this.setup();
        }

        setup() {
            document.body.insertAdjacentHTML('beforeend', `
                <section class="voice-assistant" aria-label="Foodo voice assistant">
                    <div class="voice-assistant-panel" id="voice-assistant-panel" hidden>
                        <div class="voice-assistant-header">
                            <div>
                                <strong><i class="fa-solid fa-wand-magic-sparkles"></i> Foodo Assistant</strong>
                                <span id="voice-assistant-status">Ready to listen</span>
                            </div>
                            <button type="button" class="voice-assistant-close" id="voice-assistant-close" aria-label="Close voice assistant">&times;</button>
                        </div>
                        <div class="voice-assistant-language">
                            <label for="voice-assistant-language">Voice language</label>
                            <select id="voice-assistant-language">
                                <option value="en-IN">English</option>
                                <option value="ta-IN">Tamil / Thanglish</option>
                            </select>
                        </div>
                        <div class="voice-assistant-message">
                            <span class="voice-assistant-label">You said</span>
                            <p id="voice-assistant-transcript">Tap the microphone and try "Open surplus list".</p>
                        </div>
                        <div class="voice-assistant-message assistant-reply">
                            <span class="voice-assistant-label">Foodo says</span>
                            <p id="voice-assistant-response">I can help you move around Foodo by voice.</p>
                        </div>
                    </div>
                    <button type="button" class="voice-assistant-button" id="voice-assistant-button" aria-label="Start voice assistant" aria-expanded="false">
                        <span class="voice-assistant-pulse"></span>
                        <i class="fa-solid fa-microphone"></i>
                    </button>
                </section>
            `);

            this.panel = document.getElementById('voice-assistant-panel');
            this.button = document.getElementById('voice-assistant-button');
            this.status = document.getElementById('voice-assistant-status');
            this.transcript = document.getElementById('voice-assistant-transcript');
            this.response = document.getElementById('voice-assistant-response');
            this.languageSelect = document.getElementById('voice-assistant-language');

            this.button.addEventListener('click', () => this.toggleAssistant());
            document.getElementById('voice-assistant-close').addEventListener('click', () => this.closePanel());

            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.maxAlternatives = 1;
                this.recognition.onstart = () => this.setListening(true);
                this.recognition.onresult = (event) => this.handleSpeech(event.results[0][0].transcript);
                this.recognition.onerror = (event) => this.handleRecognitionError(event.error);
                this.recognition.onend = () => this.setListening(false);
            } else {
                this.setResponse('Voice input is not supported in this browser. You can still use the Foodo navigation normally.');
            }
        }

        toggleAssistant() {
            if (this.panel.hidden) {
                this.panel.hidden = false;
                this.button.setAttribute('aria-expanded', 'true');
            }

            if (!this.recognition) {
                this.setStatus('Voice input unavailable');
                this.speak('Voice input is not supported in this browser.');
                return;
            }

            if (this.isListening) {
                this.recognition.stop();
                return;
            }

            this.recognition.lang = this.languageSelect.value;
            try {
                this.recognition.start();
            } catch (error) {
                this.handleRecognitionError('start-failed');
            }
        }

        closePanel() {
            if (this.isListening && this.recognition) this.recognition.stop();
            this.panel.hidden = true;
            this.button.setAttribute('aria-expanded', 'false');
        }

        setListening(isListening) {
            this.isListening = isListening;
            this.button.classList.toggle('is-listening', isListening);
            this.status.textContent = isListening ? 'Listening now...' : 'Ready to listen';
            this.button.setAttribute('aria-label', isListening ? 'Stop listening' : 'Start voice assistant');
        }

        handleSpeech(text) {
            this.transcript.textContent = text;
            const command = text.toLowerCase().trim();
            const response = this.runCommand(command);
            this.setResponse(response);
            this.speak(response);
        }

        runCommand(command) {
            if (this.matches(command, ['show surplus food', 'open surplus list', 'surplus food', 'surplus list', 'surplus food kaatu', 'surplus list thira'])) {
                this.openTab('tab-browse');
                return 'Opening the surplus food list.';
            }

            if (this.matches(command, ['upload food', 'post food', 'add food', 'food upload', 'food upload pannu'])) {
                this.openTab('tab-post');
                return 'Opening the upload food form.';
            }

            if (this.matches(command, ['go to home', 'go home', 'home', 'home ku po'])) {
                if (window.app) {
                    this.openTab('tab-dashboard');
                    return 'Opening the Foodo home dashboard.';
                }
                window.location.href = 'index.html';
                return 'Opening the Foodo home dashboard.';
            }

            if (this.matches(command, ['open profile', 'my profile', 'profile', 'profile thira'])) {
                const profileLink = document.querySelector('#nav-profile-badge a, .profile-nav-link');
                if (profileLink) profileLink.click();
                else window.location.href = 'login.html';
                return 'Opening your Foodo profile.';
            }

            if (this.matches(command, ['find nearby food', 'nearby food', 'find food near me', 'arugil unavu'])) {
                this.openTab('tab-browse');
                const search = document.getElementById('search-input');
                if (search) search.focus();
                return 'Opening nearby surplus food listings.';
            }

            if (this.matches(command, ['help', 'what can you do', ' உதவி'])) {
                return 'Try saying show surplus food, upload food, go to home, open profile, or find nearby food.';
            }

            return 'I did not recognize that command. Say help to hear the available voice commands.';
        }

        matches(command, phrases) {
            return phrases.some((phrase) => command === phrase || command.includes(phrase));
        }

        openTab(tabId) {
            if (window.app && typeof window.app.switchTab === 'function') {
                window.app.switchTab(tabId);
            } else if (tabId === 'tab-browse' || tabId === 'tab-post' || tabId === 'tab-dashboard') {
                window.location.href = `index.html#${tabId}`;
            }
        }

        handleRecognitionError(error) {
            this.setListening(false);
            const messages = {
                'not-allowed': 'Microphone permission was blocked. Please allow microphone access in your browser settings.',
                'service-not-allowed': 'The browser speech service is unavailable. Please try again later.',
                'audio-capture': 'No microphone was found. Connect a microphone and try again.',
                'no-speech': 'I did not hear anything. Please try again.',
                'network': 'Voice recognition needs a network connection. Please try again.',
                'start-failed': 'The microphone is busy. Please wait a moment and try again.'
            };
            const message = messages[error] || 'Voice recognition could not start. Please try again.';
            this.setStatus('Voice input issue');
            this.setResponse(message);
            this.speak(message);
        }

        setStatus(message) {
            this.status.textContent = message;
        }

        setResponse(message) {
            this.response.textContent = message;
        }

        speak(message) {
            if (!('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = this.languageSelect.value;
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    }

    const startAssistant = () => {
        if (!document.querySelector('.voice-assistant')) window.foodoVoiceAssistant = new FoodoVoiceAssistant();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startAssistant);
    else startAssistant();
})();
