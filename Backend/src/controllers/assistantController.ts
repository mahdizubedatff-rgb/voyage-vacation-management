import type { Request, Response } from "express";
import { getRecommendation } from "../services/ai/recommendationService";
import { askQuestion } from "../services/mcpQuestionService";
import { sendSuccess } from "../utils/http";

export async function recommend(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getRecommendation(req.body.destination));
}

export async function ask(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await askQuestion(req.body.question));
}
