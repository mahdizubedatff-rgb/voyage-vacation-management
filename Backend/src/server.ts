import { createApp } from "./app";
import { connectDatabase } from "./config/db";
import { env, isAiConfigured } from "./config/env";
import { Vacation } from "./models/Vacation";
import { seedDatabase } from "./seed/seed";

async function main(): Promise<void> {
  await connectDatabase();
  if (process.env.SEED_ON_EMPTY === "true" && (await Vacation.estimatedDocumentCount()) === 0) {
    console.log("Empty database detected - seeding demo data");
    await seedDatabase({ log: true });
  }
  createApp().listen(env.PORT, () => {
    console.log(`Voyage API listening on http://localhost:${env.PORT}/api`);
    console.log(`AI provider: ${isAiConfigured() ? `${env.AI_PROVIDER} (${env.GEMINI_MODEL})` : "not configured (set GEMINI_API_KEY)"}`);
    console.log(`MCP server: ${env.MCP_SERVER_URL}`);
  });
}

main().catch((error: unknown) => {
  console.error("Failed to start the API", error);
  process.exit(1);
});
