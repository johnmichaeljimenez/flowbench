#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { callLLm } from "./llm.js";
import xml2js from "xml2js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
	path: path.resolve(__dirname, '.env')
});

const args = process.argv.slice(2);
if (args.length === 0) {
	console.error("Usage: node app.js <graph.json> [startNode]");
	process.exit(1);
}

const graphPath = path.resolve(args[0]);
if (!existsSync(graphPath)) {
	console.error(`Graph file not found: ${graphPath}`);
	process.exit(1);
}

const graphData = JSON.parse(readFileSync(graphPath, "utf-8"));
const startNodeId = args[1] || "out1";

const nodes = Object.fromEntries(
	graphData.graph.map(node => [node.id, node])
);

const cache = {};

function applySchema(data, schema) {
	let result = {};

	for (const key in schema) {
		if (schema.hasOwnProperty(key)) {
			const path = schema[key];
			result[key] = extractFromPath(data, path);
		}
	}

	return result;
}

function applyTemplates(str) {
	if (typeof str !== "string") return str;

	const now = new Date();
	const templates = {
		"datenow": `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_` +
			`${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`
	};

	return str.replaceAll(/{{:(\w+)}}/g, (_, key) => {
		if (key in templates) return templates[key];
		return `{{:${key}}}`;
	});
}

function extractFromPath(data, path) {
	const keys = path.split(/\.|\[|\]/).filter(Boolean);
	let value = data;

	for (let key of keys) {
		value = value[key];
		if (value === undefined) {
			return null;
		}
	}

	return value;
}

async function resolveInput(input) {
	if (typeof input !== "string" || !input.startsWith("$")) {
		return input;
	}

	const ref = input.slice(1);
	const parts = ref.split(".");
	const nodeId = parts[0];
	const propertyPath = parts.slice(1).join(".");

	let result = await processNode(nodeId);

	if (propertyPath) {
		if (result == null || typeof result !== "object") {
			return undefined;
		}
		return extractFromPath(result, propertyPath);
	}

	if (result && typeof result === "object" && "value" in result) {
		return result.value;
	}
	return result;
}

