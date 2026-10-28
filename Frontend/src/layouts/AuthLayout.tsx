import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "../components/Logo";

interface AuthLayoutProps {
  image: string;
  quote: string;
  caption: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}

/** Split-screen layout: photography on large screens, form-first on mobile. */
export function AuthLayout({ image, quote, caption, title, subtitle, children }: AuthLayoutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-midnight lg:block">
        <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/30 to-midnight/20" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/about" aria-label="About Voyage" className="self-start rounded-lg">
            <Logo tone="light" />
          </Link>
          <figure className="max-w-md">
            <blockquote className="font-display text-[2.1rem] leading-tight text-white">“{quote}”</blockquote>
            <figcaption className="mt-4 text-sm tracking-wide text-white/70">{caption}</figcaption>
          </figure>
        </div>
      </aside>

      <main id="main" className="flex flex-col bg-ivory">
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10 lg:hidden">
          <Logo />
          <Link to="/about" className="text-sm font-medium text-muted hover:text-ink">
            About
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <motion.div
            className="w-full max-w-[420px]"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1 className="font-display text-[2.2rem] leading-tight text-ink sm:text-[2.6rem]">{title}</h1>
            <p className="mt-3 text-muted">{subtitle}</p>
            <div className="mt-9">{children}</div>
          </motion.div>
        </div>
        <p className="hidden px-10 pb-8 text-sm text-muted lg:block">
          <Link to="/about" className="hover:text-ink">
            About Voyage
          </Link>
        </p>
      </main>
    </div>
  );
}
