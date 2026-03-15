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

export default function generateForm(formData) {
	let form = "";

	const typeMap = {
		textfield,
		separator
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