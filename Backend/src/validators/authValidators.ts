import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address").max(120),
  // bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
  password: z.string().min(4, "Password must be at least 4 characters").max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
