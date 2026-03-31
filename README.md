# Flowbench 🌊

Flowbench is a lightweight JSON-driven workflow engine for orchestrating LLMs, APIs, and tools. Non-developers run AI tasks via intuitive auto-generated forms; developers build reusable graphs for CLI automation or cron jobs. Fills the gap between enterprise platforms like Zapier and basic ChatGPT wrappers.

---

## 🚀 Key Features

*   **Self-Documenting:** This README is self-generated using the `meta/readme` graph, showcasing Flowbench's self-improving capabilities.
*   **Dual Interfaces:** Web UI with auto-generated forms and output cards for non-dev users (marketing, VAs, content creators); CLI mode for scripted execution and automation.
*   **Modular node-based system:** Connect nodes via `$id` references for complex, parallelizable workflows with caching for efficiency.
*   **Secure local-only operation:** API keys stored in `.env` (gitignored); graphs shareable without key exposure.
*   **Multi-LLM support:** (Grok, Gemini) with tools (web/X search), file I/O, Git integration, RSS, TTS, image generation.
*   **Advanced Engine:** Graph validation, templating (`{{:datenow}}`), schema extraction, and `entryPoints` for multi-output graphs.

---

## 🛠 Getting Started

*   **Prerequisites:** Node.js 18+, API keys in `.env` (e.g., `API_KEY_GROK=sk-...`, `BASE_URL_GROK=https://api.x.ai/v1`).
*   **Install:** 
    ```bash
    git clone https://github.com/johnmichaeljimenez/flowbench && cd flowbench && npm install
    ```
*   **CLI mode:** `node app.js graphs/<graph>/index.json [startNode] [--nodeId.inputField value]` 
    *(e.g., `node app.js graphs/chatbot/index.json out1 --userInput.string "Hello"`. Outputs JSON.)*
*   **Web UI mode:** `node index.js` (or `npm run dev`), open `http://localhost:3000`. Browse graphs via menu, fill forms, view markdown/tables/audio outputs.
*   **Editor:** `public/editor.html` with Monaco JSON editor (File > New/Open/Save; loads `template.json`).

---

## ⚙️ Usage

*   **Graphs:** JSON files with `graph` (array of nodes), optional `form` (auto-generates UI), `output` (cards), `meta` (name/description/notifyOnEnd), `entryPoints` (multi-start).
*   **Nodes:** `{id: 'unique', type: 'nodeType', input: {key: value|$ref.property}}`. References (`$id`) resolve lazily with caching (cycle-safe).
*   **Processing:** Starts at `out1` or `entryPoints`; resolves inputs recursively, executes handlers, normalizes to `{value}`. Supports templates `{{:datenow}}`.
*   **Custom graphs:** Copy `template.json`, add nodes (see node list), validate via `engine.js`, test CLI/UI. Params override inputs (CLI `--` or form).
*   **Dev tips:** `nodeMetadata` defines validation/UI; extend by adding `nodes/*.js`.

---

## 📋 Example Graphs

| Name | Description | Key Features | Used For |
| :--- | :--- | :--- | :--- |
| **Flowbench README** | Self-improving README generator | Loads full codebase blob + template; LLM formats into Markdown | Auto-generating repo docs |
| **Project Manager** | Evaluates project status/scope | Loads project desc/TODO/codebase; structured report | Solo dev project oversight |
| **Resume Generator** | Evaluates/summarizes credentials | Multi-LLM pipeline; market research via tools | ATS-optimized resumes |
| **Meal Plan maker** | Create a full meal plan | Rich form; realtime prices; Markdown report | Personalized meal planning |
| **Chatbot** | Basic chatbot with history | Persistent history/memory files; dual LLMs | Stateful conversational AI |
| **Idea Generator** | Evaluates raw idea notes | Parallel LLMs + combiner; strengths/weaknesses | Refining scratch notes |
| **Flowbench Help** | Coding assistant graph | Codebase blob query; toggle blob-only vs. LLM | Repo-specific Q&A |
| **PH Latest news** | Up-to-date important news | Multi-RSS join; location-aware summary | PH news briefing |
| **Quick Assistant** | Google Gemini 3.1 Flash | Simple single-LLM query; auto-clear | Fast Q&A |

---

## 🧩 Node List

| Name | Parameters | Outputs | Used For |
| :--- | :--- | :--- | :--- |
| **Call LLM** | systemPrompt, userPrompt, maxTokens, temperature, testMode, apiKey, baseURL, model, useTools | value, fullPrompt, modelUsed, tokensUsed | Sends prompts to LLMs |
| **Choose (Branch)** | condition, trueSource, falseSource | value, boolValue | Simple if/else logic |
| **Constant String** | string | value | Fixed text value |
| **Execute Shell** | command, fireAndForget | value | Runs shell commands |
| **Fetch API** | url, schema | value, code | HTTP GET requests |
| **Fetch RSS** | url, fields | value | Parses RSS to JSON |
| **Git List Files** | repoPath, commitHash | value | Extract files from commit |
| **Git List Staged** | repoPath | value | Review staged files |
| **Join Strings** | sources, separator, fileSeparator | value | Combines strings |
| **Load Text Blob** | path, whitelist, blacklist, maxFileSizeMB, etc. | value | Loads many files into one blob |
| **Output Log** | source | value | Console/Frontend logging |
| **Read Text File** | path, allowNonExistingFile | value | Reads single file |
| **Template String** | template, sources | value | Fills placeholders |
| **Text to Image** | prompt, outputPath, aspectRatio, etc. | value, filePath, imageBase64, etc. | Generates images (Grok) |
| **Text to Speech** | text, voiceId, apiKey, etc. | value, filePath, audioBase64, etc. | Converts text to audio |
| **Write Text File** | source, path, append, encoding, forceWrite | value, filePath | Saves content to file |

---

## 🗺 Roadmap

*   Grok Imagine API video node.
*   Grok Imagine API image-to-image node (add boolean parameter to treat prompt as base64 image source).
*   Image upload form input as base64 string.

---

## 📜 License

Distributed under the MIT License. See LICENSE for more information.