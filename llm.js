import OpenAI from "openai";

function stripOuterCodeBlock(text) {
  if (!text || typeof text !== 'string') return text || '';

  const trimmed = text.trim();

  const fullRegex = /^```[\s\w]*\n?([\s\S]*?)\n?```$/;
  let match = trimmed.match(fullRegex);
  if (match && match[1] !== undefined) {
    return match[1].trim();
  }

  const openRegex = /^```[\s\w]*\n?([\s\S]*)$/;
  match = trimmed.match(openRegex);
  if (match && match[1] !== undefined) {
    return match[1].trim();
  }

  return trimmed;
}

export async function callLLm({
  test,
  userPrompt,
  systemPrompt = "You are a helpful assistant.",
  apiKey,
  baseURL,
  model,
  temperature = 0.7,
  maxTokens = 1024,
  topP = 0.9,
  useTools = false, //for xAI
  logToolUsage = true
}) {
  if (test) {
    const result = {
      response: `This is a test.\n\nSystem Prompt: ${systemPrompt}\n\nUser Prompt: ${userPrompt}`,
      modelUsed: "test mode",
      tokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      usedTools: false,
      toolCalls: [],
      usage: null,
    };

    if (logToolUsage) {
      console.log("[LLM Test Mode] No tokens or tools used");
    }
    return result;
  }

  if (!userPrompt) throw new Error("userPrompt is required");
  if (!apiKey) throw new Error("apiKey is required");
  if (!baseURL) throw new Error("baseURL is required");
  if (!model) throw new Error("model is required");

  const client = new OpenAI({ apiKey, baseURL });

  if (useTools) {
    const completion = await client.responses.create({
      model,
      input: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt },
      ],
      tools: [
        { type: "web_search" },
        { type: "x_search" },
      ],
      temperature,
      max_output_tokens: maxTokens,
      top_p: topP,
      tool_choice: "auto",
    });

    let responseText = "";
    let usedTools = false;
    const toolCalls = [];

    if (completion.output && Array.isArray(completion.output)) {
      for (const item of completion.output) {
        if (item.type && item.type.includes("_call")) {
          usedTools = true;
          const toolName = item.name || item.type.replace("_call", "");
          toolCalls.push(toolName);
        }

        if (item.type === "message" && item.content?.[0]?.text) {
          responseText = item.content[0].text.trim();
        }
      }
    }

    const usage = completion.usage || {};
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;

    if (logToolUsage) {
      console.log(`\n=== LLM Tool & Cost Report ===`);
      console.log(`Model          : ${model}`);
      console.log(`Tools used     : ${usedTools} (${toolCalls.length} call${toolCalls.length === 1 ? "" : "s"})`);
      if (toolCalls.length) console.log(`Tools called   : ${toolCalls.join(", ")}`);
      console.log(`Input tokens   : ${inputTokens}`);
      console.log(`Output tokens  : ${outputTokens}`);
      console.log(`Total tokens   : ${totalTokens}`);
      console.log(`Response length: ${responseText.length} chars`);
      console.log(`==============================\n`);
    }

    const original = responseText;
    responseText = stripOuterCodeBlock(responseText);
    if (original !== responseText && logToolUsage) {
      console.log(`[stripCodeBlocks] Removed outer code fences (${original.length} → ${responseText.length} chars)`);
    }

    return {
      response: responseText,
      modelUsed: model,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      usedTools,
      toolCalls,
      usage: completion.usage || null,
    };

  } else {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    });

    let responseText = completion.choices?.[0]?.message?.content?.trim() || "";
    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;

    if (logToolUsage) {
      console.log(`\n=== LLM Cost Report (No Tools) ===`);
      console.log(`Model        : ${model}`);
      console.log(`Tools used   : false`);
      console.log(`Input tokens : ${inputTokens}`);
      console.log(`Output tokens: ${outputTokens}`);
      console.log(`Total tokens : ${totalTokens}`);
      console.log(`================================\n`);

      const choice = completion.choices?.[0];
      console.log("Finish reason:", choice?.finish_reason);
      console.log("Raw content length:", choice?.message?.content?.length || 0);
      if (choice?.finish_reason === "length") {
        console.warn("OUTPUT WAS TRUNCATED BY MAX_TOKENS LIMIT");
      }
    }


    const original = responseText;
    responseText = stripOuterCodeBlock(responseText);
    if (original !== responseText && logToolUsage) {
      console.log(`[stripCodeBlocks] Removed outer code fences (${original.length} → ${responseText.length} chars)`);
    }

    return {
      response: responseText,
      modelUsed: model,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      usedTools: false,
      toolCalls: [],
      usage: completion.usage || null,
    };
  }
}

export async function generateImage({
  test,
  prompt,
  apiKey,
  baseURL,
  model = "grok-imagine-image",
  n = 1,
  aspectRatio,
  resolution,
  responseFormat = "url",
  logUsage = true
}) {
  if (test) {
    const result = {
      images: Array.from({ length: n }, (_, i) => ({
        url: `https://picsum.photos/id/${1000 + i}/1024/1024`,
        revised_prompt: prompt
      })),
      modelUsed: "test-mode",
      prompt,
      n,
      aspectRatio,
      resolution,
      responseFormat
    };
    if (logUsage) console.log("[Image Gen Test Mode]");
    return result;
  }

  if (!prompt) throw new Error("prompt is required");
  if (!apiKey) throw new Error("apiKey is required");
  if (!baseURL) throw new Error("baseURL is required");

  const client = new OpenAI({ apiKey, baseURL });

  const params = {
    model,
    prompt,
    n: Math.max(1, Math.min(10, Number(n) || 1)),
    response_format: responseFormat,
  };

  const extraBody = {};
  if (aspectRatio) extraBody.aspect_ratio = aspectRatio;
  if (resolution) extraBody.resolution = resolution;

  const response = await client.images.generate({
    ...params,
    ...(Object.keys(extraBody).length > 0 ? { extra_body: extraBody } : {})
  });

  if (logUsage) {
    console.log(`\n=== Grok Imagine Report ===`);
    console.log(`Model          : ${model}`);
    console.log(`Images         : ${params.n}`);
    console.log(`Aspect Ratio   : ${aspectRatio || "auto"}`);
    console.log(`Resolution     : ${resolution || "1k"}`);
    console.log(`Format         : ${responseFormat}`);
    console.log(`===========================\n`);
  }

  return {
    images: response.data || [],
    modelUsed: model,
    prompt,
    n: params.n,
    aspectRatio: aspectRatio || null,
    resolution: resolution || null,
    responseFormat,
    fullResponse: response
  };
}