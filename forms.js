function textfield(element) {
	return `
		<div>
		<label for="${element.id}">
			${element.name || ""}:
		</label>
		
		<input type="text" id=${element.id} value="${element.value || ""}" ${element.required ? "required" : ""}>
		</div>
	`;
}

function separator() {
	return "<hr>";
}

function uploadText(element) {
	return `
		<div>
			<label for="${element.id}">
				${element.name || "Upload text file"}:
			</label>
			<input 
				type="file" 
				id="${element.id}" 
				accept="${element.accept || '.txt,.md,.json'}" 
				${element.required ? "required" : ""}
			>
			<p id="${element.id}-status" class="upload-status" style="font-size:0.85em; color:#666; margin-top:4px;"></p>
		</div>
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
			form += func(element);
		} else {
			console.warn(`No function defined for type "${element.type}"`);
		}
	});

	form += `\n\n<input type="submit">`;
	return form;
}