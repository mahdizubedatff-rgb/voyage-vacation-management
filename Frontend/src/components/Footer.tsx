import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 bg-midnight text-white/70">
      <div className="container-page flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-4 text-sm leading-relaxed">
            Curated escapes, thoughtfully planned. A John Bryce Full Stack Web Development final project.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <Link to="/about" className="hover:text-white">
            About Voyage
          </Link>
          <p>© {new Date().getFullYear()} Ameer Zubedat. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
