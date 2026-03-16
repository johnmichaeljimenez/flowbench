import { resolveInput, applySchema } from "../nodeutils.js";

export default async function fetchApi(node, options) {
	const url = await resolveInput(node.input.url);
	const schema = await resolveInput(node.input.schema ?? null);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch from ${url}`);
	}

	const jsonData = await response.json();
	if (!schema) {
		return {
			value: JSON.stringify(jsonData),
			code: response.status
		}
	}

	return {
		value: JSON.stringify(applySchema(jsonData, schema)),
		code: response.status
	}
}