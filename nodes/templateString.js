import { resolveInput, resolveFilePath } from "../nodeutils.js";

export default async function templateString(node, context) {

	const values = await Promise.all(
		node.input.sources.map(id => resolveInput(id, context))
	);

	let result = await resolveInput(node.input.template, context);

	values.forEach((value, index) => {
		result = result.replaceAll(`{${index}}`, value ?? "");
	});

	return {
		value: result
	}
};

export const nodeMetadata = {
	type: "templateString",
	name: "Template String",
	description: "Builds text by filling {0}, {1}... placeholders from sources.",
	category: "Utility",
	inputs: {
		template: { type: "string", required: true, supportsRef: true },
		sources: { type: "array", required: true, supportsRef: true }
	},
	outputs: ["value"]
};