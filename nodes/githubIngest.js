import { resolveInput, resolveStringList } from "../nodeutils.js";
import path from "node:path";

const defaultBlacklist = [
	'node_modules', '.git', '.svn', '.hg', '__pycache__',
	'.venv', 'env', '.env', '.DS_Store', 'Thumbs.db',
	'.nyc_output', 'coverage', '.cache', 'dist', 'build',
	'package-lock.json', 'yarn.lock', 'reports', '.temp',
	'LICENSE.txt' //not needed anyway
];

function calculateDepth(itemPath) {
	return (itemPath.match(/\//g) || []).length;
}

export default async function githubIngest(node, options) {
	const owner = await resolveInput(node.input.owner);
	const repo = await resolveInput(node.input.repo);
	const ref = await resolveInput(node.input.ref ?? 'main');
	const subPath = await resolveInput(node.input.path ?? '');
	const maxFileSizeMB = await resolveInput(node.input.maxFileSizeMB ?? 1);
	const maxTotalSizeMB = await resolveInput(node.input.maxTotalSizeMB ?? 5);
	const maxDepth = await resolveInput(node.input.maxDepth ?? 10);

	let githubToken = await resolveInput(node.input.githubToken ?? '');
	if (githubToken)
		githubToken = process.env[githubToken];

	const whitelist = await resolveStringList(node.input.whitelist);
	const userBlacklist = await resolveStringList(node.input.blacklist);
	const blacklist = [...new Set([...defaultBlacklist, ...userBlacklist])];

	const headers = {
		'User-Agent': 'flowbench-github-crawler/1.0'
	};
	if (githubToken) {
		headers.Authorization = `token ${githubToken}`;
	}

	const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
	const treeResponse = await fetch(treeUrl, { headers });
	if (!treeResponse.ok) {
		const errorText = await treeResponse.text();
		throw new Error(`GitHub API error for '${treeUrl}' (${treeResponse.status}): ${errorText}`);
	}
	const treeData = await treeResponse.json();

	if (treeData.truncated) {
		console.warn(`[githubIngest '${node.id}'] Tree is truncated (very large repo).`);
	}

	let candidateFiles = [];
	let totalSize = 0;
	const maxFileSize = maxFileSizeMB * 1024 * 1024;
	const maxTotalSize = maxTotalSizeMB * 1024 * 1024;
	const normalizedSubPath = subPath ? (subPath.endsWith('/') ? subPath : subPath + '/') : '';

	for (const item of (treeData.tree || [])) {
		if (item.type !== 'blob') continue;

		const itemPathLower = item.path.toLowerCase();
		if (blacklist.some(b => itemPathLower.includes(b))) continue;

		if (normalizedSubPath && !item.path.startsWith(normalizedSubPath)) continue;

		if (calculateDepth(item.path) > maxDepth) continue;

		const ext = path.extname(item.path);
		if (whitelist.length && !whitelist.includes(ext)) continue;

		const size = item.size || 0;
		if (size > maxFileSize) {
			console.warn(`[githubIngest '${node.id}'] Skipped oversized file: ${item.path} (${(size / 1024 / 1024).toFixed(1)}MB)`);
			continue;
		}

		if (totalSize + size > maxTotalSize) {
			console.warn(`[githubIngest '${node.id}'] Reached total size limit, stopping.`);
			break;
		}

		candidateFiles.push(item);
		totalSize += size;
	}

	candidateFiles.sort((a, b) => a.path.localeCompare(b.path));

	let output = "=====FILE START=====\n";
	let loadedCount = 0;
	let loadedSize = 0;

	for (const item of candidateFiles) {
		const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
		const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${encodedPath}`;

		try {
			const contentResponse = await fetch(rawUrl, { headers: { 'User-Agent': 'flowbench-github-crawler/1.0' } });
			if (!contentResponse.ok) {
				console.warn(`Failed to fetch ${item.path}: ${contentResponse.status}`);
				continue;
			}

			let content = await contentResponse.text();
			if (content.includes("\0")) {
				console.warn(`[githubIngest '${node.id}'] Skipped binary file: ${item.path}`);
				continue;
			}

			output += `===${item.path}===\n`;
			output += content;
			output += "\n\n";

			loadedCount++;
			loadedSize += item.size || content.length;

			if (loadedCount % 20 === 0) { //politeness
				await new Promise(r => setTimeout(r, 50));
			}
		} catch (err) {
			console.warn(`Failed to process ${item.path}: ${err.message}`);
		}
	}

	output += "=====FILE END=====";

	console.log(`[githubIngest '${node.id}'] Loaded ${loadedCount} files from ${owner}/${repo}@${ref} (~${(loadedSize / 1024 / 1024).toFixed(1)}MB)`);

	return { value: output };
}

export const nodeMetadata = {
	type: "githubIngest", //yes I am challenging both Repomix and GitIngest with this node
	name: "GitHub Ingest repo",
	description: "Fetches directory tree from public GitHub repo via API, filters with whitelist/blacklist (exactly like loadTextBlob), then combines text files into one blob.",
	category: "File",
	inputs: {
		owner: { type: "string", required: true, supportsRef: true, description: "GitHub owner/org (e.g. facebook)" },
		repo: { type: "string", required: true, supportsRef: true, description: "Repository name (e.g. react)" },
		ref: { type: "string", required: false, default: "main", supportsRef: true, description: "Branch, tag or commit SHA (default: main)" },
		path: { type: "string", required: false, supportsRef: true, description: "Optional sub-directory (e.g. src/components)" },
		whitelist: { type: "string", required: false, supportsRef: true, description: "Semicolon-separated extensions e.g. .js;.ts;.md;.py;.json" }, //load all files in repo if whitelist is null
		blacklist: { type: "string", required: false, supportsRef: true, description: "Semicolon-separated names/paths to exclude" },
		maxFileSizeMB: { type: "number", required: false, default: 1, description: "Skip individual files larger than this" },
		maxTotalSizeMB: { type: "number", required: false, default: 5, description: "Stop when total size reached" },
		maxDepth: { type: "number", required: false, default: 10, description: "Max directory depth (same as loadTextBlob)" },
		githubToken: { type: "string", required: false, supportsRef: true, description: "Optional GitHub PAT for higher rate limits" }
	},
	outputs: ["value"]
};