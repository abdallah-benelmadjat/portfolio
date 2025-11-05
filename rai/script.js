// Global variables
let songs = [];
let filteredSongs = [];
let currentPage = 1;
let itemsPerPage = 50;
let currentSort = 'views-desc';

// DOM elements
const searchInput = document.getElementById('searchInput');
const yearFilter = document.getElementById('yearFilter');
const minViewsInput = document.getElementById('minViews');
const maxViewsInput = document.getElementById('maxViews');
const sortBy = document.getElementById('sortBy');
const songsGrid = document.getElementById('songsGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const modal = document.getElementById('videoModal');
const closeBtn = document.querySelector('.close');
const videoContainer = document.getElementById('videoContainer');

// Initialize the app
async function init() {
    try {
        const response = await fetch('rai524.json');
        songs = await response.json();
        filteredSongs = [...songs];

        populateYearFilter();
        setupEventListeners();
        applyFilters();
    } catch (error) {
        console.error('Error loading songs:', error);
        songsGrid.innerHTML = '<p style="color: white; text-align: center;">Error loading songs. Please check the console.</p>';
    }
}

// Populate year filter dropdown
function populateYearFilter() {
    const years = [...new Set(songs.map(song => song['Year Released']))].sort((a, b) => b - a);
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    yearFilter.addEventListener('change', applyFilters);
    minViewsInput.addEventListener('input', applyFilters);
    maxViewsInput.addEventListener('input', applyFilters);
    sortBy.addEventListener('change', applyFilters);

    // Pagination controls
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            itemsPerPage = parseInt(e.target.dataset.size);
            document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPage = 1;
            displaySongs();
        });
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displaySongs();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displaySongs();
        }
    });

    // Modal
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Apply all filters and sorting
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedYear = yearFilter.value;
    const minViews = parseFloat(minViewsInput.value) || 0;
    const maxViews = parseFloat(maxViewsInput.value) || Infinity;
    const sortOption = sortBy.value;

    filteredSongs = songs.filter(song => {
        const matchesSearch = song.Title.toLowerCase().includes(searchTerm) ||
                             song['Search Term'].toLowerCase().includes(searchTerm);
        const matchesYear = !selectedYear || song['Year Released'] == selectedYear;
        const viewsInMillions = song.Views / 1000000;
        const matchesViews = viewsInMillions >= minViews && viewsInMillions <= maxViews;

        return matchesSearch && matchesYear && matchesViews;
    });

    // Sort
    filteredSongs.sort((a, b) => {
        switch (sortOption) {
            case 'views-desc':
                return b.Views - a.Views;
            case 'views-asc':
                return a.Views - b.Views;
            case 'year-desc':
                return b['Year Released'] - a['Year Released'];
            case 'year-asc':
                return a['Year Released'] - b['Year Released'];
            default:
                return 0;
        }
    });

    currentPage = 1;
    displaySongs();
}

// Display songs for current page
function displaySongs() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const songsToShow = filteredSongs.slice(startIndex, endIndex);

    songsGrid.innerHTML = '';

    songsToShow.forEach((song, index) => {
        const songCard = createSongCard(song, index);
        songsGrid.appendChild(songCard);
    });

    updatePagination();
}

// Create song card element
function createSongCard(song, index) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.style.animationDelay = `${index * 0.1}s`;

    const videoId = extractVideoId(song.URL);
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const viewsInMillions = (song.Views / 1000000).toFixed(1);

    card.innerHTML = `
        <div class="song-thumbnail">
            <img src="${thumbnailUrl}" alt="${song.Title}" loading="lazy"
                 onerror="handleThumbnailError(this, '${videoId}')"
                 onload="checkThumbnailQuality(this, '${videoId}')">
            <button class="play-btn" onclick="openModal('${videoId}')">▶</button>
        </div>
        <div class="song-info">
            <div class="song-title">${song.Title}</div>
            <div class="song-meta">
                <span class="song-views">${viewsInMillions}M views</span>
                <span class="song-year">${song['Year Released']}</span>
            </div>
        </div>
    `;

    return card;
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
}

// Open video modal
function openModal(videoId) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    videoContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
    modal.style.display = 'block';
}

// Check if loaded thumbnail is actually useful or just a blank placeholder
function checkThumbnailQuality(img, videoId) {
    // Skip quality check for very small images (default.jpg is 120x90)
    if (img.naturalWidth <= 120 || img.naturalHeight <= 90) {
        return; // This is expected for default.jpg
    }

    try {
        // Create a small canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to a small sample
        canvas.width = Math.min(img.naturalWidth, 50);
        canvas.height = Math.min(img.naturalHeight, 50);

        // Draw the image scaled down
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check if image is mostly uniform color (blank/placeholder)
        let totalPixels = data.length / 4; // Each pixel has 4 values (RGBA)
        let uniformPixels = 0;
        let firstPixel = [data[0], data[1], data[2]]; // RGB of first pixel

        // Sample pixels to check uniformity
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for performance
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Check if this pixel is similar to the first pixel (within tolerance)
            const tolerance = 30; // Allow some variation
            if (Math.abs(r - firstPixel[0]) <= tolerance &&
                Math.abs(g - firstPixel[1]) <= tolerance &&
                Math.abs(b - firstPixel[2]) <= tolerance) {
                uniformPixels++;
            }
        }

        // If more than 90% of sampled pixels are uniform, it's likely a blank thumbnail
        const uniformityRatio = uniformPixels / (totalPixels / 4); // Divide by 4 because we sampled every 4th pixel
        if (uniformityRatio > 0.9) {
            // This appears to be a blank/placeholder thumbnail, try next fallback
            handleThumbnailError(img, videoId);
        }
    } catch (error) {
        // If canvas analysis fails, just continue with the current image
        console.warn('Thumbnail quality check failed:', error);
    }
}

// Handle thumbnail loading errors with multiple fallbacks
function handleThumbnailError(img, videoId) {
    // Define thumbnail quality options in order of preference
    const thumbnailOptions = [
        'maxresdefault.jpg',  // High quality (1280x720)
        'hqdefault.jpg',      // High quality (480x360)
        'mqdefault.jpg',      // Medium quality (320x180)
        'default.jpg'         // Low quality (120x90)
    ];

    // Get current thumbnail index
    const currentSrc = img.src;
    const currentFile = currentSrc.split('/').pop();

    // Find current index in options
    const currentIndex = thumbnailOptions.indexOf(currentFile);

    // Try next fallback option
    if (currentIndex < thumbnailOptions.length - 1) {
        const nextIndex = currentIndex + 1;
        img.src = `https://img.youtube.com/vi/${videoId}/${thumbnailOptions[nextIndex]}`;
    } else {
        // All fallbacks failed, show a placeholder
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1ibmFpbDwvdGV4dD48L3N2Zz4=';
        img.style.objectFit = 'contain';
        img.style.backgroundColor = '#333';
    }
}

// Close video modal
function closeModal() {
    modal.style.display = 'none';
    videoContainer.innerHTML = '';
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
