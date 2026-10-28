import { Like } from "../models/Like";
import { Vacation } from "../models/Vacation";
import { AppError } from "../utils/AppError";

export interface LikeState {
  vacationId: string;
  isLiked: boolean;
  likesCount: number;
}

async function stateFor(vacationId: string, isLiked: boolean): Promise<LikeState> {
  return { vacationId, isLiked, likesCount: await Like.countDocuments({ vacationId }) };
}

export async function likeVacation(userId: string, vacationId: string): Promise<LikeState> {
  if (!(await Vacation.exists({ _id: vacationId }))) throw AppError.notFound("Vacation not found");
  try {
    await Like.create({ userId, vacationId });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw AppError.conflict("You already liked this vacation");
    throw error;
  }
  return stateFor(vacationId, true);
}

export async function unlikeVacation(userId: string, vacationId: string): Promise<LikeState> {
  const { deletedCount } = await Like.deleteOne({ userId, vacationId });
  if (deletedCount === 0) throw AppError.notFound("You have not liked this vacation");
  return stateFor(vacationId, false);
}
