// Data Storage
const wordData = {
  N5: [], N4: [], N3: [], N2: [], N1: []
};

// DOM Elements
const elements = {
  cardContainer: document.getElementById('card-container'),
  levelButtons: document.querySelectorAll('.level-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  fullscreenToggle: document.getElementById('fullscreen-toggle'),
  fullscreenClose: document.getElementById('fullscreen-close'),
  progressFill: document.querySelector('.progress-fill'),
  flashcardViewport: document.querySelector('.flashcard-viewport') // Added for scroll reset
};

// App State
const state = {
  currentLevel: 'N5',
  currentCardIndex: 0,
  isFlipped: false
};

// Initialize App
async function init() {
  try {
    showLoadingState();
    await loadAllData();
    initTheme();
    renderCards(state.currentLevel);
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

function renderCards(level) {
  console.log('Rendering level:', level, 'Data:', wordData[level]);
  if (!wordData[level] || wordData[level].length === 0) {
    elements.cardContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open" aria-hidden="true"></i>
        <p>No cards available for ${level} level</p>
      </div>
    `;
    elements.progressFill.style.width = '0%'; // Reset progress bar
    return;
  }

  state.currentLevel = level;
  state.currentCardIndex = 0; // Reset to first card
  state.isFlipped = false;
  elements.cardContainer.innerHTML = '';

  wordData[level].forEach((word, index) => {
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
      </div>
    `;
    setupCardInteractions(card);
    elements.cardContainer.appendChild(card);
  });

  // Reset scroll position to top
  elements.flashcardViewport.scrollTo({ top: 0, behavior: 'smooth' });
  updateProgress();
}

function updateProgress() {
  const totalCards = wordData[state.currentLevel]?.length || 0;
  const progress = totalCards ? ((state.currentCardIndex + 1) / totalCards) * 100 : 0;
  console.log('Updating progress:', { level: state.currentLevel, index: state.currentCardIndex, progress: progress });
  elements.progressFill.style.width = `${progress}%`;
}

// Data Functions
async function loadAllData() {
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const promises = levels.map(async level => {
    try {
      const response = await fetch(`/data/${level}.json`);
      if (!response.ok) throw new Error(`Failed to load ${level} data`);
      wordData[level] = await response.json();
    } catch (error) {
      console.warn(`Failed to load ${level}:`, error);
      wordData[level] = [];
    }
  });
  await Promise.all(promises);
}

// Interaction Functions
function setupCardInteractions(card) {
  let isAnimating = false;

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
  elements.levelButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (state.currentLevel === button.dataset.level) return;
      console.log('Switching to level:', button.dataset.level);
      elements.levelButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      renderCards(button.dataset.level);
    });
  });

  elements.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? '' : 'dark');
    const icon = elements.themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon', isDark);
    icon.classList.toggle('fa-sun', !isDark);
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

// Start the application
document.addEventListener('DOMContentLoaded', init);
