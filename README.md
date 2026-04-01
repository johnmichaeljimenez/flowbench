# Flowbench

Flowbench is a lightweight LLM-powered workflow orchestration engine that defines complex AI-driven tasks as simple JSON graphs. Non-developers interact via intuitive auto-generated web forms for tasks like meal planning, resume generation, or news summarization; developers leverage CLI execution, extensible nodes, and integrations like Git, RSS, TTS, and image generation. Secure, local-only operation with API keys in .env. This README is self-generated using the meta/readme graph.

---

## 🚀 Key Features

*   **Self-Documenting:** This README is self-generated with the meta/readme graph, demonstrating self-improving documentation capabilities.
*   **Dual Operation Modes:** CLI for scripting, automation, and cron jobs; Web UI with auto-generated forms for non-technical users.
*   **Modular Architecture:** Node-based system for composing reusable workflows with references (`$id.property`) and parallel/async processing support.
*   **Multi-LLM Support:** Grok, Gemini, OpenAI-compatible with tool calling (web/X search), structured output stripping, and cost/token reporting.
*   **Rich Integrations:** File I/O (read/write batch/single), RSS fetching, Git status/commit inspection, text-to-speech (ElevenLabs), text-to-image (Grok Imagine).
*   **Advanced Workflow:** Graph validation, caching for cycles/shared nodes, templates with `{{:datenow}}`, local notifications on completion.
*   **Frontend Experience:** Monaco JSON editor, form persistence via localStorage, Markdown/CSV/TSV rendering, copy/download buttons.
*   **Secure Design:** Localhost-only web server, no graph uploads, API keys exclusively from `.env` (gitignored).

---

## 🛠 Getting Started

1.  **Clone the repository:** `git clone https://github.com/johnmichaeljimenez/flowbench && cd flowbench`
2.  **Install dependencies:** `npm install`
3.  **Configure API keys:** Create a `.env` file (gitignored):
    *   `API_KEY_GROK=your_key`
    *   `BASE_URL_GROK=https://api.x.ai/v1`
    *   `API_KEY_GEMINI=your_key`
    *   `BASE_URL_GEMINI=https://generativelanguage.googleapis.com/v1beta`
4.  **CLI mode:** `node app.js graphs/meal-plan/index.json --ingredients.string "chicken rice onions"` (overrides form inputs; outputs JSON).
5.  **Web UI mode:** `node index.js` (or `npm run dev` with nodemon), open `http://localhost:3000`, select graph from menu, fill form, submit for results.
6.  **Editor mode:** Access `/editor.html` in web UI to create/edit JSON graphs with Monaco editor (new/open/save File API).
7.  **Auto-discovery:** Graphs auto-discover from `graphs/` subfolders; outputs render as Markdown/tables/audio with copy/download.

---

## 📖 Usage

*   **Graph Structure:** JSON objects with `graph` (array of nodes), optional `form` (auto-generates UI inputs), `output` (result cards), `meta` (name/description/notifyOnEnd/disableConfirm), `entryPoints` (multiple start nodes).
*   **Nodes:** `{id: 'unique', type: 'nodeType', input: {key: value|$ref.property}}`, refs via `$nodeId[.path]` for dependency resolution/caching.
*   **Execution:** CLI starts at `out1` or specified node; resolves deps recursively with caching (cycle-safe), applies defaults/params/templates.
*   **Custom Graphs:** Copy example, edit in Monaco (`/editor.html`), add to `graphs/mygraph/index.json`; forms map to node.input overrides (`id: 'nodeId.inputKey'`).
*   **Dev Extensibility:** Add `nodes/*.js` with default handler + `nodeMetadata` {type, name, description, category, inputs {key: {type, required, supportsRef, default/description}}, outputs []}.
*   **Validation:** Ensures node types exist, required inputs present, types match, refs valid; run before form gen/execution.

---

## 📊 Example Graphs

| Name | Description | Key Features | Used For |
| :--- | :--- | :--- | :--- |
| **Flowbench README** | Self-improving README generator | Loads source code blob + JSON template, LLM processes into formatted Markdown | Auto-generating project documentation |
| **Project Manager** | Evaluates project status and scope | Loads project desc/TODO/code blob, generates status report | Solo project management reviews |
| **Resume Generator** | ATS-optimized resume builder | Multi-LLM chain: draft → market eval (tools) → polish | Competitor analysis & resumes |
| **Meal Plan maker** | Personalized meal planning | Rich form, realtime prices/tools, Markdown report | Budget/dietary planning |
| **Chatbot** | Stateful conversational AI | Persistent history/memory, dual LLM, tools enabled | Fact extraction & chat |
| **Code Scaffold** | Coding project assistant | JSON scaffold upload or LLM gen, batch file write | Multi-file code projects |
| **Idea Generator** | Ensemble reasoning for ideas | Dual LLM ideas + checker for coherent report | Refining raw notes |
| **Quick Assistant** | Google Gemini 3.1 Flash | Simple single-prompt LLM | Fast Q&A |
| **PH Latest news** | RSS news aggregator | Multi-RSS join + LLM summarize | Location-specific news |
| **Flowbench Help** | Coding assistant | Code blob + query to LLM | Project-specific AI coding |

---

## 🧩 Node List

*   **Call LLM:** Sends prompts to Grok/LLMs.
*   **Choose (Branch):** If/else logic based on boolean.
*   **Constant String:** Fixed text value.
*   **Execute Shell:** Runs shell commands (Disabled/Stubbed).
*   **Fetch API:** HTTP GET requests.
*   **Fetch RSS:** Parses RSS feeds to JSON.
*   **Git List Files:** Extracts content from commits/staged files.
*   **Join Strings:** Combines multiple string outputs.
*   **Load Text Blob:** Recursively loads files into a blob.
*   **Output Log:** Console/Frontend logging.
*   **Read/Write Text File:** Single file I/O.
*   **Template String:** Fills placeholders from sources.
*   **Text to Image (Grok):** Generates images via Grok Imagine.
*   **Text to Speech:** ElevenLabs integration.
*   **Write Batch Text Files:** Saves multiple files from JSON.

---

## 🗺 Roadmap

*   [ ] Grok Imagine API video node
*   [ ] Grok Imagine API image-to-image node
*   [ ] Image upload form input as base64 string

---

## ⚖️ License
Distributed under the MIT License. See LICENSE for more information.