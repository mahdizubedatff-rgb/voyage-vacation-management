import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CalendarDays, DollarSign, MapPin } from "lucide-react";
import type { VacationFormValues } from "../services";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { todayInput } from "../utils/format";
import { Input, Textarea } from "./ui/Field";
import { Button, ButtonLink } from "./ui/Button";
import { ImageUpload } from "./ImageUpload";

function buildSchema(isEdit: boolean) {
  return z
    .object({
      destination: z.string().trim().min(1, "Destination is required").max(100, "Destination is too long"),
      description: z.string().trim().min(1, "Description is required").max(2000, "Description is too long (max 2,000 characters)"),
      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().min(1, "End date is required"),
      price: z
        .number({ invalid_type_error: "Price is required", required_error: "Price is required" })
        .gt(0, "Price must be greater than 0")
        .max(10_000, "Price cannot exceed 10,000"),
    })
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      message: "End date cannot be before start date",
      path: ["endDate"],
    })
    .refine((v) => isEdit || !v.startDate || v.startDate >= todayInput(), {
      message: "Start date cannot be in the past",
      path: ["startDate"],
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

interface VacationFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<FormValues>;
  existingImageUrl?: string;
  submitting: boolean;
  onSubmit: (values: VacationFormValues) => Promise<void>;
}

export function VacationForm({ mode, defaultValues, existingImageUrl, submitting, onSubmit }: VacationFormProps) {
  const isEdit = mode === "edit";
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(isEdit)),
    defaultValues: { destination: "", description: "", startDate: "", endDate: "", ...defaultValues },
  });

  const startDate = useWatch({ control, name: "startDate" });
  const descriptionLength = useWatch({ control, name: "description" })?.length ?? 0;

  const submit = handleSubmit(
    async (values) => {
      if (!isEdit && !image) {
        setImageError("An image is required");
        return;
      }
      setServerError(null);
      try {
        await onSubmit({ ...values, image });
      } catch (error) {
        const fields = getFieldErrors(error);
        let mapped = false;
        if (fields) {
          for (const [field, messages] of Object.entries(fields)) {
            if (!messages?.[0]) continue;
            if (field === "image") setImageError(messages[0]);
            else setError(field as keyof FormValues, { message: messages[0] });
            mapped = true;
          }
        }
        if (!mapped) setServerError(getErrorMessage(error, "The vacation could not be saved."));
      }
    },
    () => {
      if (!isEdit && !image) setImageError("An image is required");
    },
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
      <div className="space-y-6 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-card sm:p-8">
        <div>
          <h2 className="font-display text-xl text-ink">Trip details</h2>
          <p className="mt-1 text-sm text-muted">What travellers will see on the vacation card.</p>
        </div>

        {serverError && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}

        <Input
          label="Destination"
          placeholder="e.g. Kyoto, Japan"
          leading={<MapPin className="size-[18px]" aria-hidden />}
          error={errors.destination?.message}
          {...register("destination")}
        />
        <Textarea
          label="Description"
          rows={5}
          placeholder="Describe the experience, stay and highlights…"
          error={errors.description?.message}
          hint={`${descriptionLength.toLocaleString()} / 2,000 characters`}
          {...register("description")}
        />

        <fieldset className="space-y-4">
          <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarDays className="size-4 text-ocean" aria-hidden />
            Dates
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              min={isEdit ? undefined : todayInput()}
              error={errors.startDate?.message}
              {...register("startDate")}
            />
            <Input label="End date" type="date" min={startDate || undefined} error={errors.endDate?.message} {...register("endDate")} />
          </div>
        </fieldset>

        <Input
          label="Price per person (USD)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max="10000"
          placeholder="2,500"
          leading={<DollarSign className="size-[18px]" aria-hidden />}
          hint="Between $0.01 and $10,000."
          error={errors.price?.message}
          {...register("price", { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-card sm:p-8">
          <ImageUpload
            value={image}
            existingUrl={existingImageUrl}
            error={imageError}
            onInvalid={setImageError}
            onChange={(file) => {
              setImage(file);
              setImageError(undefined);
            }}
          />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:flex-col-reverse lg:items-stretch xl:flex-row xl:justify-end">
          <ButtonLink to="/vacations" variant="secondary" size="lg">
            Cancel
          </ButtonLink>
          <Button type="submit" size="lg" loading={submitting}>
            {isEdit ? "Save changes" : "Add vacation"}
          </Button>
        </div>
      </div>
    </form>
  );
}
