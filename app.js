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
  const STORAGE_KEY_USERNAME = 'aws_quiz_username';
  const STORAGE_KEY_MAX_STREAK = 'aws_quiz_max_streak';
  const SCOREBOARD_API_URL = 'https://xhzsn3drllceqzlmqqwl5gt3wq0ojwpr.lambda-url.eu-west-3.on.aws/';

  // State objects loaded from storage
  let stats = loadJson(STORAGE_KEY_STATS, { answered: 0, correct: 0, streak: 0 });
  let bookmarks = new Set(loadJson(STORAGE_KEY_BOOKMARKS, []));
  let seen = new Set(loadJson(STORAGE_KEY_SEEN, []));
  let mistakes = new Set(loadJson(STORAGE_KEY_MISTAKES, []));
  let currentUsername = localStorage.getItem(STORAGE_KEY_USERNAME) || '';
  let maxStreak = parseInt(localStorage.getItem(STORAGE_KEY_MAX_STREAK) || '0', 10);

  // --- DOM Elements ---
  const elUserBtn = document.getElementById('user-btn');
  const elUserBtnText = document.getElementById('user-btn-text');
  const elScoreboardToggle = document.getElementById('scoreboard-toggle');
  const elScoreboardModal = document.getElementById('scoreboard-modal');
  const elBtnCloseScoreboard = document.getElementById('btn-close-scoreboard');
  const elInputScoreboardUser = document.getElementById('input-scoreboard-user');
  const elBtnSaveUser = document.getElementById('btn-save-user');
  const elScoreboardContent = document.getElementById('scoreboard-content');
  const elBtnRefreshScoreboard = document.getElementById('btn-refresh-scoreboard');

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
      maxStreak = 0;
      seen.clear();
      mistakes.clear();
      saveJson(STORAGE_KEY_STATS, stats);
      saveJson(STORAGE_KEY_SEEN, []);
      saveJson(STORAGE_KEY_MISTAKES, []);
      localStorage.setItem(STORAGE_KEY_MAX_STREAK, '0');
      updateStatsDisplay();
      if (currentUsername) syncScoreToDynamoDB();
      alert('Statistiques réinitialisées avec succès.');
    }
  });

  // --- User & DynamoDB Scoreboard ---
  function updateUsernameDisplay() {
    if (currentUsername) {
      elUserBtnText.textContent = currentUsername;
      if (elInputScoreboardUser) elInputScoreboardUser.value = currentUsername;
    } else {
      elUserBtnText.textContent = 'Définir pseudo';
      if (elInputScoreboardUser) elInputScoreboardUser.value = '';
    }
  }

  function setUsername(name) {
    name = (name || '').trim();
    if (!name) return;
    currentUsername = name;
    localStorage.setItem(STORAGE_KEY_USERNAME, name);
    updateUsernameDisplay();
    syncScoreToDynamoDB();
  }

  async function syncScoreToDynamoDB() {
    if (!currentUsername) return;
    try {
      const payload = {
        username: currentUsername,
        score: stats.correct,
        total_answered: stats.answered,
        streak: stats.streak,
        max_streak: maxStreak
      };
      await fetch(SCOREBOARD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Synchro DynamoDB échouée:', err);
    }
  }

  async function loadScoreboard() {
    if (!elScoreboardContent) return;
    elScoreboardContent.innerHTML = '<div class="scoreboard-loading">Chargement du classement depuis Amazon DynamoDB...</div>';
    try {
      const res = await fetch(SCOREBOARD_API_URL);
      const data = await res.json();
      if (!data.success || !data.scoreboard || data.scoreboard.length === 0) {
        elScoreboardContent.innerHTML = '<div class="scoreboard-loading">Aucun score enregistré pour l\'instant. Soyez le premier ! 🏆</div>';
        return;
      }
      renderScoreboardTable(data.scoreboard);
    } catch (err) {
      elScoreboardContent.innerHTML = '<div class="scoreboard-loading" style="color:var(--red);">Impossible de joindre l\'API DynamoDB.</div>';
    }
  }

  function renderScoreboardTable(scoreboard) {
    let html = `
      <table class="scoreboard-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Réviseur</th>
            <th>Score</th>
            <th>Total</th>
            <th>Précision</th>
            <th>Série Max</th>
          </tr>
        </thead>
        <tbody>
    `;

    scoreboard.forEach(row => {
      const isCurrent = currentUsername && row.username.toLowerCase() === currentUsername.toLowerCase();
      let rankDisplay = `${row.rank}`;
      if (row.rank === 1) rankDisplay = '<span class="rank-badge rank-1">🥇 1</span>';
      else if (row.rank === 2) rankDisplay = '<span class="rank-badge rank-2">🥈 2</span>';
      else if (row.rank === 3) rankDisplay = '<span class="rank-badge rank-3">🥉 3</span>';

      html += `
        <tr class="${isCurrent ? 'current-user-row' : ''}">
          <td>${rankDisplay}</td>
          <td><strong>${escapeHtml(row.username)}</strong> ${isCurrent ? '<span style="font-size:11px;color:var(--blue);font-weight:700;">(Vous)</span>' : ''}</td>
          <td><span style="color:var(--green);font-weight:700;">${row.score}</span></td>
          <td>${row.total_answered}</td>
          <td>${row.accuracy}%</td>
          <td>${row.max_streak} 🔥</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    elScoreboardContent.innerHTML = html;
  }

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

    if (stats.streak > maxStreak) {
      maxStreak = stats.streak;
      localStorage.setItem(STORAGE_KEY_MAX_STREAK, maxStreak.toString());
    }

    saveJson(STORAGE_KEY_STATS, stats);
    saveJson(STORAGE_KEY_MISTAKES, Array.from(mistakes));
    updateStatsDisplay();

    // Auto-sync to DynamoDB
    if (currentUsername) {
      syncScoreToDynamoDB();
    } else if (stats.answered === 1) {
      setTimeout(() => {
        const entered = prompt("Félicitations pour votre première réponse ! Entrez votre pseudo pour figurer dans le classement :", "Bastien");
        if (entered) setUsername(entered);
      }, 500);
    }

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

  // Scoreboard & User Events
  if (elUserBtn) {
    elUserBtn.addEventListener('click', () => {
      const entered = prompt("Entrez ou modifiez votre pseudo pour le classement :", currentUsername || "Bastien");
      if (entered) setUsername(entered);
    });
  }

  if (elScoreboardToggle) {
    elScoreboardToggle.addEventListener('click', () => {
      elScoreboardModal.classList.remove('hidden');
      loadScoreboard();
    });
  }

  if (elBtnCloseScoreboard) {
    elBtnCloseScoreboard.addEventListener('click', () => {
      elScoreboardModal.classList.add('hidden');
    });
  }

  if (elScoreboardModal) {
    elScoreboardModal.addEventListener('click', (e) => {
      if (e.target === elScoreboardModal) {
        elScoreboardModal.classList.add('hidden');
      }
    });
  }

  if (elBtnSaveUser) {
    elBtnSaveUser.addEventListener('click', () => {
      const val = elInputScoreboardUser.value.trim();
      if (val) {
        setUsername(val);
        loadScoreboard();
      }
    });
  }

  if (elBtnRefreshScoreboard) {
    elBtnRefreshScoreboard.addEventListener('click', loadScoreboard);
  }

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    // If modal open, close on Esc
    if (e.key === 'Escape' && elScoreboardModal && !elScoreboardModal.classList.contains('hidden')) {
      elScoreboardModal.classList.add('hidden');
      return;
    }

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
    updateUsernameDisplay();

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

    // Sync stats on load if user is set
    if (currentUsername && stats.answered > 0) {
      syncScoreToDynamoDB();
    }

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
