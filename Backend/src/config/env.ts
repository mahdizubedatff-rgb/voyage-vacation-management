import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/voyage"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  UPLOADS_DIR: z.string().default(path.resolve(process.cwd(), "uploads")),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),

  AI_PROVIDER: z.enum(["anthropic", "none"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),

  MCP_SERVER_URL: z.string().default("http://localhost:4001/mcp"),
  MCP_PORT: z.coerce.number().int().positive().default(4001),
});

const testDefaults = process.env.NODE_ENV === "test" ? { JWT_SECRET: "test-secret-please-change-0123456789" } : {};

const parsed = envSchema.safeParse({ ...testDefaults, ...process.env });

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isAiConfigured = (): boolean => env.AI_PROVIDER === "anthropic" && Boolean(env.ANTHROPIC_API_KEY);
