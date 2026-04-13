import { resolveInput } from "../nodeutils.js";

export default async function replaceString(node, context) {
	let text = await resolveInput(node.input.text, context) || "";
	let replacements = await resolveInput(node.input.replacements, context) || [];
	const ignoreCase = await resolveInput(node.input.ignoreCase, context) ?? false;
	const useRegex = await resolveInput(node.input.useRegex, context) ?? false;

	if (typeof replacements === 'string') {
		try {
			replacements = JSON.parse(replacements);
		} catch (e) {
			console.error("Failed to parse replacements JSON:", e);
			replacements = [];
		}
	}

	if (!Array.isArray(replacements)) {
		replacements = [];
	}

	let result = text;

	replacements.forEach((item) => {
		const find = Object.keys(item)[0];
		const replace = item[find];

		if (useRegex) {
			const flags = ignoreCase ? "gi" : "g";
			const regex = new RegExp(find, flags);
			result = result.replace(regex, replace);
		} else {
			if (ignoreCase) {
				const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
				result = result.replace(regex, replace);
			} else {
				result = result.split(find).join(replace);
			}
		}
	});

	return {
		value: result
	};
};

export const nodeMetadata = {
	type: "replaceString",
	name: "Replace String",
	description: "Performs multiple find/replace operations on a string.",
	category: "Utility",
	inputs: {
		text: { type: "string", required: true, supportsRef: true },
		replacements: { type: "array", required: true, supportsRef: true }, // Expected format: [{"<string to find>": "<string to replace>"}]
		ignoreCase: { type: "boolean", required: false, supportsRef: true },
		useRegex: { type: "boolean", required: false, supportsRef: true }
	},
	outputs: ["value"]
};