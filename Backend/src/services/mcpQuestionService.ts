import Anthropic from "@anthropic-ai/sdk";
import { env, isAiConfigured } from "../config/env";
import { mcpClient, type VacationMcpClient } from "../mcp/client";
import { parseRegion } from "../mcp/regions";
import type { VacationSummary, VacationDetails } from "../mcp/vacationData";
import { mapAnthropicError } from "./ai/anthropicProvider";
import { AppError } from "../utils/AppError";

export interface ToolCallRecord {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  /** "ai": an LLM chose the MCP tools. "rules": a deterministic router chose them. Both execute real MCP calls. */
  mode: "ai" | "rules";
  toolCalls: ToolCallRecord[];
}

let clientOverride: VacationMcpClient | undefined;
let aiOverride: boolean | undefined;

/** Test hooks. */
export function setQuestionServiceDeps(deps: { client?: VacationMcpClient; aiEnabled?: boolean }): void {
  clientOverride = deps.client;
  aiOverride = deps.aiEnabled;
}

const getClient = () => clientOverride ?? mcpClient;
const aiEnabled = () => aiOverride ?? isAiConfigured();

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const describe = (v: VacationSummary) => `${v.destination} (${v.startDate} → ${v.endDate}, ${usd(v.price)})`;
const bulletList = (items: VacationSummary[]) => items.map((v) => `• ${describe(v)}`).join("\n");

interface Statistics {
  totalVacations: number;
  byStatus: { upcoming: number; active: number; past: number };
  averagePrice: number | null;
  cheapest: VacationSummary | null;
  mostExpensive: VacationSummary | null;
  mostLiked: VacationSummary | null;
}

const HELP_MESSAGE =
  "I can answer questions about our vacation catalogue — for example: how many vacations are available, " +
  "the average or cheapest price, vacations in a region such as Europe or Asia, upcoming or active trips, " +
  "or the price and details of a specific destination.";

/**
 * Deterministic natural-language router used when no AI provider is configured.
 * It still answers exclusively through MCP tool calls.
 */
