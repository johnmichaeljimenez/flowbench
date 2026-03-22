import { resolveInput } from "../nodeutils.js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import simpleGit from 'simple-git';

export default async function gitListStagedFiles(node, options) {
	const repoPath = await resolveInput(node.input.repoPath);

	if (!existsSync(repoPath)) {
		throw new Error(`Git repository path not found: ${repoPath}`);
	}

	const git = simpleGit(repoPath);

	const status = await git.status();
	const stagedFiles = status.staged;

	if (!stagedFiles || stagedFiles.length === 0) {
		return { value: "No files are staged." };
	}

	let combinedContent = "";
	for (const file of stagedFiles) {
		const filePath = path.join(repoPath, file);

		let content;
		try {
			content = readFileSync(filePath, 'utf-8');
		} catch (error) {
			console.warn(`Failed to read file ${file}: ${error.message}`);
			continue;
		}

		const lastCommitContent = await git.show([`HEAD:${file}`]).catch(() => "");

		combinedContent += `===== ${file} =====\n`;

		if (lastCommitContent) {
			combinedContent += `--- Before Staging (Last Commit) ---\n${lastCommitContent}\n`;
		} else {
			combinedContent += "No previous version (new file)\n";
		}

		combinedContent += `--- After Staging (Staged Content) ---\n${content}\n`;

		if (lastCommitContent && lastCommitContent === content) {
			combinedContent += "No changes detected between staging and the last commit.\n";
		}

		if (content.trim() === "") {
			combinedContent += "This file is empty or contains no content.\n";
		}

		combinedContent += `====================\n`;
	}

	return {
		value: combinedContent
	}
};

export const nodeMetadata = {
	type: "gitListStagedFiles",
	name: "Git List Staged Files",
	description: "Shows all staged files with before/after content for quick review.",
	category: "Git",
	inputs: {
		repoPath: { type: "string", required: true, supportsRef: true }
	},
	outputs: ["value"]
};