// ===== ADVANCED AUDIO VISUALIZER =====
class AudioVisualizer {
    constructor(canvasSelector, audioContext, analyserNode) {
        this.canvas = Utils.$(canvasSelector);
        this.ctx = this.canvas?.getContext('2d');
        this.audioContext = audioContext;
        this.analyser = analyserNode;
        
        // Visualization settings
        this.settings = {
            fftSize: 2048,
            smoothingTimeConstant: 0.8,
            minDecibels: -90,
            maxDecibels: -10,
            // Visual settings
            barCount: 64,
            barSpacing: 2,
            style: 'bars', // 'bars', 'wave', 'circular'
            gradient: true,
            particles: false,
            responsiveness: 1.0
        };
        
        this.animationId = null;
        this.isRunning = false;
        this.bufferLength = 0;
        this.dataArray = null;
        this.colors = {
            primary: '#f59e0b',
            secondary: '#fb923c', 
            accent: '#dc2626',
            background: 'rgba(17, 24, 39, 0.1)'
        };
        
        this.particles = [];
        this.initialize();
    }
    
    initialize() {
        if (!this.canvas || !this.ctx || !this.analyser) {
            console.warn('Visualizer initialization failed - missing elements');
            return;
        }
        
        this.setupCanvas();
        this.setupAnalyser();
        this.createParticles();
        this.bindEvents();
        
        console.log('🎨 Audio Visualizer initialized');
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }
    
    setupAnalyser() {
        this.analyser.fftSize = this.settings.fftSize;
        this.analyser.smoothingTimeConstant = this.settings.smoothingTimeConstant;
        this.analyser.minDecibels = this.settings.minDecibels;
        this.analyser.maxDecibels = this.settings.maxDecibels;
        
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }
    
    createParticles() {
        const particleCount = 50;
        this.particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.1,
                frequency: Math.floor(Math.random() * this.settings.barCount)
            });
        }
    }
    
    bindEvents() {
        window.addEventListener('resize', () => this.setupCanvas());
        
        // Style switcher
        document.addEventListener('keydown', (e) => {
            if (e.key === 'v' && !e.target.matches('input, textarea')) {
                this.switchVisualizationStyle();
            }
        });
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.render();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    render() {
        if (!this.isRunning) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear canvas with fade effect
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render based on current style
        switch (this.settings.style) {
            case 'bars':
                this.renderBars();
                break;
            case 'wave':
                this.renderWave();
                break;
            case 'circular':
                this.renderCircular();
                break;
            case 'particles':
                this.renderParticles();
                break;
        }
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.render());
    }
    
    renderBars() {
        const barWidth = this.width / this.settings.barCount;
        const barSpacing = this.settings.barSpacing;
        
        for (let i = 0; i < this.settings.barCount; i++) {
            const dataIndex = Math.floor((i / this.settings.barCount) * this.bufferLength);
            const barHeight = (this.dataArray[dataIndex] / 255) * this.height * 0.8;
            
            const x = i * barWidth;
            const y = this.height - barHeight;
            
            if (this.settings.gradient) {
                const gradient = this.ctx.createLinearGradient(0, this.height, 0, y);
                gradient.addColorStop(0, this.colors.primary);
                gradient.addColorStop(0.5, this.colors.secondary);
                gradient.addColorStop(1, this.colors.accent);
                this.ctx.fillStyle = gradient;
            } else {
                this.ctx.fillStyle = this.colors.primary;
            }
            
            this.ctx.fillRect(x, y, barWidth - barSpacing, barHeight);
            
            // Add glow effect
            this.ctx.shadowColor = this.colors.primary;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    renderWave() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 3;
        
        let x = 0;
        const sliceWidth = this.width / this.bufferLength;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        
        // Add filled area
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = this.colors.primary;
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
    }
    
    renderCircular() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(centerX, centerY) * 0.6;
        
        for (let i = 0; i < this.settings.barCount; i++) {
            const dataIndex = Math.floor((i / this.settings.barCount) * this.bufferLength);
            const amplitude = (this.dataArray[dataIndex] / 255) * 100;
            
            const angle = (i / this.settings.barCount) * 2 * Math.PI;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + amplitude);
            const y2 = centerY + Math.sin(angle) * (radius + amplitude);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.colors.accent;
        this.ctx.fill();
    }
    
    renderParticles() {
        // Update and render particles based on frequency data
        this.particles.forEach((particle, index) => {
            const dataIndex = Math.floor((particle.frequency / this.settings.barCount) * this.bufferLength);
            const intensity = this.dataArray[dataIndex] / 255;
            
            // Update particle based on audio intensity
            particle.size = 1 + intensity * 5;
            particle.opacity = 0.1 + intensity * 0.9;
            
            // Move particle
            particle.x += particle.vx * (1 + intensity);
            particle.y += particle.vy * (1 + intensity);
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
            
            // Draw particle
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = this.colors.primary;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1.0;
    }
    
    switchVisualizationStyle() {
        const styles = ['bars', 'wave', 'circular', 'particles'];
        const currentIndex = styles.indexOf(this.settings.style);
        const nextIndex = (currentIndex + 1) % styles.length;
        
        this.settings.style = styles[nextIndex];
        Utils.showToast(`Visualizer: ${this.settings.style}`, 'info');
    }
    
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.setupAnalyser();
        
        if (this.settings.particles) {
            this.createParticles();
        }
    }
    
    setColors(colorScheme) {
        Object.assign(this.colors, colorScheme);
    }
    
    // Performance monitoring
    getPerformanceMetrics() {
        return {
            fps: this.isRunning ? Math.round(1000 / 16.67) : 0,
            bufferLength: this.bufferLength,
            particleCount: this.particles.length,
            style: this.settings.style
        };
    }
}

// Export for use in audioPlayer.js
window.AudioVisualizer = AudioVisualizer;
