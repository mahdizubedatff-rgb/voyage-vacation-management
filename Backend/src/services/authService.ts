import bcrypt from "bcryptjs";
import { User, toPublicUser, type PublicUser } from "../models/User";
import { signToken } from "../middleware/auth";
import { AppError } from "../utils/AppError";
import type { LoginInput, RegisterInput } from "../validators/authValidators";

const SALT_ROUNDS = 10;

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) {
    throw AppError.conflict("An account with this email already exists");
  }

  const password = await bcrypt.hash(input.password, SALT_ROUNDS);
  try {
    const user = await User.create({ ...input, email, password, role: "USER" });
    const publicUser = toPublicUser(user);
    return { user: publicUser, token: signToken(publicUser) };
  } catch (error) {
    // Two simultaneous registrations can both pass the exists() check; the unique index is the real guard.
    if ((error as { code?: number }).code === 11000) {
      throw AppError.conflict("An account with this email already exists");
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select("+password");
  const valid = user ? await bcrypt.compare(input.password, user.password) : false;
  if (!user || !valid) {
    throw AppError.unauthorized("Incorrect email or password");
  }
  const publicUser = toPublicUser(user);
  return { user: publicUser, token: signToken(publicUser) };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  return toPublicUser(user);
}
