import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarClock, Compass, Heart, Layers, Plus, Plane, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDeleteVacation, useToggleLike, useVacationList } from "../hooks/useVacations";
import { getErrorMessage } from "../services/api";
import { reportService, vacationService } from "../services";
import type { Vacation, VacationFilter } from "../types";
import { VacationCard, VacationCardSkeleton } from "../components/VacationCard";
import { Pagination } from "../components/ui/Pagination";
import { SegmentedControl, type Segment } from "../components/ui/SegmentedControl";
import { EmptyState, ErrorState, PageHeader } from "../components/ui/States";
import { ButtonLink } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import heroImage from "../assets/images/hero.jpg";

const USER_FILTERS: Segment<VacationFilter>[] = [
  { value: "all", label: "All vacations", icon: <Compass className="size-4" aria-hidden /> },
  { value: "liked", label: "My favourites", icon: <Heart className="size-4" aria-hidden /> },
  { value: "upcoming", label: "Upcoming", icon: <CalendarClock className="size-4" aria-hidden /> },
  { value: "active", label: "Active now", icon: <Sun className="size-4" aria-hidden /> },
];

const ADMIN_FILTERS = USER_FILTERS.filter((segment) => segment.value !== "liked");

const EMPTY_COPY: Record<VacationFilter, { title: string; description: string }> = {
  all: { title: "No vacations yet", description: "New escapes are being curated. Check back soon." },
  liked: {
    title: "No favourites yet",
    description: "Tap the heart on any vacation to save it here for later.",
  },
  upcoming: { title: "No upcoming vacations", description: "Every trip in the collection has already begun." },
  active: { title: "Nothing happening right now", description: "No vacations are in progress today. Explore upcoming trips instead." },
};

function parseFilter(value: string | null, isAdmin: boolean): VacationFilter {
  const allowed = (isAdmin ? ADMIN_FILTERS : USER_FILTERS).map((segment) => segment.value);
  return allowed.includes(value as VacationFilter) ? (value as VacationFilter) : "all";
}

