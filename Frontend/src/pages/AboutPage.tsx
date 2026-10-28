import { Bot, Code2, Database, Heart, Layers, Lock, Server, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ButtonLink } from "../components/ui/Button";
import aboutImage from "../assets/images/about.jpg";

const FEATURES = [
  { icon: Heart, title: "Favourites that persist", text: "Like and unlike vacations; every like is stored in MongoDB." },
  { icon: Layers, title: "Smart filtering", text: "All, favourites, upcoming and active trips — paginated nine per page." },
  { icon: Sparkles, title: "AI travel concierge", text: "Live recommendations: attractions, activities, itinerary and tips." },
  { icon: Bot, title: "MCP-powered answers", text: "Questions answered by a real Model Context Protocol server over live data." },
  { icon: Lock, title: "Secure by design", text: "JWT authentication, bcrypt hashing and role-based authorization on the server." },
  { icon: Database, title: "Admin insights", text: "Full vacation management, a likes chart and an Excel-ready CSV export." },
];

const STACK = [
  { group: "Frontend", items: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "TanStack Query", "React Hook Form + Zod", "Recharts", "Framer Motion"] },
  { group: "Backend", items: ["Node.js", "Express", "TypeScript", "MongoDB", "Mongoose", "JWT", "bcrypt", "Multer", "Zod"] },
  { group: "AI & tooling", items: ["Anthropic Claude API", "Model Context Protocol SDK", "Docker Compose", "Vitest", "Supertest"] },
];

export function AboutPage() {
  const { user } = useAuth();
  return (
    <>
      <section className="container-page pt-4 sm:pt-6">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-midnight">
          <img src={aboutImage} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight/90 via-midnight/60 to-midnight/20" aria-hidden />
          <div className="max-w-2xl px-6 py-16 sm:px-12 sm:py-24">
            <p className="eyebrow mb-4 text-gold">About Voyage</p>
            <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">Travel planning, thoughtfully crafted.</h1>
            <p className="mt-5 text-lg leading-relaxed text-white/80">
              Voyage is a premium vacation management platform where travellers discover and save curated escapes, and administrators
              manage the collection with real-time insight.
            </p>
            {!user && (
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to="/register" variant="gold" size="lg">
                  Create an account
                </ButtonLink>
                <ButtonLink to="/login" variant="secondary" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Sign in
                </ButtonLink>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="purpose-title">
        <div>
          <p className="eyebrow mb-3">The project</p>
          <h2 id="purpose-title" className="font-display text-3xl text-ink sm:text-4xl">
            Purpose
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Voyage is the final project of the John Bryce Full Stack Web Developer program. It demonstrates a complete, production-minded
            application: a typed React client, a secure Express and MongoDB API, AI integration, a genuine MCP server, automated tests
            and a Docker-based deployment.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <Icon className="size-6 text-ocean" aria-hidden />
              <h3 className="mt-4 font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white/70 py-16 sm:py-20" aria-labelledby="stack-title">
        <div className="container-page">
          <p className="eyebrow mb-3">Under the hood</p>
          <h2 id="stack-title" className="font-display text-3xl text-ink sm:text-4xl">
            Technology stack
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STACK.map(({ group, items }) => (
              <div key={group} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <h3 className="flex items-center gap-2 font-semibold text-ink">
                  {group === "Backend" ? <Server className="size-5 text-ocean" aria-hidden /> : <Code2 className="size-5 text-ocean" aria-hidden />}
                  {group}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <li key={item} className="rounded-full bg-sand px-3 py-1 text-sm text-ink">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pt-16 sm:pt-20" aria-labelledby="developer-title">
        <div className="flex flex-col items-start gap-8 rounded-[1.75rem] bg-gradient-to-br from-gold-soft via-white to-ocean-soft p-8 sm:flex-row sm:items-center sm:p-12">
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-midnight font-display text-3xl text-gold" aria-hidden>
            AZ
          </span>
          <div>
            <p className="eyebrow mb-2">Developer</p>
            <h2 id="developer-title" className="font-display text-3xl text-ink">
              Ameer Zubedat
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Full stack web developer, John Bryce Full Stack Web Developer program. Voyage was built end to end — from the data model
              and REST API to the MCP server, AI integration and interface design.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
