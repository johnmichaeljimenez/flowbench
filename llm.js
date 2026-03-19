import OpenAI from "openai";

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
  useTools = false //for xAI
}) {
  if (test) {
    return {
      response: `This is a test.\n\nSystem Prompt: ${systemPrompt}\n\nUser Prompt: ${userPrompt}`,
      modelUsed: "test mode",
      tokensUsed: 0,
    };
  }
  if (!userPrompt) throw new Error("userPrompt is required");
  if (!apiKey) throw new Error("apiKey is required");
  if (!baseURL) throw new Error("baseURL is required");
  if (!model) throw new Error("model is required");

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

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
    if (completion.output && completion.output.length > 0) {
      const lastItem = completion.output[completion.output.length - 1];
      responseText = lastItem.content?.[0]?.text?.trim() || "";
    }

    return {
      response: responseText,
      modelUsed: model,
      tokensUsed: completion.usage?.total_tokens ?? "unknown",
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

    return {
      response: completion.choices?.[0]?.message?.content?.trim() || "",
      modelUsed: model,
      tokensUsed: completion.usage?.total_tokens ?? "unknown",
    };
  }
}