import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, Bot, Cpu, User as UserIcon, Wrench } from "lucide-react";
import { assistantService } from "../services";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Spinner";
import type { QuestionAnswer } from "../types";

const EXAMPLES = [
  "Which destination is the cheapest?",
  "How many vacations are available?",
  "Which vacations are in Europe?",
  "What is the average vacation price?",
  "Which vacations are active right now?",
  "How much does the Kyoto trip cost?",
];

type Entry = { id: number; question: string } & ({ status: "pending" } | { status: "done"; result: QuestionAnswer } | { status: "error"; message: string });

export function McpQuestionsPage() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mutation = useMutation({ mutationFn: assistantService.ask });

  useEffect(() => {
    if (entries.length) bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [entries, reduceMotion]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || mutation.isPending) return;
    const id = nextId.current++;
    setEntries((all) => [...all, { id, question: trimmed, status: "pending" }]);
    setQuestion("");
    mutation.mutate(trimmed, {
      onSuccess: (result) => setEntries((all) => all.map((e) => (e.id === id ? { id, question: trimmed, status: "done", result } : e))),
      onError: (error) =>
        setEntries((all) => all.map((e) => (e.id === id ? { id, question: trimmed, status: "error", message: getErrorMessage(error) } : e))),
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(question);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(question);
    }
  };

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <div className="text-center">
        <p className="eyebrow mb-3">Powered by MCP</p>
        <h1 className="font-display text-4xl text-ink sm:text-5xl">Ask me anything about our vacations</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Questions are answered from live catalogue data through our Model Context Protocol server — prices, dates, regions and more.
        </p>
      </div>

      <div className="mt-10 rounded-[1.5rem] border border-line bg-white shadow-card">
        <div className="max-h-[60vh] min-h-[240px] space-y-6 overflow-y-auto p-5 sm:p-8" aria-live="polite">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-ocean-soft text-ocean">
                <Bot className="size-6" aria-hidden />
              </span>
              <p className="mt-4 font-medium text-ink">Not sure where to start? Try one of these:</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => ask(example)}
                    className="rounded-full border border-line bg-ivory px-4 py-2 text-sm text-ink transition-colors hover:border-ocean/40 hover:bg-ocean-soft"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            entries.map((entry) => (
              <motion.div key={entry.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex items-start justify-end gap-3">
                  <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-midnight px-4 py-3 text-[0.95rem] text-white">{entry.question}</p>
                  <span className="mt-1 hidden size-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-deep sm:flex" aria-label={user?.firstName ?? "You"}>
                    <UserIcon className="size-4" aria-hidden />
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-ocean-soft text-ocean" aria-hidden>
                    <Bot className="size-4" />
                  </span>
                  <div className="max-w-[85%] min-w-0">
                    {entry.status === "pending" ? (
                      <p className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-sand px-4 py-3 text-sm text-muted">
                        <Spinner className="size-4" /> Querying the MCP server…
                      </p>
                    ) : entry.status === "error" ? (
                      <p role="alert" className="rounded-2xl rounded-tl-md border border-danger/20 bg-danger-soft px-4 py-3 text-[0.95rem] text-danger">
                        {entry.message}
                      </p>
                    ) : (
                      <>
                        <p className="rounded-2xl rounded-tl-md bg-sand px-4 py-3 text-[0.95rem] leading-relaxed whitespace-pre-line text-ink">
                          {entry.result.answer}
                        </p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Cpu className="size-3.5" aria-hidden />
                            {entry.result.mode === "ai" ? "AI tool selection" : "Rule-based tool selection"}
                          </span>
                          {entry.result.toolCalls.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Wrench className="size-3.5" aria-hidden />
                              MCP tools: {entry.result.toolCalls.map((call) => call.tool).join(", ")}
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-3 sm:p-4">
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <div className="flex items-end gap-3 rounded-2xl border border-line bg-ivory p-2 focus-within:border-ocean focus-within:ring-4 focus-within:ring-ocean/10">
            <textarea
              id="question"
              rows={2}
              value={question}
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. Which vacations are in Asia?"
              className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-[0.95rem] text-ink placeholder:text-muted/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={question.trim().length < 3 || mutation.isPending}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-ocean px-4 text-sm font-medium text-white transition-colors hover:bg-ocean-dark disabled:opacity-45"
            >
              {mutation.isPending ? <Spinner className="size-4" /> : <ArrowUp className="size-4" aria-hidden />}
              Ask
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Press Enter to ask · Shift + Enter for a new line</p>
        </form>
      </div>
    </div>
  );
}
