import { readFileSync, readdirSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { callLLm } from "./llm.js";
import dotenv from "dotenv";
dotenv.config();

const filePath = "./graphs/test.json";
const graphData = JSON.parse(readFileSync(filePath, "utf-8"));

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

		const blacklist = (node.input.blacklist ?? "")
			.split(";")
			.map(s => s.trim())
			.filter(Boolean);

		const files = [];

		function walk(dir) {

			const entries = readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {

				const fullPath = path.join(dir, entry.name);
				if (blacklist.some(b => entry.name.includes(b))) {
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
		const userPrompt = await processNode(node.input.userPrompt);
		const systemPrompt = await processNode(node.input.systemPrompt);
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

		return llmResponse.response;
	},

	async outputLog(node) {
		const result = await processNode(node.input.source);
		console.log(result);
		return result;
	},

	async joinString(node) {
		const values = await Promise.all(
			node.input.sources.map(id => processNode(id))
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

	async templateString(node) {

		const values = await Promise.all(
			node.input.sources.map(id => processNode(id))
		);

		let result = node.input.template;

		values.forEach((value, index) => {
			result = result.replaceAll(`{${index}}`, value ?? "");
		});

		return result;
	},

	async writeToTextFile(node) {

		let content = await processNode(node.input.source);
		if (typeof content !== "string") {
			content = JSON.stringify(content, null, 2);
		}

		let filePath = node.input.path;

		if (filePath.includes("{datenow}")) {
			const now = new Date();
			const timestamp =
				`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_` +
				`${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

			filePath = filePath.replaceAll("{datenow}", timestamp);
		}

		const dir = path.dirname(filePath);
		mkdirSync(dir, { recursive: true });

		const append = node.input.append ?? false;
		const encoding = node.input.encoding ?? "utf-8";

		if (append) {
			appendFileSync(filePath, content ?? "", encoding);
		} else {
			writeFileSync(filePath, content ?? "", encoding);
		}

		return filePath;
	}
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

await processNode("out1").catch(console.error);