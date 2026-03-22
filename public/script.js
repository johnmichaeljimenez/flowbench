const loadGraphLink = document.getElementById('loadGraph');
const fileInput = document.getElementById('jsonFile');
const responseOutput = document.getElementById('responseOutput');
const graphForm = document.getElementById('graphForm');

let workingData = null;
let running = false;

loadGraphLink.addEventListener('click', (event) => {
	event.preventDefault();
	fileInput.click();
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
			container.innerText = element.name ?? "";

			const copyBtn = document.createElement("button");
			copyBtn.innerText = "Copy";

			copyBtn.onclick = () => navigator.clipboard.writeText(workingData.results[index].value ?? "");
			container.appendChild(copyBtn);

			container.appendChild(document.createElement("hr"));
			const txt = document.createElement("p");
			txt.innerText = element.value ?? "<EMPTY>";
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

fileInput.addEventListener('change', async () => {
	const file = fileInput.files[0];
	if (!file) return;

	try {
		const text = await file.text();
		workingData = JSON.parse(text);
		workingData.results = [];

		const response = await fetch('/form', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(workingData)
		});

		const formHTML = await response.text();
		graphForm.innerHTML = formHTML;
		responseOutput.textContent = "";

		graphForm.querySelectorAll('input[type="file"]').forEach(input => {
			const filenameEl = document.getElementById(`${input.id}-filename`);
			if (filenameEl) {
				input.addEventListener('change', () => {
					filenameEl.textContent = input.files[0]
						? input.files[0].name
						: 'No file selected';
				});
			}
		});
	} catch (err) {
		responseOutput.textContent = "Error: " + err.message;
		workingData = null;
	}
});

async function runGraph(event) {
	event.preventDefault();

	if (running)
		return;

	if (!workingData) {
		alert("Please select a JSON file first.");
		return;
	}

	if (!confirm("Run this graph?"))
		return;

	const submitBtn = document.getElementById("form-submit");
	submitBtn.classList.add("is-loading");
	running = true;

	try {
		workingData.params = await getParams(graphForm);

		const response = await fetch('/process', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(workingData)
		});

		const result = await response.json();
		workingData.results = result;

		console.log(workingData);
		renderResults();

	} catch (err) {
		responseOutput.textContent = "Error: " + err.message;
	} finally {
		submitBtn.classList.remove("is-loading");
		running = false;
	}
}