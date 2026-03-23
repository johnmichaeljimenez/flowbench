window.MonacoEnvironment = {
	getWorkerUrl: function () {
		return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/' };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/base/worker/workerMain.js');
        `)}`;
	}
};

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
		console.log('Debounced change detected!');
	}, 300);

	// Attach the debounced listener
	editor.onDidChangeModelContent(handleEditorChange);
	window.monacoEditor = editor;
});