export function VacationsPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get("filter"), isAdmin);
  const page = Math.max(1, Number(params.get("page")) || 1);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useVacationList(filter, page);
  const toggleLike = useToggleLike();
  const deleteVacation = useDeleteVacation();
  const [pendingDelete, setPendingDelete] = useState<Vacation | null>(null);

  const update = (next: { filter?: VacationFilter; page?: number }) => {
    const nextFilter = next.filter ?? filter;
    const nextPage = next.filter !== undefined ? 1 : (next.page ?? page);
    const search = new URLSearchParams();
    if (nextFilter !== "all") search.set("filter", nextFilter);
    if (nextPage > 1) search.set("page", String(nextPage));
    setParams(search);
    if (next.page !== undefined) document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLike = (vacation: Vacation) =>
    toggleLike.mutate({ vacation }, { onError: (err) => toast.error(getErrorMessage(err, "We couldn't update your favourites.")) });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteVacation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(`${pendingDelete.destination} was deleted`);
        setPendingDelete(null);
        if (data && data.items.length === 1 && page > 1) update({ page: page - 1 });
      },
      onError: (err) => toast.error(getErrorMessage(err, "The vacation could not be deleted.")),
    });
  };

  const filters = isAdmin ? ADMIN_FILTERS : USER_FILTERS;

  return (
    <>
      {isAdmin ? <AdminHeader /> : <Hero firstName={user?.firstName ?? ""} />}

      <section id="collection" className="container-page scroll-mt-24 pt-12 sm:pt-16" aria-labelledby="collection-title">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-2">{isAdmin ? "Catalogue" : "The collection"}</p>
            <h2 id="collection-title" className="font-display text-3xl text-ink sm:text-4xl">
              {isAdmin ? "Manage vacations" : "Curated escapes"}
            </h2>
            <p className="mt-2 text-muted" aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? "vacation" : "vacations"} · sorted by departure date` : " "}
            </p>
          </div>
          <SegmentedControl label="Filter vacations" segments={filters} value={filter} onChange={(value) => update({ filter: value })} />
        </div>

        {isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8" aria-busy="true" aria-label="Loading vacations">
            {Array.from({ length: 6 }, (_, i) => (
              <VacationCardSkeleton key={i} />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            title={EMPTY_COPY[filter].title}
            description={EMPTY_COPY[filter].description}
            icon={filter === "liked" ? <Heart className="size-6" aria-hidden /> : undefined}
            action={
              filter !== "all" ? (
                <button type="button" className="font-medium text-ocean underline-offset-4 hover:underline" onClick={() => update({ filter: "all" })}>
                  Browse all vacations
                </button>
              ) : isAdmin ? (
                <ButtonLink to="/admin/vacations/new" icon={<Plus className="size-4" aria-hidden />}>
                  Add the first vacation
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <div
              className="grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
              style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
            >
              {data.items.map((vacation, index) => (
                <VacationCard
                  key={vacation.id}
                  vacation={vacation}
                  index={index}
                  mode={isAdmin ? "admin" : "user"}
                  likePending={toggleLike.isPending && toggleLike.variables?.vacation.id === vacation.id}
                  onToggleLike={handleLike}
                  onDelete={setPendingDelete}
                />
              ))}
            </div>
            <div className="mt-12 flex flex-col items-center gap-3">
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(next) => update({ page: next })} />
              {data.totalPages > 1 && (
                <p className="text-sm text-muted">
                  Page {data.page} of {data.totalPages}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this vacation?"
        description={
          <>
            <strong className="font-semibold text-ink">{pendingDelete?.destination}</strong> and all of its likes will be permanently
            removed. This can't be undone.
          </>
        }
        confirmLabel="Delete vacation"
        loading={deleteVacation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => !deleteVacation.isPending && setPendingDelete(null)}
      />
    </>
  );
}

function Hero({ firstName }: { firstName: string }) {
  return (
    <section className="container-page pt-4 sm:pt-6">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-midnight">
        <img src={heroImage} alt="" className="absolute inset-0 -z-10 size-full object-cover" loading="eager" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight/85 via-midnight/55 to-midnight/10" aria-hidden />
        <div className="max-w-2xl px-6 py-12 sm:px-12 sm:py-16 lg:py-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.16em] text-gold uppercase backdrop-blur">
            <Plane className="size-3.5" aria-hidden />
            Welcome back{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="font-display text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            Discover places worth <em className="text-gold not-italic sm:italic">remembering.</em>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
            Explore extraordinary destinations, save the ones that move you, and find your next unforgettable escape.
          </p>
          <a
            href="#collection"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-midnight shadow-sm transition-colors hover:bg-gold-soft"
          >
            Explore the collection
          </a>
        </div>
      </div>
    </section>
  );
}

function AdminHeader() {
  const reports = useQuery({ queryKey: ["reports", "likes"], queryFn: reportService.likes });
  const upcoming = useQuery({
    queryKey: ["vacations", "count", "upcoming"],
    queryFn: () => vacationService.list({ filter: "upcoming", page: 1, limit: 1 }),
  });

  const totalLikes = reports.data?.reduce((sum, row) => sum + row.likes, 0);
  const stats = [
    { label: "Total vacations", value: reports.data?.length, icon: Layers },
    { label: "Total likes", value: totalLikes, icon: Heart },
    { label: "Upcoming departures", value: upcoming.data?.total, icon: CalendarClock },
  ];

  return (
    <section className="border-b border-line bg-white/60">
      <div className="container-page py-10 sm:py-12">
        <PageHeader
          eyebrow="Administration"
          title="Vacation dashboard"
          description="Curate the collection, keep details accurate and see what travellers love."
          actions={
            <>
              <ButtonLink to="/admin/reports" variant="secondary" icon={<BarChart3 className="size-4" aria-hidden />}>
                Reports
              </ButtonLink>
              <ButtonLink to="/admin/vacations/new" icon={<Plus className="size-4" aria-hidden />}>
                Add vacation
              </ButtonLink>
            </>
          }
        />
        <dl className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-ocean-soft text-ocean sm:size-11">
                <Icon className="size-[18px] sm:size-5" aria-hidden />
              </span>
              <div>
                <dt className="text-xs leading-snug text-muted sm:text-sm">{label}</dt>
                <dd className="font-display text-2xl text-ink tabular-nums">
                  {value ?? <span className="skeleton inline-block h-6 w-10 rounded align-middle" aria-label="Loading" />}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
