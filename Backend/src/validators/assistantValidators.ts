import { z } from "zod";

export const recommendationSchema = z.object({
  destination: z.string().trim().min(2, "Please enter a destination").max(100, "Destination is too long"),
});

export const askQuestionSchema = z.object({
  question: z.string().trim().min(3, "Please enter a question").max(500, "Question is too long (max 500 characters)"),
});
