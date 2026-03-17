import PerplexityAI from "@perplexity-ai/perplexity_ai";

export const perplexity = new PerplexityAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
});
