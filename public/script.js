const { Marked } = globalThis.marked;
const { markedHighlight } = globalThis.markedHighlight;

const keyLastUsedGraph = `flowbench_last_used_graph`;

const loadGraphLink = document.getElementById('loadGraph');
const responseOutput = document.getElementById('responseOutput');
const graphForm = document.getElementById('graphForm');
const graphNameEl = document.getElementById("graphName");
const graphDescEl = document.getElementById("graphDescription");

let currentGraphName = null;
let workingData = null;
let running = false;

let allGraphs = [];

let isAdvancedOpen = false;

async function loadGraphList() {
	try {
		const res = await fetch('/graphs/list');
		if (!res.ok) throw new Error('Failed to load graph list');
		allGraphs = await res.json();

		return allGraphs;
	} catch (err) {
		console.error(err);
		return [];
	}
}

function renderGraphList(filter = '') {
	const container = document.getElementById('graphList');
	container.innerHTML = '';

	const filtered = allGraphs.filter(g =>
		g.displayName.toLowerCase().includes(filter.toLowerCase())
	);

	if (filtered.length === 0) {
		container.innerHTML = `<p class="has-text-grey-light p-4">No graphs found.</p>`;
		return;
	}

	const ul = document.createElement('ul');
	ul.className = 'menu-list';

	filtered.forEach(graph => {
		const li = document.createElement('li');
		li.innerHTML = `
            <a href="#" class="graph-item">
                <span class="icon-text">
                    <span class="icon"><i class="fas fa-file-code"></i></span>
                    <span>${graph.displayName}</span>
                </span>
            </a>`;
		li.querySelector('.graph-item').addEventListener('click', async (e) => {
			e.preventDefault();
			await loadSelectedGraph(graph.graphName);
			closeModal();
		});
		ul.appendChild(li);
	});

	container.appendChild(ul);
}

async function loadSelectedGraph(graphName) {
	if (workingData)
		saveLastValues(graphForm);

	currentGraphName = graphName;
	localStorage.setItem(keyLastUsedGraph, graphName);

	try {
		const response = await fetch('/graphs/form', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ graphName })
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

		loadLastValues(graphForm);

		graphForm.querySelectorAll('input[type="file"]').forEach(input => {
			const filenameEl = document.getElementById(`${input.id}-filename`);
			if (filenameEl) {
				input.addEventListener('change', () => {
					filenameEl.textContent = input.files[0] ? input.files[0].name : 'No file selected';
				});
			}
		});

		showAdvancedInputs();
	} catch (err) {
		responseOutput.innerHTML = `<div class="notification is-danger">Error loading graph:<br>${err.message}</div>`;
		localStorage.removeItem(keyLastUsedGraph);
	}
}

function openModal() {
	document.getElementById('graphModal').classList.add('is-active');
	renderGraphList('');
	document.getElementById('graphSearch').focus();
}

function closeModal() {
	document.getElementById('graphModal').classList.remove('is-active');
}

loadGraphLink.addEventListener('click', async (event) => {
	event.preventDefault();

	if (running) //dont switch graphs while running (TODO: add proper message)
		return;

	if (allGraphs.length === 0) {
		await loadGraphList();
	}
	openModal();
});

document.getElementById('graphModal').addEventListener('click', (e) => {
	if (e.target.classList.contains('modal-background')) closeModal();
});

document.getElementById('graphSearch').addEventListener('input', (e) => {
	renderGraphList(e.target.value);
});

