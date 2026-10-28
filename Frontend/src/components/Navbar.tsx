import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { BarChart3, Compass, Info, LogOut, Menu, MessagesSquare, PlusCircle, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { buttonClasses } from "./ui/Button";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Compass;
}

const userLinks: NavItem[] = [
  { to: "/vacations", label: "Vacations", icon: Compass },
  { to: "/recommendations", label: "AI Concierge", icon: Sparkles },
  { to: "/ask", label: "Ask Voyage", icon: MessagesSquare },
  { to: "/about", label: "About", icon: Info },
];

const adminLinks: NavItem[] = [
  { to: "/vacations", label: "Vacations", icon: Compass },
  { to: "/admin/vacations/new", label: "Add Vacation", icon: PlusCircle },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/about", label: "About", icon: Info },
];

const guestLinks: NavItem[] = [{ to: "/about", label: "About", icon: Info }];

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);

  // Close the mobile menu after navigation (adjusting state during render, not in an effect).
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = !user ? guestLinks : isAdmin ? adminLinks : userLinks;
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled || open ? "border-line bg-ivory/90 shadow-[0_8px_30px_-20px_rgb(20_33_61/0.25)] backdrop-blur-md" : "border-transparent bg-ivory/70 backdrop-blur",
      )}
    >
      <nav className="container-page flex h-[72px] items-center justify-between gap-6" aria-label="Main">
        <Link to={user ? "/vacations" : "/login"} className="rounded-lg" aria-label="Voyage home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  clsx(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink",
                  )
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <div className="flex items-center gap-3 rounded-full border border-line bg-white py-1 pr-4 pl-1">
                <span
                  className={clsx(
                    "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                    isAdmin ? "bg-gold-soft text-gold-deep" : "bg-ocean-soft text-ocean-dark",
                  )}
                  aria-hidden
                >
                  {initials}
                </span>
                <span className="text-sm leading-tight">
                  <span className="block font-medium text-ink">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="block text-xs text-muted">{isAdmin ? "Administrator" : "Traveller"}</span>
                </span>
              </div>
              <button type="button" onClick={handleLogout} className={buttonClasses("ghost", "sm")}>
                <LogOut className="size-4" aria-hidden />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonClasses("ghost", "sm")}>
                Log in
              </Link>
              <Link to="/register" className={buttonClasses("dark", "sm")}>
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <div className="container-page space-y-1 py-4">
              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                  <span
                    className={clsx(
                      "flex size-10 items-center justify-center rounded-full text-sm font-semibold",
                      isAdmin ? "bg-gold-soft text-gold-deep" : "bg-ocean-soft text-ocean-dark",
                    )}
                    aria-hidden
                  >
                    {initials}
                  </span>
                  <div>
                    <p className="font-medium text-ink">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted">{isAdmin ? "Administrator" : "Traveller"}</p>
                  </div>
                </div>
              )}
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-[0.95rem] font-medium",
                      isActive ? "bg-white text-ink shadow-card" : "text-muted hover:bg-white/70 hover:text-ink",
                    )
                  }
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </NavLink>
              ))}
              <div className="pt-3">
                {user ? (
                  <button type="button" onClick={handleLogout} className={buttonClasses("secondary", "md", "w-full")}>
                    <LogOut className="size-4" aria-hidden />
                    Log out
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/login" className={buttonClasses("secondary", "md")}>
                      Log in
                    </Link>
                    <Link to="/register" className={buttonClasses("dark", "md")}>
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
