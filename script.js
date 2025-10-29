// ==================== DATA MANAGEMENT ====================
let books = [];
let currentFilter = 'all';
let searchQuery = '';
let currentView = 'grid';
let currentSort = 'newest';
let draggedBookId = null;
let yearlyGoal = 52;
let varietyGoal = 5;
let lifetimeGoal = 100;

// ==================== INDEXEDDB SETUP (untuk gambar) ====================
let db;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PersonalLibraryDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('bookImages')) {
                database.createObjectStore('bookImages', { keyPath: 'id' });
            }
        };
    });
}

async function saveImageToDB(bookId, imageData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['bookImages'], 'readwrite');
        const store = transaction.objectStore('bookImages');
        const request = store.put({ id: bookId, image: imageData });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getImageFromDB(bookId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['bookImages'], 'readonly');
        const store = transaction.objectStore('bookImages');
        const request = store.get(bookId);
        
        request.onsuccess = () => resolve(request.result?.image || null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteImageFromDB(bookId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['bookImages'], 'readwrite');
        const store = transaction.objectStore('bookImages');
        const request = store.delete(bookId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ==================== MUSIC PLAYER ====================
const musicToggle = document.getElementById('musicToggle');
const volumeControl = document.getElementById('volumeControl');
let audio = null;
let isPlaying = false;

function initMusic() {
    const musicSources = ['music/mp3.mp3'];
    audio = new Audio();
    audio.loop = true;
    audio.volume = 0.3;
    audio.src = musicSources[0];
    
    audio.addEventListener('error', () => {
        showNotification('Musik tidak tersedia saat ini', true);
        musicToggle.disabled = true;
    });
}

musicToggle.addEventListener('click', () => {
    if (!audio) initMusic();
    
    if (isPlaying) {
        audio.pause();
        musicToggle.innerHTML = '<i class="fas fa-music"></i>';
        musicToggle.classList.remove('playing');
        isPlaying = false;
    } else {
        audio.play().catch(err => {
            showNotification('Tidak dapat memutar musik', true);
        });
        musicToggle.innerHTML = '<i class="fas fa-pause"></i>';
        musicToggle.classList.add('playing');
        isPlaying = true;
    }
});

volumeControl.addEventListener('input', (e) => {
    if (audio) audio.volume = e.target.value / 100;
});

// ==================== PARTICLES ANIMATION ====================
const canvas = document.getElementById('particlesCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    
    draw() {
        ctx.fillStyle = `rgba(139, 69, 19, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const particles = Array.from({ length: 50 }, () => new Particle());

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    requestAnimationFrame(animateParticles);
}
animateParticles();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ==================== DOM ELEMENTS ====================
const bookForm = document.getElementById('bookForm');
const addBookSection = document.getElementById('addBookSection');
const addBookToggleBtn = document.getElementById('addBookToggleBtn');
const bookListContainer = document.getElementById('bookListContainer');
const searchInput = document.getElementById('searchInputHeader');
const filterButtons = document.querySelectorAll('.filter-button');
const viewButtons = document.querySelectorAll('.view-btn');
const sortToggle = document.getElementById('sortToggle');
const sortMenu = document.getElementById('sortMenu');
const notification = document.getElementById('notification');
const ratingStars = document.querySelectorAll('.rating-stars i');
const coverImageInput = document.getElementById('coverImage');
const imagePreview = document.getElementById('imagePreview');

// ==================== INITIALIZE ====================
async function loadBooks() {
    await initIndexedDB();
    
    const stored = localStorage.getItem('personalLibraryBooks');
    if (stored) books = JSON.parse(stored);
    
    const storedYearlyGoal = localStorage.getItem('yearlyGoal');
    if (storedYearlyGoal) yearlyGoal = parseInt(storedYearlyGoal);
    
    const storedVarietyGoal = localStorage.getItem('varietyGoal');
    if (storedVarietyGoal) varietyGoal = parseInt(storedVarietyGoal);
    
    const storedLifetimeGoal = localStorage.getItem('lifetimeGoal');
    if (storedLifetimeGoal) lifetimeGoal = parseInt(storedLifetimeGoal);
    
    updateAllStats();
    renderBooks();
}

function saveBooks() {
    // Simpan data buku TANPA gambar (gambar ada di IndexedDB)
    const booksToSave = books.map(book => {
        const { coverImage, ...bookWithoutImage } = book;
        return bookWithoutImage;
    });
    localStorage.setItem('personalLibraryBooks', JSON.stringify(booksToSave));
    updateAllStats();
}

// ==================== GOAL SETTING FUNCTIONS ====================
window.setQuickGoal = function(goal) {
    document.getElementById('goalInput').value = goal;
}

window.saveYearlyGoal = function() {
    const goalInput = document.getElementById('goalInput').value;
    const varietyInput = document.getElementById('varietyGoalInput').value;
    const lifetimeInput = document.getElementById('lifetimeGoalInput').value;
    
    const newYearlyGoal = parseInt(goalInput);
    if (!newYearlyGoal || newYearlyGoal < 1 || newYearlyGoal > 365) {
        showNotification('Masukkan target tahunan yang valid (1-365 buku)', true);
        return;
    }
    
    const newVarietyGoal = parseInt(varietyInput);
    if (!newVarietyGoal || newVarietyGoal < 1 || newVarietyGoal > 20) {
        showNotification('Masukkan target variety yang valid (1-20 dekade)', true);
        return;
    }
    
    const newLifetimeGoal = parseInt(lifetimeInput);
    if (!newLifetimeGoal || newLifetimeGoal < 1 || newLifetimeGoal > 10000) {
        showNotification('Masukkan target lifetime yang valid (1-10000 buku)', true);
        return;
    }
    
    yearlyGoal = newYearlyGoal;
    varietyGoal = newVarietyGoal;
    lifetimeGoal = newLifetimeGoal;
    
    localStorage.setItem('yearlyGoal', yearlyGoal);
    localStorage.setItem('varietyGoal', varietyGoal);
    localStorage.setItem('lifetimeGoal', lifetimeGoal);
    
    document.getElementById('goalModal').style.display = 'none';
    updateAllStats();
    showNotification(`🎯 Semua target berhasil diatur!`);
}

document.getElementById('setGoalBtn').addEventListener('click', () => {
    document.getElementById('goalInput').value = yearlyGoal;
    document.getElementById('varietyGoalInput').value = varietyGoal;
    document.getElementById('lifetimeGoalInput').value = lifetimeGoal;
    document.getElementById('goalModal').style.display = 'block';
});

// ==================== STATISTICS ====================
function updateAllStats() {
    const total = books.length;
    const read = books.filter(b => b.isRead).length;
    const unread = total - read;
    const favorites = books.filter(b => b.isFavorite).length;
    
    animateNumber(document.getElementById('totalBooks'), total);
    animateNumber(document.getElementById('readBooks'), read);
    animateNumber(document.getElementById('unreadBooks'), unread);
    animateNumber(document.getElementById('readingStreak'), favorites);
    
    document.getElementById('badgeAll').textContent = total;
    document.getElementById('badgeRead').textContent = read;
    document.getElementById('badgeUnread').textContent = unread;
    document.getElementById('badgeFav').textContent = favorites;
    document.getElementById('bookCount').textContent = `${total} buku`;
    
    const percentage = total > 0 ? Math.round((read / total) * 100) : 0;
    document.getElementById('progressPercent').textContent = `${percentage}%`;
    const progressCircle = document.getElementById('progressCircle');
    const offset = 283 - (283 * percentage) / 100;
    progressCircle.style.strokeDashoffset = offset;
    
    document.getElementById('readBar').style.width = `${percentage}%`;
    
    const totalPages = books.reduce((sum, book) => sum + (book.pages || 0), 0);
    document.getElementById('totalPages').textContent = totalPages.toLocaleString();
    
    const booksWithRating = books.filter(b => b.rating);
    const avgRating = booksWithRating.length > 0
        ? (booksWithRating.reduce((sum, b) => sum + b.rating, 0) / booksWithRating.length).toFixed(1)
        : '0.0';
    document.getElementById('avgRating').textContent = avgRating;
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const booksThisMonth = books.filter(b => {
        const bookDate = new Date(b.addedDate);
        return bookDate.getMonth() === thisMonth && bookDate.getFullYear() === thisYear;
    }).length;
    document.getElementById('booksThisMonth').textContent = booksThisMonth;
    
    const genres = new Set(books.filter(b => b.genre).map(b => b.genre));
    document.getElementById('uniqueGenres').textContent = genres.size;
    
    const lastMonthCount = books.filter(b => {
        const bookDate = new Date(b.addedDate);
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return bookDate >= lastMonth;
    }).length;
    document.getElementById('bookTrend').textContent = `+${lastMonthCount} bulan ini`;
    
    document.getElementById('footerTotal').textContent = total;
    document.getElementById('footerStreak').textContent = favorites;
    
    updateChallenges();
}

function updateChallenges() {
    const read = books.filter(b => b.isRead).length;
    
    document.getElementById('yearlyGoalDisplay').textContent = `${yearlyGoal} buku`;
    const challenge1 = Math.min((read / yearlyGoal) * 100, 100);
    document.getElementById('challenge1').style.width = `${challenge1}%`;
    document.querySelector('#challenge1').parentElement.nextElementSibling.textContent = `${read}/${yearlyGoal}`;
    
    const decades = new Set(books.filter(b => b.isRead).map(b => Math.floor(b.year / 10) * 10));
    const challenge2 = Math.min((decades.size / varietyGoal) * 100, 100);
    document.getElementById('challenge2').style.width = `${challenge2}%`;
    document.querySelector('#challenge2').parentElement.nextElementSibling.textContent = `${decades.size}/${varietyGoal} dekade`;
    
    const challenge2Card = document.querySelector('#challenge2').closest('.challenge-card');
    const challenge2Desc = challenge2Card.querySelector('p');
    challenge2Desc.textContent = `Baca buku dari ${varietyGoal} dekade berbeda`;
    
    const challenge3 = Math.min((read / lifetimeGoal) * 100, 100);
    document.getElementById('challenge3').style.width = `${challenge3}%`;
    document.querySelector('#challenge3').parentElement.nextElementSibling.textContent = `${read}/${lifetimeGoal} buku`;
    
    const challenge3Card = document.querySelector('#challenge3').closest('.challenge-card');
    const challenge3Desc = challenge3Card.querySelector('p');
    challenge3Desc.textContent = `Capai milestone ${lifetimeGoal} buku seumur hidup`;
}

function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    if (current === target) return;
    
    const increment = target > current ? 1 : -1;
    const duration = 500;
    const steps = Math.abs(target - current);
    if (steps === 0) {
        element.textContent = target;
        return;
    }
    
    const stepDuration = duration / steps;
    let count = current;
    const timer = setInterval(() => {
        count += increment;
        element.textContent = count;
        if ((increment > 0 && count >= target) || (increment < 0 && count <= target)) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, stepDuration);
}

// ==================== UI CONTROLS ====================
addBookToggleBtn.addEventListener('click', () => {
    const isHidden = addBookSection.style.display === 'none';
    addBookSection.style.display = isHidden ? 'block' : 'none';
    addBookToggleBtn.innerHTML = isHidden 
        ? '<i class="fas fa-times"></i> <span>Tutup</span>' 
        : '<i class="fas fa-plus"></i> <span>Tambah Buku</span>';
    
    if (isHidden) {
        addBookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

sortToggle.addEventListener('click', () => {
    sortMenu.style.display = sortMenu.style.display === 'none' ? 'flex' : 'none';
});

document.querySelectorAll('.sort-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
        currentSort = btn.dataset.sort;
        sortMenu.style.display = 'none';
        renderBooks();
        showNotification('📚 Buku berhasil diurutkan!');
    });
});

document.addEventListener('click', (e) => {
    if (!sortToggle.contains(e.target) && !sortMenu.contains(e.target)) {
        sortMenu.style.display = 'none';
    }
});

// ==================== RATING STARS ====================
ratingStars.forEach((star, index) => {
    star.addEventListener('click', () => {
        const rating = index + 1;
        document.getElementById('rating').value = rating;
        updateStarDisplay(rating);
    });
    
    star.addEventListener('mouseenter', () => {
        updateStarDisplay(index + 1);
    });
});

document.querySelector('.rating-stars').addEventListener('mouseleave', () => {
    const currentRating = document.getElementById('rating').value;
    updateStarDisplay(currentRating || 0);
});

function updateStarDisplay(rating) {
    ratingStars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// ==================== IMAGE PREVIEW WITH COMPRESSION ====================
coverImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
        showNotification('❌ File harus berupa gambar!', true);
        coverImageInput.value = '';
        return;
    }
    
    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('❌ Ukuran gambar maksimal 5MB!', true);
        coverImageInput.value = '';
        return;
    }
    
    // Show loading
    imagePreview.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading" style="margin: 0 auto;"></div>
            <p style="color: var(--text-muted); margin-top: 10px;">Mengompres gambar...</p>
        </div>
    `;
    imagePreview.style.display = 'block';
    
    try {
        // Kompres gambar
        const options = {
            maxSizeMB: 0.3, // Max 300KB
            maxWidthOrHeight: 600, // Max dimension
            useWebWorker: true,
            fileType: 'image/jpeg'
        };
        
        const compressedFile = await imageCompression(file, options);
        
        // Convert ke Base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const compressedSize = (compressedFile.size / 1024).toFixed(2);
            const originalSize = (file.size / 1024).toFixed(2);
            
            imagePreview.innerHTML = `
                <div style="text-align: center;">
                    <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 280px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                    <p style="color: var(--success); margin-top: 10px; font-size: 0.85rem;">
                        <i class="fas fa-check-circle"></i> Berhasil dikompres!<br>
                        <small style="color: var(--text-muted);">
                            ${originalSize}KB → ${compressedSize}KB 
                            (${Math.round((1 - compressedFile.size/file.size) * 100)}% lebih kecil)
                        </small>
                    </p>
                </div>
            `;
            
            // Simpan sementara untuk form submission
            coverImageInput.dataset.compressedImage = e.target.result;
        };
        reader.readAsDataURL(compressedFile);
        
    } catch (error) {
        console.error('Error kompresi:', error);
        showNotification('❌ Gagal mengompres gambar. Coba gambar lain.', true);
        imagePreview.style.display = 'none';
        coverImageInput.value = '';
    }
});

// ==================== FORM SUBMISSION ====================
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim();
    const year = parseInt(document.getElementById('year').value);
    const genre = document.getElementById('genre').value;
    const pages = parseInt(document.getElementById('pages').value) || 0;
    const rating = parseFloat(document.getElementById('rating').value) || 0;
    const notes = document.getElementById('notes').value.trim();
    const isRead = document.getElementById('isRead').checked;
    const isFavorite = document.getElementById('isFavorite').checked;
    const compressedImage = coverImageInput.dataset.compressedImage;

    const bookId = Date.now();
    
    const book = {
        id: bookId,
        title,
        author,
        year,
        genre,
        pages,
        rating,
        notes,
        isRead,
        isFavorite,
        hasImage: !!compressedImage,
        addedDate: new Date().toISOString()
    };

    // Simpan gambar ke IndexedDB
    if (compressedImage) {
        try {
            await saveImageToDB(bookId, compressedImage);
        } catch (error) {
            console.error('Error saving image:', error);
            showNotification('⚠️ Gambar gagal disimpan, tapi data buku tersimpan', true);
        }
    }

    books.unshift(book);
    
    saveBooks();
    renderBooks();
    bookForm.reset();
    imagePreview.style.display = 'none';
    delete coverImageInput.dataset.compressedImage;
    updateStarDisplay(0);
    addBookSection.style.display = 'none';
    addBookToggleBtn.innerHTML = '<i class="fas fa-plus"></i> <span>Tambah Buku</span>';
    
    showConfetti();
    showNotification('✨ Buku berhasil ditambahkan! Selamat membaca!');
});

