import { resolveInput } from "../nodeutils.js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export default async function writeBatchToTextFile(node, options) {
	const forceWrite = node.input.forceWrite === true;
	const basePath = node.input.path
		? await resolveInput(node.input.path)
		: ".temp";

	const rawInput = await resolveInput(node.input.sources);

	let batchData;
	try {
		batchData = typeof rawInput === "string" ? JSON.parse(rawInput) : rawInput;
	} catch (e) {
		throw new Error("Invalid JSON format for batch write");
	}

	const writtenFiles = [];

	if (options.localMode || forceWrite) {
		for (const [relativePath, content] of Object.entries(batchData)) {

			const filePath = basePath
				? path.resolve(basePath, relativePath)
				: relativePath;

			const dir = path.dirname(filePath);
			mkdirSync(dir, { recursive: true });

			const encoding = node.input.encoding ?? "utf-8";
			writeFileSync(filePath, String(content), encoding);
			writtenFiles.push(filePath);
		}
		console.log(`Batch write completed. ${writtenFiles.length} files written.`);
	} else {
		console.log(`Local mode disabled, skipping batch write for '${node.id}'`);
	}

	return {
		value: rawInput,
		writtenFiles: writtenFiles,
	};
}

export const nodeMetadata = {
	type: "writeBatchToTextFile",
	name: "Write Batch Text Files",
	description: "Saves multiple files from a JSON object {relativePath: content}. 'path' input is used as base directory prefix.",
	category: "File",
	inputs: {
		sources: { type: "string", required: true, supportsRef: true },
		path: {
			type: "string",
			required: false,
			default: ".temp",
			supportsRef: true,
			description: "Base folder (absolute or relative). All JSON paths are relative to this.",
		},
		encoding: { type: "string", required: false, default: "utf-8" },
		forceWrite: { type: "boolean", required: false, default: true },
	},
	outputs: ["value", "writtenFiles"],
};