window.addEventListener("beforeunload", (e) => {
	if (!running) {
		saveLastValues(graphForm);
		return;
	}
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

markedWithHighlight.use({
    renderer: {
        link(href, title, text) {
            return `<a href="${href}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       ${title ? `title="${escapeHtml(title)}"` : ''}>
                    ${text}
                   </a>`;
        }
    }
});

function saveLastValues(form) {
	const graphKey = `flowbench_last_${currentGraphName}`;
	const saved = {};

	for (const element of form.elements) {
		if (element.type === "file")
			continue; //no need

		if (!element.id || element.dataset.storeLast !== "true") continue;

		let value;
		if (element.type === "checkbox") {
			value = element.checked;
		} else if (element.type === "number") {
			value = element.value; // let the input handle conversion
		} else {
			value = element.value;
		}

		saved[element.id] = value;
		// console.log(`saved: ${element.id} = ${value}`);
	}

	localStorage.setItem(graphKey, JSON.stringify(saved));
}

function loadLastValues(form) {
	if (!currentGraphName) return;

	const graphKey = `flowbench_last_${currentGraphName}`;
	const savedJson = localStorage.getItem(graphKey);

	if (!savedJson) return;

	let saved;
	try {
		saved = JSON.parse(savedJson);
	} catch (e) {
		console.warn("Failed to parse saved form data");
		return;
	}

	// console.log(saved);
	for (const element of form.elements) {
		if (!element.id || element.dataset.storeLast !== "true") continue;

		const value = saved[element.id];

		if (value === undefined || value === null) continue;

		// console.log(`loaded: ${element.id} = ${value}`);

		if (element.type === "checkbox") {
			element.checked = !!value;
		} else if (element.type !== "file") {
			//only load the saved localStorage value if form input has no default value provided
			const strVal = String(value).trim();
			if (strVal !== '') {
				element.value = value;
			}
		}
	}
}

async function getParams(form) {
	const params = {};
	const checkboxGroups = {};

	for (const element of form.elements) {
		if (element.type === "checkbox") {
			const groupName = element.name;
			if (groupName) {
				if (!checkboxGroups[groupName]) {
					checkboxGroups[groupName] = {
						values: [],
						separator: element.dataset.separator || ',',
						defaultIfNone: element.dataset.defaultIfNone || ''
					};
				}
				if (element.checked) {
					checkboxGroups[groupName].values.push(element.value);
				}
			}
			continue;
		}

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
		} else if (element.tagName.toLowerCase() === "select") {
			value = element.value;
		} else {
			value = element.value;
			if (!element.required && (!value || String(value).trim() === '')) {
				const defaultIfEmpty = element.dataset.defaultIfEmpty;
				if (defaultIfEmpty !== undefined) {
					value = defaultIfEmpty;
				}
			}
		}

		params[element.id] = value;
	}

	Object.entries(checkboxGroups).forEach(([groupName, data]) => {
		if (data.values.length > 0) {
			params[groupName] = data.values.join(data.separator);
		} else {
			params[groupName] = data.defaultIfNone;
		}
	});

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

			const header = document.createElement("div");
			header.classList.add("is-flex", "is-justify-content-space-between", "is-align-items-center", "mb-3");

			const label = document.createElement("div");
			label.classList.add("tag");
			label.textContent = element.name;
			header.appendChild(label);

			const btnGroup = document.createElement("div");

			const downloadBtn = document.createElement("button");
			downloadBtn.classList.add("button", "is-medium", "is-ghost");
			downloadBtn.innerHTML = `<span class="icon"><i class="fas fa-download"></i></span>`;
			downloadBtn.onclick = () => {
				const blob = new Blob([element.value ?? ""], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${element.name || 'output'}.txt`;
				a.click();
				URL.revokeObjectURL(url);
			};
			btnGroup.appendChild(downloadBtn);

			const copyBtn = document.createElement("button");
			copyBtn.classList.add("button", "is-medium", "is-ghost");
			copyBtn.innerHTML = `
				<span class="icon">
					<i class="fas fa-copy"></i>
				</span>
			`;
			copyBtn.onclick = () => {
				navigator.clipboard.writeText(workingData.results[index].value ?? "");

				const originalHTML = copyBtn.innerHTML;
				copyBtn.innerHTML = `
					<span class="icon">
						<i class="fas fa-check"></i>
					</span>
				`;
				copyBtn.classList.add("is-success");

				setTimeout(() => {
					copyBtn.innerHTML = originalHTML;
					copyBtn.classList.remove("is-success");
				}, 1500);
			};
			btnGroup.appendChild(copyBtn); //put copyBtn at the right-most part of div (UX stuff, I tend to autoaim at the right-most button, and copy is safer to be treated as mistake click that download)

			header.appendChild(btnGroup);
			container.appendChild(header);

			// container.appendChild(document.createElement("hr"));

			const txt = document.createElement("div");
			txt.classList.add("content");

			const format = (element.format || '').toLowerCase();
			if (format === "markdown") {
				txt.innerHTML = markedWithHighlight.parse(element.value);
			} else if (format === "csv") {
				txt.innerHTML = delimitedToHtmlTable(element.value, ',');
			} else if (format === "tsv") {
				txt.innerHTML = delimitedToHtmlTable(element.value, '\t');
			} else {
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

	saveLastValues(graphForm);

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

function toggleAdvanced() {
	const btn = document.getElementById("advancedBtn");
	btn.classList.toggle("is-info");
	isAdvancedOpen = !isAdvancedOpen;

	showAdvancedInputs();
}

function showAdvancedInputs() {
	const form = document.getElementById('graphForm');
	const fields = form.querySelectorAll('.field.advanced');

	fields.forEach(field => {
		if (isAdvancedOpen)
			field.classList.remove("is-hidden");
		else
			field.classList.add("is-hidden");

		const inputs = field.querySelectorAll('input');
		inputs.forEach(i => {
			if (isAdvancedOpen)
				field.classList.remove("is-success");
			else
				field.classList.add("is-success");
		});
	});
}

const lastUsed = localStorage.getItem(keyLastUsedGraph);
if (lastUsed) {
	loadSelectedGraph(lastUsed);
}