function textfield(element) {
	return `
		<label class="label" for="${element.id}">
			${element.name || ""}:
		</label>
		<div class="control">
			<input class="input" type="text" id="${element.id}" value="${element.value || ""}"
			${element.required ? "required" : ""}
			${element.autoclear ? 'data-autoclear="true"' : ""}>
		</div>
  		<p class="help">${element.description ?? ""}</p>
	`;
}

function number(element) {
	const minRange = element.minRange !== undefined ? `min="${element.minRange}"` : '';
	const maxRange = element.maxRange !== undefined ? `max="${element.maxRange}"` : '';
	const step = !element.isInteger ? 'step="0.01"' : '';
	const value = element.value || "";

	return `
    <label class="label" for="${element.id}">
      ${element.name || "Number"}:
    </label>
    <div class="control">
      <input 
        class="input" 
        type="number" 
        id="${element.id}" 
        value="${value}" 
        ${minRange} 
        ${maxRange} 
        ${step}
        ${element.required ? "required" : ""}
      >
    </div>
    <p class="help">${element.description || ""}</p>
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

function dropdown(element) {
	let optionsHTML = '';

	(element.data || []).forEach(option => {
		let value = '';
		let display = '';

		if (typeof option === 'string') {
			value = display = option;
		} else if (option && typeof option === 'object') {
			if (option.value !== undefined) {
				value = option.value;
				display = option.display || option.text || option.label || value;
			}
		}

		const isSelected = (element.defaultValue === value || element.value === value) ? ' selected' : '';
		optionsHTML += `<option value="${value}"${isSelected}>${display}</option>`;
	});

	return `
		<label class="label" for="${element.id}">
			${element.name || "Select option"}:
		</label>
		<div class="control">
			<div class="select is-fullwidth">
				<select 
          id="${element.id}" 
          name="${element.id}"
          ${element.required ? "required" : ""}>
					${optionsHTML}
				</select>
			</div>
		</div>
  		<p class="help">${element.description ?? ""}</p>
	`;
}

export default function generateForm(formData) {
	let form = "";

	const typeMap = {
		textfield,
		separator,
		uploadText,
		dropdown,
		number
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

	form += `\n\n<button type="submit" id="form-submit" class="button is-primary">Submit</button>`;
	return form;
}