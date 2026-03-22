export default async function constantString(node, options) {
	return {
		value: node.input.string
	}
};

export const nodeMetadata = {
	type: "constantString",
	name: "Constant String",
	description: "Defines a fixed text value that other nodes can reference.",
	category: "Core",
	inputs: {
		string: {
			type: "string",
			required: true,
			supportsRef: false,
			description: "The text content"
		}
	},
	outputs: ["value"]
};