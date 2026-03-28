const { Marked } = globalThis.marked;
const { markedHighlight } = globalThis.markedHighlight;

const loadGraphLink = document.getElementById('loadGraph');
const responseOutput = document.getElementById('responseOutput');
const graphForm = document.getElementById('graphForm');
const graphNameEl = document.getElementById("graphName");
const graphDescEl = document.getElementById("graphDescription");

let currentGraphName = null;
let workingData = null;
let running = false;

window.addEventListener("beforeunload", (e) => {
	if (!running) return;
	e.preventDefault();
});

function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function parseDelimitedText(text, delimiter) {
	const rows = [];
	let currentRow = [];
	let currentCell = '';
	let inQuotes = false;
	let i = 0;
	const len = text.length;

	while (i < len) {
		const char = text[i];

		if (char === '"') {
			if (inQuotes && i + 1 < len && text[i + 1] === '"') {
				currentCell += '"';
				i += 2;
				continue;
			}
			inQuotes = !inQuotes;
			i++;
			continue;
		}

		if (char === delimiter && !inQuotes) {
			currentRow.push(currentCell);
			currentCell = '';
			i++;
			continue;
		}

		if ((char === '\n' || char === '\r') && !inQuotes) {
			currentRow.push(currentCell);
			if (currentRow.some(cell => cell.trim() !== '')) {
				rows.push(currentRow);
			}
			currentRow = [];
			currentCell = '';

			if (char === '\r' && i + 1 < len && text[i + 1] === '\n') i += 2;
			else i++;
			continue;
		}

		currentCell += char;
		i++;
	}

	if (currentCell || currentRow.length) {
		currentRow.push(currentCell);
		if (currentRow.some(cell => cell.trim() !== '')) {
			rows.push(currentRow);
		}
	}

	return rows;
}

function delimitedToHtmlTable(text, delimiter) {
	if (!text || typeof text !== 'string' || text.trim() === '') {
		return '<p class="has-text-grey-light">No data to display</p>';
	}

	const rows = parseDelimitedText(text.trim(), delimiter);

	if (rows.length === 0) {
		return '<p class="has-text-grey-light">No data to display</p>';
	}

	let html = '<table class="table is-bordered is-striped is-hoverable is-fullwidth"><thead><tr>';

	rows[0].forEach(cell => {
		html += `<th>${escapeHtml(cell)}</th>`;
	});
	html += '</tr></thead><tbody>';

	for (let i = 1; i < rows.length; i++) {
		html += '<tr>';
		rows[i].forEach(cell => {
			html += `<td>${escapeHtml(cell)}</td>`;
		});
		html += '</tr>';
	}
	html += '</tbody></table>';

	return html;
}

const markedWithHighlight = new Marked(
	{
		gfm: true,
		breaks: true
	},
	markedHighlight({
		emptyLangClass: 'hljs',
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : 'plaintext';
			return hljs.highlight(code, { language }).value;
		}
	})
);

loadGraphLink.addEventListener('click', async (event) => {
	event.preventDefault();

	const graphNameInput = prompt("Enter graph name");
	if (!graphNameInput) return;

	currentGraphName = graphNameInput.trim();

	try {
		const response = await fetch('/graphs/form', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ graphName: currentGraphName })
		});

		if (!response.ok) throw new Error(await response.text());

		const data = await response.json();
		graphNameEl.textContent = data.meta.name ?? currentGraphName;
		graphDescEl.textContent = data.meta.description ?? "";

		graphForm.innerHTML = data.formHtml;
		responseOutput.innerHTML = "";

		workingData = {
			graphName: currentGraphName,
			meta: data.meta ?? {}
		};

		graphForm.querySelectorAll('input[type="file"]').forEach(input => {
			const filenameEl = document.getElementById(`${input.id}-filename`);
			if (filenameEl) {
				input.addEventListener('change', () => {
					filenameEl.textContent = input.files[0] ? input.files[0].name : 'No file selected';
				});
			}
		});

	} catch (err) {
		responseOutput.innerHTML = `<div class="notification is-danger">Error loading graph:<br>${err.message}</div>`;
	}
});

