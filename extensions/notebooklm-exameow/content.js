/* ======================================================================
   content.js — Exameow Quiz Downloader for NotebookLM
   Content script (isolated world). Injects the main-world helper,
   adds a floating download button, a style toggle button, and converts
   NotebookLM quiz JSON into an Exameow-compatible QuestionBank JSON file.

   NEW: Exameow v2 Style Toggle — transforms NotebookLM's quiz options
   into Exameow's Material You-inspired card style with letter badges,
   rounded pill borders, and color-coded feedback.
   ====================================================================== */
(function () {
  'use strict';

  const OPTION_LABELS = 'ABCDEFGHIJKLMNOP'.split('');

  /* ── Helpers ─────────────────────────────────────────────────────── */

  /** Generate a short random ID */
  function uid() {
    return 'q-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  /** Generate a bank ID */
  function bankId() {
    return 'bank-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  /**
   * Convert a single NotebookLM quiz question into an Exameow Question.
   *
   * NotebookLM format:
   *   { question, hint?, answerOptions: [{ text, isCorrect, rationale }] }
   *
   * Exameow format (schema v2):
   *   { id, type, questionHeader: ContentBlock[], options: QuestionOption[],
   *     correctAnswer: string[] | string | null,
   *     explanation: { general: ContentBlock[], byOptionId: Record<string, ContentBlock[]> } }
   */
  function convertQuestion(q, index) {
    const id = uid();
    const opts = (q.answerOptions || []);
    const options = opts.map((o, i) => ({
      id: String.fromCharCode(97 + i),   // a, b, c, d …
      content: { type: 'text', format: 'plain', content: o.text || '' },
    }));

    /* Determine correct answer(s) */
    const correctIds = opts
      .map((o, i) => o.isCorrect ? String.fromCharCode(97 + i) : null)
      .filter(Boolean);

    const isMulti = correctIds.length > 1;
    const type = isMulti ? 'multiple_choice' : 'single_choice';
    const correctAnswer = correctIds.length > 0 ? correctIds : null;

    /* Build per-option explanations from rationale */
    const byOptionId = {};
    opts.forEach((o, i) => {
      if (o.rationale) {
        byOptionId[String.fromCharCode(97 + i)] = [
          { type: 'text', format: 'plain', content: o.rationale },
        ];
      }
    });

    /* General explanation from hint */
    const general = q.hint
      ? [{ type: 'text', format: 'plain', content: q.hint }]
      : [];

    return {
      id,
      type,
      questionHeader: [
        { type: 'text', format: 'plain', content: q.question || `Question ${index + 1}` },
      ],
      options,
      correctAnswer,
      explanation: { general, byOptionId },
    };
  }

  /**
   * Build a full Exameow QuestionBank object.
   */
  function buildBank(quiz, notebookTitle) {
    const name = notebookTitle
      ? `${notebookTitle} — NotebookLM Quiz`
      : `NotebookLM Quiz ${new Date().toLocaleDateString()}`;

    return {
      schemaVersion: 2,
      id: bankId(),
      name,
      questions: quiz.map(convertQuestion),
      createdAt: Date.now(),
      source: 'json-import',
    };
  }

  /** Trigger a file download */
  function downloadJSON(bank) {
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bank.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  /* ── DOM-based fallback quiz extraction ──────────────────────────── */

  function extractFromDOM() {
    /* Find all option elements (radio or checkbox) */
    const optionElements = Array.from(document.querySelectorAll('[role="radio"], [role="checkbox"]'));
    if (optionElements.length === 0) return null;

    /* Group options by their closest common ancestor container. 
       Usually they are inside a group or radiogroup, or just a generic div. */
    const questionContainers = new Map();
    
    optionElements.forEach(opt => {
      // Find a suitable container. Typically the parent of the parent of the option, or a group role.
      let container = opt.closest('[role="radiogroup"], [role="group"]');
      
      // If no explicit group role, find a common ancestor. We'll just go up a few levels.
      if (!container) {
          // Go up 2-3 levels. This is a heuristic.
          container = opt.parentElement?.parentElement;
      }
      
      if (container) {
          if (!questionContainers.has(container)) {
              questionContainers.set(container, []);
          }
          questionContainers.get(container).push(opt);
      }
    });

    const quiz = [];

    questionContainers.forEach((options, container) => {
      /* Walk up to find the question text — typically a sibling or ancestor text node */
      let questionText = '';
      
      // Look at previous siblings of the container
      let el = container.previousElementSibling;
      while (el) {
        const text = el.textContent?.trim();
        if (text && text.length > 5) {
          questionText = text;
          break;
        }
        el = el.previousElementSibling;
      }
      
      // If not found, look at the parent's previous siblings
      if (!questionText && container.parentElement) {
          let pEl = container.parentElement.previousElementSibling;
          while (pEl) {
            const text = pEl.textContent?.trim();
            if (text && text.length > 5) {
              questionText = text;
              break;
            }
            pEl = pEl.previousElementSibling;
          }
      }

      // If still not found, search inside the container for text before the first option
      if (!questionText) {
        const walker = document.createTreeWalker(container.parentElement || container, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          // Stop if we reach the first option
          if (options[0].contains(node.parentElement)) break;
          
          const t = node.textContent?.trim();
          if (t && t.length > 10 && !t.includes('radio') && !t.includes('option') && !t.includes('checkbox')) {
            questionText = t;
            // Don't break, keep finding the closest text to the options
          }
        }
      }

      /* Extract options from the elements */
      const answerOptions = [];
      options.forEach((opt) => {
        const text = opt.textContent?.trim() || '';
        const isCorrect = opt.getAttribute('aria-checked') === 'true'
          || opt.closest('[class*="correct"]') !== null
          || opt.querySelector('[class*="correct"]') !== null;
        
        if (text) {
          answerOptions.push({ text, isCorrect, rationale: '' });
        }
      });

      if (questionText && answerOptions.length >= 2) {
        quiz.push({ question: questionText, answerOptions, hint: '' });
      }
    });

    return quiz.length > 0 ? quiz : null;
  }

  /* ── UI: Floating download button ───────────────────────────────── */

  function createButton() {
    const existing = document.getElementById('exameow-quiz-btn');
    if (existing) return;

    const btn = document.createElement('button');
    btn.id = 'exameow-quiz-btn';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Exameow</span>
    `;
    btn.title = 'Download quiz as Exameow bank';

    btn.addEventListener('click', handleClick);
    document.body.appendChild(btn);
  }

  /* ── UI: Style toggle button ───────────────────────────────────── */

  let v2Active = false;
  let styleObserver = null;

  function createStyleToggle() {
    const existing = document.getElementById('exameow-style-toggle');
    if (existing) return;

    const btn = document.createElement('button');
    btn.id = 'exameow-style-toggle';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/>
      </svg>
      <span>Exameow Style</span>
    `;
    btn.title = 'Toggle Exameow v2 quiz style';

    btn.addEventListener('click', toggleV2Style);
    document.body.appendChild(btn);
  }

  function toggleV2Style() {
    v2Active = !v2Active;
    const btn = document.getElementById('exameow-style-toggle');

    if (v2Active) {
      document.body.classList.add('exameow-v2-active');
      if (btn) {
        btn.classList.add('exameow-style-active');
        btn.querySelector('span').textContent = 'Original Style';
      }
      applyV2Enhancements();
      startStyleObserver();
      showToast('✨ Exameow v2 style applied!', 'info');
    } else {
      document.body.classList.remove('exameow-v2-active');
      if (btn) {
        btn.classList.remove('exameow-style-active');
        btn.querySelector('span').textContent = 'Exameow Style';
      }
      removeV2Enhancements();
      stopStyleObserver();
      showToast('↩️ Reverted to original style', 'info');
    }
  }

  /* ── V2 Style Enhancements ─────────────────────────────────────── */

  /**
   * Find all quiz option elements and inject letter badges + restructure them
   * to match the Exameow v2 QuestionCard look.
   */
  function applyV2Enhancements() {
    /* Find quiz options — NotebookLM uses mat-checkbox, mat-radio-button,
       or elements with role="radio" / role="checkbox" */
    const optionSelectors = [
      'mat-checkbox',
      'mat-radio-button',
      '[role="radio"]',
      '[role="checkbox"]',
    ];

    const allOptions = document.querySelectorAll(optionSelectors.join(', '));
    if (allOptions.length === 0) return;

    /* Group by question (parent container) */
    const groups = groupOptionsByQuestion(allOptions);

    groups.forEach((options, groupIdx) => {
      options.forEach((opt, optIdx) => {
        injectBadge(opt, optIdx);
        injectResultIcons(opt);
        opt.setAttribute('data-exameow-styled', 'true');
        opt.setAttribute('data-exameow-index', String(optIdx));

        /* Add click listener for selected state visual tracking */
        if (!opt.hasAttribute('data-exameow-click-bound')) {
          opt.setAttribute('data-exameow-click-bound', 'true');
          opt.addEventListener('click', () => {
            /* Small delay to let Angular update aria-checked */
            setTimeout(() => updateOptionStates(options), 100);
          });
        }
      });
    });
  }

  /**
   * Group option elements by their shared question container.
   */
  function groupOptionsByQuestion(allOptions) {
    const groups = new Map();
    const optArray = Array.from(allOptions);

    optArray.forEach(opt => {
      /* Try to find a question group container */
      let container = opt.closest('[role="radiogroup"], [role="group"]');
      if (!container) {
        container = opt.parentElement?.parentElement || opt.parentElement;
      }

      if (!groups.has(container)) {
        groups.set(container, []);
      }
      groups.get(container).push(opt);
    });

    return groups;
  }

  /**
   * Inject a letter badge (A, B, C, D…) into a quiz option element.
   */
  function injectBadge(optionEl, index) {
    /* Don't inject twice */
    if (optionEl.querySelector('.exameow-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'exameow-badge exameow-animate-pop';
    badge.textContent = OPTION_LABELS[index] || String(index + 1);
    badge.style.animationDelay = `${index * 50}ms`;

    /* Insert as the first child so it appears before the label text */
    optionEl.insertBefore(badge, optionEl.firstChild);
  }

  /**
   * Inject result icons (checkmark / cross) into option elements.
   * These are hidden by default and shown via CSS when correct/wrong classes are applied.
   */
  function injectResultIcons(optionEl) {
    if (optionEl.querySelector('.exameow-result-icon')) return;

    /* Correct icon */
    const checkIcon = document.createElement('div');
    checkIcon.className = 'exameow-result-icon exameow-result-icon--correct';
    checkIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    `;

    /* Wrong icon */
    const crossIcon = document.createElement('div');
    crossIcon.className = 'exameow-result-icon exameow-result-icon--wrong';
    crossIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    `;

    optionEl.appendChild(checkIcon);
    optionEl.appendChild(crossIcon);
  }

  /**
   * Update option visual states based on their current aria-checked status
   * and any correct/incorrect class markers from NotebookLM.
   */
  function updateOptionStates(options) {
    options.forEach(opt => {
      const isChecked = opt.getAttribute('aria-checked') === 'true'
        || opt.classList.contains('mat-mdc-checkbox-checked')
        || opt.classList.contains('mat-mdc-radio-checked');

      const isCorrectFromDOM = opt.classList.contains('correct')
        || opt.querySelector('[class*="correct"]') !== null
        || opt.closest('[class*="correct"]') !== null;

      const isWrongFromDOM = opt.classList.contains('incorrect')
        || opt.querySelector('[class*="incorrect"]') !== null
        || opt.closest('[class*="incorrect"]') !== null;

      /* Clear previous states */
      opt.classList.remove('exameow-option-selected', 'exameow-option-correct', 'exameow-option-wrong');

      if (isCorrectFromDOM) {
        opt.classList.add('exameow-option-correct');
      } else if (isWrongFromDOM && isChecked) {
        opt.classList.add('exameow-option-wrong');
      } else if (isChecked) {
        opt.classList.add('exameow-option-selected');
      }
    });
  }

  /**
   * Remove all v2 enhancements from the page.
   */
  function removeV2Enhancements() {
    /* Remove injected badges */
    document.querySelectorAll('.exameow-badge').forEach(el => el.remove());
    /* Remove injected result icons */
    document.querySelectorAll('.exameow-result-icon').forEach(el => el.remove());
    /* Remove injected question number badges */
    document.querySelectorAll('.exameow-q-number').forEach(el => el.remove());
    /* Remove data attributes */
    document.querySelectorAll('[data-exameow-styled]').forEach(el => {
      el.removeAttribute('data-exameow-styled');
      el.removeAttribute('data-exameow-index');
      el.classList.remove('exameow-option-selected', 'exameow-option-correct', 'exameow-option-wrong');
    });
  }

  /* ── MutationObserver for dynamic quiz content ─────────────────── */

  /**
   * Watch for new quiz options being added to the DOM
   * (e.g., when navigating between questions in NotebookLM).
   */
  function startStyleObserver() {
    if (styleObserver) return;

    styleObserver = new MutationObserver((mutations) => {
      if (!v2Active) return;

      let needsUpdate = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              /* Check if the new node is or contains quiz options */
              if (node.matches?.('[role="radio"], [role="checkbox"], mat-checkbox, mat-radio-button') ||
                  node.querySelector?.('[role="radio"], [role="checkbox"], mat-checkbox, mat-radio-button')) {
                needsUpdate = true;
                break;
              }
            }
          }
        }
        /* Also watch for attribute changes (aria-checked, class changes for correct/incorrect) */
        if (m.type === 'attributes' && (m.attributeName === 'aria-checked' || m.attributeName === 'class')) {
          const target = m.target;
          if (target.matches?.('[role="radio"], [role="checkbox"], mat-checkbox, mat-radio-button') ||
              target.closest?.('[role="radio"], [role="checkbox"], mat-checkbox, mat-radio-button')) {
            needsUpdate = true;
          }
        }
        if (needsUpdate) break;
      }

      if (needsUpdate) {
        /* Debounce: wait a tick for Angular to finish its updates */
        clearTimeout(startStyleObserver._debounce);
        startStyleObserver._debounce = setTimeout(() => {
          applyV2Enhancements();
          /* Also update states on all current option groups */
          const allOptions = document.querySelectorAll(
            'mat-checkbox, mat-radio-button, [role="radio"], [role="checkbox"]'
          );
          const groups = groupOptionsByQuestion(allOptions);
          groups.forEach(options => updateOptionStates(options));
        }, 150);
      }
    });

    styleObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-checked', 'class'],
    });
  }

  function stopStyleObserver() {
    if (styleObserver) {
      styleObserver.disconnect();
      styleObserver = null;
    }
  }

  /* ── Notification toast ─────────────────────────────────────────── */

  function showToast(message, type = 'info') {
    const existing = document.getElementById('exameow-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'exameow-toast';
    toast.className = `exameow-toast exameow-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('exameow-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('exameow-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  /* ── Main click handler ─────────────────────────────────────────── */

  let pendingResolve = null;

  function handleClick() {
    const btn = document.getElementById('exameow-quiz-btn');
    if (btn) {
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Extracting…';
    }

    /* First try injected main-world extraction */
    const timeout = setTimeout(() => {
      /* If injected script doesn't respond in 2s, try DOM fallback */
      tryDOMFallback(btn);
    }, 2000);

    pendingResolve = (quiz, title) => {
      clearTimeout(timeout);
      processQuiz(quiz, title, btn);
    };

    window.postMessage({ action: 'EXAMEOW_EXTRACT' }, '*');
  }

  function processQuiz(quiz, title, btn) {
    if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
      /* Try DOM-based fallback */
      tryDOMFallback(btn);
      return;
    }

    const bank = buildBank(quiz, title);
    downloadJSON(bank);

    showToast(`✅ Downloaded ${bank.questions.length} questions as "${bank.name}"`, 'success');

    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Exameow';
    }
  }

  function tryDOMFallback(btn) {
    const quiz = extractFromDOM();
    if (quiz && quiz.length > 0) {
      const title = document.title.replace(/- Gemini Notebook$/i, '').trim() || '';
      const bank = buildBank(quiz, title);
      downloadJSON(bank);
      showToast(`✅ Downloaded ${bank.questions.length} questions (DOM mode)`, 'success');
    } else {
      showToast('❌ No quiz found. Open a quiz in NotebookLM first, then click again.', 'error');
    }

    if (btn) {
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Exameow';
    }
  }

  /* ── Listen for injected.js responses ───────────────────────────── */

  window.addEventListener('message', (event) => {
    if (event.data?.action !== 'EXAMEOW_RESULT') return;

    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;

      if (event.data.error) {
        console.debug('[Exameow] Fallback to DOM mode:', event.data.error);
        resolve(null, '');
      } else {
        resolve(event.data.quiz, event.data.title);
      }
    }
  });

  /* ── Inject main-world script ───────────────────────────────────── */

  function injectMainWorld() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  /* ── Init ────────────────────────────────────────────────────────── */

  function init() {
    injectMainWorld();
    createButton();
    createStyleToggle();

    /* Re-check periodically in case the page navigates within the SPA */
    const observer = new MutationObserver(() => {
      createButton();
      createStyleToggle();
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
