import type { Request, Response } from "express";
import * as reportService from "../services/reportService";
import { sendSuccess } from "../utils/http";

export async function likes(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await reportService.getLikesReport());
}

export async function likesCsv(_req: Request, res: Response): Promise<void> {
  const csv = await reportService.getLikesCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="vacation-likes.csv"');
  res.send(csv);
}
