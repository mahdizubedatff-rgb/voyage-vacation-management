import { Vacation } from "../models/Vacation";
import { Like } from "../models/Like";
import { toCsv, UTF8_BOM } from "../utils/csv";

export interface LikeReportRow {
  vacationId: string;
  destination: string;
  likes: number;
}

/** Like counts for every vacation, including vacations nobody has liked yet. */
export async function getLikesReport(): Promise<LikeReportRow[]> {
  const rows = await Vacation.aggregate<{ _id: unknown; destination: string; likes: number }>([
    { $sort: { startDate: 1, _id: 1 } },
    { $lookup: { from: Like.collection.name, localField: "_id", foreignField: "vacationId", as: "likes" } },
    { $project: { destination: 1, likes: { $size: "$likes" } } },
  ]);
  return rows.map((row) => ({ vacationId: String(row._id), destination: row.destination, likes: row.likes }));
}

export async function getLikesCsv(): Promise<string> {
  const rows = await getLikesReport();
  return UTF8_BOM + toCsv(["Destination", "Likes"], rows.map((row) => [row.destination, row.likes]));
}
