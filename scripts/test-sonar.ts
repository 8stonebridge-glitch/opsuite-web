import PerplexityAI from "@perplexity-ai/perplexity_ai";

const client = new PerplexityAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
});

async function main() {
  const response = await client.chat.completions.create({
    model: "sonar",
    messages: [
      { role: "user", content: "What is the latest version of Next.js?" },
    ],
  });

  console.log("Response:", response.choices[0].message.content);
}

main().catch(console.error);
