# Flowbench 🌊

Flowbench is a lightweight, LLM-powered workflow engine that orchestrates complex AI tasks through simple JSON graphs. Non-developers interact via auto-generated web forms for everyday automation like meal planning, news summaries, or resume generation, while developers customize with a modular node system. Dual CLI and web UI support makes it ideal for both interactive use and scripted automation.

---

## 🚀 Key Features

*   **Self-Documenting:** This README is self-generated using the `meta/readme` graph, showcasing Flowbench's self-improving capabilities.
*   **Dual Operation Modes:** CLI for automation and cron jobs (`node app.js graph.json`), Web UI with auto-generated forms for non-technical users (`localhost:3000`).
*   **Modular Node System:** 24+ built-in nodes for LLM calls, file I/O, GitHub ingestion, RSS fetching, Turso DB, TTS, image generation, and more.
*   **Robust Engine:** Graph validation, input resolution with `$refs`, caching for shared nodes, and template placeholders like `{{:datenow}}`.
*   **Secure Local-first Design:** API keys in `.env` (gitignored), no cloud dependency, supports Grok, Gemini, LM Studio.
*   **Frontend Persistence:** Uses `localStorage` for form values, advanced input toggles, markdown/CSV/TSV output rendering, and SVG extraction.
*   **Production-ready:** Handles large repos (GitHub/Turso), batch file writes, realtime tools (web/X search), and notifications on completion.

---

## 🛠 Getting Started

1.  **Clone the repository:** `git clone https://github.com/johnmichaeljimenez/flowbench && cd flowbench`
2.  **Install dependencies:** `npm install`
3.  **Configure .env:** Add your API keys (e.g., `API_KEY_GROK`, `BASE_URL_GROK`, `GEMINI`, `LM Studio`, `Turso`, `ElevenLabs`, `GitHub PAT`).
4.  **CLI mode:** `node app.js graphs/<name>/index.json [startNode] [--nodeId.input value]` (e.g., `node app.js graphs/quick\ assistant/index.json --userInput.string 'Hello'`). Outputs JSON to console.
5.  **Web UI mode:** `node index.js` (or `npm run dev`). Open `http://localhost:3000`, select a graph from the menu, fill form, submit. Results render as cards with copy/download.
6.  **Editor mode:** Use `public/editor.html` with Monaco JSON editor for creating graphs (new/open/save). Validate via `engine.js`.
7.  **Example:** Run 'quick assistant' graph for instant LLM queries with model selection.

---

## 📖 Usage

*   **Graph Structure:** Graphs are JSON files with `graph` (array of nodes), `form` (auto-generates UI inputs), `output` (cards for results), and `meta` (name/description/notifyOnEnd).
*   **Dependency Resolution:** Nodes reference outputs via `$nodeId.property` (e.g., `$llmChat.value`). The engine starts at `out1` or `entryPoints`, resolving dependencies recursively with caching.
*   **Building Graphs:** Define nodes with inputs (supports refs/defaults/types), connect via `$refs`. Use `templateString` for prompts, `callLLM` for AI, and file nodes for I/O.
*   **Dev Workflow:** Edit JSON in Monaco, validate with `engine.validateGraph(data)`, process with `processGraph(data)`. Extend by adding `nodes/*.js` with `nodeMetadata`.
*   **Params Override:** CLI `--node.input value` or form submission. Supports `{{:datenow}}` templating.

---

## 📊 Example Graphs

| Name | Description | Key Features | Used For |
| :--- | :--- | :--- | :--- |
| **Flowbench README** | Self-improving README generator | LLM chain for Markdown | Auto-generating docs |
| **Quick Assistant** | Gemini/Grok/LM Studio helper | Model selector, SVG charts | Fast Q&A, images |
| **Chatbot** | Stateful chatbot | History/memory files | Conversational AI |
| **Project Manager** | Project status evaluator | Structured LLM report | Project health checks |
| **Resume Generator** | ATS-optimized resume builder | Market research, LLM chain | Job applications |
| **GitHub code help** | Repo-specific assistant | GitHub ingestion | Code analysis |
| **Meal Plan maker** | Personalized meal planner | Multi-checkbox forms | Meal planning |
| **Idea Generator** | Raw note refiner | Ensemble reasoning | Refining ideas |
| **PH Latest news** | RSS aggregator | Location-aware summary | News briefs |
| **Code Scaffold** | Multi-file generator | Batch file writing | Project skeletons |
| **Chess SWAT** | Creative reinterpretation | Chess log analysis | Creative writing |
| **Flowbench Help** | Self-help assistant | Code blob ingestion | Project Q&A |

---

## 🧩 Node List

| Node Name | Parameters | Outputs | Used For |
| :--- | :--- | :--- | :--- |
| **Call LLM** | systemPrompt, userPrompt, maxTokens, temp, apiKey, baseURL, model, useTools | value, fullPrompt, modelUsed, tokensUsed | LLM API calls |
| **Choose (Branch)** | condition, trueSource, falseSource | value, boolValue | If/else branching |
| **Constant String** | string | value | Fixed text values |
| **Execute Shell** | command, fireAndForget | value | Shell commands |
| **Fetch API** | url, schema | value, code | HTTP GET requests |
| **Fetch RSS** | url, fields | value | RSS parsing |
| **GitHub Ingest** | owner, repo, ref, path, whitelist, blacklist, etc. | value | Repo text ingestion |
| **Git List Files** | repoPath, commitHash | value | Extract from commit |
| **Git List Staged** | repoPath | value | Review staged files |
| **Join Strings** | sources, separator, fileSeparator | value | Combine strings |
| **Load Data (Turso)** | dbName, tableName, columns, filters, limit | value, rows, rowCount | Database SELECT |
| **Load Text Blob** | path, whitelist, blacklist, etc. | value | Recursive file load |
| **Output Log** | source | value | Console logging |
| **Post API** | url, body, schema | value, code | HTTP POST requests |
| **Read Text File** | path, allowNonExistingFile | value | Read single file |
| **Select** | key, cases, defaultSource | value, matchedKey | Multi-branch logic |
| **Template String** | template, sources | value | Placeholder filling |
| **Text to Image** | prompt, outputPath, etc. | value, filePath, base64 | Grok Imagine API |
| **Text to Speech** | text, voiceId, apiKey, etc. | value, filePath, base64 | ElevenLabs TTS |
| **Write Batch Files** | sources, path, encoding, forceWrite | value, writtenFiles | Batch file writing |
| **Write Data (Turso)** | dbName, tableName, data | value, insertedCount | Database INSERT |
| **Write Text File** | source, path, append, etc. | value, filePath | Save file |

---

## 🗺 Roadmap

*   Grok Imagine API video node.
*   Grok Imagine API image-to-image node.
*   Image upload form input as base64 string.
*   Parallel request running.
*   Export PDF node.
*   `showIf` property for form inputs.

---

## ⚖️ License
Distributed under the MIT License. See LICENSE for more information.