import { resolveInput, resolveStringList } from "../nodeutils.js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const defaultBlacklist = [
	'node_modules',
	'.git',
	'.svn',
	'.hg',
	'__pycache__',
	'.venv',
	'env',
	'.env',
	'.DS_Store',
	'Thumbs.db',
	'.nyc_output',
	'coverage',
	'.cache',
	'dist',
	'build',
	'bazel-*',
	'package-lock.json'
];

export default async function loadTextBlob(node, options) {

	const basePath = await resolveInput(node.input.path);

	const rawWhitelist = await resolveInput(node.input.whitelist ?? "");
	const rawBlacklist = await resolveInput(node.input.blacklist ?? "");

	const whitelist = await resolveStringList(node.input.whitelist);
	const userBlacklist = await resolveStringList(node.input.blacklist);

	const blacklist = [...new Set([...defaultBlacklist, ...userBlacklist])];

	const files = [];
	function walk(dir) {
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {

			const fullPath = path.join(dir, entry.name);
			if (blacklist.some(b => entry.name.includes(b) || fullPath.includes(b))) {
				continue;
			}

			if (entry.isDirectory()) {
				walk(fullPath);
				continue;
			}

			const ext = path.extname(entry.name);
			if (whitelist.length && !whitelist.includes(ext)) {
				continue;
			}

			files.push(fullPath);
		}
	}

	walk(basePath);

	let output = "=====FILE START=====\n";

	for (const file of files) {

		let content;

		try {
			content = readFileSync(file, "utf-8");
			if (content.includes("\0")) continue;

		} catch {
			continue;
		}

		output += `===${file}===\n`;
		output += content;
		output += "\n\n";
	}

	output += "=====FILE END=====";

	return output;
};