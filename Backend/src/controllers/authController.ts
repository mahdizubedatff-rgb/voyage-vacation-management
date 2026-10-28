import type { Request, Response } from "express";
import * as authService from "../services/authService";
import { sendSuccess } from "../utils/http";

export async function register(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await authService.register(req.body), 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await authService.login(req.body));
}

export async function me(req: Request, res: Response): Promise<void> {
  sendSuccess(res, { user: await authService.getCurrentUser(req.user!.id) });
}
