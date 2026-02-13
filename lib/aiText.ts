// lib/aiText.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function aiText(prompt: string) {
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant that writes concise, warm, emotionally intelligent text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
  });

  return res.choices[0]?.message?.content?.trim() || "";
}
