import { resolveInput } from "../nodeutils.js";
import { callLLm } from "../llm.js";

export default async function callLLM(node) {
	const userPrompt = await resolveInput(node.input.userPrompt);
	const systemPrompt = await resolveInput(node.input.systemPrompt);
	const maxTokens = await resolveInput(node.input.maxTokens ?? 1024);
	const temperature = await resolveInput(node.input.temperature ?? 0.5);
	const testMode = await resolveInput(node.input.testMode ?? false);

	const llmResponse = await callLLm({
		test: testMode,
		apiKey: process.env[node.input.apiKey],
		baseURL: process.env[node.input.baseURL],
		model: node.input.model ?? "grok-4-1-fast-non-reasoning",
		systemPrompt: systemPrompt,
		userPrompt: userPrompt,
		maxTokens: maxTokens,
		temperature: temperature
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