import { resolveInput } from "../nodeutils.js";
import { readFileSync, existsSync } from "node:fs";

export default async function readFromTextFile(node, options) {
	const filePath = await resolveInput(node.input.path);
	if (!existsSync(filePath))
		return "";	//todo: add allow unexisting file parameter

	return readFileSync(filePath, "utf-8");
}

export const nodeMetadata = {
	type: "readFromTextFile",
	name: "Read Text File",
	description: "Reads the entire content of a single text file.",
	category: "File",
	inputs: {
		path: { type: "string", required: true, supportsRef: true }
	},
	outputs: ["value"]
};