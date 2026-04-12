# Flowbench 🌊

Flowbench is a lightweight JSON-driven workflow engine designed for orchestrating LLM API calls, file I/O operations, database queries, Git integrations, and external APIs through simple node-based graphs. Non-developers interact via intuitive auto-generated web forms for everyday automations like meal planning or resume generation, while developers leverage CLI execution, extensible nodes, and visual graph previews for complex scripting and self-improving codebases.

---

## 💡 Why Flowbench

*   **Non-developers:** Run powerful LLM-powered workflows (e.g., personalized meal plans, project status reports, or resume builders) using simple web forms—no coding, nodes, or JSON required.
*   **Developers:** Define reusable workflows as portable JSON graphs with a rich node library for file ingestion, LLM chaining, Git analysis, and more; execute via CLI for scripts/cron jobs or web UI for testing.
*   **Lightweight and local-first:** Runs entirely on localhost with .env-based API keys; no cloud dependencies, vendor lock-in, or complex setups—ideal for personal projects, VAs, content creators, and solo devs.
*   **Self-improving:** Graphs like 'project manager' analyze your codebase against TODOs, while 'meta/readme' auto-generates this README from source code and tasks.
*   **Pragmatic extensibility:** Add custom nodes easily; supports real-time LLM tools (e.g., web/X search), Turso DBs, Notion, ElevenLabs TTS, Grok Imagine, and GitHub crawling without bloat.
*   **Cost-effective:** Optimized for low-token LLM usage with test modes, caching, and precise field extraction; handles large repos via filtered text blobs.

---

## 🚀 Key Features

*   This README is self-generated using the 'meta/readme' graph, which ingests source code, TODOs from Notion, and a JSON template via LLM processing.
*   **Dual-mode operation:** CLI for headless execution (node app.js graphs/xxx.json) and web UI (npm run dev) with auto-generated forms and output cards.
*   **Node-based graphs:** Connect 20+ built-in nodes for LLM calls, file batching, RSS fetching, Git analysis, DB ops, TTS, image gen, and more; full validation and Mermaid visualization.
*   **Form automation:** Graphs define user-friendly inputs (text, checkboxes, file uploads, numbers) with persistence, advanced toggles, and auto-clear.
*   **Output flexibility:** Render Markdown, tables (CSV/TSV), audio players, PDFs, images, and downloads; CLI outputs JSON.
*   **Integrations:** Grok/Gemini/LM Studio LLMs (with tools), GitHub API, Turso DB, Notion databases, ElevenLabs TTS, Grok Imagine, RSS feeds.
*   **Safety and efficiency:** Env-only API keys, size/depth limits on file ingestion, disabled shell execution, graph caching, and local file writing with force options.

---

## 🛠 Getting Started

