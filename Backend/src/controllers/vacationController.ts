import type { Request, Response } from "express";
import { assertRealImage } from "../middleware/upload";
import * as vacationService from "../services/vacationService";
import * as likeService from "../services/likeService";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/http";

export async function list(req: Request, res: Response): Promise<void> {
  const { filter, page, limit } = res.locals.query;
  if (filter === "liked" && req.user!.role !== "USER") throw AppError.forbidden("Only travellers can filter by likes");
  sendSuccess(res, await vacationService.listVacations({ filter, page, limit, userId: req.user!.id }));
}

export async function getById(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await vacationService.getVacationById(res.locals.params.id, req.user!.id));
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.file) throw AppError.badRequest("An image is required", { image: ["An image is required"] });
  await assertRealImage(req.file.path);
  sendSuccess(res, await vacationService.createVacation(req.body, req.file.filename), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  if (req.file) await assertRealImage(req.file.path);
  sendSuccess(res, await vacationService.updateVacation(res.locals.params.id, req.body, req.file?.filename));
}

export async function remove(_req: Request, res: Response): Promise<void> {
  await vacationService.deleteVacation(res.locals.params.id);
  res.status(204).end();
}

export async function like(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await likeService.likeVacation(req.user!.id, res.locals.params.id), 201);
}

export async function unlike(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await likeService.unlikeVacation(req.user!.id, res.locals.params.id));
}
