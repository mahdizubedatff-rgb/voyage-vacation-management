import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";
import { AuthLayout } from "../layouts/AuthLayout";
import { Input } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import authImage from "../assets/images/auth.jpg";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith("/") ? from : "/vacations", { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, "We couldn't sign you in. Please try again."));
    }
  });

  return (
    <AuthLayout
      image={authImage}
      quote="The world is a book, and those who do not travel read only one page."
      caption="Saint Augustine"
      title="Welcome back"
      subtitle={
        <>
          New to Voyage?{" "}
          <Link to="/register" className="font-medium text-ocean underline-offset-4 hover:underline">
            Create an account
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
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leading={<Mail className="size-[18px]" aria-hidden />}
          error={errors.email?.message}
          {...register("email")}
        />
        <Input label="Password" type="password" autoComplete="current-password" placeholder="Your password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
