function textfield(element) {
	return `
		<label class="label" for="${element.id}">
			${element.name || ""}:
		</label>
		<div class="control">
			<input class="input" type="text" id="${element.id}" value="${element.value || ""}" ${element.required ? "required" : ""}>
		</div>
  		<p class="help">${element.description ?? ""}</p>
	`;
}

function separator() {
	return "<hr>";
}

function uploadText(element) {
	return `
		<label class="label" for="${element.id}">
			${element.name || "Upload text file"}:
		</label>
		<div class="control">
			<div class="file has-name is-fullwidth">
				<label class="file-label">
					<input 
						class="file-input" 
						type="file" 
						id="${element.id}" 
						accept="${element.accept || '.txt,.md,.json'}" 
						${element.required ? "required" : ""}
					>
					<span class="file-cta">
						<span class="file-label">
							Choose a file…
						</span>
					</span>
					<span class="file-name" id="${element.id}-filename">
						No file selected
					</span>
				</label>
			</div>
		</div>
  		<p class="help" id="${element.id}-status">${element.description ?? ""}</p>
	`;
}

export default function generateForm(formData) {
	let form = "";

	const typeMap = {
		textfield,
		separator,
		uploadText
	};

	formData.forEach(element => {
		const func = typeMap[element.type];
		if (func) {
			const el = `
			<div class="field">
				${func(element)}
			</div>`;

			form += el;
		} else {
			console.warn(`No function defined for type "${element.type}"`);
		}
	});

	form += `\n\n<input type="submit" class="button is-primary">`;
	return form;
}