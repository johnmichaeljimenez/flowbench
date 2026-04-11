import { resolveInput, resolveFilePath } from "../nodeutils.js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateImage } from "../llm.js";

export default async function textToImage(node, context) {
	const prompt = await resolveInput(node.input.prompt, context);
	const outputPath = await resolveFilePath(node.input.outputPath, context);
	const forceWrite = Boolean(await resolveInput(node.input.forceWrite ?? true, context));
	const aspectRatio = await resolveInput(node.input.aspectRatio, context);
	const resolution = await resolveInput(node.input.resolution, context);
	const testMode = Boolean(await resolveInput(node.input.testMode ?? false, context));

	const apiKeyEnv = node.input.apiKey ?? "API_KEY_GROK";
	const baseURLEnv = node.input.baseURL ?? "BASE_URL_GROK";

	if (!prompt?.trim()) {
		throw new Error("No prompt provided for text-to-image");
	}
	if (!outputPath) {
		throw new Error("outputPath is required for textToImage node");
	}

	const imageResponse = await generateImage({
		test: testMode,
		prompt,
		apiKey: process.env[apiKeyEnv],
		baseURL: process.env[baseURLEnv],
		model: node.input.model ?? "grok-imagine-image",
		n: 1,
		aspectRatio,
		resolution,
		responseFormat: "b64_json"
	});

	const imageData = imageResponse.images[0] || {};
	const imageBase64 = imageData.b64_json || "";
	const mimeType = "image/png";

	if (context.localMode || forceWrite) {
		const dir = path.dirname(outputPath);
		mkdirSync(dir, { recursive: true });
		const buffer = Buffer.from(imageBase64, "base64");
		writeFileSync(outputPath, buffer);
		console.log(`Image file written: ${outputPath}`);
	} else {
		console.log(`Local mode disabled for '${node.id}', skipping file write (base64 still returned)`);
	}

	const filename = path.basename(outputPath) || "generated-image.png";

	return {
		value: prompt,
		filePath: outputPath,
		imageBase64: imageBase64,
		mimeType: mimeType,
		filename: filename
	};
};

export const nodeMetadata = {
	type: "textToImage",
	name: "Text to Image (Grok Imagine)",
	description: "Generates ONE image using Grok Imagine API and saves it locally (exact same style & output shape as TTS node).",
	category: "LLM",
	inputs: {
		prompt: {
			type: "string",
			required: true,
			supportsRef: true,
			description: "Detailed image prompt",
			default: "A majestic mountain landscape at sunset with dramatic clouds"
		},
		outputPath: {
			type: "string",
			required: true,
			supportsRef: true,
			description: "Full path to save the image (e.g. ./output/image.png)"
		},
		aspectRatio: {
			type: "string",
			required: false,
			default: "1:1",
			description: 'e.g. "1:1", "16:9", "9:16"'
		},
		resolution: {
			type: "string",
			required: false,
			default: "1k",
			description: '"1k" or "2k"'
		},
		model: {
			type: "string",
			required: false,
			default: "grok-imagine-image",
			description: "grok-imagine-image or grok-imagine-image-pro"
		},
		forceWrite: { type: "boolean", required: false, default: true },
		testMode: { type: "boolean", required: false, default: false },
		apiKey: {
			type: "string",
			required: true,
			description: "Env var name (e.g. API_KEY_GROK)",
			default: "API_KEY_GROK"
		},
		baseURL: {
			type: "string",
			required: true,
			description: "Env var name (e.g. BASE_URL_GROK)",
			default: "BASE_URL_GROK"
		},
	},
	outputs: ["value", "filePath", "imageBase64", "mimeType", "filename"]
};