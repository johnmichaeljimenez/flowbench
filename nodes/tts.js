import { resolveInput } from "../nodeutils.js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export default async function tts(node) {
	const text = await resolveInput(node.input.text);
	const voiceId = await resolveInput(node.input.voiceId);
	const apiKeyEnv = node.input.apiKey ?? "ELEVENLABS_API_KEY";
	const outputPath = await resolveInput(node.input.outputPath);

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

	const buffer = await response.arrayBuffer();

	const dir = path.dirname(outputPath);
	mkdirSync(dir, { recursive: true });
	writeFileSync(outputPath, Buffer.from(buffer));

	return {
		value: text,
		filePath: outputPath,
	};
}