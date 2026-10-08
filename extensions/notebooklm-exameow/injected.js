/* ======================================================================
   injected.js — runs in the MAIN WORLD so it can read [data-app-data].
   Extracts NotebookLM quiz JSON and posts it back to the content script.
   ====================================================================== */
(function () {
  'use strict';

  /* Respond to extraction requests from the content script */
  window.addEventListener('message', (event) => {
    if (event.data?.action !== 'EXAMEOW_EXTRACT') return;

    try {
      const appRoot = document.querySelector('[data-app-data]');
      if (!appRoot) {
        window.postMessage({ action: 'EXAMEOW_RESULT', error: 'No [data-app-data] element found on this page.' }, '*');
        return;
      }

      const raw = appRoot.getAttribute('data-app-data');
      if (!raw) {
        window.postMessage({ action: 'EXAMEOW_RESULT', error: 'data-app-data attribute is empty.' }, '*');
        return;
      }

      /* Unescape HTML entities that Google may inject */
      const clean = raw
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");

      const data = JSON.parse(clean);

      /* Locate quiz array — may be at data.quiz or data.mostRecentQuery.quiz */
      const quiz = data.quiz
        || (data.mostRecentQuery && data.mostRecentQuery.quiz)
        || null;

      /* Also grab notebook title */
      const title = data.title || data.notebookTitle || '';

      window.postMessage({
        action: 'EXAMEOW_RESULT',
        quiz,
        title,
        rawKeys: Object.keys(data),      // debug aid
      }, '*');
    } catch (err) {
      window.postMessage({ action: 'EXAMEOW_RESULT', error: String(err) }, '*');
    }
  });

  /* Signal readiness */
  window.postMessage({ action: 'EXAMEOW_INJECTED_READY' }, '*');
})();
