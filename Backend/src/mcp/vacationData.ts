import { Types } from "mongoose";
import { Vacation } from "../models/Vacation";
import { Like } from "../models/Like";
import { formatIsoDate, startOfTodayUtc } from "../utils/dates";
import { regionOf, type Region } from "./regions";

/** Read-only data access used by the MCP tools. Every function queries MongoDB directly. */

export type VacationStatus = "upcoming" | "active" | "past";

export interface VacationSummary {
  id: string;
  destination: string;
  region: Region | "Other";
  startDate: string;
  endDate: string;
  nights: number;
  price: number;
  status: VacationStatus;
  likes: number;
}

export interface VacationDetails extends VacationSummary {
  description: string;
}

interface Row {
  _id: Types.ObjectId;
  destination: string;
  description: string;
  startDate: Date;
  endDate: Date;
  price: number;
  likes: number;
}

function statusOf(row: Pick<Row, "startDate" | "endDate">, now = new Date()): VacationStatus {
  if (row.startDate > now) return "upcoming";
  if (row.endDate >= startOfTodayUtc(now)) return "active";
  return "past";
}

function toDetails(row: Row): VacationDetails {
  return {
    id: String(row._id),
    destination: row.destination,
    region: regionOf(row.destination),
    startDate: formatIsoDate(row.startDate),
    endDate: formatIsoDate(row.endDate),
    nights: Math.round((row.endDate.getTime() - row.startDate.getTime()) / 86_400_000),
    price: row.price,
    status: statusOf(row),
    likes: row.likes,
    description: row.description,
  };
}

const toSummary = ({ description: _description, ...summary }: VacationDetails): VacationSummary => summary;

async function loadAll(match: Record<string, unknown> = {}): Promise<VacationDetails[]> {
  const rows = await Vacation.aggregate<Row>([
    { $match: match },
    { $sort: { startDate: 1, _id: 1 } },
    { $lookup: { from: Like.collection.name, localField: "_id", foreignField: "vacationId", as: "likeDocs" } },
    { $project: { destination: 1, description: 1, startDate: 1, endDate: 1, price: 1, likes: { $size: "$likeDocs" } } },
  ]);
  return rows.map(toDetails);
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listVacations(options: {
  status?: VacationStatus | "all";
  sortBy?: "startDate" | "price";
  limit?: number;
}): Promise<VacationSummary[]> {
  let items = await loadAll();
  if (options.status && options.status !== "all") items = items.filter((v) => v.status === options.status);
  if (options.sortBy === "price") items = [...items].sort((a, b) => a.price - b.price);
  return items.slice(0, options.limit ?? items.length).map(toSummary);
}

export async function findByDestination(query: string): Promise<VacationDetails[]> {
  const terms = query.split(/[,\s]+/).filter((term) => term.length > 1);
  const exact = await loadAll({ destination: { $regex: escapeRegex(query.trim()), $options: "i" } });
  if (exact.length > 0 || terms.length < 2) return exact;
  // Fall back to matching any individual word ("Japan" in "Kyoto Japan").
  return loadAll({ $or: terms.map((term) => ({ destination: { $regex: escapeRegex(term), $options: "i" } })) });
}

export async function getDetails(idOrDestination: { vacationId?: string; destination?: string }): Promise<VacationDetails[]> {
  if (idOrDestination.vacationId) {
    if (!Types.ObjectId.isValid(idOrDestination.vacationId)) return [];
    return loadAll({ _id: new Types.ObjectId(idOrDestination.vacationId) });
  }
  if (idOrDestination.destination) return findByDestination(idOrDestination.destination);
  return [];
}

export async function listByRegion(region: Region): Promise<VacationSummary[]> {
  const all = await loadAll();
  return all.filter((v) => v.region === region).map(toSummary);
}

export async function getStatistics() {
  const all = await loadAll();
  const byPrice = [...all].sort((a, b) => a.price - b.price);
  const count = (status: VacationStatus) => all.filter((v) => v.status === status).length;
  const regions: Record<string, number> = {};
  for (const vacation of all) regions[vacation.region] = (regions[vacation.region] ?? 0) + 1;
  const total = all.reduce((sum, v) => sum + v.price, 0);

  return {
    totalVacations: all.length,
    byStatus: { upcoming: count("upcoming"), active: count("active"), past: count("past") },
    averagePrice: all.length ? Math.round((total / all.length) * 100) / 100 : null,
    cheapest: byPrice[0] ? toSummary(byPrice[0]) : null,
    mostExpensive: byPrice.at(-1) ? toSummary(byPrice.at(-1) as VacationDetails) : null,
    mostLiked: all.length ? toSummary([...all].sort((a, b) => b.likes - a.likes)[0] as VacationDetails) : null,
    vacationsPerRegion: regions,
  };
}
