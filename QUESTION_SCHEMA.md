# Embedded question schema (version 2)

Banks use `schemaVersion: 2`, `id`, `name`, and `questions`. See `examples/question-44.json` for a real, self-contained bank with its original 696 × 364 JPEG embedded in the JSON.

- `questionHeader`: ordered text/image blocks.
- `options`: `{ id, content }` objects. Each `content` is one block, not an array.
- Text block: `{ type: "text", format: "plain" | "html", content: "..." }`. The default format is plain. HTML rendering allows basic formatting only; attributes and active content are removed.
- Image block: `{ type: "image", content: "data:image/jpeg;base64,..." }`. PNG, JPEG, GIF, WebP and BMP are supported. External URLs and SVG are rejected.
- `correctAnswer`: one option ID in an array for `single_choice`, one or more IDs for `multiple_choice`, or `null` if unknown.
- Existing non-choice types remain supported: `true_false`, `fill_blank`, `short_answer`. Their `correctAnswer` is a string or null.
- `explanation`: `{ general: ContentBlock[], byOptionId: Record<string, ContentBlock[]> }`.
- Existing optional subject/chapter/difficulty/score and AI explanation metadata remain supported. No question source document, page or bounding-box fields are stored.

## Import and export

Practice → Import accepts JSON alongside existing CSV/XLSX/XLS imports. Import validation checks duplicate IDs, option references, block shape and embedded-image syntax. The bank export menu offers **JSON (with images)**. This export preserves image bytes and all content blocks. CSV, XLSX and legacy Word export remain text-oriented; image banks are directed to JSON rather than silently losing figures.

Legacy `stem` / string options / `answer` / `analysis` questions are converted at import, AI response and storage boundaries. `multi_choice` is accepted on input and becomes `multiple_choice`. Existing question IDs stay unchanged, preserving bank-linked mistake history. Option shuffling changes display order only. Selections use JSON-encoded arrays of option IDs, including for online exams; display letters are derived from current order. Unknown answers remain ungraded.

Question banks, generated questions, sessions and joined-exam review data are stored as JSON strings in IndexedDB. Images remain base64 strings inside the same JSON; there is no asset store or deduplication. On first launch, existing localStorage data is copied and normalized; old records are retained as rollback copies. Startup migration errors are shown without deleting original data. Import confirmation waits for its IndexedDB transaction to complete. Background save failures display a persistent alert.

## Backend and release compatibility

The shared TypeScript model, Cloudflare Worker and Rust core/server use the same wire structure. Generation prompts request the new fields. Both online exam backends project only IDs, type, header and options before submission, omitting answers and explanations. Existing relay payload size limits still apply.

Ship frontend and backend together. Native apps must be rebuilt with the updated Rust core. Before a native release, bump the application version and OTA `minShell` to that release: old native binaries cannot receive the new question payload through a frontend-only OTA update.

This change implements the schema, rendering and JSON import/export. PDF figure extraction and vision-based AI assistance are separate work. Text-only AI assistance is explicitly blocked for image questions rather than sending incomplete visual context.

## Verification

- `pnpm test:schema`
- `pnpm --dir frontend run type-check`
- `pnpm --dir frontend run build-only`
- `cd workers && npm ci && npm run typecheck`
- `cargo test -p exameow-core -p exameow-server`
