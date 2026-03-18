import { resolveInput } from "../nodeutils.js";

export default async function outputLog(node, options) {
	const result = await resolveInput(node.input.source);
	console.log(result);
	return result;
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