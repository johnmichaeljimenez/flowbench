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