import { readFileSync } from "node:fs";

const filePath = "./graphs/test.json";
const graphData = JSON.parse(readFileSync(filePath, "utf-8"));

const nodes = Object.fromEntries(
	graphData.graph.map(node => [node.id, node])
);

const cache = {};

const nodeHandlers = {

	constantString(node) {
		return node.input.string;
	},

	callLLM(node) {
		const userPrompt = processNode(node.input.userPrompt);
		return `Processed LLM Response: ${userPrompt}`;
	},

	outputLog(node) {
		const result = processNode(node.input.source);
		console.log(result);
		return result;
	},

	joinString(node) {
		const values = node.input.sources.map(id => processNode(id));
		return values.join(node.input.separator ?? "");
	},

	templateString(node) {

		const values = node.input.sources.map(id => processNode(id));

		let result = node.input.template;

		values.forEach((value, index) => {
			result = result.replaceAll(`{${index}}`, value ?? "");
		});

		return result;
	}
};

function processNode(nodeId, stack = new Set()) {

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
	const result = handler(node);
	stack.delete(nodeId);
	cache[nodeId] = result;

	return result;
}

processNode("out1");