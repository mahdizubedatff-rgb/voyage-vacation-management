import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarRange, Compass, Lightbulb, Map, MapPin, Sparkles, Sun } from "lucide-react";
import { assistantService } from "../services";
import { getErrorMessage } from "../services/api";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/States";
import type { RecommendationResult } from "../types";

const SUGGESTIONS = ["Lisbon, Portugal", "Kyoto, Japan", "Patagonia", "Cape Town", "Amalfi Coast"];
const LOADING_STEPS = ["Studying the map…", "Shortlisting must-see places…", "Sketching your itinerary…", "Packing local tips…"];

export function AiRecommendationPage() {
  const [destination, setDestination] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: assistantService.recommend });

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setInputError("Please enter a destination");
      return;
    }
    setInputError(null);
    mutation.mutate(trimmed);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(destination);
  };

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden bg-midnight text-white">
        <div
          className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-ocean/30 blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-48 -left-24 size-[420px] rounded-full bg-gold/15 blur-3xl" aria-hidden />
        <div className="container-page relative pt-14 pb-12 sm:pt-20 sm:pb-14">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-[0.16em] text-gold uppercase">
            <Sparkles className="size-3.5" aria-hidden />
            AI travel concierge
          </p>
          <h1 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Where would you like to go?</h1>
          <p className="mt-4 max-w-xl text-white/75 sm:text-lg">
            Name a destination and our concierge will prepare highlights, experiences, a day-by-day plan and insider tips.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8 max-w-2xl">
            <label htmlFor="destination" className="sr-only">
              Destination
            </label>
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-2 shadow-lift sm:flex-row sm:items-center sm:rounded-full">
              <div className="flex flex-1 items-center gap-3 px-4">
                <MapPin className="size-5 shrink-0 text-ocean" aria-hidden />
                <input
                  id="destination"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="e.g. Lisbon, Portugal"
                  maxLength={100}
                  aria-invalid={Boolean(inputError) || undefined}
                  aria-describedby={inputError ? "destination-error" : undefined}
                  className="h-12 w-full bg-transparent text-[1.02rem] text-ink placeholder:text-muted/70 focus:outline-none"
                />
              </div>
              <Button type="submit" size="lg" loading={mutation.isPending} icon={<Sparkles className="size-4" aria-hidden />}>
                Get Recommendation
              </Button>
            </div>
            {inputError && (
              <p id="destination-error" role="alert" className="mt-3 text-sm text-[#ffb4a9]">
                {inputError}
              </p>
            )}
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/60">Try:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setDestination(suggestion);
                  submit(suggestion);
                }}
                disabled={mutation.isPending}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/85 transition-colors hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pt-12" aria-live="polite" aria-busy={mutation.isPending}>
        <AnimatePresence mode="wait">
          {mutation.isPending ? (
            <LoadingState key="loading" />
          ) : mutation.isError ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ErrorState message={getErrorMessage(mutation.error)} onRetry={() => submit(destination)} />
            </motion.div>
          ) : mutation.data ? (
            <RecommendationView key={mutation.data.generatedAt} result={mutation.data} />
          ) : (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Compass, title: "Destination overview", text: "The character of the place in a few lines." },
                { icon: Map, title: "Attractions", text: "The sights that are genuinely worth your time." },
                { icon: CalendarRange, title: "Itinerary", text: "A balanced day-by-day plan." },
                { icon: Lightbulb, title: "Travel tips", text: "Practical advice locals would give you." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                  <Icon className="size-6 text-ocean" aria-hidden />
                  <h2 className="mt-4 font-display text-lg text-ink">{title}</h2>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function LoadingState() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-[var(--radius-card)] border border-line bg-white p-8 shadow-card sm:p-10">
      <div className="flex items-center gap-4">
        <span className="relative flex size-12 items-center justify-center rounded-full bg-ocean-soft text-ocean">
          <Sparkles className="size-6" aria-hidden />
          {!reduceMotion && <span className="absolute inset-0 animate-ping rounded-full bg-ocean/20" aria-hidden />}
        </span>
        <div>
          <p className="font-display text-xl text-ink">Your concierge is planning…</p>
          <ul className="mt-1 text-sm text-muted">
            {LOADING_STEPS.map((step, i) => (
              <motion.li
                key={step}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0.45] }}
                transition={{ duration: 3, delay: i * 2.2 }}
              >
                {step}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-line p-5">
            <div className="skeleton h-5 w-1/3 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Generating recommendation
      </span>
    </motion.div>
  );
}

function Section({ icon: Icon, title, children, className }: { icon: typeof Compass; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-card sm:p-8 ${className ?? ""}`}>
      <h3 className="mb-5 flex items-center gap-3 font-display text-2xl text-ink">
        <span className="flex size-10 items-center justify-center rounded-xl bg-ocean-soft text-ocean">
          <Icon className="size-5" aria-hidden />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function RecommendationView({ result }: { result: RecommendationResult }) {
  const { recommendation: r } = result;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
      <header className="rounded-[var(--radius-card)] bg-gradient-to-br from-gold-soft via-white to-ocean-soft p-8 sm:p-10">
        <p className="eyebrow">Your recommendation</p>
        <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">{r.destination}</h2>
        <p className="mt-3 font-display text-xl text-gold-deep italic">{r.tagline}</p>
        <p className="mt-5 max-w-3xl text-[1.05rem] leading-relaxed text-ink/80">{r.overview}</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-ink shadow-sm">
          <Sun className="size-4 text-gold" aria-hidden />
          <span className="font-medium">Best time to visit:</span> {r.bestTimeToVisit}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Map} title="Top attractions">
          <ul className="space-y-4">
            {r.attractions.map((item) => (
              <li key={item.name}>
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="mt-0.5 text-[0.95rem] leading-relaxed text-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={Compass} title="Suggested activities">
          <ul className="space-y-4">
            {r.activities.map((item) => (
              <li key={item.name}>
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="mt-0.5 text-[0.95rem] leading-relaxed text-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section icon={CalendarRange} title="Recommended itinerary">
        <ol className="relative space-y-6 border-l-2 border-ocean/20 pl-8">
          {r.itinerary.map((day) => (
            <li key={day.day} className="relative">
              <span className="absolute top-0 -left-[45px] flex size-8 items-center justify-center rounded-full bg-ocean text-sm font-semibold text-white ring-4 ring-white">
                {day.day}
              </span>
              <p className="text-xs font-semibold tracking-wider text-ocean uppercase">Day {day.day}</p>
              <p className="font-display text-lg text-ink">{day.title}</p>
              <p className="mt-1 leading-relaxed text-muted">{day.description}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={Lightbulb} title="Travel tips">
        <ul className="grid gap-3 sm:grid-cols-2">
          {r.tips.map((tip) => (
            <li key={tip} className="rounded-xl bg-sand/70 p-4 text-[0.95rem] leading-relaxed text-ink/85">
              {tip}
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-center text-xs text-muted">
        Generated by {result.provider} · {result.model} · {new Date(result.generatedAt).toLocaleString()}. AI suggestions may be imperfect — verify
        details before booking.
      </p>
    </motion.article>
  );
}
