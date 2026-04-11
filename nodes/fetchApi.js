import { resolveInput, applySchema } from "../nodeutils.js";

export default async function fetchApi(node, context) {
	const url = await resolveInput(node.input.url, context);
	const schema = await resolveInput(node.input.schema ?? null, context);
	const format = node.input.format ?? "json";

	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch from ${url}`);

	const data = format === "text" ? await response.text() : await response.json();

	if (!schema || format === "text") {
		return {
			value: typeof data === 'string' ? data : JSON.stringify(data),
			code: response.status
		};
	}

	return {
		value: JSON.stringify(applySchema(data, schema)),
		code: response.status
	};
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