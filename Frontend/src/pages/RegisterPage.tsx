import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, getFieldErrors } from "../services/api";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import registerImage from "../assets/images/auth-register.jpg";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerUser(values);
      navigate("/vacations", { replace: true });
    } catch (error) {
      const message = getErrorMessage(error, "We couldn't create your account. Please try again.");
      const fields = getFieldErrors(error);
      if (/already exists/i.test(message)) setError("email", { message });
      else if (fields) {
        for (const [field, messages] of Object.entries(fields)) {
          if (messages?.[0]) setError(field as keyof RegisterValues, { message: messages[0] });
        }
      } else setServerError(message);
    }
  });

  return (
    <AuthLayout
      image={registerImage}
      quote="Somewhere beautiful is waiting. Let's find it together."
      caption="The Voyage concierge team"
      title="Create your account"
      subtitle={
        <>
          Already a member?{" "}
          <Link to="/login" className="font-medium text-ocean underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leading={<Mail className="size-[18px]" aria-hidden />}
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 4 characters."
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
