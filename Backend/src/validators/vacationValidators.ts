import { z } from "zod";
import { Types } from "mongoose";
import { startOfTodayUtc, toUtcDate } from "../utils/dates";

const isoDate = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} must be a valid date`)
    .transform((value) => toUtcDate(value));

const vacationFields = z.object({
  destination: z.string({ required_error: "Destination is required" }).trim().min(1, "Destination is required").max(100),
  description: z.string({ required_error: "Description is required" }).trim().min(1, "Description is required").max(2000),
  startDate: isoDate("Start date"),
  endDate: isoDate("End date"),
  price: z.coerce
    .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
    .gt(0, "Price must be greater than 0")
    .max(10_000, "Price cannot exceed 10,000"),
});

const endNotBeforeStart = <T extends { startDate: Date; endDate: Date }>(data: T) => data.endDate >= data.startDate;
const endDateMessage = { message: "End date cannot be before start date", path: ["endDate"] };

export const createVacationSchema = vacationFields
  .refine(endNotBeforeStart, endDateMessage)
  .refine((data) => data.startDate >= startOfTodayUtc(), {
    message: "Start date cannot be in the past",
    path: ["startDate"],
  });

export const updateVacationSchema = vacationFields.refine(endNotBeforeStart, endDateMessage);

export type VacationInput = z.infer<typeof vacationFields>;

export const VACATION_FILTERS = ["all", "liked", "upcoming", "active"] as const;
export type VacationFilter = (typeof VACATION_FILTERS)[number];

export const listVacationsQuerySchema = z.object({
  filter: z.enum(VACATION_FILTERS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
});

export const objectIdParamSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid id"),
});
