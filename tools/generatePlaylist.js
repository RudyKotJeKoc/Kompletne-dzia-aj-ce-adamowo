const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'audio');
const playlistPath = path.join(__dirname, '..', 'playlist.json');

const playlists = {
    ambient: [],
    disco: [],
    hiphop: [],
    barbara: [],
    kids: [],
    podcasts: []
};

function generateTitleFromFilename(filepath) {
    if (!filepath || typeof filepath !== 'string') return 'Utwór bez tytułu';
    
    const filename = path.basename(filepath);
    if (!filename) return 'Utwór bez tytułu';
    
    let title = filename.replace(/\.mp3$/i, '');
    title = title.replace(/Utwor\s*\((\d+)\)/i, 'Utwór $1');
    title = title.replace(/_/g, ' ');
    title = title.replace(/\b\w/g, l => l.toUpperCase());
    
    return title || 'Utwór bez tytułu';
}

function generatePlaylist() {
    console.log('Generating playlist...');
    
    // Clear existing playlists
    for (const key in playlists) {
        playlists[key] = [];
    }

    fs.readdirSync(audioDir, { withFileTypes: true }).forEach(dirent => {
        if (dirent.isDirectory()) {
            const category = dirent.name;
            const categoryPath = path.join(audioDir, category);

            fs.readdirSync(categoryPath).forEach(file => {
                if (file.endsWith('.mp3')) {
                    const filePath = `audio/${category}/${file}`;
                    const track = {
                        title: generateTitleFromFilename(file),
                        artist: "Radio Adamowo",
                        url: filePath,
                        category: category
                    };
                    if (playlists[category]) {
                        playlists[category].push(track);
                    } else {
                        console.warn(`Category "${category}" not predefined in playlists object. Adding to 'full' if exists.`);
                    }
                }
            });
        }
    });

    // Generate 'full' playlist from all categorized tracks
    playlists.full = Object.values(playlists).flat();

    fs.writeFileSync(playlistPath, JSON.stringify(playlists.full, null, 2), 'utf-8');
    console.log('Playlist generated successfully at:', playlistPath);
}

generatePlaylist();
