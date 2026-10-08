# Exameow Quiz Downloader for NotebookLM

A browser extension that allows you to download quizzes generated in Google NotebookLM as Exameow-compatible Question Bank `.json` files, and optionally restyle the quiz UI to match Exameow's v2 design.

## Features

- **One-Click Export**: Adds a floating "Exameow" download button to NotebookLM quiz pages.
- **Exameow v2 Style Toggle**: A second floating button ("Exameow Style") lets you transform the NotebookLM quiz into Exameow's Material You-inspired design:
  - Rounded pill option cards with subtle borders and shadows
  - Letter badges (A, B, C, D…) on each option
  - Color-coded feedback: green for correct answers, red for incorrect
  - Check/cross result icons on answered questions
  - Smooth spring animations on interaction
  - Click to toggle back to original style anytime
- **Data Accuracy**: Uses a main-world injected script to read the raw, structured JSON data (`data-app-data`) that NotebookLM uses internally, ensuring the extraction is accurate and doesn't rely entirely on fragile DOM structures.
- **Robust Fallback**: If the internal data cannot be found, it falls back to a DOM-scraping strategy that uses structural heuristics (like `role="radiogroup"`) to extract the questions and answers.
- **Exameow Compatible**: The exported JSON matches Exameow's v2 schema, so you can immediately import it into the Exameow app via the `Import JSON` functionality.

## Installation (Developer Mode)

Since this extension is not published on the Chrome Web Store, you need to load it manually:

1. Open Google Chrome or any Chromium-based browser (Edge, Brave, Arc, etc.).
2. Navigate to the Extensions page: `chrome://extensions/`
3. In the top right corner, enable the **"Developer mode"** toggle.
4. Click the **"Load unpacked"** button in the top left.
5. Select this directory (`extensions/notebooklm-exameow`).
6. The extension should now appear in your list of installed extensions with the Exameow cat icon!

## Usage

### Downloading a Quiz
1. Open [Google NotebookLM](https://notebooklm.google.com/).
2. Create or open a notebook and generate a Quiz using the Studio features.
3. Once the Quiz is visible on your screen, you will see a floating purple **"Exameow"** button in the bottom right corner.
4. Click the button.
5. A `.json` file containing the question bank will be downloaded to your computer automatically, and a toast notification will confirm how many questions were extracted.
6. Open your Exameow app, go to the Question Banks/Practice section, and import the JSON file.

### Toggling Exameow v2 Style
1. While viewing a NotebookLM quiz, click the blue **"Exameow Style"** button (to the left of the download button).
2. The quiz options will transform into Exameow's v2 card design with letter badges and rounded borders.
3. The button turns green and reads **"Original Style"** — click it again to revert.
4. The style automatically adapts when you navigate between questions (via MutationObserver).
5. Correct/incorrect feedback colors apply automatically when NotebookLM reveals answers.

## Technical Details

- **`manifest.json` (Manifest V3)**: Grants permissions for `notebooklm.google.com` and declares the content scripts.
- **`content.js`**: Runs in an isolated world. Injects the UI buttons (download + style toggle), handles the download logic, contains the DOM scraping fallback, and manages the v2 style enhancements (badge injection, state tracking, MutationObserver).
- **`injected.js`**: Runs in the main world. This is necessary because NotebookLM stores the quiz state in a DOM attribute (`data-app-data`), and only main-world scripts have unhindered access to the parsed objects/strings without isolated world restrictions. It extracts the JSON, normalizes it, and sends it to `content.js` via `window.postMessage`.
- **`content.css`**: Styles for the buttons, toast notifications, and the full Exameow v2 quiz restyling (gated behind `.exameow-v2-active` body class). Includes light/dark mode support.
