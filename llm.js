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
}) {
  if (test) {
    return {
      response: "This is a test",
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