// ==================== BOOK ACTIONS ====================
window.toggleReadStatus = function(id) {
    const book = books.find(b => b.id === id);
    if (book) {
        book.isRead = !book.isRead;
        saveBooks();
        renderBooks();
        showNotification(book.isRead ? '📚 Selamat! Satu buku selesai!' : '⏳ Buku ditandai belum dibaca');
    }
}

window.toggleFavorite = function(id) {
    const book = books.find(b => b.id === id);
    if (book) {
        book.isFavorite = !book.isFavorite;
        saveBooks();
        renderBooks();
        showNotification(book.isFavorite ? '❤️ Ditambahkan ke favorit!' : '💔 Dihapus dari favorit');
    }
}

window.deleteBook = async function(id) {
    const book = books.find(b => b.id === id);
    if (book && confirm(`Apakah Anda yakin ingin menghapus "${book.title}"?`)) {
        // Hapus gambar dari IndexedDB
        if (book.hasImage) {
            try {
                await deleteImageFromDB(id);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
        
        books = books.filter(b => b.id !== id);
        saveBooks();
        renderBooks();
        showNotification('🗑️ Buku berhasil dihapus');
    }
}

window.viewBookDetail = async function(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    const modal = document.getElementById('bookModal');
    const modalBody = document.getElementById('modalBody');
    
    // Load gambar dari IndexedDB
    let coverImage = null;
    if (book.hasImage) {
        try {
            coverImage = await getImageFromDB(id);
        } catch (error) {
            console.error('Error loading image:', error);
        }
    }
    
    const stars = Array.from({length: 5}, (_, i) => 
        i < book.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
    ).join('');
    
    modalBody.innerHTML = `
        <div style="display: flex; gap: 30px; flex-wrap: wrap;">
            ${coverImage 
                ? `<img src="${coverImage}" style="width: 250px; height: 350px; object-fit: cover; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">`
                : `<div style="width: 250px; height: 350px; background: linear-gradient(135deg, var(--primary-color), var(--accent-burgundy)); border-radius: 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 4rem;"><i class="fas fa-book"></i></div>`
            }
            <div style="flex: 1; min-width: 250px;">
                <h2 style="font-family: 'Playfair Display', serif; color: var(--primary-color); font-size: 2rem; margin-bottom: 10px;">${escapeHtml(book.title)}</h2>
                <p style="font-style: italic; color: var(--text-muted); font-size: 1.1rem; margin-bottom: 20px;">oleh ${escapeHtml(book.author)}</p>
                
                ${book.rating ? `<div style="margin-bottom: 15px; color: var(--accent-gold); font-size: 1.2rem;">${stars} <span style="color: var(--text-muted); font-size: 1rem; margin-left: 10px;">${book.rating}/5</span></div>` : ''}
                
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
                    ${book.genre ? `<span style="background: rgba(139, 69, 19, 0.1); padding: 8px 15px; border-radius: 20px; font-weight: 600; color: var(--primary-color);"><i class="fas fa-tag"></i> ${book.genre}</span>` : ''}
                    <span style="background: rgba(212, 175, 55, 0.1); padding: 8px 15px; border-radius: 20px; font-weight: 600; color: var(--accent-gold);"><i class="fas fa-calendar"></i> ${book.year}</span>
                    ${book.pages ? `<span style="background: rgba(74, 124, 89, 0.1); padding: 8px 15px; border-radius: 20px; font-weight: 600; color: var(--success);"><i class="fas fa-file-alt"></i> ${book.pages} hal</span>` : ''}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <span style="padding: 10px 20px; border-radius: 25px; font-weight: 600; ${book.isRead ? 'background: linear-gradient(135deg, #e8f5ea, #d4edda); color: var(--success); border: 2px solid var(--success);' : 'background: linear-gradient(135deg, #fff8e1, #ffecb3); color: var(--warning); border: 2px solid var(--warning);'}">
                        ${book.isRead ? '✓ Sudah Dibaca' : '◷ Belum Dibaca'}
                    </span>
                    ${book.isFavorite ? '<span style="margin-left: 10px; font-size: 1.5rem; color: var(--fire-color);">❤️ Favorit</span>' : ''}
                </div>
                
                ${book.notes ? `
                    <div style="margin-top: 25px; padding: 20px; background: var(--bg-light); border-radius: 15px; border-left: 4px solid var(--accent-gold);">
                        <h4 style="color: var(--primary-color); margin-bottom: 10px;"><i class="fas fa-sticky-note"></i> Catatan Pribadi</h4>
                        <p style="color: var(--text-muted); line-height: 1.6;">${escapeHtml(book.notes)}</p>
                    </div>
                ` : ''}
                
                <div style="margin-top: 30px; display: flex; gap: 15px; flex-wrap: wrap;">
                    <button onclick="toggleReadStatus(${book.id}); document.getElementById('bookModal').style.display='none';" class="button primary-button">
                        <i class="fas ${book.isRead ? 'fa-undo' : 'fa-check'}"></i> ${book.isRead ? 'Tandai Belum' : 'Tandai Sudah'}
                    </button>
                    <button onclick="toggleFavorite(${book.id}); document.getElementById('bookModal').style.display='none';" class="button secondary-button">
                        <i class="fas fa-heart"></i> ${book.isFavorite ? 'Hapus Favorit' : 'Tambah Favorit'}
                    </button>
                    <button onclick="deleteBook(${book.id}); document.getElementById('bookModal').style.display='none';" class="button secondary-button" style="background: linear-gradient(135deg, var(--danger), #6d2e2e); color: white;">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('bookModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('bookModal');
    const goalModal = document.getElementById('goalModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
    if (e.target === goalModal) {
        goalModal.style.display = 'none';
    }
});

// ==================== DRAG & DROP ====================
let draggedElement = null;

function handleDragStart(e) {
    const bookCard = e.target.closest('.book-card');
    if (!bookCard) return;
    
    draggedElement = bookCard;
    draggedBookId = parseInt(bookCard.dataset.bookId);
    bookCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', bookCard.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetCard = e.target.closest('.book-card');
    if (targetCard && targetCard !== draggedElement && draggedElement) {
        const container = bookListContainer;
        const bounding = targetCard.getBoundingClientRect();
        const offset = e.clientX - bounding.left;
        const isAfter = offset > bounding.width / 2;
        
        if (isAfter) {
            targetCard.parentNode.insertBefore(draggedElement, targetCard.nextSibling);
        } else {
            targetCard.parentNode.insertBefore(draggedElement, targetCard);
        }
    }
    
    return false;
}

function handleDragEnter(e) {
    const bookCard = e.target.closest('.book-card');
    if (bookCard && bookCard !== draggedElement) {
        bookCard.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const bookCard = e.target.closest('.book-card');
    if (bookCard) {
        bookCard.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    
    const allCards = [...bookListContainer.querySelectorAll('.book-card')];
    const newOrder = allCards.map(card => parseInt(card.dataset.bookId));
    
    const reorderedBooks = newOrder.map(id => books.find(b => b.id === id)).filter(Boolean);
    books = reorderedBooks;
    
    saveBooks();
    showNotification('📚 Urutan buku berhasil diubah!');
    
    return false;
}

function handleDragEnd(e) {
    const bookCard = e.target.closest('.book-card');
    if (bookCard) bookCard.classList.remove('dragging');
    
    document.querySelectorAll('.book-card').forEach(card => {
        card.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedBookId = null;
}

// ==================== FILTERS & SEARCH ====================
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filter;
        renderBooks();
    });
});

viewButtons.forEach(button => {
    button.addEventListener('click', () => {
        viewButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentView = button.dataset.view;
        renderBooks();
    });
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderBooks();
});

// ==================== RENDER BOOKS ====================
async function renderBooks() {
    let filteredBooks = [...books];

    if (currentFilter === 'read') {
        filteredBooks = filteredBooks.filter(book => book.isRead);
    } else if (currentFilter === 'unread') {
        filteredBooks = filteredBooks.filter(book => !book.isRead);
    } else if (currentFilter === 'favorites') {
        filteredBooks = filteredBooks.filter(book => book.isFavorite);
    }

    if (searchQuery) {
        filteredBooks = filteredBooks.filter(book =>
            book.title.toLowerCase().includes(searchQuery) ||
            book.author.toLowerCase().includes(searchQuery) ||
            (book.genre && book.genre.toLowerCase().includes(searchQuery)) ||
            book.year.toString().includes(searchQuery)
        );
    }
    
    filteredBooks.sort((a, b) => {
        switch(currentSort) {
            case 'newest':
                return new Date(b.addedDate) - new Date(a.addedDate);
            case 'oldest':
                return new Date(a.addedDate) - new Date(b.addedDate);
            case 'title':
                return a.title.localeCompare(b.title);
            case 'author':
                return a.author.localeCompare(b.author);
            case 'year-desc':
                return b.year - a.year;
            case 'year-asc':
                return a.year - b.year;
            default:
                return 0;
        }
    });

    bookListContainer.className = 'book-grid';
    if (currentView === 'list') bookListContainer.classList.add('list-view');
    if (currentView === 'cover') bookListContainer.classList.add('cover-view');

    const noBooksMessage = document.getElementById('noBooksMessage');
    const noResultsMessage = document.getElementById('noResultsMessage');
    
    if (books.length === 0) {
        noBooksMessage.style.display = 'block';
        noResultsMessage.style.display = 'none';
        bookListContainer.style.display = 'none';
        return;
    } else if (filteredBooks.length === 0) {
        noBooksMessage.style.display = 'none';
        noResultsMessage.style.display = 'block';
        bookListContainer.style.display = 'none';
        return;
    } else {
        noBooksMessage.style.display = 'none';
        noResultsMessage.style.display = 'none';
        bookListContainer.style.display = 'grid';
    }

    // Load semua gambar dulu
    const bookImages = {};
    for (const book of filteredBooks) {
        if (book.hasImage) {
            try {
                bookImages[book.id] = await getImageFromDB(book.id);
            } catch (error) {
                console.error('Error loading image for book', book.id, error);
            }
        }
    }

    bookListContainer.innerHTML = filteredBooks.map(book => {
        const stars = book.rating ? Array.from({length: 5}, (_, i) => 
            i < book.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
        ).join('') : '';
        
        const coverImage = bookImages[book.id];
        
        return `
            <div class="book-card" 
                 data-book-id="${book.id}"
                 draggable="true"
                 onclick="viewBookDetail(${book.id})">
                <div class="drag-handle" onclick="event.stopPropagation();" title="Seret untuk memindahkan">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                ${book.isFavorite ? '<div class="favorite-star">❤️</div>' : ''}
                ${coverImage 
                    ? `<img src="${coverImage}" alt="${escapeHtml(book.title)}" class="book-cover">`
                    : `<div class="book-cover"></div>`
                }
                <div class="book-info">
                    ${book.genre ? `<div class="genre-badge">${book.genre}</div>` : ''}
                    <div class="book-title">${escapeHtml(book.title)}</div>
                    <div class="book-author">oleh ${escapeHtml(book.author)}</div>
                    <div class="book-year">📅 ${book.year}</div>
                    ${stars ? `<div class="book-rating">${stars}</div>` : ''}
                    <span class="book-status ${book.isRead ? 'status-read' : 'status-unread'}">
                        ${book.isRead ? '✓ Sudah Dibaca' : '◷ Belum Dibaca'}
                    </span>
                </div>
                <div class="book-actions">
                    <button class="toggle-read-btn" onclick="event.stopPropagation(); toggleReadStatus(${book.id})" title="${book.isRead ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}">
                        <i class="fas ${book.isRead ? 'fa-undo' : 'fa-check'}"></i> ${book.isRead ? 'Belum' : 'Sudah'}
                    </button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteBook(${book.id})" title="Hapus buku">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart, false);
        card.addEventListener('dragenter', handleDragEnter, false);
        card.addEventListener('dragover', handleDragOver, false);
        card.addEventListener('dragleave', handleDragLeave, false);
        card.addEventListener('drop', handleDrop, false);
        card.addEventListener('dragend', handleDragEnd, false);
    });
    
    bookCards.forEach((card, index) => {
        card.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.05}s`;
        card.style.opacity = '0';
    });
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.className = 'notification' + (isError ? ' error' : '');
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showConfetti() {
    const colors = ['#D4AF37', '#8B4513', '#6B1C23', '#FF6B35'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// ==================== ANIMATIONS ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addBookToggleBtn.click();
    }
    
    if (e.key === 'Escape') {
        document.getElementById('bookModal').style.display = 'none';
        document.getElementById('goalModal').style.display = 'none';
        sortMenu.style.display = 'none';
    }
});

// ==================== INITIALIZE APP ====================
loadBooks();

if (books.length === 0) {
    setTimeout(() => {
        showNotification('👋 Selamat datang! Mulai koleksi buku pertama Anda!');
    }, 1000);
} else {
    setTimeout(() => {
        showNotification(`📚 Selamat datang kembali! Anda memiliki ${books.length} buku`);
    }, 1000);
}

setInterval(() => {
    if (books.length > 0) {
        saveBooks();
        console.log('Auto-saved at', new Date().toLocaleTimeString());
    }
}, 300000);

console.log('%c📚 My Personal Library ', 'background: #8B4513; color: #D4AF37; font-size: 20px; padding: 10px; border-radius: 5px;');
console.log('%cSelamat membaca! 🎉', 'color: #D4AF37; font-size: 16px;');