import { resolveInput } from "../nodeutils.js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export default async function tts(node, options) {
	const text = await resolveInput(node.input.text);
	const voiceId = await resolveInput(node.input.voiceId);
	const apiKeyEnv = node.input.apiKey ?? "ELEVENLABS_API_KEY";
	const outputPath = await resolveInput(node.input.outputPath);
	const forceWrite = await resolveInput(node.input.forceWrite) === true;

	if (!text?.trim()) {
		throw new Error("No text provided for TTS");
	}
	if (!voiceId) {
		throw new Error("voiceId is required for TTS node");
	}
	if (!outputPath) {
		throw new Error("outputPath is required for TTS node");
	}

	const apiKey = process.env[apiKeyEnv];
	if (!apiKey) {
		throw new Error(`Environment variable ${apiKeyEnv} not found`);
	}

	const modelId = node.input.modelId ?? "eleven_multilingual_v2";
	const outputFormat = node.input.outputFormat ?? "mp3_44100_128";

	const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Accept": "audio/mpeg",
			"xi-api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text: text,
			model_id: modelId,
			voice_settings: {
				stability: node.input.stability ?? 0.5,
				similarity_boost: node.input.similarityBoost ?? 0.75,
			},
			output_format: outputFormat,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	const audioBuffer = Buffer.from(arrayBuffer);
	const base64Audio = audioBuffer.toString("base64");

	if (options.localMode || forceWrite) {
		const dir = path.dirname(outputPath);
		mkdirSync(dir, { recursive: true });
		writeFileSync(outputPath, audioBuffer);
		console.log(`TTS file written: ${outputPath}`);
	} else {
		console.log(`Local mode disabled for '${node.id}', skipping file write (base64 returned for browser)`);
	}

	return {
		value: text,
		filePath: outputPath,
		audioBase64: base64Audio,
		mimeType: "audio/mpeg",
		filename: path.basename(outputPath) || "tts.mp3"
	};
};

export const nodeMetadata = {
	type: "tts",
	name: "Text to Speech",
	description: "Converts text to spoken audio using ElevenLabs (returns base64 + file).",
	category: "Integration",
	inputs: {
		text: { type: "string", required: true, supportsRef: true },
		voiceId: { type: "string", required: true, supportsRef: true },
		apiKey: { type: "string", required: true, description: "Env var name" },
		outputPath: { type: "string", required: true, supportsRef: true },
		modelId: { type: "string", required: false, default: "eleven_v3" },
		outputFormat: { type: "string", required: false, default: "mp3_44100_128" },
		stability: { type: "number", required: false, default: 0.5 },
		similarityBoost: { type: "number", required: false, default: 0.75 },
		forceWrite: { type: "boolean", required: false, default: true }
	},
	outputs: ["value", "filePath", "audioBase64", "filename"]
};