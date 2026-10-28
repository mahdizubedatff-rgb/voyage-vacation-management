import { Schema, model, Types } from "mongoose";

const likeSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    vacationId: { type: Types.ObjectId, ref: "Vacation", required: true, index: true },
  },
  { timestamps: true },
);

// One like per user per vacation, enforced by the database itself.
likeSchema.index({ userId: 1, vacationId: 1 }, { unique: true });

export const Like = model("Like", likeSchema);
