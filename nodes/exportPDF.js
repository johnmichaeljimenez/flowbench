import { resolveInput } from "../nodeutils.js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import puppeteer from "puppeteer";

export default async function exportPDF(node, options) {
	const forceWrite = node.input.forceWrite === true;

	let content = await resolveInput(node.input.source);
	if (typeof content !== "string") {
		content = JSON.stringify(content, null, 2);
	}
	content = content ?? "";

	let filePath = await resolveInput(node.input.path);
	const pageSize = (await resolveInput(node.input.pageSize)) || "A4";

	let pdfBuffer = null;
	let base64 = null;
	let error = null;

	try {
		const htmlContent = marked(content);
		const fullHtml = `<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body {
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
					line-height: 1.6;
					padding: 2rem;
					max-width: 800px;
					margin: 0 auto;
				}
				pre, code {
					background-color: #f4f4f4;
					border-radius: 4px;
				}
				pre {
					padding: 1rem;
					overflow-x: auto;
				}
				code {
					padding: 0.2rem 0.4rem;
				}
				table {
					border-collapse: collapse;
					width: 100%;
				}
				th, td {
					border: 1px solid #ddd;
					padding: 8px;
					text-align: left;
				}
				th {
					background-color: #f2f2f2;
				}
			</style>
		</head>
		<body>${htmlContent}</body>
		</html>`;

		const browser = await puppeteer.launch({ headless: "new" });
		const page = await browser.newPage();
		await page.setContent(fullHtml, { waitUntil: "networkidle0" });

		pdfBuffer = await page.pdf({
			format: pageSize,
			printBackground: true,
			margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" }
		});

		await browser.close();

		base64 = Buffer.from(pdfBuffer).toString('base64');
	} catch (err) {
		console.error(`Failed to generate PDF: ${err.message}`);
		error = err;
	}

	let writtenFilePath = null;
	if ((options.localMode || forceWrite) && pdfBuffer) {
		try {
			const dir = path.dirname(filePath);
			mkdirSync(dir, { recursive: true });
			writeFileSync(filePath, pdfBuffer);
			writtenFilePath = filePath;
			console.log(`PDF saved to ${filePath}`);
		} catch (err) {
			console.error(`Failed to write PDF file: ${err.message}`);
		}
	} else if (!options.localMode && !forceWrite) {
		console.log(`Local mode disabled for '${node.id}', skipping file writing (but base64 generated)`);
	}

	if (error) {
		throw error;
	}

	return {
		value: base64,
		base64: base64,
		filePath: writtenFilePath
	};
}

export const nodeMetadata = {
	type: "exportPDF",
	name: "Export PDF",
	description: "Converts Markdown or plain text to a PDF file and returns base64 data.",
	category: "File",
	inputs: {
		source: { type: "string", required: true, supportsRef: true, description: "Text or Markdown content to convert" },
		path: { type: "string", required: true, supportsRef: true, description: "Output PDF file path (used only when writing to disk)" },
		pageSize: { type: "string", required: false, default: "A4", supportsRef: true, description: "Page size (e.g., A4, Letter, Legal)" },
		forceWrite: { type: "boolean", required: false, default: true, description: "Force write even if localMode is false" }
	},
	outputs: ["value", "base64", "filePath"]
};