import { resolveInput } from "../nodeutils.js";

export default async function joinString(node, options) {

	const values = await Promise.all(
		node.input.sources.map(id => resolveInput(id))
	);

	return values.join(node.input.separator ?? "");
};

export const nodeMetadata = {
	type: "joinString",
	name: "Join Strings",
	description: "Combines multiple string outputs with a separator.",
	category: "Utility",
	inputs: {
		sources: { type: "array", required: true, supportsRef: true, description: "Array of literal string or $refs" },
		separator: { type: "string", required: false, default: "\n\n\n\n" }
	},
	outputs: ["value"]
};