# Flowbench 🌊

Flowbench is a lightweight, local-first JSON workflow engine designed for orchestrating LLM-powered automations and data pipelines. Non-developers can use intuitive auto-generated forms for tasks like meal planning, fitness tracking, or news summaries—no coding needed. Developers benefit from a flexible node-based system, CLI execution, and easy custom graph creation for complex workflows.

---

## 💡 Why Flowbench
*   **Local-only execution** ensures privacy and speed—no cloud dependencies or vendor lock-in.
*   **Dual-mode usability:** Web UI with forms for non-devs (marketing, VAs, execs) and CLI for devs/scheduling.
*   **JSON graphs** are human-readable, shareable, and versionable—edit in any text editor.
*   **Production-ready nodes** for LLMs (Grok, Gemini, Groq, LM Studio), file I/O, GitHub/Notion integration, and more.
*   **Cost-transparent:** Detailed token usage logs per LLM call, with tool support (web/X search).
*   **Self-improving:** This README was generated using the meta/readme graph example.

---

## 🚀 Key Features
*   **Node-based JSON graphs** with automatic validation, dependency resolution, and Mermaid visualization.
*   **CLI mode:** `flowbench graphs/mygraph.json [startNode] [--viz] [--key value]` for scripting/cron jobs.
*   **Web UI:** Auto-generates forms from graph metadata and displays rich outputs (Markdown, PDF, audio, tables).
*   **Extensible node system:** 25+ built-in nodes for LLMs, files, databases (Turso), Notion, GitHub, RSS, etc.
*   **Form builder:** Text, checkboxes, dropdowns, file uploads, numbers—with persistence and advanced options.
*   **Self-generated README:** This document was produced via the `graphs/meta/readme/index.json` graph, showcasing real-world meta-capabilities.

---

