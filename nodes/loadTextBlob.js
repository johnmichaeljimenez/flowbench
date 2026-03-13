import { resolveInput } from "../nodeutils.js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export default async function loadTextBlob(node) {

	const basePath = await resolveInput(node.input.path);

	const whitelist = (node.input.whitelist ?? "")
		.split(";")
		.map(s => s.trim())
		.filter(Boolean);

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

	const userBlacklist = (node.input.blacklist ?? "")
		.split(";")
		.map(s => s.trim())
		.filter(Boolean);

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