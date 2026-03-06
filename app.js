import { readFileSync } from "node:fs";
import { callLLm } from "./llm.js";
import dotenv from "dotenv";
dotenv.config();

const filePath = "./graphs/test.json";
const graphData = JSON.parse(readFileSync(filePath, "utf-8"));

const nodes = Object.fromEntries(
	graphData.graph.map(node => [node.id, node])
);

const cache = {};

const nodeHandlers = {

	async constantString(node) {
		return node.input.string;
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

	async templateString(node) {

		const values = await Promise.all(
			node.input.sources.map(id => processNode(id))
		);

		let result = node.input.template;

		values.forEach((value, index) => {
			result = result.replaceAll(`{${index}}`, value ?? "");
		});

		return result;
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