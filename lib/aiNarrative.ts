import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateNarrative(input: {
  connectionScore: number | null;
  momentumLabel?: string;
  alignmentLabel?: string;
  topThemes: string[];
  sampleNotes: string[];
}) {
  try {
    const prompt = `
You are a warm, emotionally intelligent relationship coach.

Write a short weekly relationship story (5–7 sentences).
Tone:
- supportive
- balanced
- never blaming
- never dramatic
- encouraging growth

Facts for this week:
- Average connection score: ${input.connectionScore ?? "unknown"}/5
- Momentum: ${input.momentumLabel ?? "unknown"}
- Alignment: ${input.alignmentLabel ?? "unknown"}
- Top love themes: ${input.topThemes.join(", ") || "none"}
- Sample partner reflections: ${input.sampleNotes.join(" | ") || "none"}

Rules:
- Be specific but gentle
- Normalize ups and downs
- Highlight one strength
- Suggest gentle improvement
- No emojis
`;

    const res = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    return res.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("AI narrative failed:", err);
    return null;
  }
}
export async function generatePolish(prompt: string) {
    try {
      const res = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You rewrite gratitude memories in a warm, emotionally intelligent tone. Keep it real and grounded.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });
  
      return res.choices[0]?.message?.content ?? null;
    } catch (err) {
      console.error("AI polish failed:", err);
      return null;
    }
}
  