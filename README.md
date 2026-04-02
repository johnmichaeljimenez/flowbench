# Flowbench 🌊

Flowbench is a lightweight LLM-powered workflow engine that orchestrates complex AI tasks via simple JSON graphs and auto-generated web forms. Non-developers can build chatbots, reports, meal plans, and automations through intuitive UIs without coding, while developers leverage CLI execution, modular nodes, and Git integration for powerful scripting.

---

## ✨ Key Features

*   **Self-Improving:** This README is self-generated using the meta/readme graph, showcasing Flowbench's self-improvement capabilities.
*   **Dual Execution Modes:** CLI for automation/scripts/cron jobs and Web UI with auto-generated forms for non-technical users.
*   **Modular Node System:** Composing reusable workflows with LLM calls, file I/O, RSS fetching, Git ops, TTS, and image generation.
*   **Multi-LLM Support:** Grok, Gemini, LM Studio with real-time tools (web/X search) for current data.
*   **Secure:** Local-only operation with API keys confined to `.env`; graphs are sharable without key exposure.
*   **Robust Processing:** Built-in validation, caching (cycle-safe), templating, and notifications.
*   **Rich Frontend:** Outputs as formatted cards (Markdown tables, audio previews) with copy/download actions.

---

## 🚀 Getting Started

1.  **Clone the repo:** `git clone https://github.com/johnmichaeljimenez/flowbench && cd flowbench`
2.  **Install dependencies:** `npm install`
3.  **Set up .env:** Create a `.env` file with API keys (e.g., `API_KEY_GROK=yourkey`, `BASE_URL_GROK=https://api.x.ai/v1`).
4.  **CLI mode:** `node app.js graphs/meal-plan/index.json --ingredients.string "chicken rice"` (override params with `--nodeId.input` value).
5.  **Web UI mode:** `node index.js` (or `npm run dev`), open `http://localhost:3000`, select a graph from the menu, fill form, and submit.
6.  **Editor:** Open `public/editor.html` for JSON graph creation/editing with Monaco (new/open/save support).

---

## 🛠 Usage

*   **Graphs:** JSON files with a `graph` array of nodes. Reference outputs via `$nodeId` (or `$nodeId.property` for paths).
*   **Resolution:** Node inputs support literals, `$refs`, arrays/objects; engine resolves dependencies, applies defaults/templates, validates schema/reqs, and caches results.
*   **Building:** Use `constantString` for values, `templateString`/`joinString` for composition, `callLLM` for AI, and file nodes for I/O. Entry points are defined via the `entryPoints` array.
*   **Forms:** Auto-generate from the `form` array (textfield/textarea/number/checkbox/dropdown/uploadText); outputs via `output.cards` with id refs and types (text/markdown/csv).
*   **Testing:** Set `testMode:true` on `callLLM`; override params via CLI flags or form `storeLast` for persistence.
*   **Editor:** `public/editor.html` loads `template.json`; validate via engine before running.

---

## 📋 Example Graphs

| Name | Description | Key Features | Used For |
| :--- | :--- | :--- | :--- |
| **Project Manager** | Evaluates project status and scope | Loads codebase/TODO/description, generates report | Solo project oversight |
| **Flowbench README** | Self-improving README generator | Ingests code/blob/template, formats Markdown | Auto-generating repo docs |
| **Resume Generator** | Evaluates credentials vs. market | Multi-LLM pipeline: draft → eval → polish | Job applications |
| **Idea Generator** | Evaluates raw idea notes | Parallel ideas + combiner LLM | Refining scratch notes |
| **Meal Plan maker** | Full meal plan creator | Form-heavy, real-time pricing/tools | Daily cooking plans |
| **Code Scaffold** | Coding project assistant | JSON scaffold → LLM code gen → batch write | Bootstrap projects |
| **PH Latest news** | RSS 2.0 aggregation | Multi-RSS fetch/join, location-aware | News briefs |
| **Flowbench Help** | Coding assistant | Text blob ingestion for Q&A | Project self-help |
| **Chatbot** | Persistent conversation | History/memory files, tools-enabled | Conversations |
| **Chess SWAT** | Chess log to drama script | Chess log → analysis → dramatic script | Creative transformations |
| **Quick Assistant** | Google Gemini 3.1 Flash | Simple Q&A with low temp | Fast queries |

---

## 🧩 Node List

| Node | Parameters | Outputs | Used For |
| :--- | :--- | :--- | :--- |
| **Call LLM** | systemPrompt, userPrompt, maxTokens, temp, testMode, apiKey, baseURL, model, useTools | value, fullPrompt, modelUsed, tokensUsed | LLM API calls |
| **Choose (Branch)** | condition, trueSource, falseSource | value, boolValue | If/else branching |
| **Constant String** | string | value | Fixed text values |
| **Execute Shell** | command, fireAndForget | value | Shell execution |
| **Fetch API** | url, schema | value, code | HTTP GET requests |
| **Fetch RSS** | url, fields | value | RSS parsing |
| **Git List Files** | repoPath, commitHash | value | Extract from commit |
| **Git List Staged** | repoPath | value | Review staged files |
| **Join Strings** | sources, separator, fileSeparator | value | Combine strings |
| **Load Text Blob** | path, whitelist, blacklist, maxFileSizeMB, etc. | value | Recursive file loading |
| **Output Log** | source | value | Console/Frontend logs |
| **Read Text File** | path, allowNonExistingFile | value | Read single file |
| **Template String** | template, sources | value | Fill placeholders |
| **Text to Image** | prompt, outputPath, aspectRatio, etc. | value, filePath, base64 | Grok Imagine generation |
| **Text to Speech** | text, voiceId, apiKey, etc. | value, filePath, base64 | ElevenLabs TTS |
| **Write Batch** | sources, path, encoding, forceWrite | value, writtenFiles | Save multiple files |
| **Write Text File** | source, path, append, encoding, forceWrite | value, filePath | Save single file |

---

## 🗺 Roadmap

*   Grok Imagine API video node.
*   Grok Imagine API image-to-image node.
*   Image upload form input as base64 string.
*   Add 'save as' button on text output cards.

---

## ⚖️ License

Distributed under the MIT License. See LICENSE for more information.