async function getParams(form) {
	const params = {};
	for (const element of form.elements) {
		if (!element.id) continue;

		let value;
		if (element.type === "file") {
			const file = element.files[0];
			if (file) {
				try {
					const text = await file.text();
					value = text;

					const statusEl = document.getElementById(element.id + '-status');
					if (statusEl) {
						statusEl.textContent = `✓ Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
						statusEl.style.color = "#28a745";
					}
				} catch (err) {
					console.error("Failed to read file:", err);
					throw new Error(`Could not read file: ${file.name}`);
				}
			} else if (element.required) {
				throw new Error(`Please upload a file for "${element.id}"`);
			}
		} else if (element.type === "checkbox") {
			value = element.checked;
		} else if (element.type === "radio") {
			if (!element.checked) continue;
			value = element.value;
		} else if (element.tagName.toLowerCase() === "select") {
			value = element.value;
		} else {
			value = element.value;
		}
		params[element.id] = value;
	}
	return params;
}

function renderResults() {
	responseOutput.innerHTML = "";

	if (!workingData.results) return;

	for (const e of graphForm.elements) {
		if (e.dataset.autoclear === "true")
			e.value = null;
	}

	workingData.results.forEach((element, index) => {
		if (element.type === "text") {
			const container = document.createElement("div");
			container.classList.add("box");
			container.innerText = element.name ?? "";

			const copyBtn = document.createElement("button");
			copyBtn.innerText = "Copy";
			copyBtn.classList.add("button");
			copyBtn.classList.add("is-info");

			copyBtn.onclick = () => navigator.clipboard.writeText(workingData.results[index].value ?? "");
			container.appendChild(copyBtn);

			container.appendChild(document.createElement("hr"));
			const txt = document.createElement("div");
			const format = (element.format || '').toLowerCase();

			if (format === "markdown") {
				txt.innerHTML = markedWithHighlight.parse(element.value)
			} else if (format === "csv") {
				txt.innerHTML = delimitedToHtmlTable(element.value, ',');
			} else if (format === "tsv") {
				txt.innerHTML = delimitedToHtmlTable(element.value, '\t');
			}
			else {
				txt.innerText = element.value ?? "<EMPTY>";
			}

			txt.querySelectorAll("table").forEach(table => {
				table.classList.add("table", "is-bordered", "is-striped", "is-hoverable", "is-fullwidth");
			});
			container.appendChild(txt);

			responseOutput.appendChild(container);
		} else if (element.type === "downloadText") {
			const downloadBtn = document.createElement("button");
			downloadBtn.innerText = `Download ${element.name ?? ""}`;

			downloadBtn.onclick = () => {
				const blob = new Blob([element.value ?? ""], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);

				const a = document.createElement("a");
				a.href = url;
				a.download = element.filename ?? "output.txt";
				a.click();

				URL.revokeObjectURL(url);
			};

			responseOutput.appendChild(downloadBtn);
		} else if (element.type === "audio") {
			const container = document.createElement("div");
			container.style.margin = "15px 0";

			const title = document.createElement("strong");
			title.textContent = element.name ?? "Generated Speech";
			container.appendChild(title);
			container.appendChild(document.createElement("br"));

			const audio = document.createElement("audio");
			audio.controls = true;
			audio.style.width = "100%";
			audio.style.maxWidth = "520px";
			audio.src = `data:${element.mimeType || "audio/mpeg"};base64,${element.value || element.audioBase64}`;
			container.appendChild(audio);

			responseOutput.appendChild(container);
		}
	});
}

async function runGraph(event) {
	event.preventDefault();
	if (running || !currentGraphName) return;

	if (!workingData.meta?.disableConfirm && !confirm("Run this graph?"))
		return;

	const submitBtn = document.getElementById("form-submit");
	if (submitBtn) submitBtn.classList.add("is-loading");
	running = true;

	try {
		const params = await getParams(graphForm);

		const response = await fetch('/graphs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				graphName: currentGraphName,
				params: params,
				startNode: "out1"
			})
		});

		if (!response.ok) throw new Error(await response.text());

		const result = await response.json();
		workingData.results = result;

		renderResults();

	} catch (err) {
		responseOutput.innerHTML = `<div class="notification is-danger">Error:<br>${err.message}</div>`;
		console.error(err);
	} finally {
		if (submitBtn) submitBtn.classList.remove("is-loading");
		running = false;
	}
}