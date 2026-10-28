import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const vacationSchema = new Schema(
  {
    destination: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true, min: 0.01, max: 10_000 },
    imageName: { type: String, required: true },
  },
  { timestamps: true },
);

vacationSchema.index({ startDate: 1 });

export type VacationAttrs = InferSchemaType<typeof vacationSchema>;
export type VacationDocument = HydratedDocument<VacationAttrs>;
export const Vacation = model("Vacation", vacationSchema);
