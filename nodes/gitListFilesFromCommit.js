import { resolveInput } from "../nodeutils.js";
import { existsSync } from "node:fs";
import path from "node:path";
import simpleGit from 'simple-git';

export default async function gitListFilesFromCommit(node, options) {
	const repoPath = await resolveInput(node.input.repoPath);
	const commitHash = await resolveInput(node.input.commitHash);

	if (!existsSync(repoPath)) {
		throw new Error(`Git repository path not found: ${repoPath}`);
	}

	const git = simpleGit(repoPath);

	let diffSummary;
	try {
		diffSummary = await git.diffSummary([commitHash + '^', commitHash]);
	} catch (error) {
		if (error.message.includes('unknown revision or path not in the working tree')) {
			diffSummary = await git.diffSummary([commitHash]);
		} else {
			throw error;
		}
	}

	if (!diffSummary || !diffSummary.files || diffSummary.files.length === 0) {
		return `No files changed in commit ${commitHash}.`;
	}

	let combinedContent = `Files changed in commit ${commitHash}:\n\n`;

	for (const file of diffSummary.files) {
		const filePath = path.join(repoPath, file.file);

		let content;
		try {
			content = await git.show([`${commitHash}:${file.file}`]);
		} catch (error) {
			console.warn(`Failed to read file at commit ${commitHash}: ${file.file} - ${error.message}`);
			continue;
		}

		combinedContent += `===== ${file.file} =====\n`;
		combinedContent += `--- Content at Commit ---\n${content}\n`;

		if (content.trim() === "") {
			combinedContent += "This file is empty or contains no content at this commit.\n";
		}

		combinedContent += `====================\n`;
	}

	return combinedContent;
};

export const nodeMetadata = {
	type: "gitListFilesFromCommit",
	name: "Git List Files From Commit",
	description: "Extracts file contents from a specific git commit.",
	category: "Git",
	inputs: {
		repoPath: { type: "string", required: true, supportsRef: true },
		commitHash: { type: "string", required: true, supportsRef: true }
	},
	outputs: ["value"]
};