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

  AI_PROVIDER: z.enum(["gemini", "none"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  // Free-tier eligible models (ai.google.dev/gemini-api/docs/pricing). The fallback is tried
  // when the primary model is unavailable, overloaded or timing out; leave it empty to disable.
  GEMINI_MODEL: z.string().min(1).default("gemini-3.1-flash-lite"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.6-flash"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),

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
export const isAiConfigured = (): boolean => env.AI_PROVIDER === "gemini" && Boolean(env.GEMINI_API_KEY?.trim());