## 🛠 Getting Started
1.  **Clone the repo:** `git clone https://github.com/johnmichaeljimenez/flowbench && cd flowbench`.
2.  **Install:** `npm install`.
3.  **Set up `.env`** with API keys (e.g. `API_KEY_GROK=yourkey`, `BASE_URL_GROK=https://api.x.ai/v1`).
4.  **CLI:** `./app.js graphs/quick assistant/index.json --viz` (generates graph.png) or run without `--viz` for JSON output.
5.  **Web UI:** `npm run dev` (runs on http://localhost:3000)—select a graph, fill form, submit.
6.  **Editor:** Open http://localhost:3000/editor.html for Monaco JSON editing + live Mermaid preview.
7.  **Graphs in `graphs/` folder:** Copy/modify for custom use; web UI auto-lists them.

---

## ⚙️ Usage
*   Graphs are JSON objects with `graph` (array of nodes), `form` (UI inputs), `output` (result cards), and `meta` (name/description).
*   Nodes reference outputs via `$nodeId.output` (e.g. `$llmChat.value`); supports templates `{{:datenow}}`, `{{:sessionId}}`.
*   Build custom graphs: Define nodes with `id`, `type`, `input`; engine resolves dependencies automatically.
*   Entry points: Run specific nodes via `entryPoints` array or default `out1`.
*   Dev tip: Use `validateGraph(graphData)` from engine.js; extend by adding JS files to `nodes/`.
*   Example node chain: constantString → templateString → callLLM → writeToTextFile.

---

## 📂 Example Graphs

| Name | Description | Key Features | Used For |
| :--- | :--- | :--- | :--- |
| **meta/readme** | Self-generates this README.md using source code, TODOs, and a JSON template. | Loads code blob, Notion TODOs, LLM formatting—proves meta/self-improvement capabilities. | Documentation automation and project introspection. |
| **quick assistant** | Fast Q&A with multiple LLMs (Gemini, Grok, Groq OSS/Qwen, LM Studio); supports SVG charts. | Model selector, realtime tools, image gen; form-persistent settings. | Everyday queries, local AI chat. |
| **coding assistant** | Context-aware code analysis/gen from project folder; Gemini or Grok. | Text blob loading (whitelist/blacklist), blob-only or LLM mode. | Project reviews, bug fixes, refactoring ideas. |
| **fitness monitor** | Analyzes Notion-tracked stats/activity/diet; generates Markdown/PDF reports. | Multi-DB Notion fetch (CSV), model selector, template integration. | Personal health tracking and insights. |
| **github code help** | Ingests public GitHub repo files for LLM analysis; PAT for rate limits. | Tree API fetch, filters (path/whitelist/blacklist), multi-model support. | Repo reviews, OSS code explanations. |
| **project manager** | Evaluates project status from codebase, TODO.txt, description. | Strategic LLM report (status, strengths/weaknesses, priorities). | Solo dev project oversight. |
| **resume generator** | Turns scrap notes into ATS-optimized resume + market research. | Multi-LLM chain (draft → eval → polish), realtime competitor analysis. | Job applications. |
| **chatbot** | Persistent chat with history/memory; optional realtime search. | File-based state, memory updater LLM. | Conversational agents. |
| **code scaffold** | Generates project files from JSON scaffold + instructions. | Batch file writer, LLM or direct JSON mode. | Boilerplate code gen. |
| **meal plan** | Custom meal plans from ingredients/budget/preferences. | Checkbox prefs/appliances, realtime price search. | Daily cooking ideas. |
| **idea generator** | Refines raw notes into evaluated ideas via ensemble LLMs. | Multi-temp generation + consolidation. | Brainstorming cleanup. |
| **PH news** | Aggregates/summarizes RSS feeds, location-aware prioritization. | Multi-RSS join, weather/emergency focus. | Local news briefs. |
| **chess-swat** | Transforms chess logs into dramatic SWAT radio scripts. | Two-stage LLM (analysis → dramatization). | Creative reinterpretations. |
| **msgk** | Mesugaki persona chatbot with prompt injection defense. | History persistence, character enforcement. | Fun PoC roleplay. |
| **flowbench help** | Self-help for Flowbench codebase via text blob. | Project introspection. | Internal docs. |

---

## 🧩 Node List

| Name | Parameters | Outputs | Used For |
| :--- | :--- | :--- | :--- |
| **callLLM** | systemPrompt, userPrompt, maxTokens, temperature, testMode, apiKey, baseURL, model, useTools | value, fullPrompt, modelUsed, tokensUsed | Queries Grok/Gemini/Groq/LM Studio; logs tokens/tools. |
| **choose** | condition, trueSource, falseSource | value, boolValue | Simple if/else branching. |
| **constantString** | string | value | Fixed text values. |
| **executeShell** | command, fireAndForget | value | Shell commands (stubbed). |
| **exportPDF** | source, path, pageSize, forceWrite | value, base64, filePath | Markdown-to-PDF. |
| **fetchApi** | url, schema | value, code | HTTP GET. |
| **fetchRss** | url, fields | value | RSS 2.0 parsing. |
| **findString** | text, keyword, useRegex, trueSource, falseSource | value, found | String search branching. |
| **githubIngest** | owner, repo, ref, path, whitelist, blacklist, maxFileSizeMB, maxTotalSizeMB, maxDepth, githubToken | value | Fetches/filter GitHub repo tree. |
| **gitListFilesFromCommit** | repoPath, commitHash | value | Extracts changed files from Git commit. |
| **gitListStagedFiles** | repoPath | value | Reviews staged Git files. |
| **joinString** | sources, separator, fileSeparator | value | Concatenates strings. |
| **loadData** | dbName, tableName, columns, filters, limit | value, rows, rowCount, dbName | SELECT from Turso DB. |
| **loadNotionData** | apiKey, databaseId, mapping, format | value | Notion DB to JSON/CSV/TSV. |
| **loadTextBlob** | path, whitelist, blacklist, maxFileSizeMB, maxTotalSizeMB, maxDepth | value | Recursive folder text files into blob. |
| **outputLog** | source | value | Console/UI logging. |
| **postApi** | url, body, schema | value, code | HTTP POST. |
| **readFromTextFile** | path, allowNonExistingFile | value | Single file read. |
| **replaceString** | text, replacements, ignoreCase, useRegex | value | Multi-find/replace. |
| **select** | key, cases, defaultSource | value, matchedKey | Switch-like multi-branch. |
| **templateString** | template, sources | value | Placeholder filling. |
| **textToImage** | prompt, outputPath, aspectRatio, resolution, model, forceWrite, testMode, apiKey, baseURL | value, filePath, imageBase64, mimeType, filename | Grok Imagine image gen. |
| **tts** | text, voiceId, apiKey, outputPath, modelId, outputFormat, stability, similarityBoost, forceWrite | value, filePath, audioBase64, filename | ElevenLabs speech synthesis. |
| **writeBatchToTextFile** | sources, path, encoding, forceWrite | value, writtenFiles | JSON {path: content} to files. |
| **writeData** | dbName, tableName, data | value, insertedCount, dbName, tableName | INSERT to Turso. |
| **writeToTextFile** | source, path, append, encoding, forceWrite | value, filePath | File write/append. |

---

## 🗺 Roadmap
*   Add `showIf` property for form inputs: Conditionally show fields based on another input's value equality.
*   Add local session id: Generate unique session ID on graph load in frontend for disposable chatbots.
*   Add `callLLM` auto retry mechanism: Implement retries for transient LLM API failures.

---

## 📜 License
Distributed under the MIT License. See LICENSE for more information.