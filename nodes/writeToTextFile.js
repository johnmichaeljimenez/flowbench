import { resolveInput } from "../nodeutils.js";
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export default async function writeToTextFile(node, options) {

	let content = await resolveInput(node.input.source);
	if (typeof content !== "string") {
		content = JSON.stringify(content, null, 2);
	}

	content = content ?? "";

	let filePath = await resolveInput(node.input.path);

	if (options.localMode) {
		const dir = path.dirname(filePath);
		mkdirSync(dir, { recursive: true });

		const append = node.input.append ?? false;
		const encoding = node.input.encoding ?? "utf-8";

		if (append) {
			appendFileSync(filePath, content, encoding);
		} else {
			writeFileSync(filePath, content, encoding);
		}
	} else {
		console.log(`Local mode disabled for '${node.id}', skipping file writing`);
	}

	return {
		value: content,
		filePath: filePath,
	};
};

export const nodeMetadata = {
	type: "writeToTextFile",
	name: "Write Text File",
	description: "Saves content to a file (create or append mode).",
	category: "File",
	inputs: {
		source: { type: "string", required: true, supportsRef: true },
		path: { type: "string", required: true, supportsRef: true },
		append: { type: "boolean", required: false, default: false },
		encoding: { type: "string", required: false, default: "utf-8" }
	},
	outputs: ["value", "filePath"]
};