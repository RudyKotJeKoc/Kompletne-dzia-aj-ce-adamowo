// PWA Install Banner
let deferredPrompt = null;
const pwaBanner = document.getElementById('pwa-install-banner');
const pwaBtn = document.getElementById('pwa-install-btn');
const pwaCloseBtn = document.getElementById('pwa-close-btn');

// Handle beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaBanner) pwaBanner.classList.remove('hidden');
});

if (pwaBtn) {
    pwaBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                if (pwaBanner) pwaBanner.classList.add('hidden');
            }
            deferredPrompt = null;
        }
    });
}

if (pwaCloseBtn) {
    pwaCloseBtn.addEventListener('click', () => {
        if (pwaBanner) pwaBanner.classList.add('hidden');
    });
}

// Hide banner once app is installed
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (pwaBanner) pwaBanner.classList.add('hidden');
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Use relative path to work on subpaths too
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
