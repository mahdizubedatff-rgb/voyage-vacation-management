import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "USER", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;
export const User = model("User", userSchema);

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id as string,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role as Role,
  };
}
