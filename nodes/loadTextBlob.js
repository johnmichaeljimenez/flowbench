import { resolveInput, resolveStringList } from "../nodeutils.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const defaultBlacklist = [
	'node_modules', '.git', '.svn', '.hg', '__pycache__',
	'.venv', 'env', '.env', '.DS_Store', 'Thumbs.db',
	'.nyc_output', 'coverage', '.cache', 'dist', 'build',
	'package-lock.json', 'yarn.lock', 'reports', 'graphs', '.temp'
];

export default async function loadTextBlob(node, options) {
	const basePath = await resolveInput(node.input.path);
	const maxFileSizeMB = await resolveInput(node.input.maxFileSizeMB ?? 1);
	const maxTotalSizeMB = await resolveInput(node.input.maxTotalSizeMB ?? 1);
	const maxDepth = await resolveInput(node.input.maxDepth ?? 10);

	const whitelist = await resolveStringList(node.input.whitelist);
	const userBlacklist = await resolveStringList(node.input.blacklist);
	const blacklist = [...new Set([...defaultBlacklist, ...userBlacklist])];

	let files = [];
	let totalSize = 0;
	const maxFileSize = maxFileSizeMB * 1024 * 1024;
	const maxTotalSize = maxTotalSizeMB * 1024 * 1024;

	async function walk(dir, depth = 0) {
		if (depth > maxDepth) return;

		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const name = entry.name.toLowerCase();

			if (blacklist.some(b => name.includes(b) || fullPath.includes(b))) continue;

			if (entry.isDirectory()) {
				await walk(fullPath, depth + 1);
				continue;
			}

			const stats = await fs.stat(fullPath);
			if (stats.size > maxFileSize) {
				console.warn(`[loadTextBlob '${node.id}'] Skipped oversized file: ${fullPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
				continue;
			}

			if (totalSize + stats.size > maxTotalSize) {
				continue; //allow next files that can still fit on the remaining current totalSize
			}

			const ext = path.extname(entry.name);
			if (whitelist.length && !whitelist.includes(ext)) continue;

			files.push(fullPath);
			totalSize += stats.size;
		}
	}

	await walk(basePath);

	let output = "=====FILE START=====\n";
	for (const file of files) {
		try {
			const content = await fs.readFile(file, "utf-8");
			if (content.includes("\0")) continue;

			output += `===${file}===\n`;
			output += content;
			output += "\n\n";
		} catch (err) {
			console.warn(`Failed to read ${file}: ${err.message}`);
		}
	}
	output += "=====FILE END=====";

	console.log(`[loadTextBlob] Loaded ${files.length} files (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
	return { value: output };
}

export const nodeMetadata = {
	type: "loadTextBlob",
	name: "Load Text Blob",
	description: "Recursively loads many text files into one huge blob.",
	category: "File",
	inputs: {
		path: { type: "string", required: true, supportsRef: true, description: "Root folder path" },
		whitelist: { type: "string", required: false, supportsRef: true, description: "list of file extensions and folder names  separated by semicolon e.g. .js;.json;.md" },
		blacklist: { type: "string", required: false, supportsRef: true, description: "list of file extensions and folder names separated by semicolon e.g. .js;.json;.md" },
		maxFileSizeMB: { type: "number", required: false, default: 1, description: "Skip individual files larger than this" },
        maxTotalSizeMB: { type: "number", required: false, default: 1, description: "Stop loading once total size reached" },
        maxDepth: { type: "number", required: false, default: 10, description: "Max folder recursion depth" }
	},
	outputs: ["value"]
};