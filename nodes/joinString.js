import { resolveInput } from "../nodeutils.js";
import path from "path";

export default async function joinString(node, options) {
	const fileSeparatorMode = node.input.fileSeparator === true;  //FIXME: might be too redundant anyway if forward slash is already forgiving in Node.js at any OS

	const values = await Promise.all(
		node.input.sources.map(id => resolveInput(id))
	);

	let separator = node.input.separator ?? "";
	if (fileSeparatorMode) {
		separator = path.sep;
	}

	return {
		value: values.join(separator)
	};
};

export const nodeMetadata = {
	type: "joinString",
	name: "Join Strings",
	description: "Combines multiple string outputs with a separator.",
	category: "Utility",
	inputs: {
		sources: { type: "array", required: true, supportsRef: true, description: "Array of literal string or $refs" },
		separator: { type: "string", required: false, default: "\n\n\n\n" },
		fileSeparator: { type: "boolean", required: false, default: false, description: "Overrides separator parameter and performs file path separator joining for strings" }
	},
	outputs: ["value"]
};