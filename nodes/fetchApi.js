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
};

export const nodeMetadata = {
	type: "fetchApi",
	name: "Fetch API",
	description: "Makes an HTTP GET request and optionally applies a schema.",
	category: "Integration",
	inputs: {
		url: { type: "string", required: true, supportsRef: true },
		schema: { type: "object", required: false, supportsRef: false, description: "Optional field extraction map" }
	},
	outputs: ["value", "code"]
};