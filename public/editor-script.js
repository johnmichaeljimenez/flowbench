window.MonacoEnvironment = {
	getWorkerUrl: function () {
		return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/' };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/base/worker/workerMain.js');
        `)}`;
	}
};

let currentPanZoomInstance = null;
mermaid.initialize({
	startOnLoad: true,
	theme: 'default'
});

require.config({
	paths: {
		vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs'
	}
});

let defaultTemplate = "";
let fileHandle = null;
let savedString = null;
const fileNameHeader = document.getElementById("current-filename");

function isDirty() {
	return savedString != window.monacoEditor.getValue();
}

function showUnsavedConfirm() {
	return isDirty() && !confirm("You have unsaved changes. Continue?");
};

window.addEventListener("beforeunload", (e) => {
	if (!isDirty()) return;
	e.preventDefault();
});

function fileNew() {
	if (showUnsavedConfirm())
		return;

	fileHandle = null;
	savedString = defaultTemplate;
	window.monacoEditor.setValue(savedString);
	fileNameHeader.innerText = "Untitled";
};

async function fileOpen() {
	if (showUnsavedConfirm())
		return;

	try {
		[fileHandle] = await window.showOpenFilePicker({
			types: [{
				description: "JSON Files",
				accept: { "application/json": [".json"] }
			}]
		});

		const file = await fileHandle.getFile();
		savedString = await file.text();
		window.monacoEditor.setValue(savedString);
		fileNameHeader.innerText = fileHandle.name;

	} catch (error) {
		console.error("File open error:", error);
	}
};


async function fileSave(saveAs) {
	try {
		if (!fileHandle || saveAs) {
			fileHandle = await window.showSaveFilePicker({
				suggestedName: "graph.json",
				types: [{
					description: "JSON Files",
					accept: { "application/json": [".json"] }
				}]
			});
		}

		savedString = window.monacoEditor.getValue();
		const writable = await fileHandle.createWritable();
		await writable.write(savedString);
		await writable.close();

		fileNameHeader.innerText = fileHandle.name;
	} catch (error) {
		console.error("File save error:", error);
	}
};

function updatePreview(code) {
	const params = new URLSearchParams({ graphData: code });

	//TODO: better error handling
	fetch(`/graphs/viz?${params.toString()}`)
		.then(response => {
			if (!response.ok) throw new Error('JSON graph error');
			return response.text();
		})
		.then(m => {
			const graphElement = document.getElementById('graph');

			graphElement.innerHTML = '';
			if (currentPanZoomInstance) {
				currentPanZoomInstance.destroy();
				currentPanZoomInstance = null;
			}

			graphElement.textContent = m;
			graphElement.removeAttribute('data-processed');

			mermaid.init(undefined, '#graph').then(() => {
				const svg = graphElement.querySelector('svg');
				if (svg) {
					svg.removeAttribute('width');
					svg.removeAttribute('height');

					svg.style.width = '100%';
					svg.style.height = '100%';
					svg.style.maxWidth = '100%';
					svg.style.maxHeight = '100%';

					svg.setAttribute('width', '100%');
					svg.setAttribute('height', '100%');
					svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

					currentPanZoomInstance = svgPanZoom(svg, {
						zoomEnabled: true,
						controlIconsEnabled: false,
						fit: true,
						center: true,
						minZoom: 0.3,
						maxZoom: 20,
						zoomScaleSensitivity: 0.2,
						dblClickZoomEnabled: true,
						preventMouseEventsDefault: true
					});
				}
			});
		})
		.catch(err => {
			console.error(err);
		});
}

require(['vs/editor/editor.main'], function () {
	const editor = monaco.editor.create(document.getElementById('editor'), {
		value: "{}",
		language: 'json',
		theme: 'vs-dark',
		automaticLayout: true,
		fontSize: 15,
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		padding: { top: 16, bottom: 32 }
	});

	function debounce(func, delay) {
		let timeoutId;
		return function (...args) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				func.apply(this, args);
			}, delay);
		};
	}

	fetch('./template.json')
		.then(response => {
			if (!response.ok) throw new Error('Template file not found');
			return response.text();
		})
		.then(templateContent => {
			editor.setValue(templateContent);

			setTimeout(() => {
				editor.getAction('editor.action.formatDocument').run();
			}, 50);

			defaultTemplate = editor.getValue();
			savedString = defaultTemplate;
			console.log('JSON template loaded from template.json');
		})
		.catch(err => {
			console.warn('template.json not found. using sample JSON instead');
			const sample = `{}`;
			editor.setValue(sample);
			editor.getAction('editor.action.formatDocument').run();
		});

	const handleEditorChange = debounce(() => {
		const currentCode = editor.getValue();
		updatePreview(currentCode);
	}, 300);

	editor.onDidChangeModelContent(handleEditorChange);
	window.monacoEditor = editor;
});

(function initSplitResize() {
	const container = document.querySelector('.split-container');
	const leftPane = document.getElementById('editor-pane');
	const rightPane = document.getElementById('graph-pane');
	const handle = document.getElementById('resize-handle');

	if (!leftPane || !rightPane || !handle) return;

	let startX = 0;
	let startLeftWidth = 0;

	function onMouseMove(e) {
		const containerRect = container.getBoundingClientRect();
		const deltaX = e.clientX - startX;
		const newLeftWidthPercent = (startLeftWidth + deltaX) / containerRect.width * 100;

		const clamped = Math.min(80, Math.max(20, newLeftWidthPercent));
		leftPane.style.flex = `1 1 ${clamped}%`;
		rightPane.style.flex = `1 1 ${100 - clamped}%`;

		if (window.monacoEditor) {
			window.monacoEditor.layout();
		}

		if (currentPanZoomInstance && typeof currentPanZoomInstance.resize === 'function') {
			currentPanZoomInstance.resize();
			currentPanZoomInstance.fit();
			currentPanZoomInstance.center();
		}
	}

	function onMouseUp() {
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}

	function onMouseDown(e) {
		startX = e.clientX;
		startLeftWidth = leftPane.getBoundingClientRect().width;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
		e.preventDefault();
	}

	handle.addEventListener('mousedown', onMouseDown);

	let resizeTimeout;
	window.addEventListener('resize', () => {
		if (resizeTimeout) clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			if (window.monacoEditor) window.monacoEditor.layout();
			if (currentPanZoomInstance && typeof currentPanZoomInstance.resize === 'function') {
				currentPanZoomInstance.resize();
				currentPanZoomInstance.fit();
				currentPanZoomInstance.center();
			}
		}, 100);
	});
})();