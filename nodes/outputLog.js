import { resolveInput, resolveFilePath } from "../nodeutils.js";

export default async function outputLog(node, context) {
	const result = await resolveInput(node.input.source, context);
	console.log(result);

	return {
		value: result
	}
};

export const nodeMetadata = {
	type: "outputLog",
	name: "Output Log",
	description: "Prints a message to console or returns it to frontend.",
	category: "Core",
	inputs: {
		source: { type: "string", required: true, supportsRef: true }
	},
	outputs: ["value"]
};