import { Types, type PipelineStage } from "mongoose";
import { Vacation } from "../models/Vacation";
import { Like } from "../models/Like";
import { removeUpload } from "../middleware/upload";
import { AppError } from "../utils/AppError";
import { startOfTodayUtc } from "../utils/dates";
import type { VacationFilter, VacationInput } from "../validators/vacationValidators";

export interface VacationDto {
  id: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  price: number;
  imageName: string;
  imageUrl: string;
  likesCount: number;
  isLiked: boolean;
}

export interface PaginatedVacations {
  items: VacationDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface VacationRow {
  _id: Types.ObjectId;
  destination: string;
  description: string;
  startDate: Date;
  endDate: Date;
  price: number;
  imageName: string;
  likesCount: number;
  isLiked: boolean;
}

export const imageUrlFor = (imageName: string): string => `/api/images/${encodeURIComponent(imageName)}`;

function toDto(row: VacationRow): VacationDto {
  return {
    id: String(row._id),
    destination: row.destination,
    description: row.description,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    price: row.price,
    imageName: row.imageName,
    imageUrl: imageUrlFor(row.imageName),
    likesCount: row.likesCount,
    isLiked: row.isLiked,
  };
}

/** Adds `likesCount` and `isLiked` (for the given user) to each vacation document. */
function likeStages(userId?: string): PipelineStage.FacetPipelineStage[] {
  const userObjectId = userId ? new Types.ObjectId(userId) : null;
  return [
    { $lookup: { from: Like.collection.name, localField: "_id", foreignField: "vacationId", as: "likes" } },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: userObjectId ? { $in: [userObjectId, "$likes.userId"] } : false,
      },
    },
    { $project: { likes: 0, __v: 0, createdAt: 0, updatedAt: 0 } },
  ];
}

export async function buildFilterMatch(filter: VacationFilter, userId?: string, now: Date = new Date()) {
  switch (filter) {
    case "liked": {
      if (!userId) return { _id: { $in: [] } };
      const likedIds = await Like.find({ userId }).distinct("vacationId");
      return { _id: { $in: likedIds } };
    }
    case "upcoming":
      return { startDate: { $gt: now } };
    case "active":
      // Started already and the last day (stored as UTC midnight) is today or later.
      return { startDate: { $lte: now }, endDate: { $gte: startOfTodayUtc(now) } };
    default:
      return {};
  }
}

export async function listVacations(params: {
  filter: VacationFilter;
  page: number;
  limit: number;
  userId?: string;
}): Promise<PaginatedVacations> {
  const { filter, page, limit, userId } = params;
  const match = await buildFilterMatch(filter, userId);

  // Filtering happens in $match before $skip/$limit, so pagination always applies to the filtered set.
  const [result] = await Vacation.aggregate<{ items: VacationRow[]; total: Array<{ count: number }> }>([
    { $match: match },
    { $sort: { startDate: 1, _id: 1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...likeStages(userId)],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.total[0]?.count ?? 0;
  return {
    items: (result?.items ?? []).map(toDto),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getVacationById(id: string, userId?: string): Promise<VacationDto> {
  const [row] = await Vacation.aggregate<VacationRow>([
    { $match: { _id: new Types.ObjectId(id) } },
    ...(likeStages(userId) as PipelineStage[]),
  ]);
  if (!row) throw AppError.notFound("Vacation not found");
  return toDto(row);
}

export async function createVacation(input: VacationInput, imageName: string): Promise<VacationDto> {
  const vacation = await Vacation.create({ ...input, imageName });
  return getVacationById(vacation.id as string);
}

export async function updateVacation(id: string, input: VacationInput, newImageName?: string): Promise<VacationDto> {
  const vacation = await Vacation.findById(id);
  if (!vacation) throw AppError.notFound("Vacation not found");

  const previousImage = vacation.imageName;
  vacation.set({ ...input, ...(newImageName ? { imageName: newImageName } : {}) });
  await vacation.save();

  if (newImageName && previousImage !== newImageName) await removeUpload(previousImage);
  return getVacationById(id);
}

export async function deleteVacation(id: string): Promise<void> {
  const vacation = await Vacation.findByIdAndDelete(id);
  if (!vacation) throw AppError.notFound("Vacation not found");
  await Like.deleteMany({ vacationId: vacation._id });
  await removeUpload(vacation.imageName);
}
