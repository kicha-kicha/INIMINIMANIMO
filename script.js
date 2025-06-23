// Data Storage
const wordData = {
  N5: [], N4: [], N3: [], N2: [], N1: []
};

// DOM Elements
const elements = {
  cardContainer: document.getElementById('card-container'),
  levelSelect: document.getElementById('level-select'),
  categorySelect: document.getElementById('category-select'),
  themeToggle: document.getElementById('theme-toggle'),
  fullscreenToggle: document.getElementById('fullscreen-toggle'),
  fullscreenClose: document.getElementById('fullscreen-close'),
  progressFill: document.querySelector('.progress-fill'),
  flashcardViewport: document.querySelector('.flashcard-viewport')
};

// App State
const state = {
  currentLevel: 'N5',
  currentCategory: 'all',
  currentCardIndex: 0,
  isFlipped: false
};

// Initialize App
async function init() {
  try {
    showLoadingState();
    await loadAllData();
    initTheme();
    loadPreferences();
    updateCategoryOptions();
    // Set default value to remove placeholder
    elements.levelSelect.value = state.currentLevel;
    elements.categorySelect.value = state.currentCategory;
    renderCards(state.currentLevel, state.currentCategory);
    setupEventListeners();
    updateProgress();
  } catch (error) {
    showErrorState(error);
  }
}

// UI Functions
function showLoadingState() {
  elements.cardContainer.innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
      <p>Loading flashcards...</p>
    </div>
  `;
}

function showErrorState(error) {
  console.error('Error loading flashcards:', error);
  elements.cardContainer.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
      <p>Failed to load flashcards: ${error.message}</p>
      <button class="retry-btn" aria-label="Retry loading">Retry</button>
    </div>
  `;
  document.querySelector('.retry-btn')?.addEventListener('click', init);
}

