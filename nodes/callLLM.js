import { resolveInput } from "../nodeutils.js";
import { callLLm } from "../llm.js";

export default async function callLLM(node) {
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
}