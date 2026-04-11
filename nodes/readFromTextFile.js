import { resolveInput, resolveFilePath } from "../nodeutils.js";
import { readFileSync, existsSync } from "node:fs";

export default async function readFromTextFile(node, context) {
	const filePath = await resolveFilePath(node.input.path, context);
	const fileExists = existsSync(filePath);

	const allowNonExistingFile = node.input.allowNonExistingFile !== false;

	if (!fileExists) {
		if (allowNonExistingFile)
			return "";

		throw new Error(`File not found: ${filePath}`);
	}

	return {
		value: readFileSync(filePath, "utf-8"),
		path: filePath
	}
}

export const nodeMetadata = {
	type: "readFromTextFile",
	name: "Read Text File",
	description: "Reads the entire content of a single text file.",
	category: "File",
	inputs: {
		path: { type: "string", required: true, supportsRef: true },
		allowNonExistingFile: { type: "boolean", required: false, default: true }
	},
	outputs: ["value"]
};