function renderCards(level, category = 'all') {
  console.log('Rendering level:', level, 'Category:', category, 'Data:', wordData[level]);
  state.currentLevel = level;
  state.currentCategory = category;
  state.currentCardIndex = 0;
  state.isFlipped = false;
  elements.cardContainer.innerHTML = '';

  let filteredWords = wordData[level] || [];
  if (category !== 'all') {
    filteredWords = filteredWords.filter(word => word.category === category);
  }

  if (filteredWords.length === 0) {
    elements.cardContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open" aria-hidden="true"></i>
        <p>No cards available for ${level} level${category !== 'all' ? ` in ${category} category` : ''}</p>
      </div>
    `;
    elements.progressFill.style.width = '0%';
    return;
  }

  filteredWords.forEach((word, index) => {
    const card = document.createElement('div');
    card.className = 'flashcard';
    card.dataset.index = index;
    card.innerHTML = `
      <div class="flashcard-front">
        <div class="level-badge">${level}</div>
        <div class="kanji">${word.kanji || word.hiragana}</div>
      </div>
      <div class="flashcard-back">
        <div class="hiragana">${word.hiragana || ''}</div>
        <div class="meaning">${word.meaning}</div>
        ${word.example ? `<div class="example">例: ${word.example}</div>` : ''}
        <div class="category">Category: ${word.category.charAt(0).toUpperCase() + word.category.slice(1)}</div>
      </div>
    `;
    setupCardInteractions(card);
    elements.cardContainer.appendChild(card);
  });

  elements.levelSelect.value = level;
  elements.categorySelect.value = category;
  elements.flashcardViewport.scrollTo({ top: 0, behavior: 'smooth' });
  updateProgress();
  savePreferences();
  updateMetaDescription(level, category);
}

function updateProgress() {
  let filteredWords = wordData[state.currentLevel] || [];
  if (state.currentCategory !== 'all') {
    filteredWords = filteredWords.filter(word => word.category === state.currentCategory);
  }
  const totalCards = filteredWords.length;
  const progress = totalCards ? ((state.currentCardIndex + 1) / totalCards) * 100 : 0;
  console.log('Updating progress:', { level: state.currentLevel, category: state.currentCategory, index: state.currentCardIndex, progress });
  elements.progressFill.style.width = `${progress}%`;
}

// Data Functions
async function loadAllData() {
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const promises = levels.map(async level => {
    try {
      const response = await fetch(`./data/${level}.json`);
      if (!response.ok) throw new Error(`Failed to load ${level} data: ${response.status} ${response.statusText}`);
      wordData[level] = await response.json();
      console.log(`Successfully loaded ${level} with ${wordData[level].length} items`);
    } catch (error) {
      console.error(`Failed to load ${level}:`, error);
      wordData[level] = [];
      showErrorState(new Error(`Failed to load ${level} data: ${error.message}`));
    }
  });
  await Promise.all(promises);
}

// Interaction Functions
function setupCardInteractions(card) {
  let isAnimating = false;
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !isAnimating) {
      state.currentCardIndex = parseInt(card.dataset.index);
      updateProgress();
    }
  }, { threshold: 0.7 });
  observer.observe(card);

  const flipCard = () => {
    if (isAnimating) return;
    isAnimating = true;
    state.isFlipped = !state.isFlipped;
    card.classList.toggle('flipped');
    setTimeout(() => {
      isAnimating = false;
      state.currentCardIndex = parseInt(card.dataset.index);
      updateProgress();
    }, 600);
  };

  card.addEventListener('click', flipCard);

  let touchStartX = 0;
  card.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (isAnimating) return;
    const touchEndX = e.changedTouches[0].clientX;
    if (Math.abs(touchEndX - touchStartX) > 50) {
      flipCard();
    }
  }, { passive: true });
}

// Event Listeners
function setupEventListeners() {
  elements.levelSelect.addEventListener('change', () => {
    const level = elements.levelSelect.value;
    if (level) { // Ignore if still on placeholder
      console.log('Switching to level:', level);
      updateCategoryOptions();
      renderCards(level, state.currentCategory);
    }
  });

  elements.categorySelect.addEventListener('change', () => {
    const category = elements.categorySelect.value;
    if (category) { // Ignore if still on placeholder
      console.log('Switching to category:', category);
      renderCards(state.currentLevel, category);
    }
  });

  elements.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? '' : 'dark');
    const icon = elements.themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun', isDark);
    icon.classList.toggle('fa-moon', !isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });

  elements.fullscreenToggle.addEventListener('click', toggleFullscreen);
  elements.fullscreenClose.addEventListener('click', toggleFullscreen);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
      toggleFullscreen();
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const currentCard = document.querySelector(`.flashcard[data-index="${state.currentCardIndex}"]`);
      if (currentCard) {
        currentCard.classList.toggle('flipped');
        state.isFlipped = !state.isFlipped;
        updateProgress();
      }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = state.currentCardIndex + 1;
      const nextCard = document.querySelector(`.flashcard[data-index="${nextIndex}"]`);
      if (nextCard) {
        nextCard.scrollIntoView({ behavior: 'smooth' });
      }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = state.currentCardIndex - 1;
      const prevCard = document.querySelector(`.flashcard[data-index="${prevIndex}"]`);
      if (prevCard) {
        prevCard.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

function toggleFullscreen() {
  const isFullscreen = document.body.classList.toggle('fullscreen-mode');
  const icon = elements.fullscreenToggle.querySelector('i');
  icon.classList.toggle('fa-expand', !isFullscreen);
  icon.classList.toggle('fa-compress', isFullscreen);
  elements.fullscreenClose.style.display = isFullscreen ? 'flex' : 'none';
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    const icon = elements.themeToggle.querySelector('i');
    icon.classList.replace('fa-moon', 'fa-sun');
  }
}

function updateCategoryOptions() {
  const categories = ['all', ...new Set(wordData[state.currentLevel].map(word => word.category))];
  elements.categorySelect.innerHTML = `
    <option value="" disabled ${state.currentCategory === '' ? 'selected' : ''}>Select Category</option>
    ${categories.map(cat => `
      <option value="${cat}" ${cat === state.currentCategory ? 'selected' : ''}>
        ${cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
      </option>
    `).join('')}
  `;
}

function savePreferences() {
  localStorage.setItem('level', state.currentLevel);
  localStorage.setItem('category', state.currentCategory);
}

function loadPreferences() {
  state.currentLevel = localStorage.getItem('level') || 'N5';
  state.currentCategory = localStorage.getItem('category') || 'all';
}

function updateMetaDescription(level, category) {
  const description = `Belajar kosakata Jepang JLPT ${level}${category !== 'all' ? ` (${category})` : ''} dengan flashcard interaktif. Cocok untuk pemula dan lanjutan.`;
  document.querySelector('meta[name="description"]').setAttribute('content', description);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);