async function answerWithRules(question: string, client: VacationMcpClient): Promise<QuestionAnswer> {
  const q = question.toLowerCase();
  const toolCalls: ToolCallRecord[] = [];
  const call = async <T>(tool: string, args: Record<string, unknown> = {}): Promise<T> => {
    toolCalls.push({ tool, arguments: args });
    return (await client.callTool(tool, args)) as T;
  };
  const done = (answer: string): QuestionAnswer => ({ question, answer, mode: "rules", toolCalls });

  const status = /\b(upcoming|future|not started|haven't started|coming up)\b/.test(q)
    ? "upcoming"
    : /\b(active|current|currently|ongoing|in progress|happening now|right now)\b/.test(q)
      ? "active"
      : /\b(past|ended|finished|completed|previous)\b/.test(q)
        ? "past"
        : null;

  // 1. Region questions: "Which vacations are in Europe?"
  const region = parseRegion(q);
  if (region) {
    const result = await call<{ region: string; count: number; vacations: VacationSummary[] }>("get_vacations_by_region", { region });
    if (result.count === 0) return done(`We don't currently have any vacations in ${result.region}.`);
    return done(`We have ${result.count} vacation${result.count === 1 ? "" : "s"} in ${result.region}:\n${bulletList(result.vacations)}`);
  }

  // 2. Aggregate price questions.
  if (/\b(average|mean|typical)\b/.test(q)) {
    const stats = await call<Statistics>("get_vacation_statistics");
    if (stats.averagePrice === null) return done("There are no vacations in the catalogue yet.");
    return done(`The average vacation price is ${usd(stats.averagePrice)} across ${stats.totalVacations} vacations.`);
  }
  if (/\b(cheapest|least expensive|lowest price|most affordable|budget)\b/.test(q)) {
    const stats = await call<Statistics>("get_vacation_statistics");
    return done(stats.cheapest ? `The cheapest vacation is ${describe(stats.cheapest)}.` : "There are no vacations yet.");
  }
  if (/\b(most expensive|priciest|highest price|luxurious|costliest)\b/.test(q)) {
    const stats = await call<Statistics>("get_vacation_statistics");
    return done(stats.mostExpensive ? `The most expensive vacation is ${describe(stats.mostExpensive)}.` : "There are no vacations yet.");
  }
  if (/\b(most liked|most popular|favou?rite)\b/.test(q)) {
    const stats = await call<Statistics>("get_vacation_statistics");
    return done(stats.mostLiked ? `The most liked vacation is ${stats.mostLiked.destination} with ${stats.mostLiked.likes} likes.` : "There are no vacations yet.");
  }

  // 3. Counting questions.
  if (/\b(how many|number of|count|total)\b/.test(q)) {
    if (status) {
      const result = await call<{ count: number }>("list_vacations", { status });
      return done(`There ${result.count === 1 ? "is" : "are"} ${result.count} ${status} vacation${result.count === 1 ? "" : "s"}.`);
    }
    const stats = await call<Statistics>("get_vacation_statistics");
    const { upcoming, active, past } = stats.byStatus;
    return done(
      `There are ${stats.totalVacations} vacations in the catalogue: ${upcoming} upcoming, ${active} active right now and ${past} already completed.`,
    );
  }

  // 4. Questions naming a specific destination.
  const catalogue = await call<{ vacations: VacationSummary[] }>("list_vacations", { status: "all" });
  const mentioned = catalogue.vacations.find((v) =>
    v.destination
      .toLowerCase()
      .split(/,\s*/)
      .some((part) => part.length > 2 && q.includes(part)),
  );
  if (mentioned) {
    const name = mentioned.destination.split(",")[0] ?? mentioned.destination;
    if (/\b(price|cost|how much|expensive|cheap)\b/.test(q)) {
      const result = await call<{ prices: Array<{ destination: string; price: number }> }>("get_vacation_price", { destination: name });
      return done(result.prices.map((p) => `${p.destination} costs ${usd(p.price)} per person.`).join("\n"));
    }
    const result = await call<{ vacations: VacationDetails[] }>("get_vacation_details", { destination: name });
    const v = result.vacations[0] as VacationDetails;
    return done(`${v.destination} — ${v.startDate} to ${v.endDate} (${v.nights} nights), ${usd(v.price)}, currently ${v.status}.\n${v.description}`);
  }

  // 5. Listing questions.
  if (status) {
    const result = await call<{ count: number; vacations: VacationSummary[] }>("list_vacations", { status });
    if (result.count === 0) return done(`There are no ${status} vacations right now.`);
    return done(`${result.count} ${status} vacation${result.count === 1 ? "" : "s"}:\n${bulletList(result.vacations)}`);
  }
  if (/\b(list|show|which|what) .*\b(vacations|trips|destinations|holidays)\b|\ball (vacations|destinations)\b/.test(q)) {
    return done(`Here are all ${catalogue.vacations.length} vacations:\n${bulletList(catalogue.vacations)}`);
  }

  return done(`I'm not sure how to answer that. ${HELP_MESSAGE}`);
}

const AGENT_SYSTEM_PROMPT = `You are the Voyage vacation assistant. Answer questions about Voyage's vacation catalogue.
Use the provided tools to look up facts; never guess catalogue data. Prices are USD per person.
If a question is unrelated to Voyage vacations, say briefly that you can only help with questions about our vacations.
Answer concisely in plain text (no markdown headings). Use short bullet lines starting with "• " for lists.`;

/** LLM-driven answering: Claude picks MCP tools, the backend executes them over the MCP client. */
async function answerWithAi(question: string, client: VacationMcpClient): Promise<QuestionAnswer> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: env.AI_TIMEOUT_MS, maxRetries: 2 });
  const mcpTools = await client.listTools();
  const tools: Anthropic.Tool[] = mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? tool.name,
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));

  const toolCalls: ToolCallRecord[] = [];
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Today's date is ${new Date().toISOString().slice(0, 10)}.\n\nQuestion: ${question}` },
  ];

  try {
    for (let turn = 0; turn < 6; turn++) {
      const response = await anthropic.messages.create({
        model: env.AI_MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        system: AGENT_SYSTEM_PROMPT,
        tools,
        messages,
      });

      if (response.stop_reason === "refusal") {
        return { question, answer: "Sorry, I can't help with that request.", mode: "ai", toolCalls };
      }

      const toolUses = response.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const answer = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
        return { question, answer: answer || HELP_MESSAGE, mode: "ai", toolCalls };
      }

      messages.push({ role: "assistant", content: response.content });
      const results = await Promise.all(
        toolUses.map(async (use): Promise<Anthropic.ToolResultBlockParam> => {
          const args = (use.input ?? {}) as Record<string, unknown>;
          toolCalls.push({ tool: use.name, arguments: args });
          try {
            const result = await client.callTool(use.name, args);
            return { type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) };
          } catch (error) {
            return { type: "tool_result", tool_use_id: use.id, content: (error as Error).message, is_error: true };
          }
        }),
      );
      messages.push({ role: "user", content: results });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    const mapped = mapAnthropicError(error);
    throw new AppError(mapped.kind === "rate_limit" ? 429 : 503, mapped.message);
  }

  return { question, answer: "Sorry, I couldn't finish answering that question. Please try rephrasing it.", mode: "ai", toolCalls };
}

export async function askQuestion(question: string): Promise<QuestionAnswer> {
  const client = getClient();
  return aiEnabled() ? answerWithAi(question, client) : answerWithRules(question, client);
}
