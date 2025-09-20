// ===== MODERN AUDIO PLAYER WITH ADVANCED FEATURES =====
const AudioPlayer = {
    // Advanced state management
    state: {
        isInitialized: false,
        currentTrack: null,
        crossfading: false,
        visualizerActive: false,
        analyzerData: new Uint8Array(256),
        playbackRate: 1.0,
        equalizer: {
            enabled: false,
            presets: ['flat', 'rock', 'pop', 'classical', 'jazz']
        }
    },

    async init() {
        try {
            this.setupEventListeners();
            await this.loadPlaylists();
            this.initializeVisualizer();
            this.setupKeyboardShortcuts();
            console.log('🎵 Modern Audio Player initialized');
        } catch (error) {
            console.error('Failed to initialize audio player:', error);
            Utils.showToast(I18nManager.t('common.error'), 'error');
        }
    },

    async loadPlaylists() {
        try {
            const response = await fetch('playlist.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const playlistData = await response.json();
            
            // Clear existing playlists
            Object.keys(AppState.playlists).forEach(key => {
                AppState.playlists[key] = [];
            });

            // Process playlist with enhanced metadata
            playlistData.forEach(item => {
                const track = this.createTrackObject(item);
                if (track) {
                    // Add to category playlist
                    if (AppState.playlists[track.category]) {
                        AppState.playlists[track.category].push(track);
                    }
                    // Always add to 'full'
                    AppState.playlists.full.push(track);
                }
            });

            // Update UI with loaded counts
            this.updatePlaylistCounts();
            
            // Set default playlist if none active
            if (AppState.currentPlaylist.length === 0 && AppState.playlists.full.length > 0) {
                this.setRadioPlaylist('full');
            }

            console.log('✅ Playlists loaded:', this.getPlaylistStats());

        } catch (error) {
            console.error('Playlist loading failed:', error);
            Utils.showToast(`${I18nManager.t('common.error')}: ${error.message}`, 'error');
            this.handlePlaylistError();
        }
    },

    createTrackObject(item) {
        const src = item.url || item.file;
        if (!src) return null;

        return {
            title: item.title || this.generateTrackTitle(src),
            artist: item.artist || this.generateTrackArtist(item.category),
            url: src,
            category: item.category || 'inne',
            id: this.generateTrackId(src),
            duration: item.duration || null,
            artwork: item.artwork || this.getDefaultArtwork(item.category),
            tags: item.tags || [],
            mood: item.mood || 'neutral',
            // Advanced metadata
            metadata: {
                bitrate: item.bitrate || null,
                genre: item.genre || item.category,
                year: item.year || null,
                bpm: item.bpm || null
            }
        };
    },

    async initializeAudio() {
        if (AppState.isAudioInitialized) return;
        
        try {
            // Create enhanced audio context
            AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended
            if (AppState.audioContext.state === 'suspended') {
                await AppState.audioContext.resume();
            }
            
            // Create advanced audio graph
            await this.createAudioGraph();
            
            AppState.isAudioInitialized = true;
            this.enableControls();
            
            // Start visualizer
            this.startVisualizer();
            
            Utils.showToast(I18nManager.t('common.success'), 'success');
            console.log('🎧 Advanced Web Audio API initialized');
            
        } catch (error) {
            console.error('Web Audio API initialization failed:', error);
            Utils.showToast(`${I18nManager.t('common.error')}: ${error.message}`, 'error');
            // Fallback to basic HTML5 audio
            this.fallbackToBasicAudio();
        }
    },

    async createAudioGraph() {
        const ctx = AppState.audioContext;
        
        // Create nodes
        AppState.analyser = ctx.createAnalyser();
        AppState.analyser.fftSize = CONFIG.VISUALIZER_FFT_SIZE;
        AppState.analyser.smoothingTimeConstant = 0.8;
        
        AppState.gainNode = ctx.createGain();
        AppState.gainNode.gain.value = AppState.currentVolume;
        
        // Create equalizer (basic 3-band)
        AppState.lowShelf = ctx.createBiquadFilter();
        AppState.lowShelf.type = 'lowshelf';
        AppState.lowShelf.frequency.value = 200;
        
        AppState.midPeak = ctx.createBiquadFilter();
        AppState.midPeak.type = 'peaking';
        AppState.midPeak.frequency.value = 1000;
        
        AppState.highShelf = ctx.createBiquadFilter();
        AppState.highShelf.type = 'highshelf';
        AppState.highShelf.frequency.value = 3000;
        
        // Create compressor for better dynamics
        AppState.compressor = ctx.createDynamicsCompressor();
        AppState.compressor.threshold.value = -24;
        AppState.compressor.ratio.value = 12;
        AppState.compressor.attack.value = 0.003;
        AppState.compressor.release.value = 0.25;
        
        // Connect audio element when track loads
        this.connectAudioSource();
    },

    connectAudioSource() {
        const audioElement = Utils.$('#radio-player');
        if (audioElement && AppState.audioContext) {
            try {
                // Create source only once
                if (!AppState.audioSource) {
                    AppState.audioSource = AppState.audioContext.createMediaElementSource(audioElement);
                    
                    // Connect audio graph: Source → EQ → Compressor → Gain → Analyser → Destination
                    AppState.audioSource
                        .connect(AppState.lowShelf)
                        .connect(AppState.midPeak)
                        .connect(AppState.highShelf)
                        .connect(AppState.compressor)
                        .connect(AppState.gainNode)
                        .connect(AppState.analyser)
                        .connect(AppState.audioContext.destination);
                }
            } catch (error) {
                console.error('Failed to connect audio source:', error);
            }
        }
    },

    initializeVisualizer() {
        const canvas = Utils.$('#visualizer-canvas');
        if (!canvas) return;
        
        this.visualizer = {
            canvas,
            ctx: canvas.getContext('2d'),
            animationId: null,
            bars: 64,
            barWidth: 0,
            isActive: false
        };
        
        // Resize canvas
        this.resizeVisualizer();
        window.addEventListener('resize', () => this.resizeVisualizer());
    },

    resizeVisualizer() {
        if (!this.visualizer?.canvas) return;
        
        const canvas = this.visualizer.canvas;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        this.visualizer.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.visualizer.barWidth = rect.width / this.visualizer.bars;
    },

    startVisualizer() {
        if (!this.visualizer || !AppState.analyser) return;
        
        this.state.visualizerActive = true;
        this.updateVisualizer();
    },

    updateVisualizer() {
        if (!this.state.visualizerActive || !AppState.analyser) return;
        
        AppState.analyser.getByteFrequencyData(this.state.analyzerData);
        
        const canvas = this.visualizer.canvas;
        const ctx = this.visualizer.ctx;
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw frequency bars
        const barWidth = this.visualizer.barWidth;
        let x = 0;
        
        for (let i = 0; i < this.visualizer.bars; i++) {
            const barHeight = (this.state.analyzerData[i] / 255) * height * 0.8;
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#f59e0b');
            gradient.addColorStop(0.5, '#fb923c');
            gradient.addColorStop(1, '#dc2626');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
            
            x += barWidth;
        }
        
        // Continue animation
        this.visualizer.animationId = requestAnimationFrame(() => this.updateVisualizer());
    },

    setupEventListeners() {
        const audioElement = Utils.$('#radio-player');
        if (!audioElement) return;
        
        // Enhanced audio event listeners
        audioElement.addEventListener('loadstart', () => this.handleLoadStart());
        audioElement.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
        audioElement.addEventListener('canplaythrough', () => this.handleCanPlayThrough());
        audioElement.addEventListener('play', () => this.handlePlay());
        audioElement.addEventListener('pause', () => this.handlePause());
        audioElement.addEventListener('ended', () => this.handleEnded());
        audioElement.addEventListener('timeupdate', () => this.handleTimeUpdate());
        audioElement.addEventListener('error', (e) => this.handleAudioError(e));
        audioElement.addEventListener('stalled', () => this.handleStalled());
        audioElement.addEventListener('waiting', () => this.handleWaiting());
        
        // Control event listeners
        this.setupControlListeners();
        this.setupPlaylistListeners();
        this.setupProgressBar();
        this.setupVolumeControl();
    },

    setupControlListeners() {
        const controls = {
            playPause: Utils.$('#play-pause-btn'),
            next: Utils.$('#next-btn'),
            prev: Utils.$('#prev-btn'),
            shuffle: Utils.$('#shuffle-btn'),
            repeat: Utils.$('#repeat-btn'),
            mute: Utils.$('#mute-btn')
        };

        Object.entries(controls).forEach(([action, button]) => {
            if (button) {
                button.addEventListener('click', () => this[`handle${action.charAt(0).toUpperCase() + action.slice(1)}`]());
            }
        });
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea')) return;
            
            const shortcuts = {
                'Space': () => this.handlePlayPause(),
                'ArrowRight': () => this.handleNext(),
                'ArrowLeft': () => this.handlePrev(),
                'KeyM': () => this.handleMute(),
                'KeyS': () => this.handleShuffle(),
                'KeyR': () => this.handleRepeat(),
                'ArrowUp': () => this.adjustVolume(0.1),
                'ArrowDown': () => this.adjustVolume(-0.1),
                'Digit0': () => this.seekToPercentage(0),
                'Digit1': () => this.seekToPercentage(10),
                'Digit2': () => this.seekToPercentage(20),
                'Digit3': () => this.seekToPercentage(30),
                'Digit4': () => this.seekToPercentage(40),
                'Digit5': () => this.seekToPercentage(50),
                'Digit6': () => this.seekToPercentage(60),
                'Digit7': () => this.seekToPercentage(70),
                'Digit8': () => this.seekToPercentage(80),
                'Digit9': () => this.seekToPercentage(90)
            };

            if (shortcuts[e.code]) {
                e.preventDefault();
                shortcuts[e.code]();
            }
        });
    },

    // Enhanced event handlers
    handleLoadStart() {
        this.showLoadingState();
    },

    handleLoadedMetadata() {
        this.updateTrackInfo();
        this.connectAudioSource();
    },

    handleCanPlayThrough() {
        this.hideLoadingState();
    },

    handlePlay() {
        AppState.isPlaying = true;
        this.updatePlayButton();
        this.startVisualizer();
        this.updateMediaSession();
    },

    handlePause() {
        AppState.isPlaying = false;
        this.updatePlayButton();
    },

    handleEnded() {
        if (AppState.repeatMode === 'one') {
            this.playRadioTrack(AppState.currentTrackIndex);
        } else {
            this.handleNext();
        }
    },

    handleTimeUpdate() {
        this.updateProgress();
        this.updateMiniVisualizer();
    },

    handleAudioError(error) {
        console.error('Audio error:', error);
        const audioElement = Utils.$('#radio-player');
        const errorCode = audioElement?.error?.code;
        
        let errorMessage = I18nManager.t('radio.playbackError');
        switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
                errorMessage = 'Odtwarzanie przerwane';
                break;
            case 2: // MEDIA_ERR_NETWORK
                errorMessage = 'Błąd sieci - sprawdź połączenie';
                break;
            case 3: // MEDIA_ERR_DECODE
                errorMessage = 'Błąd dekodowania pliku audio';
                break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                errorMessage = 'Format audio nie jest obsługiwany';
                break;
        }
        
        Utils.showToast(errorMessage, 'error');
        
        // Auto-retry or skip to next track
        setTimeout(() => {
            if (AppState.currentPlaylist.length > 1) {
                this.handleNext();
            }
        }, 2000);
    },

    // Enhanced playlist management
    setRadioPlaylist(playlistKey) {
        const playlist = AppState.playlists[playlistKey];
        if (!playlist || playlist.length === 0) {
            Utils.showToast(`Playlista "${playlistKey}" jest pusta`, 'error');
            return;
        }

        AppState.currentPlaylist = [...playlist];
        if (AppState.isShuffled) {
            Utils.shuffleArray(AppState.currentPlaylist);
        }
        AppState.currentTrackIndex = 0;

        this.updateActivePlaylistTab(playlistKey);
        this.updateTrackInfo();

        // Auto-play if already playing
        if (AppState.isPlaying) {
            this.playRadioTrack(0);
        }

        Utils.showToast(
            `${I18nManager.t('radio.playlistSelected')}: ${playlistKey} (${AppState.currentPlaylist.length} ${I18nManager.t('radio.tracks')})`,
            'success'
        );
    },

    async playRadioTrack(index) {
        if (!AppState.currentPlaylist || AppState.currentPlaylist.length === 0) {
            Utils.showToast(I18nManager.t('radio.selectPlaylist'), 'info');
            return;
        }

        // Ensure audio context is initialized
        if (!AppState.isAudioInitialized) {
            await this.initializeAudio();
        }

        AppState.currentTrackIndex = (index + AppState.currentPlaylist.length) % AppState.currentPlaylist.length;
        const track = AppState.currentPlaylist[AppState.currentTrackIndex];
        this.state.currentTrack = track;

        const audioElement = Utils.$('#radio-player');
        if (audioElement) {
            try {
                // Show loading state
                this.showLoadingState();
                
                audioElement.src = track.url;
                await audioElement.play();
                
                this.updateTrackInfo();
                this.updateMediaSession();
                
            } catch (error) {
                console.error('Playback failed:', error);
                this.handleAudioError(error);
            }
        }
    },

    // Enhanced UI updates
    updateTrackInfo() {
        const track = this.state.currentTrack || AppState.currentPlaylist[AppState.currentTrackIndex];
        if (!track) return;

        const elements = {
            currentTrack: Utils.$('#current-track'),
            trackArtist: Utils.$('#track-artist'),
            trackImage: Utils.$('#track-image')
        };

        if (elements.currentTrack) {
            elements.currentTrack.textContent = track.title;
        }
        
        if (elements.trackArtist) {
            elements.trackArtist.textContent = track.artist;
        }
        
        if (elements.trackImage && track.artwork) {
            elements.trackImage.src = track.artwork;
            elements.trackImage.alt = `Okładka utworu: ${track.title}`;
        }

        // Update emotion tags
        this.updateEmotionTags(track);
    },

    updateEmotionTags(track) {
        const container = Utils.$('.track-emotions');
        if (!container) return;

        const emotions = this.getTrackEmotions(track);
        container.innerHTML = emotions.map(emotion => 
            `<span class="emotion-tag">${emotion}</span>`
        ).join('');
    },

    getTrackEmotions(track) {
        const emotionMap = {
            ambient: ['😌 Spokojny', '🧘 Medytacyjny'],
            disco: ['💃 Energiczny', '🕺 Taneczny'],
            hiphop: ['🔥 Intensywny', '💪 Motywujący'],
            barbara: ['🎭 Dramatyczny', '💔 Melancholijny'],
            kids: ['😊 Radosny', '🎈 Zabawny'],
            podcasts: ['🧠 Edukacyjny', '💭 Refleksyjny']
        };

        return emotionMap[track.category] || ['🎵 Muzyczny'];
    },

    // Enhanced progress and volume controls
    setupProgressBar() {
        const progressContainer = Utils.$('#track-progress');
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => this.seekToPosition(e));
            progressContainer.addEventListener('touchstart', (e) => this.handleTouchSeek(e));
        }
    },

    seekToPosition(event) {
        const audioElement = Utils.$('#radio-player');
        if (!audioElement || AppState.isLiveMode) return;

        const progressContainer = Utils.$('#track-progress');
        const rect = progressContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * audioElement.duration;

        if (!isNaN(newTime) && isFinite(newTime)) {
            audioElement.currentTime = newTime;
        }
    },

    adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, AppState.currentVolume + delta));
        this.setVolume(newVolume * 100);
    },

    seekToPercentage(percentage) {
        const audioElement = Utils.$('#radio-player');
        if (audioElement && !AppState.isLiveMode) {
            const newTime = (percentage / 100) * audioElement.duration;
            if (!isNaN(newTime)) {
                audioElement.currentTime = newTime;
            }
        }
    },

    // Utility methods
    showLoadingState() {
        const trackInfo = Utils.$('#current-track');
        if (trackInfo) {
            trackInfo.innerHTML = '<span class="loading">⏳ Ładowanie...</span>';
        }
    },

    hideLoadingState() {
        // Loading state will be hidden when track info is updated
    },

    updatePlaylistCounts() {
        Utils.$$('.playlist-btn').forEach(btn => {
            const playlist = btn.dataset.playlist;
            const count = AppState.playlists[playlist]?.length || 0;
            const countEl = btn.querySelector('.playlist-count');
            if (countEl) {
                countEl.textContent = `${count} utworów`;
            }
        });
    },

    getPlaylistStats() {
        return Object.entries(AppState.playlists).reduce((stats, [key, playlist]) => {
            stats[key] = playlist.length;
            return stats;
        }, {});
    },

    handlePlaylistError() {
        // Create fallback playlist
        AppState.playlists.full = [{
            title: 'Radio Adamowo - Strumień testowy',
            artist: 'Radio Adamowo',
            url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTeHzPPYjDkHGGS57+OZSA0PUqzn77NiGgU',
            category: 'inne',
            id: 'test-stream'
        }];
        
        Utils.showToast('Użyto awaryjnej playlisty', 'info');
    },

    // Enhanced control handlers remain the same but with better error handling
    async handlePlayPause() {
        // ...existing code with enhanced error handling...
        try {
            if (!AppState.isAudioInitialized) {
                await this.initializeAudio();
            }
            
            const audioElement = Utils.$('#radio-player');
            if (!audioElement) return;
            
            if (AppState.isPlaying) {
                audioElement.pause();
            } else {
                if (AppState.currentPlaylist.length === 0) {
                    this.setRadioPlaylist('full');
                }
                await audioElement.play();
            }
        } catch (error) {
            console.error('Play/pause failed:', error);
            Utils.showToast(I18nManager.t('common.error'), 'error');
        }
    },

    handleNext() {
        if (AppState.currentPlaylist.length > 0) {
            const nextIndex = AppState.currentTrackIndex + 1;
            if (AppState.repeatMode === 'none' && nextIndex >= AppState.currentPlaylist.length) {
                Utils.showToast(I18nManager.t('radio.playlistEnd'), 'info');
                return;
            }
            this.playRadioTrack(nextIndex);
        }
    },

    handlePrev() {
        if (AppState.currentPlaylist.length > 0) {
            this.playRadioTrack(AppState.currentTrackIndex - 1);
        }
    },

    handleShuffle() {
        AppState.isShuffled = !AppState.isShuffled;
        this.updateShuffleButton();
        
        if (AppState.isShuffled && AppState.currentPlaylist.length > 0) {
            Utils.shuffleArray(AppState.currentPlaylist);
            AppState.currentTrackIndex = 0;
        }
        
        Utils.showToast(
            AppState.isShuffled ? I18nManager.t('radio.shuffleOn') : I18nManager.t('radio.shuffleOff'),
            'info'
        );
    },

    handleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(AppState.repeatMode);
        AppState.repeatMode = modes[(currentIndex + 1) % modes.length];
        this.updateRepeatButton();
    },

    handleMute() {
        AppState.isMuted = !AppState.isMuted;
        this.updateMuteButton();
        
        const audioElement = Utils.$('#radio-player');
        if (audioElement) {
            audioElement.muted = AppState.isMuted;
        }
        
        if (AppState.gainNode) {
            AppState.gainNode.gain.value = AppState.isMuted ? 0 : AppState.currentVolume;
        }
    },

    // Enhanced button updates
    updatePlayButton() {
        const playIcon = Utils.$('#play-icon');
        const pauseIcon = Utils.$('#pause-icon');
        const playPauseBtn = Utils.$('#play-pause-btn');
        
        if (AppState.isPlaying) {
            playIcon?.classList.add('hidden');
            pauseIcon?.classList.remove('hidden');
            playPauseBtn?.classList.add('playing');
        } else {
            playIcon?.classList.remove('hidden');
            pauseIcon?.classList.add('hidden');
            playPauseBtn?.classList.remove('playing');
        }
    },

    updateShuffleButton() {
        const shuffleBtn = Utils.$('#shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', AppState.isShuffled);
            shuffleBtn.style.opacity = AppState.isShuffled ? '1' : '0.6';
            shuffleBtn.setAttribute('aria-pressed', AppState.isShuffled.toString());
        }
    },

    updateRepeatButton() {
        const repeatBtn = Utils.$('#repeat-btn');
        if (!repeatBtn) return;

        const icons = { none: '🔁', all: '🔁', one: '🔂' };
        const labels = {
            none: I18nManager.t('radio.repeatOff'),
            all: I18nManager.t('radio.repeatAll'),  
            one: I18nManager.t('radio.repeatOne')
        };

        repeatBtn.textContent = icons[AppState.repeatMode];
        repeatBtn.setAttribute('aria-label', labels[AppState.repeatMode]);
        repeatBtn.style.opacity = AppState.repeatMode !== 'none' ? '1' : '0.6';
        repeatBtn.classList.toggle('active', AppState.repeatMode !== 'none');
    },

    updateMuteButton() {
        const muteBtn = Utils.$('#mute-btn');
        if (muteBtn) {
            muteBtn.textContent = AppState.isMuted ? '🔇' : '🔊';
            muteBtn.classList.toggle('muted', AppState.isMuted);
        }
    },

    updateActivePlaylistTab(playlistKey) {
        Utils.$$('.playlist-btn').forEach(btn => {
            const isActive = btn.dataset.playlist === playlistKey;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive.toString());
        });
    },

    updateProgress() {
        const audioElement = Utils.$('#radio-player');
        const progressBar = Utils.$('.progress-bar');
        const currentTimeEl = Utils.$('#current-time');
        const totalTimeEl = Utils.$('#total-time');
        
        if (!audioElement || AppState.isLiveMode) return;

        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        
        if (progressBar) {
            progressBar.style.width = `${progress || 0}%`;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = Utils.formatTime(audioElement.currentTime || 0);
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = Utils.formatTime(audioElement.duration || 0);
        }
    },

    setVolume(value) {
        const volume = Math.max(0, Math.min(100, parseInt(value))) / 100;
        AppState.currentVolume = volume;

        // Update audio element
        const audioElement = Utils.$('#radio-player');
        if (audioElement) {
            audioElement.volume = volume;
        }

        // Update gain node
        if (AppState.gainNode && !AppState.isMuted) {
            AppState.gainNode.gain.value = volume;
        }

        // Update volume slider
        const volumeSlider = Utils.$('#volume-slider');
        if (volumeSlider) {
            volumeSlider.value = value;
            volumeSlider.style.setProperty('--volume-percentage', `${value}%`);
        }
    },

    enableControls() {
        const controls = ['#play-pause-btn', '#next-btn', '#prev-btn', '#shuffle-btn', '#repeat-btn', '#mute-btn'];
        controls.forEach(selector => {
            const btn = Utils.$(selector);
            if (btn) btn.disabled = false;
        });
    },

    // Enhanced media session
    updateMediaSession() {
        if (!('mediaSession' in navigator)) return;

        const track = this.state.currentTrack;
        if (!track) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'Radio Adamowo',
            artwork: [{
                src: track.artwork || 'public/images/favicon.png',
                sizes: '512x512',
                type: 'image/png'
            }]
        });

        // Set action handlers
        const actions = {
            play: () => this.handlePlayPause(),
            pause: () => this.handlePlayPause(),
            previoustrack: () => this.handlePrev(),
            nexttrack: () => this.handleNext(),
            seekbackward: () => this.seekRelative(-10),
            seekforward: () => this.seekRelative(10),
            seekto: (details) => this.seekToTime(details.seekTime)
        };

        Object.entries(actions).forEach(([action, handler]) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (error) {
                console.warn(`Media session action ${action} not supported`);
            }
        });
    },

    seekRelative(seconds) {
        const audioElement = Utils.$('#radio-player');
        if (audioElement && !AppState.isLiveMode) {
            audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + seconds));
        }
    },

    seekToTime(time) {
        const audioElement = Utils.$('#radio-player');
        if (audioElement && !AppState.isLiveMode && time >= 0 && time <= audioElement.duration) {
            audioElement.currentTime = time;
        }
    },

    // Enhanced helper methods remain the same...
    generateTrackTitle: (filePath) => Utils.generateTitle(filePath),
    generateTrackArtist: (category) => category ? `Radio Adamowo - ${category}` : 'Radio Adamowo',
    generateTrackId: (filePath) => Utils.generateId(filePath),
    getDefaultArtwork: (category) => `public/images/artwork/${category || 'default'}.png`,

    // Cleanup method
    destroy() {
        // Stop visualizer
        if (this.visualizer?.animationId) {
            cancelAnimationFrame(this.visualizer.animationId);
        }
        
        // Close audio context
        if (AppState.audioContext) {
            AppState.audioContext.close();
        }
        
        this.state.visualizerActive = false;
        console.log('🔇 Audio Player destroyed');
    }
};
