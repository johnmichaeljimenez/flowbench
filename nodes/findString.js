import { resolveInput } from "../nodeutils.js";

export default async function findString(node, context) {
	const text = await resolveInput(node.input.text, context) || "";
	const keyword = await resolveInput(node.input.keyword, context) || "";
	const useRegex = await resolveInput(node.input.useRegex, context) ?? false;

	let found = false;

	if (useRegex) {
		try {
			const regex = new RegExp(keyword);
			found = regex.test(text);
		} catch (e) {
			console.error("Invalid Regex in findString:", e);
			found = false;
		}
	} else {
		found = text.includes(keyword);
	}

	const branchRef = found ? node.input.trueSource : node.input.falseSource; //cost-efficiency like in choose.js
	const result = await resolveInput(branchRef, context);

	return {
		value: result,
		found: found
	};
}

export const nodeMetadata = {
	type: "findString",
	name: "Find String (Branch)",
	description: "Checks if a keyword exists in a string and picks one of two inputs based on the result.",
	category: "Utility",
	inputs: {
		text: { type: "string", required: true, supportsRef: true },
		keyword: { type: "string", required: true, supportsRef: true },
		useRegex: { type: "boolean", required: false, supportsRef: true },
		trueSource: {
			type: "any", required: true, supportsRef: true,
			description: "$ref to the 'true' path (string is found)"
		},
		falseSource: {
			type: "any", required: true, supportsRef: true,
			description: "$ref to the 'false' path (string is not found)"
		}
	},
	outputs: ["value", "found"]
};