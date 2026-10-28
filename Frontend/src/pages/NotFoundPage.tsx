import { Compass } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ButtonLink } from "../components/ui/Button";

export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-gold-soft text-gold-deep">
        <Compass className="size-8" aria-hidden />
      </span>
      <p className="eyebrow mt-6">Error 404</p>
      <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">This path leads nowhere</h1>
      <p className="mt-4 max-w-md text-muted">The page you're looking for doesn't exist or has moved.</p>
      <ButtonLink to={user ? "/vacations" : "/login"} className="mt-8" size="lg">
        {user ? "Back to vacations" : "Go to sign in"}
      </ButtonLink>
    </div>
  );
}