const nodeHandlers = {

	async constantString(node) {
		return node.input.string;
	},

	async loadTextBlob(node) {

		const basePath = node.input.path;

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
	},

	async callLLM(node) {
		const userPrompt = await resolveInput(node.input.userPrompt);
		const systemPrompt = await resolveInput(node.input.systemPrompt);
		const llmResponse = await callLLm({
			test: node.input.testMode ?? false,
			apiKey: process.env[node.input.apiKey],
			baseURL: process.env[node.input.baseURL],
			model: node.input.model ?? "grok-4-1-fast-non-reasoning",
			systemPrompt: systemPrompt,
			userPrompt: userPrompt,
			maxTokens: node.input.maxTokens ?? 1024,
			temperature: node.input.temperature ?? 0.5,
		});

		return {
			value: llmResponse.response,
			systemPrompt: systemPrompt,
			userPrompt: userPrompt,
			modelUsed: llmResponse.model,
			tokensUsed: llmResponse.tokensUsed,
			fullPrompt: `${systemPrompt}\n\n\n==========\n\n\n${userPrompt}`
		};
	},

	async outputLog(node) {
		const result = await resolveInput(node.input.source);
		console.log(result);
		return result;
	},

	async joinString(node) {
		const values = await Promise.all(
			node.input.sources.map(id => resolveInput(id))
		);
		return values.join(node.input.separator ?? "");
	},

	async fetchApi(node) {
		const { url, schema } = node.input;
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch from ${url}`);
		}

		const jsonData = await response.json();
		if (!schema) {
			return JSON.stringify(jsonData);
		}

		return JSON.stringify(applySchema(jsonData, schema));
	},

	async executeShell(node) {
		const command = await resolveInput(node.input.command);
		const fireAndForget = node.input.fireAndForget ?? false;

		const { spawn } = await import('node:child_process');

		if (fireAndForget) {
			spawn(command, {
				shell: true,
				stdio: 'ignore',
				detached: true
			});
			return '';
		}

		return new Promise((resolve) => {
			const child = spawn(command, {
				shell: true,
				stdio: ['ignore', 'pipe', 'pipe']
			});

			let output = '';
			let errorOutput = '';

			child.stdout.on('data', (data) => {
				output += data.toString();
			});

			child.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});

			child.on('close', (code) => {
				if (code === 0) {
					resolve(output.trim());
				} else {
					const errorMsg = `Shell command failed (code ${code}): ${errorOutput || output}`;
					console.error(errorMsg);
					resolve(errorMsg);
				}
			});

			child.on('error', (err) => {
				console.error('Shell execution error:', err);
				resolve(`Error: ${err.message}`);
			});
		});
	},

	async fetchRss(node) {
		const url = node.input.url;
		const fields = node.input.fields;

		const response = await fetch(url);
		if (!response.ok) throw new Error(`Failed to fetch ${url}`);

		const rssXml = await response.text();
		const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
		const rssData = await parser.parseStringPromise(rssXml);

		const channel = rssData?.rss?.channel;
		if (!channel) throw new Error("Invalid RSS feed");

		const items = Array.isArray(channel.item) ? channel.item : [channel.item];

		const mappedItems = items.map(item => ({
			title: item.title ?? null,
			link: item.link ?? null,
			description: item.description ?? null,
			pubDate: item.pubDate ?? null,
			guid: item.guid ?? null
		}));

		const fullResult = {
			title: channel.title ?? null,
			link: channel.link ?? null,
			description: channel.description ?? null,
			items: mappedItems
		};

		if (fields && typeof fields === "object") {
			return JSON.stringify(Object.entries(fullResult).reduce((acc, [key, value]) => {
				if (key === "items" && Array.isArray(fields.items)) {
					acc.items = value.map(v =>
						fields.items.reduce((subAcc, k) => {
							if (k in v) subAcc[k] = v[k];
							return subAcc;
						}, {})
					);
				} else if (fields[key]) {
					acc[key] = value;
				}
				return acc;
			}, {}));
		}

		return JSON.stringify(fullResult);
	},

	async templateString(node) {

		const values = await Promise.all(
			node.input.sources.map(id => resolveInput(id))
		);

		let result = node.input.template;

		values.forEach((value, index) => {
			result = result.replaceAll(`{${index}}`, value ?? "");
		});

		return result;
	},

	async readFromTextFile(node) {
		const filePath = node.input.path;
		if (!existsSync(filePath))
			return "";

		return readFileSync(filePath, "utf-8");
	},

	async writeToTextFile(node) {

		let content = await resolveInput(node.input.source);
		if (typeof content !== "string") {
			content = JSON.stringify(content, null, 2);
		}

		content = content ?? "";

		let filePath = node.input.path;

		const dir = path.dirname(filePath);
		mkdirSync(dir, { recursive: true });

		const append = node.input.append ?? false;
		const encoding = node.input.encoding ?? "utf-8";

		if (append) {
			appendFileSync(filePath, content, encoding);
		} else {
			writeFileSync(filePath, content, encoding);
		}

		return {
			value: content,
			filePath: filePath,
		};
	},

	async tts(node) {
		const text = await resolveInput(node.input.text);
		const voiceId = node.input.voiceId;
		const apiKeyEnv = node.input.apiKey ?? "ELEVENLABS_API_KEY";
		const outputPath = node.input.outputPath;

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
	},
};

async function processNode(nodeId, stack = new Set()) {

	if (nodeId in cache) {
		return cache[nodeId];
	}

	if (stack.has(nodeId)) {
		throw new Error(`Cycle detected at node: ${nodeId}`);
	}

	const node = nodes[nodeId];
	if (!node) {
		throw new Error(`Node not found: ${nodeId}`);
	}

	if (node.input) {
		for (const key in node.input) {
			const value = node.input[key];
			if (typeof value === "string") {
				node.input[key] = applyTemplates(value);
			}
			else if (value && typeof value === "object" && !Array.isArray(value)) {
				for (const subKey in value) {
					if (typeof value[subKey] === "string") {
						value[subKey] = applyTemplates(value[subKey]);
					}
				}
			}
		}
	}

	const handler = nodeHandlers[node.type];
	if (!handler) {
		throw new Error(`Unknown node type: ${node.type}`);
	}

	stack.add(nodeId);
	const result = await handler(node);
	stack.delete(nodeId);
	cache[nodeId] = result;

	return result;
}

async function main() {
	try {
		const result = await processNode(startNodeId);
		process.exit(0);
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}

main();