1.  **Clone the repo:** `git clone https://github.com/johnmichaeljimenez/flowbench && cd flowbench`
2.  **Install dependencies:** `npm install`
3.  **Set up .env:** Create a `.env` file in the root directory and add your API keys (e.g., `API_KEY_GROK=...`, `BASE_URL_GROK=https://api.x.ai/v1`, `API_KEY_GEMINI=...`, etc.). Full list in graphs.
4.  **Web UI (for forms/non-devs):** `npm run dev` (runs on http://localhost:3000)
5.  **CLI mode (for devs/scripts):** `node app.js graphs/xxx/index.json [startNode] [--nodeId.input value]` (e.g., `node app.js graphs/quick-assistant/index.json --userInput.string "What is Flowbench?"`)
6.  **Editor mode:** Open `http://localhost:3000/editor.html` to create/edit JSON graphs with Monaco editor and live Mermaid preview.
7.  **Run a graph:** In web UI, select from list (e.g., 'Quick Assistant'), fill form, submit. CLI outputs JSON to stdout.

---

## 📖 Usage

*   **Graphs:** JSON objects with `graph` (array of nodes), `form` (UI inputs), `output` (cards), and `meta` (name/description). Nodes reference outputs via `$nodeId.property`.
*   **Node flow:** Define nodes with id/type/input; inputs support `$refs`, templates `{{:datenow}}`, and defaults. Engine resolves dependencies, caches results, validates structure.
*   **Custom graphs:** Use Monaco editor for JSON; preview Mermaid graph; save as `graphs/mygraph/index.json`. Forms auto-map to `node.input.field` (e.g., id: "llm.userPrompt" sets `llm.input.userPrompt`).
*   **Extending:** Add `nodes/xxx.js` with default export handler and `nodeMetadata {type, name, inputs/outputs}`. Engine auto-loads from `nodes/`.
*   **Advanced:** Entry points for multi-output, params override (`--node.input value`), `localMode` for file writes, `notifyOnEnd` for desktop alerts.
*   **Example node chain:** `constantString` → `templateString` → `callLLM` → `writeToTextFile`.

---

## 🧩 Example Graphs

| Name | Description | Key Features | Used For |
| :--- | :--- | :--- | :--- |
| **meta/readme** | Self-generates this README.md | loadTextBlob, loadNotionData, callLLM | Documentation automation |
| **project manager** | Analyzes project folder/TODOs | loadTextBlob, readFromTextFile, Grok LLM | Solo dev oversight |
| **resume generator** | ATS-optimized Markdown resume | uploadText, callLLM chaining | Job applications |
| **github code help** | Crawls public GitHub repo | githubIngest, multi-LLM select | Repo analysis |
| **meal plan** | Generates meal plans | Multi-checkbox, Grok with tools | Personalized cooking |
| **quick assistant** | General-purpose Q&A | Multi-LLM select, autoclear | Fast queries |
| **flowbench help** | Self-asks questions about codebase | Local codebase ingestion | Internal code assistance |
| **code scaffold** | Generates code files | uploadText, writeBatchToTextFile | Project bootstrapping |
| **idea generator** | Refines raw notes into ideas | uploadText, multi-temp ensemble | Note cleanup |
| **chatbot** | Persistent chat | File read/write, templateString | Conversational agents |
| **PH news** | Aggregates RSS feeds | fetchRss, location-aware filtering | Daily briefings |
| **chess-swat** | Chess logs to SWAT radio scripts | Dual LLM analysis | Creative reinterpretation |
| **msgk** | Mesugaki persona chatbot | System prompt, persistence | Persona testing |

---

## ⚙️ Node List

| Node | Parameters | Outputs | Used For |
| :--- | :--- | :--- | :--- |
| **Call LLM** | systemPrompt, userPrompt, maxTokens, temp, testMode, apiKey, baseURL, model, useTools | value, fullPrompt, modelUsed, tokensUsed | LLM API calls |
| **Choose** | condition, trueSource, falseSource | value, boolValue | If/else branching |
| **Constant String** | string | value | Fixed text values |
| **Execute Shell** | command, fireAndForget | value | Shell commands (stubbed) |
| **Export PDF** | source, path, pageSize, forceWrite | value, base64, filePath | Text to PDF |
| **Fetch API** | url, schema | value, code | HTTP GET requests |
| **Fetch RSS** | url, fields | value | RSS parsing |
| **GitHub Ingest** | owner, repo, ref, path, whitelist, blacklist, limits, token | value | GitHub repo crawling |
| **Git List Files** | repoPath, commitHash | value | Extract from commit |
| **Git List Staged** | repoPath | value | Review staged files |
| **Join Strings** | sources, separator, fileSeparator | value | Combine strings |
| **Load Data (Turso)** | dbName, tableName, columns, filters, limit | value, rows, rowCount | Turso DB queries |
| **Load Notion Data** | apiKey, databaseId, mapping, format | value | Notion DB fetching |
| **Load Text Blob** | path, whitelist, blacklist, limits | value | Recursive file loading |
| **Output Log** | source | value | Console logging |
| **Post API** | url, body, schema | value, code | HTTP POST requests |
| **Read Text File** | path, allowNonExistingFile | value | Read single file |
| **Select** | key, cases, defaultSource | value, matchedKey | Multi-branch selector |
| **Template String** | template, sources | value | Placeholder filling |
| **Text to Image** | prompt, outputPath, aspect, res, model, force, test, apiKey, baseURL | value, filePath, base64, mime, filename | Grok Imagine gen |
| **Text to Speech** | text, voiceId, apiKey, outputPath, modelId, format, stability, boost, force | value, filePath, audioBase64, filename | ElevenLabs TTS |
| **Write Batch** | sources, path, encoding, forceWrite | value, writtenFiles | Multi-file output |
| **Write Data (Turso)** | dbName, tableName, data | value, insertedCount | Turso DB inserts |
| **Write Text File** | source, path, append, encoding, forceWrite | value, filePath | Save to file |

---

## 🗺 Roadmap

*   Grok Imagine API video node
*   Greenscreen editor example graph
*   Grok Imagine API image-to-image node
*   Image upload form input as base64 string
*   Minify property for loadTextBlob and githubIngest
*   Add `showIf` property for form inputs
*   Add Mermaid output card
*   Save Mermaid graph as PNG in Monaco editor

---

## 📜 License

Distributed under the MIT License. See LICENSE for more information.