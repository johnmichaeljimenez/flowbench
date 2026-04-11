import { resolveInput, resolveFilePath } from "../nodeutils.js";
import { callLLm } from "../llm.js";

export default async function callLLM(node, context) {
	const userPrompt = await resolveInput(node.input.userPrompt, context);
	const systemPrompt = await resolveInput(node.input.systemPrompt, context);
	const maxTokens = await resolveInput(node.input.maxTokens ?? 1024, context);
	const temperature = await resolveInput(node.input.temperature ?? 0.5, context);
	const testMode = Boolean(await resolveInput(node.input.testMode ?? false, context));
	const useTools = Boolean(await resolveInput(node.input.useTools ?? false, context));

	const llmResponse = await callLLm({
		test: testMode,
		apiKey: node.input.apiKey ? process.env[node.input.apiKey] : "<none>",
		baseURL: process.env[node.input.baseURL],
		model: node.input.model ?? "grok-4-1-fast-non-reasoning",
		systemPrompt: systemPrompt,
		userPrompt: userPrompt,
		maxTokens: maxTokens,
		temperature: temperature,
		useTools: useTools
	});

	return {
		value: llmResponse.response,
		systemPrompt: systemPrompt,
		userPrompt: userPrompt,
		modelUsed: llmResponse.model,
		tokensUsed: llmResponse.tokensUsed,
		fullPrompt: `${systemPrompt}\n\n\n==========\n\n\n${userPrompt}`
	};
};

export const nodeMetadata = {
	type: "callLLM",
	name: "Call LLM",
	description: "Sends prompts to Grok, Gemini, LM Studio models or any other OpenAI-compatible LLM API and returns the response.",
	category: "LLM",
	inputs: {
		systemPrompt: { type: "string", required: true, supportsRef: true, description: "System prompt", default: "You are a helpful assistant." },
		userPrompt: { type: "string", required: true, supportsRef: true, description: "User prompt", default: "This is a test" },
		maxTokens: { type: "number", required: false, default: 1024 },
		temperature: { type: "number", required: false, default: 0.5 },
		testMode: { type: "boolean", required: false, default: false },
		apiKey: { type: "string", required: false, description: "Env var name (e.g. API_KEY_GROK), set to blank for LM Studio etc.", default: "API_KEY_GROK" },
		baseURL: { type: "string", required: true, description: "Env var name (e.g. BASE_URL_GROK)", default: "BASE_URL_GROK" },
		model: { type: "string", required: false, default: "grok-4-1-fast-non-reasoning" },
		useTools: { type: "boolean", required: false, default: false, description: "(For xAI) Use xAI tools as auto if set to true (ex. web search and X search). WARNING: Costs more when enabled." }
	},
	outputs: ["value", "fullPrompt", "modelUsed", "tokensUsed"]
};