/**
 * AWS Certified Cloud Practitioner Practice Exam Quiz
 * S3 Static Website Engine
 */

(function () {
  'use strict';

  // --- State ---
  let questions = [];
  let currentQuestion = null;
  let selectedOptions = new Set();
  let isAnswered = false;

  // LocalStorage keys
  const STORAGE_KEY_STATS = 'aws_quiz_clf_stats';
  const STORAGE_KEY_BOOKMARKS = 'aws_quiz_clf_bookmarks';
  const STORAGE_KEY_SEEN = 'aws_quiz_clf_seen';
  const STORAGE_KEY_MISTAKES = 'aws_quiz_clf_mistakes';
  const STORAGE_KEY_THEME = 'aws_quiz_theme';

  // State objects loaded from storage
  let stats = loadJson(STORAGE_KEY_STATS, { answered: 0, correct: 0, streak: 0 });
  let bookmarks = new Set(loadJson(STORAGE_KEY_BOOKMARKS, []));
  let seen = new Set(loadJson(STORAGE_KEY_SEEN, []));
  let mistakes = new Set(loadJson(STORAGE_KEY_MISTAKES, []));

  // --- DOM Elements ---
  const elThemeToggle = document.getElementById('theme-toggle');
  const elThemeIcon = document.getElementById('theme-icon');
  const elStatsToggle = document.getElementById('stats-toggle');
  const elStatsBanner = document.getElementById('stats-banner');
  const elExamSelect = document.getElementById('exam-select');
  const elFilterMode = document.getElementById('filter-mode');
  const elBtnNextRandom = document.getElementById('btn-next-random');
  const elBtnResetStats = document.getElementById('btn-reset-stats');

  // Stats elements
  const elStatTotal = document.getElementById('stat-total');
  const elStatCorrect = document.getElementById('stat-correct');
  const elStatAccuracy = document.getElementById('stat-accuracy');
  const elStatStreak = document.getElementById('stat-streak');
  const elStatRemaining = document.getElementById('stat-remaining');

  // Question elements
  const elBadgeExam = document.getElementById('badge-exam');
  const elBadgeNumber = document.getElementById('badge-number');
  const elBadgeType = document.getElementById('badge-type');
  const elBtnBookmark = document.getElementById('btn-bookmark');
  const elBookmarkIcon = document.getElementById('bookmark-icon');
  const elQuestionText = document.getElementById('question-text');
  const elChoiceInstruction = document.getElementById('choice-instruction');
  const elOptionsContainer = document.getElementById('options-container');
  const elBtnSubmit = document.getElementById('btn-submit');
  const elBtnSkip = document.getElementById('btn-skip');

  // Feedback elements
  const elFeedbackPanel = document.getElementById('feedback-panel');
  const elFeedbackHeader = document.getElementById('feedback-header');
  const elFeedbackExplanation = document.getElementById('feedback-explanation');
  const elDeepDiveLinks = document.getElementById('deep-dive-links');
  const elBtnNextAfterFeedback = document.getElementById('btn-next-after-feedback');

  // --- Helpers ---
  function loadJson(key, defaultValue) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function saveJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  // --- Theme Handling ---
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    elThemeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }

  elThemeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Toggle stats banner
  elStatsToggle.addEventListener('click', () => {
    elStatsBanner.classList.toggle('hidden');
  });

  // --- Statistics Display ---
  function updateStatsDisplay() {
    elStatTotal.textContent = stats.answered;
    elStatCorrect.textContent = stats.correct;
    const accuracy = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
    elStatAccuracy.textContent = `${accuracy}%`;
    elStatStreak.textContent = `${stats.streak} 🔥`;

    // Calculate remaining questions based on current exam filter
    const pool = getFilteredQuestions();
    const unseenInPool = pool.filter(q => !seen.has(q.id)).length;
    elStatRemaining.textContent = unseenInPool;
  }

  elBtnResetStats.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser vos statistiques de réponses et votre série ?')) {
      stats = { answered: 0, correct: 0, streak: 0 };
      seen.clear();
      mistakes.clear();
      saveJson(STORAGE_KEY_STATS, stats);
      saveJson(STORAGE_KEY_SEEN, []);
      saveJson(STORAGE_KEY_MISTAKES, []);
      updateStatsDisplay();
      alert('Statistiques réinitialisées avec succès.');
    }
  });

  // --- Exam Options Population ---
  function populateExamSelect() {
    const examsSet = new Set(questions.map(q => q.exam));
    const sortedExams = Array.from(examsSet).sort((a, b) => a - b);

    // Keep "all" option, append exams
    sortedExams.forEach(examNum => {
      const opt = document.createElement('option');
      opt.value = examNum;
      const count = questions.filter(q => q.exam === examNum).length;
      opt.textContent = `Practice Exam ${examNum} (${count} questions)`;
      elExamSelect.appendChild(opt);
    });
  }

  // --- Filtering & Random Selection ---
  function getFilteredQuestions() {
    let pool = questions;

    // Filter by Exam
    const selectedExam = elExamSelect.value;
    if (selectedExam !== 'all') {
      const examInt = parseInt(selectedExam, 10);
      pool = pool.filter(q => q.exam === examInt);
    }

    // Filter by Mode
    const mode = elFilterMode.value;
    if (mode === 'unseen') {
      const unseenList = pool.filter(q => !seen.has(q.id));
      if (unseenList.length > 0) return unseenList;
    } else if (mode === 'mistakes') {
      const mistakeList = pool.filter(q => mistakes.has(q.id));
      if (mistakeList.length > 0) return mistakeList;
    } else if (mode === 'bookmarks') {
      const bookmarkList = pool.filter(q => bookmarks.has(q.id));
      if (bookmarkList.length > 0) return bookmarkList;
    }

    return pool;
  }

  function pickRandomQuestion(shouldScroll = true) {
    const pool = getFilteredQuestions();
    if (pool.length === 0) {
      const mode = elFilterMode.value;
      let msg = 'Aucune question ne correspond à ce filtre.';
      if (mode === 'unseen') msg = 'Félicitations ! Vous avez vu toutes les questions de ce filtre.';
      if (mode === 'mistakes') msg = 'Aucune question à revoir dans ce filtre ! Bravo !';
      if (mode === 'bookmarks') msg = 'Vous n\'avez aucun favori enregistré avec une étoile (⭐).';
      alert(msg);
      elFilterMode.value = 'all';
      return pickRandomQuestion(shouldScroll);
    }

    // Avoid picking the exact same question consecutively if pool > 1
    let nextQ;
    if (pool.length > 1 && currentQuestion) {
      const available = pool.filter(q => q.id !== currentQuestion.id);
      nextQ = available[Math.floor(Math.random() * available.length)];
    } else {
      nextQ = pool[Math.floor(Math.random() * pool.length)];
    }

    loadQuestion(nextQ, shouldScroll);
  }

  // --- Render Question ---
  function loadQuestion(q, shouldScroll = true) {
    currentQuestion = q;
    isAnswered = false;
    selectedOptions.clear();

    // Reset card UI
    elFeedbackPanel.classList.add('hidden');
    elBtnSubmit.disabled = true;
    elBtnSubmit.style.display = 'inline-flex';
    elBtnSubmit.textContent = '✓ Valider ma réponse';

    // Meta Badges
    elBadgeExam.textContent = `Practice Exam #${q.exam}`;
    elBadgeNumber.textContent = `Question ${q.number}`;
    
    if (q.is_multiple) {
      elBadgeType.className = 'badge badge-warning';
      elBadgeType.textContent = `Choix multiple (${q.num_choices} réponses)`;
      elChoiceInstruction.textContent = `⚠️ Sélectionnez exactement ${q.num_choices} réponses :`;
    } else {
      elBadgeType.className = 'badge badge-info';
      elBadgeType.textContent = 'Choix unique (1 réponse)';
      elChoiceInstruction.textContent = 'Sélectionnez la meilleure réponse :';
    }

    // Bookmark icon
    updateBookmarkButton();

    // Question Text
    elQuestionText.textContent = q.question;

    // Render Options
    elOptionsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'option-item';
      optDiv.dataset.letter = opt.letter;
      optDiv.tabIndex = 0; // Accessible keyboard focus

      optDiv.innerHTML = `
        <div class="option-letter">${opt.letter}</div>
        <div class="option-content">${escapeHtml(opt.text)}</div>
        <div class="option-indicator"></div>
      `;

      optDiv.addEventListener('click', () => handleOptionClick(opt.letter, optDiv));
      optDiv.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleOptionClick(opt.letter, optDiv);
        }
      });

      elOptionsContainer.appendChild(optDiv);
    });

    updateStatsDisplay();

    // Scroll smoothly to the question card
    if (shouldScroll) {
      const questionCard = document.getElementById('question-card');
      if (questionCard) {
        questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function handleOptionClick(letter, element) {
    if (isAnswered) return;

    if (currentQuestion.is_multiple) {
      if (selectedOptions.has(letter)) {
        selectedOptions.delete(letter);
        element.classList.remove('selected');
      } else {
        if (selectedOptions.size < currentQuestion.num_choices) {
          selectedOptions.add(letter);
          element.classList.add('selected');
        } else {
          // Reached max choices, do nothing or replace
        }
      }
      // Update instruction text with selection count
      elChoiceInstruction.textContent = `Sélectionnez exactement ${currentQuestion.num_choices} réponses (${selectedOptions.size}/${currentQuestion.num_choices} sélectionnée(s)) :`;
      elBtnSubmit.disabled = selectedOptions.size !== currentQuestion.num_choices;
    } else {
      // Single choice
      selectedOptions.clear();
      selectedOptions.add(letter);
      document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
      element.classList.add('selected');
      elBtnSubmit.disabled = false;
    }
  }

  // --- Validate Answer ---
  function submitAnswer() {
    if (isAnswered || selectedOptions.size === 0) return;
    isAnswered = true;

    // Mark as seen
    seen.add(currentQuestion.id);
    saveJson(STORAGE_KEY_SEEN, Array.from(seen));

    const correctAnswers = new Set(currentQuestion.answer.map(a => a.toUpperCase()));
    const userAnswers = selectedOptions;

    // Check correctness
    let isCorrect = true;
    if (userAnswers.size !== correctAnswers.size) {
      isCorrect = false;
    } else {
      for (const a of userAnswers) {
        if (!correctAnswers.has(a)) {
          isCorrect = false;
          break;
        }
      }
    }

    // Update stats
    stats.answered++;
    if (isCorrect) {
      stats.correct++;
      stats.streak++;
      mistakes.delete(currentQuestion.id);
    } else {
      stats.streak = 0;
      mistakes.add(currentQuestion.id);
    }
    saveJson(STORAGE_KEY_STATS, stats);
    saveJson(STORAGE_KEY_MISTAKES, Array.from(mistakes));
    updateStatsDisplay();

    // Update Options Styling
    const optionElements = document.querySelectorAll('.option-item');
    optionElements.forEach(el => {
      el.classList.add('locked');
      const letter = el.dataset.letter;
      const indicator = el.querySelector('.option-indicator');

      if (correctAnswers.has(letter)) {
        el.classList.add('correct');
        indicator.textContent = '✓';
        indicator.style.color = 'var(--success)';
      } else if (userAnswers.has(letter)) {
        el.classList.add('wrong');
        indicator.textContent = '✗';
        indicator.style.color = 'var(--danger)';
      }
    });

    // Render Feedback Header
    const correctStr = Array.from(correctAnswers).sort().join(', ');
    if (isCorrect) {
      elFeedbackHeader.className = 'feedback-header success';
      elFeedbackHeader.innerHTML = `🎉 Bravo ! Réponse exacte : <strong>${correctStr}</strong>`;
    } else {
      elFeedbackHeader.className = 'feedback-header error';
      elFeedbackHeader.innerHTML = `❌ Incorrect. La bonne réponse est : <strong>${correctStr}</strong>`;
    }

    // Render Explanation if present
    if (currentQuestion.explanation && currentQuestion.explanation.trim()) {
      elFeedbackExplanation.classList.remove('hidden');
      elFeedbackExplanation.innerHTML = `<strong>Explication :</strong> ${formatExplanation(currentQuestion.explanation)}`;
    } else {
      elFeedbackExplanation.classList.add('hidden');
    }

    // Render Deep Dive Links
    renderDeepDiveLinks(currentQuestion.links);

    // Reveal feedback panel
    elFeedbackPanel.classList.remove('hidden');
    elBtnSubmit.style.display = 'none';

    // Focus on next question button for fast keyboard interaction
    elBtnNextAfterFeedback.focus();
  }

  function formatExplanation(text) {
    // Convert URLs in explanation into hyperlinks
    const urlPattern = /(https?:\/\/[^\s<>"]+)/g;
    return escapeHtml(text).replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderDeepDiveLinks(links) {
    elDeepDiveLinks.innerHTML = '';
    if (!links || links.length === 0) {
      elDeepDiveLinks.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Aucun lien spécifique.</div>';
      return;
    }

    links.forEach(l => {
      const a = document.createElement('a');
      a.className = 'deep-dive-link';
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      let icon = '🔗';
      let badgeLabel = 'Lien';
      if (l.type === 'aws_doc') {
        icon = '📚';
        badgeLabel = 'Doc AWS';
      } else if (l.type === 'search') {
        icon = '🔍';
        badgeLabel = 'Recherche AWS';
      } else if (l.type === 'github') {
        icon = '🐙';
        badgeLabel = 'Source GitHub';
      } else if (l.type === 'source') {
        icon = '📖';
        badgeLabel = 'Référence Officielle';
      }

      a.innerHTML = `
        <span style="display:flex;align-items:center;gap:0.5rem;">
          <span>${icon}</span>
          <span>${escapeHtml(l.title)}</span>
        </span>
        <span class="deep-dive-link-badge">${badgeLabel} ↗</span>
      `;
      elDeepDiveLinks.appendChild(a);
    });
  }

  // --- Bookmarks ---
  function updateBookmarkButton() {
    if (!currentQuestion) return;
    const isBookmarked = bookmarks.has(currentQuestion.id);
    elBookmarkIcon.textContent = isBookmarked ? '⭐' : '☆';
    elBtnBookmark.title = isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris';
  }

  elBtnBookmark.addEventListener('click', () => {
    if (!currentQuestion) return;
    if (bookmarks.has(currentQuestion.id)) {
      bookmarks.delete(currentQuestion.id);
    } else {
      bookmarks.add(currentQuestion.id);
    }
    saveJson(STORAGE_KEY_BOOKMARKS, Array.from(bookmarks));
    updateBookmarkButton();
  });

  // --- Utility ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners ---
  elBtnSubmit.addEventListener('click', submitAnswer);
  elBtnNextRandom.addEventListener('click', pickRandomQuestion);
  elBtnSkip.addEventListener('click', pickRandomQuestion);
  elBtnNextAfterFeedback.addEventListener('click', pickRandomQuestion);

  elExamSelect.addEventListener('change', () => {
    pickRandomQuestion();
  });

  elFilterMode.addEventListener('change', () => {
    pickRandomQuestion();
  });

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    // Ignore keyboard shortcuts if focusing input or select
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    const key = e.key.toUpperCase();

    // Selection keys: A, B, C, D, E or 1, 2, 3, 4, 5
    const letterMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
    const targetLetter = letterMap[key] || (['A', 'B', 'C', 'D', 'E'].includes(key) ? key : null);

    if (targetLetter && !isAnswered && currentQuestion) {
      const optEl = document.querySelector(`.option-item[data-letter="${targetLetter}"]`);
      if (optEl) {
        handleOptionClick(targetLetter, optEl);
      }
    } else if (e.key === 'Enter') {
      if (!isAnswered && !elBtnSubmit.disabled) {
        submitAnswer();
      } else if (isAnswered) {
        pickRandomQuestion();
      }
    } else if (key === 'R' || key === 'N') {
      pickRandomQuestion();
    }
  });

  // --- Init App ---
  async function init() {
    initTheme();

    // Check if questions are loaded via script window.AWS_QUESTIONS_DATA
    if (window.AWS_QUESTIONS_DATA && Array.isArray(window.AWS_QUESTIONS_DATA) && window.AWS_QUESTIONS_DATA.length > 0) {
      questions = window.AWS_QUESTIONS_DATA;
    } else {
      // Fallback to fetch
      try {
        const resp = await fetch('questions.json');
        questions = await resp.json();
      } catch (err) {
        console.error('Erreur chargement questions.json:', err);
        elQuestionText.textContent = 'Erreur : impossible de charger le fichier questions.json.';
        return;
      }
    }

    populateExamSelect();
    updateStatsDisplay();

    // Pick a random question on page load without auto-scrolling
    pickRandomQuestion(false);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
