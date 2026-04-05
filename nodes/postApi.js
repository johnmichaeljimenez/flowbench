import { resolveInput, applySchema } from "../nodeutils.js";

export default async function postApi(node, options) {
	const url = await resolveInput(node.input.url);
	const body = await resolveInput(node.input.body);
	const schema = await resolveInput(node.input.schema ?? null);
	const format = node.input.format ?? "json";

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: typeof body === "string" ? body : JSON.stringify(body),
	});

	if (!response.ok) throw new Error(`Failed to POST to ${url}: ${response.statusText}`);

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
	type: "postApi",
	name: "Post API",
	description: "Makes an HTTP POST request and optionally applies a schema.",
	category: "Integration",
	inputs: {
		url: { type: "string", required: true, supportsRef: true },
		body: { type: "object", required: true, supportsRef: true },
		schema: { type: "object", required: false, supportsRef: false, description: "Optional field extraction map" }
	},
	outputs: ["value", "code"]
};