import { resolveInput, resolveFilePath, resolveStringList } from "../nodeutils.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const defaultBlacklist = [
	'node_modules', '.git', '.svn', '.hg', '__pycache__',
	'.venv', 'env', '.env', '.DS_Store', 'Thumbs.db',
	'.nyc_output', 'coverage', '.cache', 'dist', 'build',
	'package-lock.json', 'yarn.lock', 'reports', '.temp'
];

export default async function loadTextBlob(node, context) {
	const basePath = await resolveFilePath(node.input.path, context);
	const maxFileSizeMB = await resolveInput(node.input.maxFileSizeMB ?? 1, context);
	const maxTotalSizeMB = await resolveInput(node.input.maxTotalSizeMB ?? 1, context);
	const maxDepth = await resolveInput(node.input.maxDepth ?? 10, context);
	const includeStructure = await resolveInput(node.input.includeStructure ?? false, context);

	const whitelist = await resolveStringList(node.input.whitelist, ';', [], context);
	const userBlacklist = await resolveStringList(node.input.blacklist, ';', [], context);
	const blacklist = [...new Set([...defaultBlacklist, ...userBlacklist])];

	let files = [];
	let totalSize = 0;
	const maxFileSize = maxFileSizeMB * 1024 * 1024;
	const maxTotalSize = maxTotalSizeMB * 1024 * 1024;

	function buildFileTree(filePaths) {
		const root = { dirs: {}, files: [] };
		for (const filePath of filePaths) {
			const parts = filePath.split('/');
			let current = root;
			for (let i = 0; i < parts.length - 1; i++) {
				const part = parts[i];
				if (!current.dirs[part]) {
					current.dirs[part] = { dirs: {}, files: [] };
				}
				current = current.dirs[part];
			}
			if (parts.length > 0) {
				const fileName = parts[parts.length - 1];
				if (fileName) current.files.push(fileName);
			}
		}
		return root;
	}

	function formatDirectoryTree(rootNode, rootName) {
		const lines = [];
		lines.push(rootName + '/');
		function printChildren(node, prefix) {
			const entries = [];
			const dirNames = Object.keys(node.dirs || {}).sort((a, b) => a.localeCompare(b));
			for (const name of dirNames) {
				entries.push({ name, type: 'dir', child: node.dirs[name] });
			}
			const fileNames = [...(node.files || [])].sort((a, b) => a.localeCompare(b));
			for (const name of fileNames) {
				entries.push({ name, type: 'file' });
			}
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				const isLast = i === entries.length - 1;
				const connector = isLast ? '└── ' : '├── ';
				const suffix = entry.type === 'dir' ? '/' : '';
				lines.push(prefix + connector + entry.name + suffix);
				if (entry.type === 'dir') {
					const newPrefix = prefix + (isLast ? '    ' : '│   ');
					printChildren(entry.child, newPrefix);
				}
			}
		}
		printChildren(rootNode, '');
		return lines.join('\n') + '\n';
	}

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

	let output = "";
	if (includeStructure) {
		if (files.length === 0) {
			output += "=====STRUCTURE START=====\n";
			output += "No matching files available.\n";
			output += "=====STRUCTURE END=====\n\n";
		} else {
			const relativeFiles = files.map(f => path.relative(basePath, f).split(path.sep).join('/'));
			const tree = buildFileTree(relativeFiles);
			const rootName = path.basename(basePath) || 'root';
			const treeStr = formatDirectoryTree(tree, rootName);
			output += "=====STRUCTURE START=====\n";
			output += treeStr;
			output += "=====STRUCTURE END=====\n\n";
		}
	}

	output += "=====FILE START=====\n";
	for (const absPath of files) {
		try {
			const content = await fs.readFile(absPath, "utf-8");
			if (content.includes("\0")) continue;

			const relPath = path.relative(basePath, absPath).split(path.sep).join('/');
			output += `===${relPath}===\n`;
			output += content;
			output += "\n\n";
		} catch (err) {
			console.warn(`Failed to read ${absPath}: ${err.message}`);
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
		includeStructure: { type: "boolean", required: false, default: false, description: "Include a file/folder tree structure of the scanned files at the start of output" },
		whitelist: { type: "string", required: false, supportsRef: true, description: "list of file extensions and folder names  separated by semicolon e.g. .js;.json;.md" },
		blacklist: { type: "string", required: false, supportsRef: true, description: "list of file extensions and folder names separated by semicolon e.g. .js;.json;.md" },
		maxFileSizeMB: { type: "number", required: false, default: 1, description: "Skip individual files larger than this" },
		maxTotalSizeMB: { type: "number", required: false, default: 1, description: "Stop loading once total size reached" },
		maxDepth: { type: "number", required: false, default: 10, description: "Max folder recursion depth" }
	},
	outputs: ["value"]
};