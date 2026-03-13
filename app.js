#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { initNodeUtils } from "./nodeutils.js";
import { pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
	path: path.resolve(__dirname, '.env')
});

const args = process.argv.slice(2);
if (args.length === 0) {
	console.error('Usage: node app.js <graph.json> [startNode] [--<nodeId>.<inputField> <value>]...');
	process.exit(1);
}

const params = {};
let startNodeId = "out1";
let paramIndex = 1;
if (args.length > 1 && !args[1].startsWith('--')) {
	startNodeId = args[1];
	paramIndex = 2;
}
for (let i = paramIndex; i < args.length; i += 2) {
	const keyArg = args[i];
	if (keyArg.startsWith('--') && i + 1 < args.length) {
		params[keyArg.slice(2)] = args[i + 1];
	}
}

const graphPath = path.resolve(args[0]);
if (!existsSync(graphPath)) {
	console.error(`Graph file not found: ${graphPath}`);
	process.exit(1);
}

process.chdir(path.dirname(graphPath));

const graphData = JSON.parse(readFileSync(graphPath, "utf-8"));

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

function applyParams() {
	for (const [paramName, paramValue] of Object.entries(params)) {
		const parts = paramName.split('.');
		if (parts.length !== 2) continue;

		const [nodeId, inputField] = parts;
		if (!nodes[nodeId]) continue;

		// Type coercion
		let value = paramValue;
		const num = Number(value);
		if (!isNaN(num)) {
			value = num;
		} else if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}

		if (!nodes[nodeId].input) {
			nodes[nodeId].input = {};
		}
		nodes[nodeId].input[inputField] = value;

		console.log(`🔧 Overridden ${nodeId}.input.${inputField} = ${JSON.stringify(value)}`);
	}
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

const nodeHandlers = {};
async function loadNodeHandlers() {

	const nodesDir = path.join(__dirname, "nodes");
	const files = readdirSync(nodesDir);

	for (const file of files) {
		if (!file.endsWith(".js")) continue;

		const nodeType = path.basename(file, ".js");
		const modulePath = path.join(nodesDir, file);
		const module = await import(pathToFileURL(modulePath).href);

		nodeHandlers[nodeType] = module.default;
	}
}

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
	console.log(`Executing node: ${node.type} (${node.id})`);
	const result = await handler(node);
	stack.delete(nodeId);
	cache[nodeId] = result;

	return result;
}

async function main() {
	try {

		await loadNodeHandlers();

		initNodeUtils({
			resolveInput,
			extractFromPath,
			applySchema
		});

		applyParams();

		let output;
		if (graphData.entryPoints && Array.isArray(graphData.entryPoints)) {
			const results = {};
			for (const entryPoint of graphData.entryPoints) {
				results[entryPoint] = await processNode(entryPoint);
			}
			output = JSON.stringify(results, null, 2);
		} else {
			output = await processNode(startNodeId);
		}

		process.exit(0);
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}
main();


/*
 * TODO:
- verbose mode flag (log each node processing step)
- AI image and video generation node via Grok Imagine API for full content creation suite (+exec nodes with ffmpeg)
- schema validator (low prio for now)
- frontend via React Flow (low prio for now)
 */