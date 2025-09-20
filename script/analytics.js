// ===== PRIVACY-FOCUSED ANALYTICS =====
class Analytics {
    constructor() {
        this.events = [];
        this.sessionStart = Date.now();
        this.sessionId = this.generateSessionId();
        this.isEnabled = this.checkConsentStatus();
        
        // Privacy-first: all data stays local unless explicitly consented
        this.storageKey = 'radio-adamowo-analytics';
        this.maxEvents = 1000; // Limit stored events
        
        this.init();
    }
    
    init() {
        if (!this.isEnabled) {
            console.log('📊 Analytics disabled - privacy mode active');
            return;
        }
        
        this.loadStoredEvents();
        this.setupEventListeners();
        this.startSessionTracking();
        
        console.log('📊 Privacy-focused Analytics initialized');
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    checkConsentStatus() {
        // Check if user has given consent for analytics
        return localStorage.getItem('analytics-consent') === 'true';
    }
    
    requestConsent() {
        return new Promise((resolve) => {
            const banner = document.createElement('div');
            banner.className = 'analytics-consent-banner';
            banner.innerHTML = `
                <div class="consent-content">
                    <h3>🍪 Pomóż nam ulepszyć Radio Adamowo</h3>
                    <p>Zbieramy anonimowe dane o korzystaniu z aplikacji, aby lepiej zrozumieć Twoje potrzeby. 
                       Wszystkie dane pozostają lokalne i są całkowicie anonimowe.</p>
                    <div class="consent-buttons">
                        <button id="consent-accept" class="btn-primary">Akceptuję</button>
                        <button id="consent-decline" class="btn-secondary">Nie, dzięki</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(banner);
            
            banner.querySelector('#consent-accept').addEventListener('click', () => {
                localStorage.setItem('analytics-consent', 'true');
                this.isEnabled = true;
                banner.remove();
                this.init();
                resolve(true);
            });
            
            banner.querySelector('#consent-decline').addEventListener('click', () => {
                localStorage.setItem('analytics-consent', 'false');
                this.isEnabled = false;
                banner.remove();
                resolve(false);
            });
        });
    }
    
    setupEventListeners() {
        // Track audio player interactions
        document.addEventListener('click', (e) => {
            if (e.target.matches('#play-pause-btn')) {
                this.track('audio_control', { action: 'play_pause' });
            } else if (e.target.matches('#next-btn')) {
                this.track('audio_control', { action: 'next' });
            } else if (e.target.matches('#prev-btn')) {
                this.track('audio_control', { action: 'previous' });
            } else if (e.target.matches('.playlist-btn')) {
                this.track('playlist_change', { 
                    playlist: e.target.dataset.playlist,
                    method: 'click'
                });
            } else if (e.target.matches('.mood-btn')) {
                this.track('mood_selection', {
                    mood: e.target.dataset.mood,
                    playlist: e.target.dataset.playlist
                });
            }
        });
        
        // Track manipulation detection
        document.addEventListener('manipulation-detected', (e) => {
            this.track('manipulation_detected', {
                technique: e.detail.technique,
                accuracy: e.detail.accuracy
            });
        });
        
        // Track learning progress
        document.addEventListener('lesson-completed', (e) => {
            this.track('learning_progress', {
                lesson: e.detail.lesson,
                score: e.detail.score,
                timeSpent: e.detail.timeSpent
            });
        });
        
        // Track page visibility for engagement
        document.addEventListener('visibilitychange', () => {
            this.track('page_visibility', {
                hidden: document.hidden,
                timestamp: Date.now()
            });
        });
    }
    
    track(eventName, data = {}) {
        if (!this.isEnabled) return;
        
        const event = {
            id: this.generateEventId(),
            name: eventName,
            data: this.sanitizeData(data),
            timestamp: Date.now(),
            session: this.sessionId,
            url: window.location.pathname,
            userAgent: this.getBrowserInfo()
        };
        
        this.events.push(event);
        this.saveToStorage();
        
        // Keep only recent events to avoid storage bloat
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
        
        console.log('📊 Event tracked:', eventName, data);
    }
    
    generateEventId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    
    sanitizeData(data) {
        // Remove any potentially sensitive information
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 100) {
                sanitized[key] = value.substring(0, 100) + '...';
            } else if (typeof value === 'object') {
                sanitized[key] = JSON.stringify(value).substring(0, 200);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    
    getBrowserInfo() {
        return {
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }
    
    startSessionTracking() {
        // Track session duration every 30 seconds
        this.sessionTimer = setInterval(() => {
            const duration = Date.now() - this.sessionStart;
            this.track('session_heartbeat', {
                duration: Math.round(duration / 1000),
                eventsCount: this.events.length
            });
        }, 30000);
        
        // Track when user leaves
        window.addEventListener('beforeunload', () => {
            const duration = Date.now() - this.sessionStart;
            this.track('session_end', {
                duration: Math.round(duration / 1000),
                totalEvents: this.events.length
            });
        });
    }
    
    loadStoredEvents() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.events = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load stored analytics events:', error);
            this.events = [];
        }
    }
    
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.events));
        } catch (error) {
            console.warn('Failed to save analytics events:', error);
            // Clear old events if storage is full
            this.events = this.events.slice(-500);
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.events));
            } catch (e) {
                console.error('Critical: Cannot save analytics data');
            }
        }
    }
    
    // Public methods for getting insights
    getSessionStats() {
        const duration = Date.now() - this.sessionStart;
        const eventsByType = this.events.reduce((acc, event) => {
            acc[event.name] = (acc[event.name] || 0) + 1;
            return acc;
        }, {});
        
        return {
            duration: Math.round(duration / 1000),
            eventsCount: this.events.length,
            eventsByType,
            sessionId: this.sessionId
        };
    }
    
    getLearningProgress() {
        const learningEvents = this.events.filter(e => 
            ['lesson_completed', 'manipulation_detected', 'quiz_answered'].includes(e.name)
        );
        
        return {
            totalLessons: learningEvents.filter(e => e.name === 'lesson_completed').length,
            detectionsCount: learningEvents.filter(e => e.name === 'manipulation_detected').length,
            averageScore: this.calculateAverageScore(learningEvents)
        };
    }
    
    getAudioStats() {
        const audioEvents = this.events.filter(e => 
            ['audio_control', 'playlist_change', 'mood_selection'].includes(e.name)
        );
        
        const playlists = audioEvents
            .filter(e => e.name === 'playlist_change')
            .reduce((acc, event) => {
                acc[event.data.playlist] = (acc[event.data.playlist] || 0) + 1;
                return acc;
            }, {});
            
        return {
            totalInteractions: audioEvents.length,
            playlistPreferences: playlists,
            controlsUsed: audioEvents.filter(e => e.name === 'audio_control').length
        };
    }
    
    calculateAverageScore(events) {
        const scoresEvents = events.filter(e => e.data.score !== undefined);
        if (scoresEvents.length === 0) return 0;
        
        const totalScore = scoresEvents.reduce((sum, event) => sum + event.data.score, 0);
        return Math.round((totalScore / scoresEvents.length) * 100) / 100;
    }
    
    // Export data (privacy-compliant)
    exportData() {
        if (!this.isEnabled) {
            return { error: 'Analytics not enabled' };
        }
        
        return {
            exportDate: new Date().toISOString(),
            sessionStats: this.getSessionStats(),
            learningProgress: this.getLearningProgress(),
            audioStats: this.getAudioStats(),
            totalEvents: this.events.length,
            dataRetentionDays: 30
        };
    }
    
    // Clear all data (privacy compliance)
    clearAllData() {
        this.events = [];
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('analytics-consent');
        this.isEnabled = false;
        
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        Utils.showToast('🗑️ Wszystkie dane analityczne zostały usunięte', 'success');
    }
    
    // Disable analytics
    disable() {
        this.isEnabled = false;
        localStorage.setItem('analytics-consent', 'false');
        this.clearAllData();
    }
}

// Initialize analytics if consent exists, otherwise show consent banner
document.addEventListener('DOMContentLoaded', () => {
    window.Analytics = new Analytics();
    
    // If no consent decision has been made, ask for it after a delay
    if (!localStorage.getItem('analytics-consent')) {
        setTimeout(() => {
            window.Analytics.requestConsent();
        }, 3000);
    }
});
