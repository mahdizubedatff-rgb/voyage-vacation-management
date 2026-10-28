import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import * as auth from "../controllers/authController";
import * as vacations from "../controllers/vacationController";
import * as reports from "../controllers/reportController";
import * as assistant from "../controllers/assistantController";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { imageUpload } from "../middleware/upload";
import { asyncHandler } from "../utils/http";
import { loginSchema, registerSchema } from "../validators/authValidators";
import {
  createVacationSchema,
  listVacationsQuerySchema,
  objectIdParamSchema,
  updateVacationSchema,
} from "../validators/vacationValidators";
import { askQuestionSchema, recommendationSchema } from "../validators/assistantValidators";

const isTest = env.NODE_ENV === "test";
const limiter = (max: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isTest ? 10_000 : max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: { message: "Too many requests. Please slow down and try again later." } },
  });

const authRouter = Router();
authRouter.post("/register", limiter(30), validate(registerSchema), asyncHandler(auth.register));
authRouter.post("/login", limiter(30), validate(loginSchema), asyncHandler(auth.login));
authRouter.get("/me", authenticate, asyncHandler(auth.me));

const vacationRouter = Router();
const idParam = validate(objectIdParamSchema, "params");
vacationRouter.use(authenticate);
vacationRouter.get("/", validate(listVacationsQuerySchema, "query"), asyncHandler(vacations.list));
vacationRouter.get("/:id", idParam, asyncHandler(vacations.getById));
vacationRouter.post("/", requireRole("ADMIN"), imageUpload, validate(createVacationSchema), asyncHandler(vacations.create));
vacationRouter.put("/:id", requireRole("ADMIN"), idParam, imageUpload, validate(updateVacationSchema), asyncHandler(vacations.update));
vacationRouter.delete("/:id", requireRole("ADMIN"), idParam, asyncHandler(vacations.remove));
vacationRouter.post("/:id/likes", requireRole("USER"), idParam, asyncHandler(vacations.like));
vacationRouter.delete("/:id/likes", requireRole("USER"), idParam, asyncHandler(vacations.unlike));

const reportRouter = Router();
reportRouter.use(authenticate, requireRole("ADMIN"));
reportRouter.get("/likes", asyncHandler(reports.likes));
reportRouter.get("/likes/csv", asyncHandler(reports.likesCsv));

const aiRouter = Router();
aiRouter.post("/recommendations", authenticate, requireRole("USER"), limiter(40), validate(recommendationSchema), asyncHandler(assistant.recommend));

const mcpRouter = Router();
mcpRouter.post("/ask", authenticate, requireRole("USER"), limiter(100), validate(askQuestionSchema), asyncHandler(assistant.ask));

export const apiRouter = Router();
apiRouter.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});
apiRouter.use("/auth", authRouter);
apiRouter.use("/vacations", vacationRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/mcp", mcpRouter);
