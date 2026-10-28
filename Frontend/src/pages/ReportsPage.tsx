import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Heart, Trophy } from "lucide-react";
import { reportService } from "../services";
import { getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, PageHeader } from "../components/ui/States";
import { PageLoader } from "../components/ui/Spinner";

const shortName = (destination: string) => destination.split(",")[0]?.trim() ?? destination;

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const row = payload?.[0]?.payload as { destination: string; likes: number } | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 shadow-lift">
      <p className="text-sm font-semibold text-ink">{row.destination}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <Heart className="size-3.5 fill-heart stroke-heart" aria-hidden />
        {row.likes} {row.likes === 1 ? "like" : "likes"}
      </p>
    </div>
  );
}

export function ReportsPage() {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["reports", "likes"], queryFn: reportService.likes });

  const download = async () => {
    setDownloading(true);
    try {
      await reportService.downloadCsv();
      toast.success("CSV report downloaded");
    } catch (err) {
      toast.error(getErrorMessage(err, "The CSV could not be downloaded."));
    } finally {
      setDownloading(false);
    }
  };

  const chartData = (data ?? []).map((row) => ({ ...row, label: shortName(row.destination) }));
  const totalLikes = chartData.reduce((sum, row) => sum + row.likes, 0);
  const top = [...chartData].sort((a, b) => b.likes - a.likes)[0];

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Insights"
        title="Vacation likes report"
        description="How many travellers have saved each vacation. Vacations without likes are included."
        actions={
          <Button variant="gold" onClick={download} loading={downloading} icon={<Download className="size-4" aria-hidden />}>
            Download CSV
          </Button>
        }
      />

      {isPending ? (
        <PageLoader label="Loading report" />
      ) : isError ? (
        <div className="mt-10">
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        </div>
      ) : chartData.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No vacations to report on" description="Add vacations to start collecting likes." />
        </div>
      ) : (
        <>
          <dl className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <dt className="text-sm text-muted">Vacations</dt>
              <dd className="mt-1 font-display text-3xl text-ink tabular-nums">{chartData.length}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <dt className="text-sm text-muted">Total likes</dt>
              <dd className="mt-1 font-display text-3xl text-ink tabular-nums">{totalLikes}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <dt className="flex items-center gap-1.5 text-sm text-muted">
                <Trophy className="size-4 text-gold" aria-hidden />
                Most loved
              </dt>
              <dd className="mt-1 truncate font-display text-2xl text-ink">{top && top.likes > 0 ? `${top.label} · ${top.likes}` : "—"}</dd>
            </div>
          </dl>

          <figure className="mt-6 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-card sm:p-8">
            <figcaption className="mb-6 flex flex-wrap items-baseline justify-between gap-2 px-2">
              <span className="font-display text-xl text-ink">Likes per destination</span>
              <span className="text-sm text-muted">Ordered by departure date</span>
            </figcaption>
            <div className="-mx-2 overflow-x-auto">
              <div style={{ minWidth: Math.max(560, chartData.length * 64) }} className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 56, left: 8 }}>
                    <CartesianGrid vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tick={{ fill: "#5B6577", fontSize: 12 }}
                      label={{ value: "Destination", position: "insideBottom", offset: -48, fill: "#14213D", fontSize: 13 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#5B6577", fontSize: 12 }}
                      label={{ value: "Likes", angle: -90, position: "insideLeft", offset: 12, fill: "#14213D", fontSize: 13 }}
                    />
                    <Tooltip cursor={{ fill: "rgb(8 127 140 / 0.06)" }} content={ChartTooltip} />
                    <Bar dataKey="likes" name="Likes" fill="#087F8C" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </figure>

          <details className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
            <summary className="cursor-pointer font-medium text-ink">View as table</summary>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 font-medium">Destination</th>
                  <th scope="col" className="py-2 text-right font-medium">Likes</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.vacationId} className="border-b border-line/60 last:border-0">
                    <td className="py-2 text-ink">{row.destination}</td>
                    <td className="py-2 text-right tabular-nums">{row.likes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
